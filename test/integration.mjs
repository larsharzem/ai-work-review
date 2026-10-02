/**
 * Integration test: stubs the obsidian module, loads the built main.js and runs
 * onload → import AI report → rule check → apply proposal → author adjust
 * against a generated fixture vault in a temp directory (see fixture-vault.mjs).
 *
 * It used to run against a real vault and wiped its `.ai-review` folder on teardown; the fixture
 * keeps real notes out of reach. The temp vault is removed when the process exits.
 */
import Module from "node:module";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixtureVault } from "./fixture-vault.mjs";
import { needsAttention } from "../.test/store.mjs";

const pluginDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = createFixtureVault();
const vaultRoot = fixture.root;
process.on("exit", () => fixture.cleanup());

// ---- obsidian stub ----
const notices = [];
class Notice {
	constructor(msg) {
		notices.push(String(msg));
	}
}
class TFile {}
class Plugin {
	constructor(app, manifest) {
		this.app = app;
		this.manifest = manifest;
		this._data = {};
		this.commands = [];
	}
	addRibbonIcon() {}
	addCommand(cmd) {
		this.commands.push(cmd);
	}
	addSettingTab() {}
	registerView() {}
	registerEvent() {}
	registerInterval() {
		return 0;
	}
	async loadData() {
		return this._data;
	}
	async saveData(d) {
		this._data = JSON.parse(JSON.stringify(d));
	}
}
class ItemView {}
class MarkdownView {}
class Modal {}
class PluginSettingTab {}
class Setting {
	setName() {
		return this;
	}
	setDesc() {
		return this;
	}
	setHeading() {
		return this;
	}
	addText() {
		return this;
	}
	addToggle() {
		return this;
	}
	addButton() {
		return this;
	}
}
const normalizePath = (p) => p;
const getLanguage = () => "en";
const obsidianStub = { Notice, TFile, Plugin, ItemView, MarkdownView, Modal, PluginSettingTab, Setting, normalizePath, getLanguage };

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === "obsidian") return obsidianStub;
	return origLoad.apply(this, arguments);
};

// ---- fake app / vault / adapter (real file system, temp vault) ----
const abs = (rel) => path.join(vaultRoot, rel);
function walkMd(dir, base, out = []) {
	for (const name of fs.readdirSync(dir)) {
		if (name.startsWith(".")) continue;
		const p = path.join(dir, name);
		const st = fs.statSync(p);
		if (st.isDirectory()) walkMd(p, base, out);
		else if (name.endsWith(".md")) out.push(path.relative(base, p).split(path.sep).join("/"));
	}
	return out;
}
const fakeAdapter = {
	async exists(rel) {
		return fs.existsSync(abs(rel));
	},
	async read(rel) {
		return fs.readFileSync(abs(rel), "utf8");
	},
	async write(rel, data) {
		fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
		fs.writeFileSync(abs(rel), data);
	},
	async remove(rel) {
		fs.rmSync(abs(rel), { recursive: true, force: true });
	},
	async mkdir(rel) {
		fs.mkdirSync(abs(rel), { recursive: true });
	},
	async list(rel) {
		const d = abs(rel);
		if (!fs.existsSync(d)) return { files: [], folders: [] };
		const files = [];
		const folders = [];
		for (const name of fs.readdirSync(d)) {
			const relChild = `${rel}/${name}`;
			if (fs.statSync(path.join(d, name)).isDirectory()) folders.push(relChild);
			else files.push(relChild);
		}
		return { files, folders };
	},
};
const fakeVault = {
	getMarkdownFiles() {
		return walkMd(vaultRoot, vaultRoot).map((p) => Object.assign(new TFile(), { path: p }));
	},
	async cachedRead(f) {
		return fs.readFileSync(abs(f.path), "utf8");
	},
	getAbstractFileByPath(rel) {
		const p = abs(rel);
		return fs.existsSync(p) && fs.statSync(p).isFile() ? Object.assign(new TFile(), { path: rel }) : null;
	},
	async process(file, fn) {
		const p = abs(file.path);
		fs.writeFileSync(p, fn(fs.readFileSync(p, "utf8")));
	},
	adapter: fakeAdapter,
};
const fakeWorkspace = {
	on: () => () => {},
	onLayoutReady: (cb) => cb(),
	getLeavesOfType: () => [],
	getRightLeaf: () => ({ setViewState: async () => {} }),
	revealLeaf: () => {},
	openLinkText: async () => {},
	getActiveViewOfType: () => null,
};
const fakeApp = { vault: fakeVault, workspace: fakeWorkspace };
globalThis.window = { setInterval: () => 0 };

