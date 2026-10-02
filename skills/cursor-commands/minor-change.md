---
description: 微改 · Minor change — write a small change up as a slim dev doc awaiting review (<task>)
---

Lightweight entry for small changes: creates a **slim** dev doc from the 微改 template (Basics / Requirements / Acceptance criteria / Delivery — four sections only), status `awaiting-review`, then tells the author to pick 「调整」 or 「通过」 in the panel. Never starts coding.

**Trims the writing, not the process**: the Basics fields 状态 / 模块 / Target directory / Delivery date must all be present, with Delivery date left empty — a missing field makes the panel's 「通过」/「closed」 buttons silently no-op and makes `整合` skip the doc forever, with no error raised.

**Not for**: changing already-delivered code → use `变更`; delivery that fails acceptance (a BUG) → use `整改`; work touching shared components or needing Boundaries and non-goals → use `需求`.

先加载并遵守技能 dev-review 的 SKILL.md：优先项目级 `.cursor/skills/dev-review/SKILL.md`（ZCode 为 `.zcode/skills/`），没有则读用户级 `~/.cursor/skills/dev-review/SKILL.md`（ZCode 为 `~/.zcode/skills/`）。

执行 dev-review 的子命令「微改」/ Run dev-review subcommand `微改`, args: $ARGUMENTS

按技能执行，不要往仓库写模板文件。开发文档固定写在 `docs/dev-docs/<module>/`。
