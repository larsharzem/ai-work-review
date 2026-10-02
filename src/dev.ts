/**
 * Dev mode: scans the unified "dev-docs" folder and still pairs the legacy dev-requirements/ + dev-deliveries/ layout.
 * Pure functions, testable without Obsidian.
 *
 * Vocabulary written into the docs (field "Status" and section headings) is defined here once:
 *   statuses  awaiting-review · awaiting-build · adjusting · approved · in-development · delivered · revising ·
 *             closed · completed · change-open · bugfix-open
 *   sections  ## Supplementary requirements · ## Defect log · ## Requirement changes
 *   fields    Status · Delivery date · Target directory · Fix · Landed
 */

import { isTemplateLike } from "./rules";

export const STATUS_FIELD = "Status";
export const DELIVERY_DATE_FIELD = "Delivery date";
export const TARGET_DIR_FIELD = "Target directory";
export const FIX_FIELD = "Fix";
export const LANDED_FIELD = "Landed";

export const ST_AWAITING_REVIEW = "awaiting-review";
export const ST_AWAITING_BUILD = "awaiting-build";
export const ST_ADJUSTING = "adjusting";
export const ST_APPROVED = "approved";
export const ST_IN_DEVELOPMENT = "in-development";
export const ST_DELIVERED = "delivered";
export const ST_REVISING = "revising";
export const ST_CLOSED = "closed";
export const ST_COMPLETED = "completed";
export const ST_CHANGE_OPEN = "change-open";
export const ST_BUGFIX_OPEN = "bugfix-open";

export interface DevFileRef {
	path: string;
	content: string;
}

export interface DevTask {
	slug: string;
	reqPath?: string;
	reqStatus?: string;
	deliverPath?: string;
	deliverStatus?: string;
	deliverDate?: string;
	targetFolder?: string;
	/** "Target directory" from the doc: the code path to change */
	codeTarget?: string;
	unified?: boolean;
	/** "Requirement changes" still has entries without "Landed": the doc is in its code phase (adjusting → change-open) */
	pendingChange?: boolean;
	/** "Defect log" entries (unified doc): total = all, pending = without "Fix". Fixed entries feed the module regression list */
	bugTotal?: number;
	bugPending?: number;
}

export type TaskKind = "final" | "wait" | "ready" | "active" | "none";

/** "2026-09-07-login-api.md" → "login-api" */
export function stripDatePrefix(base: string): string {
	return base
		.replace(/^\d{4}-\d{2}-\d{2}-/, "")
		.replace(/\.md$/i, "");
}

