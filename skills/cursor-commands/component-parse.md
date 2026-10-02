---
description: 组件解析 · Component parse — scan widgets into component cards, pages into page cards ([module])
---

Scans component directories into the **component registry** `docs/component-docs/`：one card per reusable component (path / dual-dimension tags / responsibility / **layout ASCII sketch** / props API / minimal example / consumers — layout drawn region-level from the build/widget tree，single controls marked 无内部布局)，tags taken from the `_tags.md` controlled vocabulary (能力=what it does, 场景=where it fits, native `#capability/xx` searchable in Obsidian)；`_index.md` grouped by capability tag；one-off private widgets are skipped. Page directories also get **page cards** in `docs/page-docs/<module>/`: numbered slot sketches + position/purpose/component legends (three-state component column: card link / filename / style note), 「Business」wikilinked to the business docs. **Duplicated look-alike components across modules are never refactored in place** — instead a 组件抽取 requirement doc is generated (awaiting-review， review-then-start flow).

先加载并遵守技能 dev-review 的 SKILL.md：优先项目级 `.cursor/skills/dev-review/SKILL.md`（ZCode 为 `.zcode/skills/`），没有则读用户级 `~/.cursor/skills/dev-review/SKILL.md`（ZCode 为 `~/.zcode/skills/`）。

执行 dev-review 的子命令「组件」，动作 `解析` / Run dev-review subcommand `组件` action `解析`, args: $ARGUMENTS

按技能执行，不要往仓库写模板文件。开发文档固定写在 `docs/dev-docs/<module>/`。