// ---- fixtures ----
const TEST_MD = "characters/__nr_test.md";
const TEST_ORIG = "# Test character\n\n## Core identity\n- **Name**: Tester (TODO)\n- **Role**: extra\n";
const TEST_FIXED = "# Test character (AI proposal)\n\n## Core identity\n- **Name**: Tester, renamed\n- **Role**: protagonist\n";
const report = (summary) =>
	JSON.stringify({
		schema: "novel-review/report@1",
		file: TEST_MD,
		reviewer: "zcode-test",
		timestamp: new Date().toISOString(),
		verdict: "warn",
		summary,
		issues: [{ severity: "warn", dimension: "consistency", section: "Core identity", line: 4, problem: "test problem", suggestion: "test suggestion" }],
	});
const REPORT_PATH = ".ai-review/reports/characters/__nr_test.md.json";
const PROPOSAL_PATH = ".ai-review/proposals/characters/__nr_test.md";
const ADJUSTMENT_PATH = ".ai-review/adjustments/characters/__nr_test.md.json";

let failed = 0;
const assert = (cond, msg) => {
	if (cond) console.log(`  ✓ ${msg}`);
	else {
		failed++;
		console.error(`  ✗ ${msg}`);
	}
};

// fixtures in place
fs.writeFileSync(abs(TEST_MD), TEST_ORIG);
fs.mkdirSync(abs(".ai-review/reports/characters"), { recursive: true });
fs.mkdirSync(abs(".ai-review/proposals/characters"), { recursive: true });
fs.writeFileSync(abs(REPORT_PATH), report("integration test report"));
fs.writeFileSync(abs(PROPOSAL_PATH), TEST_FIXED);

console.log("== integration: plugin load and auto import ==");
const require = createRequire(import.meta.url);
const AiWorkReviewPlugin = require(path.join(pluginDir, "main.js")).default;
const plugin = new AiWorkReviewPlugin(fakeApp, { id: "ai-work-review", name: "AI Work Review" });
await plugin.onload();
await new Promise((r) => setTimeout(r, 500)); // wait for the async ingest inside onLayoutReady
assert(plugin.commands.length >= 4, `${plugin.commands.length} commands registered (>=4)`);

const fr = plugin.store.data.files[TEST_MD];
assert(!!fr && fr.aiVerdict === "warn", "AI report imported automatically (verdict=warn)");
assert(plugin.proposals.has(TEST_MD), "proposal registered");
const archived = fs.readdirSync(abs(".ai-review/archive"));
assert(archived.length >= 1, "report archived after import");
assert(!fs.existsSync(abs(REPORT_PATH)), "no source report left behind in reports/");

console.log("== integration: rule check over the whole vault ==");
await plugin.runRuleCheck();
const checkedCount = Object.keys(plugin.store.data.files).length;
assert(checkedCount > 30, `rule check covered ${checkedCount} files (>30)`);
const idxIssues = plugin.store.data.files["worldview.md"].ruleIssues.filter((i) => i.dimension === "index");
assert(idxIssues.length === 1, "worldview.md index check reports the one file the fixture index forgets");
const testFr = plugin.store.data.files[TEST_MD];
assert(testFr.ruleStatus === "warn" && testFr.ruleIssues.some((i) => i.dimension === "draft"), "test file checks as warn (draft marker)");

console.log("== integration: a newer report supersedes an Approve ==");
{
	// Fork behaviour 1: without this, an Approve would hide every later report (and its proposal)
	// under "Issues only" for good — and the routines would have to patch data.json from outside.
	plugin.store.applyUserVerdict(TEST_MD, "pass");
	fs.writeFileSync(abs(REPORT_PATH), report("second pass, still warn"));
	await plugin.ingestBridge(false);
	const after = plugin.store.data.files[TEST_MD];
	assert(after.userVerdict === undefined, "Approve is cleared by the newer report");
	assert(after.history.at(-2).action === "user-verdict-cleared" && after.history.at(-2).detail === "superseded by a newer AI report", "the clearing is logged with its reason");
	assert(after.aiVerdict === "warn" && after.aiSummary === "second pass, still warn", "the newer report is the one that counts");

	// An Adjust verdict must survive: its note feeds the fix prompt
	await plugin.applyUserAdjustment(TEST_MD, "keep the old name");
	fs.writeFileSync(abs(REPORT_PATH), report("third pass"));
	await plugin.ingestBridge(false);
	const kept = plugin.store.data.files[TEST_MD];
	assert(kept.userVerdict === "fail" && kept.userNote === "keep the old name", "an Adjust verdict and its note survive a newer report");
	await plugin.clearUserVerdict(TEST_MD);
}

