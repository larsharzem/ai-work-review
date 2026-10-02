---
description: 接口列表 · API list — refresh and show the per-service API doc index
---

Scan `docs/api-docs/` and refresh `_index.md` (one row per service: name, snapshot date, endpoint count, source, wikilink to its `_api.md`), then show it to the author；open `_index.md` in Obsidian for an at-a-glance overview of all services.

先加载并遵守技能 dev-review 的 SKILL.md：优先项目级 `.cursor/skills/dev-review/SKILL.md`（ZCode 为 `.zcode/skills/`），没有则读用户级 `~/.cursor/skills/dev-review/SKILL.md`（ZCode 为 `~/.zcode/skills/`）。

执行 dev-review 的子命令「接口」，动作 `列表` / Run dev-review subcommand `接口` action `列表`, args: $ARGUMENTS

按技能执行，不要往仓库写模板文件。开发文档固定写在 `docs/dev-docs/<module>/`。
