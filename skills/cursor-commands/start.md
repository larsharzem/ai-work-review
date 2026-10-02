---
description: 开工 · Start — 对「approved」的开发文档开始改代码
---

只处理状态「approved」的文档 / only docs in approved status：立刻改「in-development」并按验收改代码；不要动 closed 或未通过的文档 / never touch finished or unapproved docs。动代码前先读模块卡「Defect history」防复发 / read the module card Defect history first to avoid regressions。

先加载并遵守技能 dev-review 的 SKILL.md：优先项目级 `.cursor/skills/dev-review/SKILL.md`（ZCode 为 `.zcode/skills/`），没有则读用户级 `~/.cursor/skills/dev-review/SKILL.md`（ZCode 为 `~/.zcode/skills/`）。

执行 dev-review 的子命令「开工」/ Run dev-review subcommand `开工`，参数：$ARGUMENTS

按技能执行，不要往仓库写模板文件。开发文档固定写在 `docs/dev-docs/<module>/`。
