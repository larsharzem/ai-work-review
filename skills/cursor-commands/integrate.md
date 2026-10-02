---
description: 整合 · Integrate — merge closed-task deltas back into the business docs ([module])
---

Merges closed / delivered task deltas (requirements, delivery notes, bug root causes) **back into the business docs**: match business-line docs by target folder and business name, update affected sections in place, add missing sections where behavior changed; anything unresolvable goes to a confirmation list instead of being forced. **Link weaving is mandatory**: every updated business doc must carry a Page / component links section ([[页面]] class-name wikilinks + [[组件]] limited to cards that exist in the registry) — no links means the integration isn't done. Integrated tasks get an Integrated stamp and the module card gets a Business integration timestamp; modules without a business parse are pointed to 解析业务 first.

先加载并遵守技能 dev-review 的 SKILL.md：优先项目级 `.cursor/skills/dev-review/SKILL.md`（ZCode 为 `.zcode/skills/`），没有则读用户级 `~/.cursor/skills/dev-review/SKILL.md`（ZCode 为 `~/.zcode/skills/`）。

执行 dev-review 的子命令「整合」/ Run dev-review subcommand `整合`, args: $ARGUMENTS

按技能执行，不要往仓库写模板文件。开发文档固定写在 `docs/dev-docs/<module>/`。