function escapeRe(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Reads the value of "- **Field**: value". Single-line match: an empty field returns "" and never swallows the next line */
export function extractFieldValue(content: string, field: string): string | undefined {
	const re = new RegExp(`^[ \\t]*[-*][ \\t]*\\*\\*${escapeRe(field)}\\*\\*[ \\t]*[:：][ \\t]*([^\\r\\n]*?)[ \\t]*$`, "m");
	const m = content.match(re);
	return m ? m[1].replace(/[*_`]/g, "").trim() : undefined;
}

/** Pairs files of both folders by task name; task name = file name without the date prefix */
export function matchTasks(reqs: DevFileRef[], dels: DevFileRef[]): DevTask[] {
	const map = new Map<string, DevTask>();
	for (const r of reqs) {
		const slug = stripDatePrefix(r.path.split("/").pop() ?? r.path);
		if (!slug || isTemplateLike(r.path)) continue;
		const t: DevTask = map.get(slug) ?? { slug };
		t.reqPath = r.path;
		t.reqStatus = extractFieldValue(r.content, STATUS_FIELD);
		map.set(slug, t);
	}
	for (const d of dels) {
		const slug = stripDatePrefix(d.path.split("/").pop() ?? d.path);
		if (!slug || isTemplateLike(d.path)) continue;
		const t: DevTask = map.get(slug) ?? { slug };
		t.deliverPath = d.path;
		t.deliverStatus = extractFieldValue(d.content, STATUS_FIELD);
		t.deliverDate = extractFieldValue(d.content, DELIVERY_DATE_FIELD);
		map.set(slug, t);
	}
	return [...map.values()];
}

/** Unified dev docs + legacy requirement/delivery pairs */
export function collectDevTasks(docs: DevFileRef[], reqs: DevFileRef[], dels: DevFileRef[], docFolder: string): DevTask[] {
	const map = new Map<string, DevTask>();
	for (const d of docs) {
		const slug = stripDatePrefix(d.path.split("/").pop() ?? d.path);
		if (!slug || isTemplateLike(d.path)) continue;
		const bugs = countBugEntries(d.content);
		map.set(slug, {
			slug,
			unified: true,
			reqPath: d.path,
			deliverPath: d.path,
			reqStatus: extractFieldValue(d.content, STATUS_FIELD),
			deliverDate: extractFieldValue(d.content, DELIVERY_DATE_FIELD),
			codeTarget: extractFieldValue(d.content, TARGET_DIR_FIELD),
			targetFolder: targetFolderOf(d.path, docFolder),
			pendingChange: hasPendingChange(d.content),
			bugTotal: bugs.total,
			bugPending: bugs.pending,
		});
	}
	for (const t of matchTasks(reqs, dels)) {
		if (map.has(t.slug)) continue;
		map.set(t.slug, t);
	}
	return [...map.values()];
}

/** Current stage of a task: the delivery doc wins; without one, the requirement's adjust/approve state decides */
export function taskState(t: DevTask): { label: string; kind: TaskKind } {
	const d = (t.deliverStatus ?? "").trim();
	const r = (t.reqStatus ?? "").trim();
	if (d.includes(ST_BUGFIX_OPEN) || r.includes(ST_BUGFIX_OPEN)) return { label: d.includes(ST_BUGFIX_OPEN) ? d : r, kind: "active" };
	if (d.includes(ST_CHANGE_OPEN) || r.includes(ST_CHANGE_OPEN)) return { label: d.includes(ST_CHANGE_OPEN) ? d : r, kind: "wait" };
	if (d.includes(ST_CLOSED) || d.includes(ST_COMPLETED)) return { label: d, kind: "final" };
	if (d.includes(ST_APPROVED)) return { label: d, kind: "final" };
	if (d.includes(ST_AWAITING_REVIEW) || d.includes(ST_REVISING) || d.includes(ST_DELIVERED)) return { label: d, kind: "wait" };
	if (r.includes(ST_CLOSED) || r.includes(ST_COMPLETED)) return { label: r, kind: "final" };
	if (r.includes(ST_DELIVERED)) return { label: r, kind: "wait" };
	if (r.includes(ST_ADJUSTING)) return { label: r, kind: "wait" };
	if (r.includes(ST_APPROVED)) return { label: r, kind: "ready" };
	if (r.includes(ST_IN_DEVELOPMENT)) return { label: r, kind: "active" };
	if (r.includes(ST_AWAITING_REVIEW) || r.includes(ST_AWAITING_BUILD)) return { label: r, kind: "wait" };
	if (d) return { label: d, kind: "active" };
	if (r) return { label: r, kind: "active" };
	return { label: "", kind: "none" };
}

export function folderLeafName(folderSetting: string): string {
	return folderSetting.replace(/\/+$/, "").split("/").pop() ?? folderSetting;
}

/** A folder of that name at any depth counts (e.g. docs/dev-docs/finance/x.md) */
export function isUnderNamedFolder(path: string, folderSetting: string): boolean {
	const name = folderLeafName(folderSetting);
	return name.length > 0 && path.split("/").includes(name);
}

/**
 * Module folder of a doc.
 * - `docs/dev-docs/finance/a.md` → `docs/dev-docs/finance`
 * - `lib/features/finance/dev-requirements/a.md` → `lib/features/finance`
 */
export function targetFolderOf(path: string, folderSetting: string): string {
	const name = folderLeafName(folderSetting);
	const parts = path.split("/");
	const idx = parts.lastIndexOf(name);
	if (idx < 0) return parts.slice(0, -1).join("/");
	if (idx + 2 < parts.length) return parts.slice(0, idx + 2).join("/");
	if (idx > 0) return parts.slice(0, idx).join("/");
	return parts.slice(0, -1).join("/");
}

/**
 * Rewrites "- **Field**: old" to the new value. Single-line match: an empty field only replaces its own line.
 * The colon and the single space after it are rewritten, so an empty "- **Field**:" (as the templates
 * leave it) does not end up as "- **Field**:value"; a full-width colon is normalised to ASCII on the way.
 */
export function setFieldValue(content: string, field: string, value: string): string {
	const re = new RegExp(`^([ \\t]*[-*][ \\t]*\\*\\*${escapeRe(field)}\\*\\*[ \\t]*)[:：][ \\t]*[^\\r\\n]*$`, "m");
	// function replacement: a "$" inside the value must not act as a replacement pattern
	if (re.test(content)) return content.replace(re, (_m, head: string) => (value ? `${head}: ${value}` : `${head}:`));
	return content;
}

export const SUPPLEMENT_HEADING = "## Supplementary requirements";
export const BUG_HEADING = "## Defect log";
export const CHANGE_HEADING = "## Requirement changes";
/** Pointer line left in a section after completed entries were moved to the archive doc */
export const ARCHIVE_POINTER_PREFIX = "> Completed entries archived:";
const ARCHIVE_POINTER_RE = /^> Completed entries archived:/m;

export function upsertSupplementSection(content: string, note: string, stamp: string): string {
	const lines = note
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean)
		.map((l) => l.replace(/^[-*]\s+/, ""));
	const block = lines.map((l) => `- (${stamp}) ${l}`).join("\n");
	if (content.includes(SUPPLEMENT_HEADING)) {
		return content.replace(SUPPLEMENT_HEADING, `${SUPPLEMENT_HEADING}\n${block}`);
	}
	return `${content.trimEnd()}\n\n${SUPPLEMENT_HEADING}\n${block}\n`;
}

export function upsertBugSection(content: string, note: string, stamp: string): string {
	const lines = note
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean)
		.map((l) => l.replace(/^[-*]\s+/, ""));
	const block = [`### ${stamp}`, ...lines.map((l) => `- ${l}`), `- **${FIX_FIELD}**:`].join("\n");
	if (content.includes(BUG_HEADING)) {
		return content.replace(BUG_HEADING, `${BUG_HEADING}\n${block}\n`);
	}
	return `${content.trimEnd()}\n\n${BUG_HEADING}\n${block}\n`;
}

export function upsertChangeSection(content: string, note: string, stamp: string): string {
	const lines = note
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean)
		.map((l) => l.replace(/^[-*]\s+/, ""));
	const block = [`### ${stamp}`, ...lines.map((l) => `- ${l}`), `- **${LANDED_FIELD}**:`].join("\n");
	if (content.includes(CHANGE_HEADING)) {
		return content.replace(CHANGE_HEADING, `${CHANGE_HEADING}\n${block}\n`);
	}
	return `${content.trimEnd()}\n\n${CHANGE_HEADING}\n${block}\n`;
}

const LANDED_FILLED_RE = new RegExp(`\\*\\*${escapeRe(LANDED_FIELD)}\\*\\*[:：][ \\t]*\\S`);
const FIX_FILLED_RE = new RegExp(`\\*\\*${escapeRe(FIX_FIELD)}\\*\\*[:：][ \\t]*\\S`);

/** "Requirement changes" still holds entries whose "Landed" is empty: the change is not done, the doc is in its code phase */
export function hasPendingChange(content: string): boolean {
	const idx = content.indexOf(CHANGE_HEADING);
	if (idx < 0) return false;
	let tail = content.slice(idx + CHANGE_HEADING.length);
	const next = tail.indexOf("\n## ");
	if (next >= 0) tail = tail.slice(0, next);
	const blocks = tail.split(/^###\s/m).slice(1);
	if (blocks.length === 0) return /^[-*][ \t]+\S/m.test(tail); // hand-written change without entries
	return blocks.some((b) => !LANDED_FILLED_RE.test(b));
}

/** "Defect log" entry count: total = all entries, pending = entries whose "Fix" is empty */
export function countBugEntries(content: string): { total: number; pending: number } {
	const idx = content.indexOf(BUG_HEADING);
	if (idx < 0) return { total: 0, pending: 0 };
	let tail = content.slice(idx + BUG_HEADING.length);
	const next = tail.indexOf("\n## ");
	if (next >= 0) tail = tail.slice(0, next);
	const blocks = tail.split(/^###\s/m).slice(1);
	if (blocks.length === 0) return { total: 0, pending: 0 };
	const pending = blocks.filter((b) => !FIX_FILLED_RE.test(b)).length;
	return { total: blocks.length, pending };
}

export function todayStamp(d = new Date()): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/** Entry timestamp to the minute, so several notes on one day keep their order */
export function nowStamp(d = new Date()): string {
	const hh = String(d.getHours()).padStart(2, "0");
	const mm = String(d.getMinutes()).padStart(2, "0");
	return `${todayStamp(d)} ${hh}:${mm}`;
}

/**
 * Removes the **latest** entry of a section (entries are prepended: the first one after the heading is the newest).
 * - "Requirement changes" / "Defect log": removes the first `### ` block (up to the next `### ` or the section end).
 * - "Supplementary requirements": removes the first line `- (stamp) …`.
 */
export function removeLatestSectionEntry(content: string, heading: string): { content: string; removed: string } {
	const idx = content.indexOf(heading);
	if (idx < 0) return { content, removed: "" };
	const bodyStart = idx + heading.length;
	let section = content.slice(bodyStart);
	const nextSection = section.indexOf("\n## ");
	const rest = nextSection >= 0 ? section.slice(nextSection) : "";
	if (nextSection >= 0) section = section.slice(0, nextSection);

	const entryStart = section.search(/^###\s/m);
	if (entryStart >= 0) {
		const nextEntry = section.indexOf("\n### ", entryStart);
		let blockEnd = nextEntry >= 0 ? nextEntry + 1 : section.length;
		// The archive pointer line is not an entry: a new entry inserted under the heading pushes the pointer behind it,
		// so undo removes only the entry and leaves the pointer inside the section
		const pointerRel = section.slice(entryStart).search(ARCHIVE_POINTER_RE);
		if (pointerRel >= 0) {
			const pointerAbs = entryStart + pointerRel;
			if (nextEntry < 0 || pointerAbs < nextEntry) blockEnd = pointerAbs;
		}
		const removed = section.slice(entryStart, blockEnd);
		const kept = section.slice(0, entryStart) + section.slice(blockEnd);
		return { content: content.slice(0, bodyStart) + kept.replace(/\n{3,}/g, "\n\n") + rest, removed };
	}
	const bullet = section.match(/^[-*]\s+[（(][^）)]+[）)].*$/m);
	if (bullet && bullet.index != null) {
		const removed = bullet[0];
		const kept = (section.slice(0, bullet.index) + section.slice(bullet.index + removed.length)).replace(/\n{3,}/g, "\n\n");
		return { content: content.slice(0, bodyStart) + kept + rest, removed };
	}
	return { content, removed: "" };
}

export function isAdjustReqStatus(status: string | undefined): boolean {
	const s = (status ?? "").trim();
	return s.includes(ST_ADJUSTING) && !s.includes("change");
}

/** Bugs are logged on the original doc after completion (not a new requirement) */
export function isBugFixReqStatus(status: string | undefined): boolean {
	const s = (status ?? "").trim();
	return s.includes(ST_BUGFIX_OPEN) || s.includes(ST_COMPLETED) || s.includes(ST_CLOSED);
}

/** Bugs can only be logged after work started: in-development / delivered / closed / bugfix-open / change-open. Not during requirements. */
export function canRecordBug(status: string | undefined, delivered = false): boolean {
	return delivered || isCloseOutStatus(status);
}

export interface DevAuthorActions {
	approve: "pass" | "settle" | "done";
	adjust: boolean;
	change: boolean;
	bug: boolean;
}

/**
 * Author buttons in the panel.
 * Requirement stage (awaiting-review / adjusting / approved): Approve + Adjust (regenerate the doc from new requirements, no code).
 * Adjusting after code exists: Finalize (confirm the change is merged into the doc, → change-open) + Bug + Change req; no direct Close, that would skip landing.
 * Everything else after code exists (in-development / delivered / closed / bugfix-open / change-open): Close + Bug (BUGs only) + Change req (land in code).
 * The three never mix: doc matters go through Adjust, post-code requirements through Change, BUGs through Bug.
 */
export function devAuthorActions(status: string | undefined, delivered = false): DevAuthorActions {
	const closeOut = delivered || isCloseOutStatus(status);
	const settle = delivered && isAdjustReqStatus(status);
	return {
		approve: settle ? "settle" : closeOut ? "done" : "pass",
		adjust: !closeOut,
		change: closeOut,
		bug: closeOut,
	};
}

export function isApprovedReqStatus(status: string | undefined): boolean {
	const s = (status ?? "").trim();
	return s.includes(ST_APPROVED) && !s.includes("awaiting") && !s.includes(ST_CLOSED);
}

/** awaiting-review + Approve = approved (can start); adjusting after code + Finalize = change-open (awaits landing); in-development/delivered/bugfix-open + Approve = closed. */
export function nextApproveStatus(current: string | undefined, delivered = false): string {
	const s = (current ?? "").trim();
	if (isAdjustReqStatus(s) && delivered) return ST_CHANGE_OPEN;
	if (delivered || isCloseOutStatus(s)) return ST_CLOSED;
	return ST_APPROVED;
}

export function isCloseOutStatus(status: string | undefined): boolean {
	const s = (status ?? "").trim();
	return (
		s.includes(ST_IN_DEVELOPMENT) ||
		s.includes(ST_DELIVERED) ||
		s.includes(ST_BUGFIX_OPEN) ||
		s.includes(ST_COMPLETED) ||
		s.includes(ST_CLOSED) ||
		s.includes(ST_CHANGE_OPEN)
	);
}

/** Requirement changes only after code exists (in-development / delivered / bugfix-open / closed / change-open): land in code. During requirements use Adjust. */
export function canRecordRequirementChange(status: string | undefined): boolean {
	return isCloseOutStatus(status);
}

export const DEFAULT_DEV_DOC_FOLDER = "dev-docs";
export const DEFAULT_DEV_REQ_FOLDER = "dev-requirements";
export const DEFAULT_DEV_DELIVER_FOLDER = "dev-deliveries";
export const PROJECT_DOCS_DEV_FOLDER = "docs/dev-docs";
export const PROJECT_DOCS_REQ_FOLDER = "docs/dev-requirements";
export const PROJECT_DOCS_DELIVER_FOLDER = "docs/dev-deliveries";
/** Concept cards live here; the "Definition" line of a card is shown on hover */
export const SHARED_CONFIG_FOLDER = "shared-config";
export const ARCHIVE_FOLDER = "archive";
export const ARCHIVE_DOC_SUFFIX = "-archive";

const CODE_PROJECT_MARKERS = ["pubspec.yaml", "package.json", "Cargo.toml", "go.mod", "pyproject.toml"];
export const NOVEL_VAULT_MARKERS = ["characters", "chapters"];

/** Vault root looks like a code project and not like a novel vault: requirements/deliveries go under docs/ */
export function shouldUseProjectDocsLayout(vaultTopEntries: string[]): boolean {
	const names = new Set(vaultTopEntries.map((n) => n.replace(/\/+$/, "")));
	if (NOVEL_VAULT_MARKERS.some((m) => names.has(m))) return false;
	return CODE_PROJECT_MARKERS.some((m) => names.has(m));
}

export function isNovelDefaultDevFolders(reqFolder: string, deliverFolder: string): boolean {
	return reqFolder === DEFAULT_DEV_REQ_FOLDER && deliverFolder === DEFAULT_DEV_DELIVER_FOLDER;
}
