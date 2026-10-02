# 参考文件：文档模板（开发文档 / 微改 / 模块卡 / 概念卡）

模板正本，由 SKILL.md 的 需求 / 微改 / 解析模块 / 建卡 / 整改 等子命令按需读取。单源：改模板只改本文件，改完按「技能正本规则」同步项目副本。

## 模板：开发文档

复制后填空。不要把括号占位留在定稿里。

```markdown
# Dev doc: <title>

## Basics
- **Status**: (awaiting-review / adjusting / approved / in-development / delivered / closed / change-open / bugfix-open)
- **Module**:
- **Target directory**: （要改的代码目录，如 lib/features/finance）
- **Source**: (conversation / module parse / business parse / flow)
- **Raised on**:
- **Delivery date**:

## Background and goal

## Requirements

## Acceptance criteria
- [ ]

## Boundaries and non-goals

## Supplementary requirements

## Delivery
### Completed work
| Change | File / location | Notes |
|---|---|---|
|  |  |  |

### Self-test results

### Acceptance steps
1.

### Risks and leftovers
-

## Review notes

## Requirement changes

## Defect log
```

节用途说明是**给创建时看的**，不留在定稿正文里：Requirement changes＝对过代码后改需求写这里（落实后移入归档）；Defect log＝交付后 BUG 写这里（整改后补「Fix」「Root cause」并移入归档，汇入模块卡「Defect history」）。细则见 SKILL.md 的 `变更`/`整改` 与「模板：条目归档」。

## 模板：微改文档

`docs/dev-docs/<module>/YYYY-MM-DD-minor-<task>.md`，精简版开发文档。**「Basics」整节不可省**——它是插件状态机与 `整合` 的读写锚点，缺字段是**静默失效**：面板「通过」「closed」点了文件不变也不报错，`整合` 永远捞不到这份文档。

```markdown
# Minor change: <title>

## Basics
- **Status**: (awaiting-review / adjusting / approved / in-development / delivered / closed / change-open / bugfix-open)
- **Module**:
- **Target directory**: （要改的代码目录，如 lib/features/finance）
- **Source**: minor change
- **Raised on**:
- **Delivery date**:

## Requirements

## Acceptance criteria
- [ ]

## Delivery
### Completed work
| Change | File / location | Notes |
|---|---|---|
|  |  |  |

### Self-test results
```

省掉的章节（Background and goal / Boundaries and non-goals / Supplementary requirements / Review notes / Requirement changes / Defect log）`整合` 不读、插件不解析，按需现补：记缺陷时 `## Defect log` 由面板自动追加到文末，作者不必手写。

## 模板：模块卡

```markdown
# Module: <name>

- **Directory**: lib/features/<name>
- **Docs**: docs/dev-docs/<name>
- **Layers**:
- **Pages**:
- **Responsibilities**:
- **Business breakdown**: not parsed
- **Defect history**: none
- **Business integration**: not integrated
```

「Business breakdown」只有「解析业务 / 深度拆解」会改：拆完后填 `YYYY-MM-DD（业务线1、业务线2…）`。「Defect history」只有 `整改` 会改：每修复一条缺陷追加一行 `- YYYY-MM-DD：症状短语 → 根因短语（<task>）`，初值 `none`；`开工`/`变更`/`交付` 前先读它做回归。「Business integration」只有 `整合` 会改：每次整合后更新为 `YYYY-MM-DD HH:mm（n 个任务：任务名…）`，初值 `not integrated`。

## 模板：条目归档

`docs/archive/<module>/<doc>-archive.md`，一份开发文档配一份归档。**不能放 `docs/dev-docs/` 内**（插件会把里面的文件当任务文档扫）；文件名带 `-archive` 后缀，避免与原文档双链重名。只由 `变更` / `整改` 在条目处理完时维护：把「Landed」／「Fix」已填的条目**原样**移入对应节（最新在前，不改一字，只进不出、不回改）。**平时不读**——作者点名追历史时循原文档指针双链进入。

```markdown
# Archive: <task>

> completed 条目的冷存储。原文档：[[<doc>]]。只由 `变更`/`整改` 追加，最新在前，不回改，平时不读。

## Requirement changes

### 2026-09-10 14:36
- （原始条目全文，原样搬入）
- **Landed**: …

## Defect log

### 2026-09-09 11:20
- （原始条目全文，原样搬入）
- **Fix**: …
- **Root cause**: …
```

原文档对应节**节尾**的指针行（必须是 `>` 引用行；写成列表行会被面板 pending 统计误判）：

```markdown
> Completed entries archived: [[<doc>-archive]]
```

## 模板：概念卡

`docs/shared-config/<concept>.md`，一个概念一个文件。卡是权威定义：各文档的 Requirements / Acceptance criteria **不重写**卡内规则，只写本页特有的位置与范围＋`[[概念名]]` 双链引用；`建卡` 落卡时顺带做这趟去重：

```markdown
# Concept: <name>

- **Definition**: （一句话：它是什么、边界在哪）
- **Rules**: （与它相关的硬规则，分条）
- **Aliases**: （可选：文档里出现这些词也指本概念）
```

