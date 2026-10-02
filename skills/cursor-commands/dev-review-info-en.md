---
description: View the /dev-review workflow manual (English)
---

View the /dev-review workflow manual (English): commands, file locations, the loop, core rules.

Show the following manual to the user (keep the Markdown formatting and content; do not perform any development or modification):

---

# /dev-review Manual

**What it is**: a unified dev-doc workflow paired with the Obsidian "AI Work Review" plugin (Dev mode). Requirements and delivery live in **one** doc: the AI writes the requirement → you "Approve / Adjust" in the panel → the AI starts & delivers → you "Finish". Status maps 1:1 to commands: **adjusting**→`调整` (doc only), **change-open**→`变更` (land code), **bugfix-open**→`整改` (BUG only). Recording and processing are separate: bugs, change requests and supplement notes are logged by you via the panel buttons or `添加`; the processing commands only touch recorded entries — if nothing is recorded, they say so and stop. Post-code requirement changes go two steps: log a change → adjusting → `调整` settles the doc → change-open → `变更` lands the code.

## Commands

| Command | When | Purpose |
|---|---|---|
| `/dev-review 解析模块` | Onboarding | Scans every feature dir under `lib/features/`, creates `docs/dev-docs/<module>/` and a module card `_module.md` (structure index) |
| `/dev-review 解析业务 <module> [流程]` | Understand one module | Turns the module's current behavior into per-business-line docs (snapshot, status = closed; with `流程` they stay awaiting-review and enter the review-start loop) |
| `/dev-review 深度拆解 [modules…] [更新]` | Understand the whole project | Parses **all modules serially, one by one**: finish one (write docs + mark its module card) before the next; rerun after interruption resumes automatically; incremental by default, `更新` forces re-parse |
| `/dev-review 组件解析 [module]` | Building the registry | Scans widgets into component cards (dual-dimension tags from the `_tags.md` vocabulary + layout ASCII sketches) + page cards (numbered slot sketches + legends, business wikilinks) + a capability-grouped `_index.md`; look-alikes produce a 组件抽取 requirement (awaiting-review) |
| `/dev-review 组件查 <need description>` | Before writing UI | Tag-first lookup: capability/scenario keywords → tag hits → recommendation with minimal usage; says plainly when nothing fits |
| `/dev-review 组件登记 <path>` | New component delivered | Cards & indexes the reusable component |
| `/dev-review 组件影响 <name\|page\|path>` | Before changing a component/page | Reverse-maps consumers from code (component card & page-card legend cross-checked) + business-doc wikilink hits; impact list + regression hints; can generate a change requirement (awaiting-review) |
| `/dev-review 组件比对 [module\|整改]` | After organizing / suspect drift | Registry health check (**page-layout card coverage**, orphans, slot drift, link health, weaving backlog, consumer cross-check) → writes `docs/component-docs/_compare-report.md` (AI-fixable vs author-decides); `整改` fixes item by item per the report (docs only, never code), **deletes the report** once everything is handled |
| `/dev-review 文档检查 [module\|整改]` | Suspect doc non-compliance | Dev-doc spec check (six rules: fields / premature Delivery date / slim-doc structure / entry formats / status drift / dead links) → writes `docs/dev-docs/_check-report.md` (overwritten per run, split into AI-fixable vs author-decides); `整改` fixes item by item per the report (never touches status, ticks checkboxes), **deletes the report** once everything is handled; author-decides items go through the panel |
| `/dev-review 需求 <task description>` | Before starting | Turns the conversation's requirements into a dev doc (verifiable acceptance checkboxes, non-goals), status = awaiting-review |
| `/dev-review 微改 <task description>` | Small change, no owning doc | Slim dev doc (Basics / Requirements / Acceptance criteria / Delivery only), status = awaiting-review. **Trims the writing, not the process**: omit any Basics field and the panel buttons silently no-op while `整合` skips the doc forever — no error. Delivered-code changes go to `变更`, BUGs to `整改` |
| `/dev-review 添加 <BUG\|变更\|补充> [module or doc]` | Dictating something to log | Recording entry (AI-side twin of the panel's 缺陷/Requirement changes/调整 buttons): writes a timestamped entry at the top of the matching section and flips status — BUG→bugfix-open, change/note→adjusting; records only, never edits the spec or code |
| `/dev-review 建卡 <concept>` | Distill a shared concept | Creates the concept card `docs/shared-config/<concept>.md`: definition from the chat or extracted from code/docs (AI drafts, author confirms); unifies variant terms in docs into the canonical name with wikilinks; suggests a terminology-unification requirement for code renames |
| `/dev-review 接口摄取 <source> [service]` | Got API material | Normalizes it into the per-service summary `docs/api-docs/<service>/_api.md` + raw snapshot; missing fields filled with n/a, names/Method inferable with author confirmation; pretty-printed JSON |
| `/dev-review 接口变动 <service>` | Provider APIs updated | Re-fetch → field-level change list → update doc & index; optionally generates an adaptation requirement after asking (awaiting-review) |
| `/dev-review 接口比对 <service> [module]` | Suspect drift | Compares the API doc against code call sites and dev docs; reports three mismatch classes |
| `/dev-review 接口列表` | Anytime | Refreshes and shows the per-service index (snapshot date, endpoint count, source) |
| `/dev-review 调整` | Doc in adjusting | Regenerates the doc from the recorded notes (doc only); requirement stage → awaiting-review, post-code → change-open; recorded notes only — if none, says so and stops, no routing |
| `/dev-review 开工` | After you "Approve" | Implements approved docs (status approved → in-development); reads the module card's Defect history first to avoid regressions |
| `/dev-review 交付 <task>` | Work finished | Fills the "交付" section of the same doc against acceptance, status = delivered; self-test includes a regression check against Defect history |
| `/dev-review 整改` | After you log a bug | Fixes only entries already recorded in the doc's Defect log with Fix still empty; never creates new docs or authors bugs for you; fills 整改 + 根因 and appends to the module card's Defect history. To log a bug use `添加BUG` |
| `/dev-review 变更` | Doc in change-open | Doc already settled: land the change in code per the doc, fill Landed; if still adjusting it stops and waits for `调整` to settle first (doc confirmed, then executed) |
| `/dev-review 整合 [module]` | After closed tasks pile up | Merges closed-task deltas back into the business docs in place + **mandatory link weaving** (Page / component links section, pages linking to page cards — no links means not done); tasks stamped Integrated, module card stamped; contradictions listed for confirmation |
| `/dev-review 继续` | A delivery got adjusted | Addresses adjustment notes (code + delivery section), re-delivers for review |
| `/dev-review 状态` | Anytime | Lists every doc grouped by module: where it's stuck, whose move is next, and each module's un-integrated backlog |
| `/dev-review-info-cn` / `-info-en` | — | Show this manual (Chinese / English) |

## Where files go

| Location | Contents | Notes |
|---|---|---|
| `docs/dev-docs/<module>/` | Dev docs (requirement + delivery in one) | The review targets; status field tracked by the plugin |
| `docs/dev-docs/<module>/_module.md` | Module card (structure index) | Layers / pages / responsibility / parse progress / Defect history (root-cause index of fixed bugs; read before 开工/变更/交付); not a task, cannot be started |
| `docs/shared-config/<concept>.md` | Concept cards (shared concepts) | Targets of `[[concept]]` wikilinks; the card is authoritative — the AI never guesses a concept; the AI may draft a card but only the author confirms and saves it |
| `docs/api-docs/<service>/_api.md` | API doc summary | Normalized mirror of external APIs; body maintained only by 接口摄取/接口变动; `_index.md` for overview |
| `docs/component-docs/<category>/<component>.md` | Component cards (reuse registry) | One card per component + `_index.md`; checked before writing UI; extraction proposals go through the requirement flow |
| `docs/page-docs/<module>/<page>.md` | Page cards (layout index) | Numbered slot sketch + four-column legend (position/purpose/component: card link, filename or style note); two-way business↔page wikilinks; `_index.md` overview; created by `组件解析`, kept fresh by `组件影响`/`交付` |
| `.ai-review/adjustments/` | Notes written from the panel's "Adjust" | Read first by the skill, auto-removed once handled |

## The loop

```
(optional) 深度拆解 / 解析业务 → understand the current behavior
/dev-review 需求 → review in Obsidian Dev mode: "Adjust" regenerates the doc / "Approve" releases it
→ /dev-review 开工 → /dev-review 交付 → you "Finish"
→ post-code requirement change: "Change req" or /dev-review 添加 变更 → adjusting → /dev-review 调整 settles the doc → change-open → /dev-review 变更 lands the code (if the AI forgets to flip the status, use the panel's "Finalize" button)
→ bug: "Bug" or /dev-review 添加BUG → /dev-review 整改
```

## Core rules

1. Be honest in every doc: failing tests are reported as failing — you make approval decisions based on them.
2. The state machine gates work: only approved can start; business snapshots stay closed so they can never be started by accident.
3. Parsed business docs must map back to code: pages & entries, main flow, business rules, branches & errors, data & dependencies; mark assumptions instead of inventing details.
4. Shared concepts are authoritative in `docs/shared-config/` concept cards: reference them via wikilinks; on a dead link or an undefined concept the AI stops and asks the author instead of guessing.

## Scope

The skill lives inside the project (Cursor: `.cursor/skills/`; ZCode: `.zcode/skills/`) and manages this project's `docs/dev-docs/`. Modules map to `lib/features/<module>` by default; other project layouts map their own code dirs the same way.
