---
description: 交付 · Deliver — 对照验收填 Delivery 节，状态改 delivered（<path or task name>）
---

参数：开发文档路径或任务名 / doc path or task name。填同一文档的「Delivery」节，不要另建 Delivery 文件 / fill the same doc, no new file。Self-test results 含对照模块卡「Defect history」的回归检查 / self-test includes a regression check against Defect history。改动触及页面布局的，重画对应页面卡（`docs/page-docs/`）/ layout-touching changes redraw the page cards。

先加载并遵守技能 dev-review 的 SKILL.md：优先项目级 `.cursor/skills/dev-review/SKILL.md`（ZCode 为 `.zcode/skills/`），没有则读用户级 `~/.cursor/skills/dev-review/SKILL.md`（ZCode 为 `~/.zcode/skills/`）。

执行 dev-review 的子命令「交付」/ Run dev-review subcommand `交付`，参数：$ARGUMENTS

按技能执行，不要往仓库写模板文件。开发文档固定写在 `docs/dev-docs/<module>/`。