console.log("== integration: a proposal keeps a passing file visible ==");
{
	plugin.store.applyUserVerdict(TEST_MD, "pass");
	assert(plugin.proposals.has(TEST_MD) && needsAttention(plugin.store.data.files[TEST_MD], true) === true, "fork behaviour 2: pass + proposal stays in the Issues-only list");
	assert(needsAttention(plugin.store.data.files[TEST_MD], false) === false, "pass without a proposal is filtered out");
	await plugin.clearUserVerdict(TEST_MD);
}

console.log("== integration: an adjustment note the AI has worked in ==");
{
	// The routines take the JSON out of adjustments/ when they have worked the note in (moved to
	// adjustments-consumed/ or deleted) and never touch the plugin's data — so the import run has
	// to notice the absence itself, otherwise the file keeps its "Adjust" verdict and stale note.
	await plugin.applyUserAdjustment(TEST_MD, "write the open task as next step");
	assert(fs.existsSync(abs(ADJUSTMENT_PATH)), "the note is in adjustments/ for the AI");
	await plugin.ingestBridge(false);
	const pending = plugin.store.data.files[TEST_MD];
	assert(pending.userVerdict === "fail" && pending.userNote === "write the open task as next step", "while the JSON is there, verdict and note stay");

	fs.mkdirSync(abs(".ai-review/adjustments-consumed/characters"), { recursive: true });
	fs.renameSync(abs(ADJUSTMENT_PATH), abs(".ai-review/adjustments-consumed/characters/__nr_test.md.done.json"));
	await plugin.ingestBridge(false);
	const done = plugin.store.data.files[TEST_MD];
	assert(done.userVerdict === undefined && done.userNote === undefined, "the consumed note clears verdict and note");
	assert(done.history.at(-1).action === "user-verdict-cleared" && done.history.at(-1).detail === "adjustment note worked in by the AI", "the clearing is logged with its reason");
	await plugin.ingestBridge(false);
	assert(done.history.at(-1).detail === "adjustment note worked in by the AI" && done.history.filter((h) => h.detail === "adjustment note worked in by the AI").length === 1, "the next run leaves it alone (one entry, not one per poll)");
}

console.log("== integration: apply the proposal ==");
const applied = await plugin.applyProposal(TEST_MD);
assert(applied === true, "applyProposal reports success");
assert(fs.readFileSync(abs(TEST_MD), "utf8") === TEST_FIXED, "file content replaced by the proposal");
const fr2 = plugin.store.data.files[TEST_MD];
assert(fr2.fixedCount === 1 && fr2.ruleStatus === "unchecked", "fix round counted, status reset to unchecked");
assert(!plugin.proposals.has(TEST_MD), "proposal removed from the list");

console.log("== integration: author adjustment (reject + note) ==");
await plugin.applyUserAdjustment(TEST_MD, "put the protagonist back, age stays fourteen");
assert(fs.existsSync(abs(ADJUSTMENT_PATH)), "adjustment note written to the bridge folder adjustments/");
const savedNote = JSON.parse(fs.readFileSync(abs(ADJUSTMENT_PATH), "utf8"));
assert(savedNote.note === "put the protagonist back, age stays fourteen" && savedNote.file === TEST_MD, "adjustment JSON holds the right content");
const frAdj = plugin.store.data.files[TEST_MD];
assert(frAdj.userVerdict === "fail" && frAdj.userNote === "put the protagonist back, age stays fourteen", "user verdict and note recorded");

// New proposal arrives → import → apply → the adjustment note must be cleared with it
fs.writeFileSync(abs(PROPOSAL_PATH), TEST_FIXED);
await plugin.ingestBridge(false);
assert(plugin.proposals.has(TEST_MD), "new proposal registered");
await plugin.applyProposal(TEST_MD);
assert(!fs.existsSync(abs(ADJUSTMENT_PATH)), "applying the proposal clears the adjustment note");
const frAfter = plugin.store.data.files[TEST_MD];
assert(frAfter.userVerdict === undefined && frAfter.fixedCount === 2, "verdict cleared after the replacement, fix rounds add up (2nd)");

await plugin.clearUserVerdict(TEST_MD);
assert(plugin.store.data.files[TEST_MD].userVerdict === undefined, "clearing the user verdict works");

console.log("== teardown ==");
fs.rmSync(abs(TEST_MD), { force: true });
fs.rmSync(abs(".ai-review"), { recursive: true, force: true });
assert(!fs.existsSync(abs(TEST_MD)) && !fs.existsSync(abs(".ai-review")), "temp file and bridge folder removed");
assert(!fs.existsSync(abs(".obsidian/plugins/ai-work-review/data.json")), "plugin data stayed in memory (vault not polluted)");

console.log(failed === 0 ? "\nintegration test passed ✅" : `\n${failed} assertions failed ❌`);
process.exit(failed === 0 ? 0 : 1);
