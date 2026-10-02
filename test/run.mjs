/**
 * Unit checks for the rule engine, the report parser, the diff and the dev-mode helpers.
 * Plain node, no Obsidian. Runs against a generated fixture vault (see fixture-vault.mjs),
 * so it needs no configured vault and never touches real notes.
 *
 * The dev-mode sections spell the document vocabulary out as literals on purpose: they pin
 * what the plugin writes into the docs (statuses, field names, section headings), so a rename
 * in src/dev.ts has to be mirrored here deliberately.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { checkFile, extractTemplateSpec, isInScope, isTemplateLike, matchingFolderPrefix, checkIndexFile, DEFAULT_DRAFT_REGEX } from "../.test/rules.mjs";
import { parseAiReport } from "../.test/ingest.mjs";
import { diffLines, diffStats } from "../.test/diff.mjs";
import { matchTasks, collectDevTasks, extractFieldValue, taskState, stripDatePrefix, shouldUseProjectDocsLayout, isNovelDefaultDevFolders, isUnderNamedFolder, targetFolderOf, setFieldValue, upsertSupplementSection, upsertBugSection, upsertChangeSection, hasPendingChange, countBugEntries, removeLatestSectionEntry, nowStamp, todayStamp, isBugFixReqStatus, isApprovedReqStatus, nextApproveStatus, canRecordRequirementChange, canRecordBug, devAuthorActions } from "../.test/dev.mjs";
import { ReviewStore, effectiveStatus, needsAttention } from "../.test/store.mjs";
import { createFixtureVault } from "./fixture-vault.mjs";

const fixture = createFixtureVault();
const vaultRoot = fixture.root;
process.on("exit", () => fixture.cleanup());

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log(`  ✓ ${msg}`);
	} else {
		failed++;
		console.error(`  ✗ ${msg}`);
	}
}

function walkMd(dir, out = []) {
	for (const name of readdirSync(dir)) {
		if (name.startsWith(".")) continue;
		const p = join(dir, name);
		const st = statSync(p);
		if (st.isDirectory()) walkMd(p, out);
		else if (name.endsWith(".md")) out.push(p);
	}
	return out;
}

const allMd = walkMd(vaultRoot);
const allPaths = allMd.map((p) => relative(vaultRoot, p).split("\\").join("/"));

const TEMPLATE_MAP = {
	characters: "characters/character-template.md",
	events: "events/event-template.md",
	skills: "skills/skill-template.md",
	chapters: "chapters/chapter-template.md",
	principles: "principles/_template.md",
};
const templates = {};
for (const tplPath of Object.values(TEMPLATE_MAP)) {
	templates[tplPath] = extractTemplateSpec(readFileSync(join(vaultRoot, tplPath), "utf8"));
}
const ctx = { templateMap: TEMPLATE_MAP, templates, draftMarkerRegex: DEFAULT_DRAFT_REGEX };

console.log("\n== 1. Template parsing ==");
const tpl = templates["characters/character-template.md"];
assert(tpl.sections.length >= 8, `character template parsed into ${tpl.sections.length} sections (>=8)`);
assert(tpl.fields.some((f) => f.name === "Name"), 'character template has the field "Name"');
const principleTpl = templates["principles/_template.md"];
assert(principleTpl.fields.some((f) => f.name === "Principle ID"), 'principle template picks up the blockquote field "Principle ID"');

console.log("\n== 2. Template check (synthetic) ==");
{
	const badContent = [
		"# Test character",
		"## Core identity",
		"- **Name**:",
		"- **Role**: protagonist / heroine / villain / mentor / confidant / extra",
	].join("\n");
	const res = checkFile("characters/test-character.md", badContent, allPaths, ctx);
	const kinds = res.issues.map((i) => i.problem);
	assert(kinds.some((k) => k.includes('Missing template section "Appearance"')), 'missing section "Appearance" detected');
	assert(kinds.some((k) => k.includes('Field "Name" looks unfilled')), 'empty field "Name" detected');
	assert(kinds.some((k) => k.includes('Field "Role" looks unfilled')), 'field "Role" still holding the template placeholder detected');
	assert(res.status === "warn", `synthetic sample is warn (got ${res.status})`);
}

console.log("\n== 3. Draft marker scan ==");
{
	const maleLead = readFileSync(join(vaultRoot, "characters/male-lead.md"), "utf8");
	const res = checkFile("characters/male-lead.md", maleLead, allPaths, ctx);
	const draft = res.issues.find((i) => i.dimension === "draft");
	assert(!!draft && draft.locations.length >= 5, `male-lead.md has ${draft?.locations.length ?? 0} draft/pending markers (>=5)`);
	const clean = checkFile("characters/x.md", "# clean file\n- **Name**: Shen Yuan\n", allPaths, ctx);
	assert(!clean.issues.some((i) => i.dimension === "draft"), "clean file raises no false draft marker");
}

console.log("\n== 4. Index consistency ==");
{
	// Synthetic sample: pins both directions — a dead link and a file the index forgot
	const syntheticPaths = ["worldview.md", "worldview/00-core.md", "worldview/01-power.md", "worldview/02-rebirth.md"];
	const syntheticIdx = "| `worldview/00-core.md` | x | y |\n| `worldview/01-power.md` | x | y |\n| `worldview/09-ghost.md` | x | y |\n";
	const synIssues = checkIndexFile("worldview.md", syntheticIdx, syntheticPaths);
	assert(synIssues.some((i) => i.severity === "error" && i.problem.includes("09-ghost")), "synthetic: dead index link is an error");
	assert(synIssues.some((i) => i.problem.includes("02-rebirth")), "synthetic: file missing from the index is reported");

	// Fixture index: self-consistent (every file reported as missing really is absent from the text) and free of dead links
	const idx = readFileSync(join(vaultRoot, "worldview.md"), "utf8");
	const issues = checkIndexFile("worldview.md", idx, allPaths);
	const missing = issues.filter((i) => i.dimension === "index" && i.severity === "warn");
	assert(missing.length === 1, `fixture index forgets exactly one file (${missing.length})`);
	const selfConsistent = missing.every((i) => {
		const f = i.problem.split(": ").pop();
		return f && !idx.includes(f);
	});
	assert(selfConsistent, "fixture index: reported missing entries really are absent from the index text");
	const ghost = issues.filter((i) => i.severity === "error");
	assert(ghost.length === 0, `index has no links to missing files (${ghost.length} errors)`);
}

console.log("\n== 5. Reference integrity (whole vault) ==");
{
	let broken = 0;
	for (const p of allPaths) {
		if (!isInScope(p, ["characters", "events", "skills", "chapters", "principles", "worldview"], ["outline.md", "worldview.md"])) continue;
		const content = readFileSync(join(vaultRoot, p), "utf8");
		const res = checkFile(p, content, allPaths, ctx);
		for (const i of res.issues) {
			if (i.dimension === "reference") {
				broken++;
				console.log(`    · ${p} → ${i.problem} (L${i.line})`);
			}
		}
	}
	assert(broken === 1, `found ${broken} suspicious reference (the fixture plants exactly one)`);
}

console.log("\n== 6. AI report parsing ==");
{
	const ok = parseAiReport(
		JSON.stringify({
			schema: "novel-review/report@1",
			file: "characters/male-lead.md",
			verdict: "warn",
			summary: "broadly consistent",
			issues: [{ severity: "error", problem: "conflicts with a hard rule", line: 12 }],
		}),
	);
	assert(!!ok.report && ok.report.issues[0].severity === "error", "valid report parses");
	assert(!!parseAiReport(JSON.stringify({ verdict: "warn" })).error, "report without file is rejected");
	assert(!!parseAiReport(JSON.stringify({ file: "a.md", verdict: "bad" })).error, "illegal verdict is rejected");
	assert(!!parseAiReport("{oops").error, "broken JSON is rejected");
}

console.log("\n== 7. diff ==");
{
	const rows = diffLines(["a", "b", "c"], ["a", "B", "c", "d"]);
	const st = diffStats(rows);
	assert(st.added === 2 && st.removed === 1, `diff counts +2/-1 (got +${st.added}/-${st.removed})`);
	assert(rows[0].type === "same" && rows[1].type === "del" && rows[2].type === "add", "diff row types are right");
}

console.log("\n== 8. Dev mode: task pairing ==");
{
	assert(stripDatePrefix("2026-09-07-login-api") === "login-api", "date prefix stripped");
	const reqs = [
		{ path: "dev-requirements/2026-09-07-login-api.md", content: "- **Status**: delivered\n- **Source**: chat\n" },
		{ path: "dev-requirements/2026-09-08-export.md", content: "- **Status**: awaiting-build\n" },
	];
	const dels = [
		{ path: "dev-deliveries/2026-09-07-login-api.md", content: "- **Status**: awaiting-review\n- **Delivery date**: 2026-09-07\n" },
	];
	const tasks = matchTasks(reqs, dels);
	assert(tasks.length === 2, `${tasks.length} tasks (2 requirements + 1 delivery merge into 2)`);
	const t1 = tasks.find((x) => x.slug === "login-api");
	assert(!!t1 && t1.reqPath && t1.deliverPath, "login-api: requirement and delivery paired");
	assert(t1?.deliverStatus === "awaiting-review" && t1?.deliverDate === "2026-09-07", "delivery fields parsed");
	const s1 = taskState(t1);
	assert(s1.kind === "wait" && s1.label === "awaiting-review", `login-api state=wait/awaiting-review (got ${s1.kind}/${s1.label})`);
	const t2 = tasks.find((x) => x.slug === "export");
	const s2 = taskState(t2);
	assert(s2.kind === "wait" && s2.label === "awaiting-build", `undelivered task falls back to the requirement status (got ${s2.kind}/${s2.label})`);
	assert(extractFieldValue("- **Delivery date**: 2026-09-07\n", "Delivery date") === "2026-09-07", "field value extracted");
	// Empty fields are normal before delivery: the regex must stay on its line, or it swallows the next one
	// (that bug once made the panel read an awaiting-review doc as delivered)
	const emptyTpl = "## Basics\n- **Status**: awaiting-review\n- **Module**:\n- **Target directory**: lib/features/finance\n- **Raised on**:\n- **Delivery date**:\n\n## Requirement\nX\n";
	assert(extractFieldValue(emptyTpl, "Delivery date") === "", "empty field returns an empty string, does not swallow the next line");
	assert(extractFieldValue(emptyTpl, "Raised on") === "", "empty field does not swallow the following field of the same section");
	assert(extractFieldValue(emptyTpl, "Module") === "" && extractFieldValue(emptyTpl, "Target directory") === "lib/features/finance", "the field after an empty one still reads correctly");
	assert(extractFieldValue("- **Delivery date**:\r\n\r\n## Requirement", "Delivery date") === "", "CRLF: empty field stays on its line too");
	assert(extractFieldValue("- **Status**：awaiting-review\n", "Status") === "awaiting-review", "full-width colon is still read (docs written by the upstream vocabulary)");
	assert(extractFieldValue("  - **Status**: in-development\n", "Status") === "in-development", "indented sub-item still reads");
	assert(extractFieldValue("- **Note**: changed *three* spots\n", "Note") === "changed three spots", "emphasis markers inside the value are stripped");
	assert(extractFieldValue("- **Delivery**: x\n- **Delivery date**: 2026-09-07\n", "Delivery date") === "2026-09-07", "field names that prefix each other do not cross-match");
	assert(extractFieldValue("- **Status**: awaiting-review\n\n## Defect log\n- **Status**: bugfix-open\n", "Status") === "awaiting-review", "same field name twice: the first wins");
	const wroteEmpty = setFieldValue(emptyTpl, "Module", "finance");
	// The templates leave empty fields as "- **Module**:" — writing back must insert the space, or the
	// ASCII colon glues value and field name together ("- **Module**:finance")
	assert(wroteEmpty.includes("- **Module**: finance"), "empty field can be written back");
	assert(setFieldValue("- **Status**：awaiting-review\n", "Status", "approved") === "- **Status**: approved\n", "a full-width colon is normalised to ASCII when written back");
	assert(setFieldValue("- **Module**:\n", "Module", "a$&b") === "- **Module**: a$&b\n", "a $ in the value is written verbatim, not as a replacement pattern");
	assert(setFieldValue("- **Module**: finance\n", "Module", "") === "- **Module**:\n", "clearing a field leaves no trailing space");
	assert(wroteEmpty.includes("- **Target directory**: lib/features/finance"), "writing an empty field does not swallow the next line");
	const wroteTail = setFieldValue(emptyTpl, "Delivery date", "2026-09-10");
	assert(wroteTail.includes("- **Delivery date**: 2026-09-10") && wroteTail.includes("## Requirement"), "writing the last empty field keeps the blank line and the heading");
	assert(setFieldValue(emptyTpl, "Status", "approved").includes("- **Status**: approved"), "a field that already has a value is rewritten");
	const nested = matchTasks(
		[{ path: "lib/features/finance/dev-requirements/2026-09-07-topup.md", content: "- **Status**: awaiting-review\n" }],
		[],
	);
	assert(nested.length === 1 && nested[0].slug === "topup" && nested[0].reqPath?.includes("finance/dev-requirements"), "requirements under a feature folder pair up too");
	assert(taskState({ slug: "a", reqStatus: "adjusting" }).kind === "wait", "requirement adjusting=wait");
	assert(taskState({ slug: "a", reqStatus: "approved" }).kind === "ready", "requirement approved=ready to start");
	assert(isUnderNamedFolder("lib/features/finance/dev-requirements/a.md", "docs/dev-requirements") === true, "nested requirements recognised by folder name");
	assert(targetFolderOf("lib/features/finance/dev-requirements/a.md", "dev-requirements") === "lib/features/finance", "target folder = feature folder");
	assert(setFieldValue("- **Status**: awaiting-review\n", "Status", "approved").includes("approved"), "status field can be written back");
	assert(upsertSupplementSection("# t\n", "add a countdown", "2026-09-07").includes("## Supplementary requirements"), "adjustment note goes into the supplementary requirements section");
	assert(upsertBugSection("# t\n", "countdown never returns", "2026-09-07").includes("## Defect log"), "a bug found after completion goes into the defect log of the original doc");
	assert(isBugFixReqStatus("completed") && isBugFixReqStatus("bugfix-open"), "completed/bugfix-open count as bug fixing");
	assert(!isBugFixReqStatus("awaiting-review") && !isBugFixReqStatus("approved"), "the requirement stage is not bug fixing");
	assert(shouldUseProjectDocsLayout(["pubspec.yaml", "lib", "docs"]) === true, "a Flutter repo uses the project docs layout");
	assert(shouldUseProjectDocsLayout(["characters", "chapters", "package.json"]) === false, "a novel vault keeps its paths even with a package.json");
	assert(isNovelDefaultDevFolders("dev-requirements", "dev-deliveries") === true, "novel-vault default folder names recognised");
	assert(isNovelDefaultDevFolders("docs/dev-requirements", "docs/dev-deliveries") === false, "project docs folders are not the novel defaults");
}

console.log("\n== 8d. Defect counts (regression list against repeats) ==");
{
	assert(JSON.stringify(countBugEntries("# t\n")) === '{"total":0,"pending":0}', "no defect log section = 0/0");
	assert(JSON.stringify(countBugEntries("# t\n\n## Defect log\n")) === '{"total":0,"pending":0}', "empty defect log section = 0/0");
	const fresh = upsertBugSection("# t\n", "countdown never returns", "2026-09-07");
	assert(JSON.stringify(countBugEntries(fresh)) === '{"total":1,"pending":1}', "a freshly logged defect (Fix empty) = 1 pending");
	const fixed = fresh.replace("- **Fix**:", "- **Fix**: back to the amount page\n- **Root cause**: the timer callback never navigated");
	assert(JSON.stringify(countBugEntries(fixed)) === '{"total":1,"pending":0}', "Fix filled in = fixed");
	const two = upsertBugSection(fixed, "amount shows the old value", "2026-09-08");
	assert(JSON.stringify(countBugEntries(two)) === '{"total":2,"pending":1}', "after the second entry = 2 total, 1 pending");
	const endScoped = "# t\n\n## Defect log\n\n### 2026-09-07\n- a\n- **Fix**: x\n\n## Review notes\n- none\n";
	assert(JSON.stringify(countBugEntries(endScoped)) === '{"total":1,"pending":0}', "counting stops at the next section");
	const tasks = collectDevTasks(
		[{ path: "docs/dev-docs/finance/2026-09-07-topup.md", content: "- **Status**: bugfix-open\n" + two }],
		[],
		[],
		"dev-docs",
	);
	assert(tasks[0].bugTotal === 2 && tasks[0].bugPending === 1, "unified doc task carries the defect counts (2 total / 1 pending)");
	// "Fix"/"Landed" empty but more text below the entry: \s used to match across the line break
	// (→ the panel lost defects and treated changes as landed)
	const trailingNote = "# t\n\n## Defect log\n\n### 2026-09-07 15:00\n- one string was missed\n- **Fix**:\n- note: the author explained it but has not fixed it\n";
	assert(JSON.stringify(countBugEntries(trailingNote)) === '{"total":1,"pending":1}', "Fix empty with text below = still pending");
	const trailingFixed = trailingNote.replace("- **Fix**:", "- **Fix**: back to the amount page");
	assert(JSON.stringify(countBugEntries(trailingFixed)) === '{"total":1,"pending":0}', "Fix filled in = fixed (text below does not matter)");
	const pendingNote = "# t\n\n## Requirement changes\n\n### 2026-09-07 15:00\n- reword it\n- **Landed**:\n- note: not in the code yet\n";
	assert(hasPendingChange(pendingNote) === true, "Landed empty with text below = change not landed");
	assert(hasPendingChange(pendingNote.replace("- **Landed**:", "- **Landed**: done")) === false, "Landed filled in = change landed");
}

console.log("\n== 8b. Review scope in nested folders ==");
{
	assert(matchingFolderPrefix("lib/features/finance/dev-requirements/a.md", ["docs/dev-requirements", "docs/dev-deliveries"]) === "docs/dev-requirements", "dev-requirements under a feature matched by folder name");
	assert(isInScope("lib/features/finance/dev-requirements/2026-09-07-topup.md", ["dev-requirements", "dev-deliveries"], []) === true, "nested requirement file is in review scope");
	assert(isInScope("docs/dev-requirements/requirements-template.md", ["docs/dev-requirements"], []) === false, "template files are still skipped");
	assert(isInScope("lib/main.dart.md", ["docs/dev-requirements"], []) === false, "code folders are out of scope");
	assert(isTemplateLike("docs/dev-docs/finance/_module.md") === true, "a module card is not a review object");
	assert(isInScope("docs/dev-docs/finance/_module.md", ["dev-docs"], []) === false, "module card out of scope");
	assert(isInScope("docs/dev-docs/finance/2026-09-07-topup.md", ["dev-docs", "dev-requirements"], []) === true, "unified dev doc is in scope");
	assert(matchingFolderPrefix("docs/dev-docs/finance/a.md", ["dev-docs"]) === "dev-docs", "dev-docs matched by folder name");
	assert(targetFolderOf("docs/dev-docs/finance/a.md", "dev-docs") === "docs/dev-docs/finance", "under docs/ the module subfolder wins");
	assert(isInScope("docs/dev-docs/finance/2026-09-07-topup.md", ["docs/dev-docs"], []) === true, "the docs/dev-docs prefix is in scope as well");
}

console.log("\n== 8c. Unified dev docs ==");
{
	const docs = [
		{
			path: "docs/dev-docs/finance/2026-09-07-topup.md",
			content: "- **Status**: awaiting-review\n- **Target directory**: lib/features/finance\n",
		},
		{
			path: "docs/dev-docs/finance/_module.md",
			content: "# Module: finance\n",
		},
	];
	const legacy = collectDevTasks(
		docs,
		[{ path: "lib/features/auth/dev-requirements/2026-09-01-login.md", content: "- **Status**: approved\n" }],
		[{ path: "lib/features/auth/dev-deliveries/2026-09-01-login.md", content: "- **Status**: delivered\n- **Delivery date**: 2026-09-01\n" }],
		"dev-docs",
	);
	assert(legacy.length === 2, `unified + legacy tasks: ${legacy.length}`);
	const pay = legacy.find((x) => x.slug === "topup");
	assert(!!pay && pay.unified === true && pay.reqPath?.includes("docs/dev-docs/finance"), "topup runs through the unified dev doc");
	assert(pay?.targetFolder === "docs/dev-docs/finance", "panel groups by the docs module folder");
	assert(pay?.codeTarget === "lib/features/finance", "target directory still points at the code");
	assert(taskState(pay).kind === "wait" && taskState(pay).label === "awaiting-review", "unified doc awaiting-review=wait");
	assert(taskState({ slug: "a", reqStatus: "delivered" }).kind === "wait", "unified doc delivered=wait for the delivery review");
	assert(taskState({ slug: "a", reqStatus: "completed" }).kind === "final", "unified doc completed=final");
	assert(taskState({ slug: "a", reqStatus: "closed" }).kind === "final", "unified doc closed=final");
	assert(taskState({ slug: "a", reqStatus: "in-development" }).kind === "active", "unified doc in-development=active");
	assert(taskState({ slug: "a", reqStatus: "change-open" }).kind === "wait", "change-open=wait");
	// Upstream had two statuses here (调整 / 调整中); the fork merged both into "adjusting"
	assert(taskState({ slug: "a", reqStatus: "adjusting" }).kind === "wait", "adjusting=wait for the doc rewrite");
	assert(taskState({ slug: "a", reqStatus: "bugfix-open" }).kind === "active", "logged bug: bugfix-open=active, not a final state");
	assert(nextApproveStatus("awaiting-review") === "approved", "awaiting-review + Approve = approved");
	assert(nextApproveStatus("in-development") === "closed", "in-development + Close = closed");
	assert(nextApproveStatus("delivered") === "closed", "delivered + Close = closed");
	assert(nextApproveStatus("change-open") === "closed", "change-open + Close = closed");
	assert(nextApproveStatus("adjusting", true) === "change-open", "adjusting after code + Finalize = change-open (hasPendingChange counts as code phase)");
	assert(nextApproveStatus("approved") === "approved", "approving an approved requirement again stays approved");
	assert(isApprovedReqStatus("approved") && !isApprovedReqStatus("closed") && !isApprovedReqStatus("in-development"), "only approved may start");
	assert(!canRecordRequirementChange("awaiting-review") && !canRecordRequirementChange("adjusting") && !canRecordRequirementChange("approved"), "the requirement stage (approved included) uses Adjust, not Change req");
	assert(canRecordRequirementChange("in-development") && canRecordRequirementChange("delivered") && canRecordRequirementChange("closed") && canRecordRequirementChange("change-open"), "requirement changes only once code exists (they land in code)");
	{
		const pending = devAuthorActions("awaiting-review");
		assert(pending.approve === "pass" && pending.adjust && !pending.bug && !pending.change, "awaiting-review: Approve + Adjust, no Bug, no Change req");
		const settling = devAuthorActions("adjusting", true);
		assert(settling.approve === "settle" && settling.bug && settling.change && !settling.adjust, "adjusting after code: Finalize + Bug + Change req, no direct Close");
		const reqAdjusting = devAuthorActions("adjusting");
		assert(reqAdjusting.approve === "pass" && reqAdjusting.adjust && !reqAdjusting.bug && !reqAdjusting.change, "adjusting during requirements: Approve + Adjust");
		const approved = devAuthorActions("approved");
		assert(approved.approve === "pass" && approved.adjust && !approved.bug && !approved.change, "approved: Approve + Adjust (requirement edits regenerate the doc via Adjust)");
		const delivered = devAuthorActions("delivered");
		assert(delivered.approve === "done" && delivered.bug && delivered.change && !delivered.adjust, "delivered: Close + Bug + Change req (Adjust is requirement-stage only)");
		const closed = devAuthorActions("closed");
		assert(closed.approve === "done" && closed.bug && closed.change && !closed.adjust, "after closing, bugs and requirement changes are still possible (they land)");
		const developing = devAuthorActions("in-development");
		assert(developing.approve === "done" && developing.bug && developing.change && !developing.adjust, "in-development allows bugs and requirement changes");
		assert(canRecordBug("delivered") && canRecordBug("closed") && !canRecordBug("awaiting-review") && !canRecordBug("approved"), "the Bug button only appears once work started");
		assert(canRecordBug("adjusting", true) && !canRecordBug("adjusting"), "after delivery, a doc set back to adjusting still accepts bugs");
	}
	assert(upsertChangeSection("# t\n", "only three quick amounts", "2026-09-07").includes("## Requirement changes"), "requirement change written into the original doc");
	{
		const fresh = upsertChangeSection("# t\n", "only three quick amounts", "2026-09-07");
		assert(hasPendingChange(fresh), "a freshly logged change (Landed empty) = not landed");
		const landed = fresh.replace("- **Landed**:", "- **Landed**: amount page now shows three steps");
		assert(!hasPendingChange(landed), "Landed filled in = landed");
		assert(!hasPendingChange("# t\n\n## Requirement changes\n\n## Defect log\n"), "an empty requirement changes section is not pending");
		assert(!hasPendingChange("# t\n"), "no requirement changes section is not pending");
		const twoPending = upsertChangeSection(fresh, "add a 2000 step", "2026-09-08 09:30");
		assert(hasPendingChange(twoPending), "a second unlanded change keeps the doc adjusting");
	}
	{
		assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(nowStamp(new Date(2026, 8, 8, 9, 5))), "entry timestamps are minute-precise");
		assert(nowStamp(new Date(2026, 8, 8, 9, 5)) === "2026-09-08 09:05", "minutes are zero-padded");
		assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStamp(new Date(2026, 8, 8))), "day stamp is ISO");
		// upsert inserts right after the heading → newest entry first inside the section
		const base = "# Dev doc\n\n## Requirement changes\n\n### 2026-09-08 09:30\n- new change\n- **Landed**:\n\n### 2026-09-07 10:00\n- old change\n- **Landed**:\n\n## Defect log\n";
		const r1 = removeLatestSectionEntry(base, "## Requirement changes");
		assert(r1.removed.includes("2026-09-08 09:30") && r1.removed.includes("new change"), "undo removes the newest entry (the first one after the heading)");
		assert(r1.content.includes("2026-09-07 10:00") && !r1.content.includes("new change"), "the older entry stays, the new one is gone");
		assert(r1.content.includes("## Defect log"), "following sections are untouched");
		const r2 = removeLatestSectionEntry(r1.content, "## Requirement changes");
		assert(r2.removed.includes("2026-09-07 10:00"), "undoing again reaches the earlier entry");
		const r3 = removeLatestSectionEntry(r2.content, "## Requirement changes");
		assert(!r3.removed, "nothing changes when the section has no entries");
		// A new entry under the heading pushes the archive pointer behind it: undo removes only the entry
		const withPointer = "# t\n\n## Requirement changes\n\n### 2026-09-09 09:00\n- new change\n- **Landed**:\n\n> Completed entries archived: [[x-archive]]\n\n## Defect log\n";
		const r5 = removeLatestSectionEntry(withPointer, "## Requirement changes");
		assert(r5.removed.includes("2026-09-09 09:00") && !r5.removed.includes("Completed entries archived"), "undo removes the entry without swallowing the archive pointer line");
		assert(r5.content.includes("> Completed entries archived: [[x-archive]]"), "the pointer line stays inside the section");
		const r6 = removeLatestSectionEntry(r5.content, "## Requirement changes");
		assert(!r6.removed && r6.content.includes("> Completed entries archived: [[x-archive]]"), "with only the pointer left, undo changes nothing");
		const supp = "# t\n\n## Supplementary requirements\n- (2026-09-08 10:00) new wish\n- (2026-09-07 09:00) old wish\n";
		const r4 = removeLatestSectionEntry(supp, "## Supplementary requirements");
		assert(r4.removed.includes("2026-09-08 10:00") && r4.content.includes("old wish"), "supplementary requirements: undo removes the newest line");
	}
	assert(!legacy.some((x) => x.slug === "_module" || x.slug === "module"), "module cards never become tasks");
	const login = legacy.find((x) => x.slug === "login");
	assert(!!login && !login.unified && login.deliverPath?.includes("dev-deliveries"), "unmerged legacy requirement/delivery pairs still pair");
}

console.log("\n== 9. Simulated review result (full rule check over the fixture vault) ==");
const scanFolders = ["characters", "events", "skills", "chapters", "principles", "worldview"];
const scanRoot = ["outline.md", "worldview.md"];
const counts = { pass: 0, warn: 0, fail: 0 };
const perFile = [];
for (const p of allPaths) {
	if (!isInScope(p, scanFolders, scanRoot)) continue;
	const content = readFileSync(join(vaultRoot, p), "utf8");
	const res = checkFile(p, content, allPaths, ctx, p === "worldview.md");
	counts[res.status] = (counts[res.status] ?? 0) + 1;
	perFile.push(res);
}
perFile.sort((a, b) => ({ fail: 0, warn: 1, pass: 2 })[a.status] - ({ fail: 0, warn: 1, pass: 2 })[b.status] || a.path.localeCompare(b.path));
for (const r of perFile) {
	const icon = r.status === "pass" ? "✅" : r.status === "warn" ? "⚠️" : "❌";
	console.log(`  ${icon} ${r.path} (${r.issues.length} issues)`);
}
console.log(`\n  summary: pass ${counts.pass} / needs work ${counts.warn} / failed ${counts.fail ?? 0}`);
assert(perFile.length > 30, `${perFile.length} files reviewed (>30)`);
assert(counts.pass > 0 && counts.warn > 0, `fixture produces both clean and flagged files (${counts.pass} pass / ${counts.warn} warn)`);

console.log("\n== 10. Store: verdicts, history vocabulary, Issues-only filter ==");
{
	const store = new ReviewStore(null);
	store.applyRuleResult("a.md", "warn", [{ id: "x", source: "rule", dimension: "draft", severity: "warn", problem: "p" }]);
	// The action strings land in data.json, so they are stored values, not UI text
	assert(store.data.files["a.md"].history.at(-1).action === "rule-check", 'rule check logs "rule-check"');
	store.applyAiReport("a.md", "pass", [], "fine", "hash-1", 1);
	assert(store.data.files["a.md"].history.at(-1).action === "ai-report-imported", 'report import logs "ai-report-imported"');
	store.applyUserVerdict("a.md", "pass");
	assert(store.data.files["a.md"].history.at(-1).action === "user-approved", 'Approve logs "user-approved"');
	assert(effectiveStatus(store.data.files["a.md"]).origin === "user", "a user verdict outranks rule and AI verdicts");
	store.applyUserVerdict("a.md", undefined, undefined, "superseded by a newer AI report");
	const cleared = store.data.files["a.md"].history.at(-1);
	assert(cleared.action === "user-verdict-cleared" && cleared.detail === "superseded by a newer AI report", 'clearing logs "user-verdict-cleared" with its reason');
	store.applyUserVerdict("a.md", "fail", "unify the age");
	assert(store.data.files["a.md"].history.at(-1).action === "user-adjustment-requested", 'Adjust logs "user-adjustment-requested"');
	assert(store.data.files["a.md"].userNote === "unify the age", "the adjust note is kept (it feeds the fix prompt)");
	store.applyFixApplied("a.md");
	const fr = store.data.files["a.md"];
	assert(fr.history.at(-1).action === "proposal-applied", 'applying a proposal logs "proposal-applied"');
	assert(fr.fixedCount === 1 && fr.ruleStatus === "unchecked" && fr.userVerdict === undefined, "after the replacement: round counted, status reset, verdict cleared");

	// Behaviour change 2 of the fork: a proposal keeps the file listed under "Issues only"
	const passed = { path: "p.md", ruleStatus: "pass", ruleIssues: [], aiIssues: [], fixedCount: 0, history: [], userVerdict: "pass" };
	assert(needsAttention(passed, false) === false, "a passing file without a proposal is hidden under Issues only");
	assert(needsAttention(passed, true) === true, "a passing file with a proposal stays visible under Issues only");
	assert(needsAttention({ ...passed, userVerdict: undefined, ruleStatus: "warn" }, false) === true, "a warning file stays visible");
	assert(needsAttention(undefined, false) === true, "an unchecked file stays visible");

	const sorted = store.sortedPaths(["b.md", "a.md"]);
	assert(sorted[0] === "a.md" && sorted[1] === "b.md", "sorting by path needs no locale");
}

console.log(failed === 0 ? "\nall assertions passed ✅" : `\n${failed} assertions failed ❌`);
process.exit(failed === 0 ? 0 : 1);
