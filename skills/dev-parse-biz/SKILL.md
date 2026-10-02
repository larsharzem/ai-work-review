---
name: dev-parse-biz
description: >-
  Parses a feature module into 开发文档 business specs. Use when the user
  asks to 解析业务, 深度拆解, 需求解析, document a module's current product
  behavior, or run /dev-review 解析业务 <module> [流程] or /dev-review 深度拆解
  [模块…] [更新]. Reads code; does not implement features.
---

# 需求解析（业务 → 开发文档）

把模块的现有业务写成开发文档，放到 `docs/dev-docs/<module>/`。模板与状态机见技能 `dev-review`，不要另存模板文件。

默认只读代码、只写 `docs/dev-docs/`。不改 `lib/` 业务实现，除非用户明确走完「通过」并要求开工。

## 入参

- **Module**（必填）：模块名（Flutter 为 `lib/features/<name>` 的 name；其他结构以模块卡「Directory」为准）。未指定则先问，或根据当前打开文件推断后确认。
- **流程**（可选）：出现 `流程` / `flow` / `awaiting-review` 时进入流程模式。
- **批量**（可选）：用户运行 `深度拆解`，或明确要求「全部 / 所有模块」时，解析对象变为模块队列（见下节）。

默认只解析用户点名的模块。仅当 `深度拆解` 或用户明确要求全部时才批量，且必须**逐模块串行**：拆完一个（业务文档写盘 + `_module.md` 更新）再进入下一个。

## 批量队列（深度拆解）

1. 先按 `dev-review` 的「解析模块」刷新结构与全部 `_module.md`，确保每张卡有「Business breakdown」字段（已有日期不要覆盖）。
2. 队列：用户点名的模块清单；否则全部模块，按目录名排序。
3. 增量：跳过「Business breakdown」已有日期的模块；带 `更新` 或点名单个模块时强制重拆（更新既有业务文档，不重复建）。
4. **上下文纪律：一次只装载一个模块的代码。**该模块全部业务文档写完、其 `_module.md` 的「Business breakdown」更新为 `今天日期（业务线1、业务线2…）` 之后，才读下一个模块的代码。不要并行、不要把多个模块的代码同时摊开。
5. 中断续跑：重跑同一命令，从第一个「Business breakdown」仍为 `not parsed` 的模块继续。
6. 全部结束汇报：每模块拆出的业务线清单 + 文档路径；没拆完的如实说明停在哪，不要谎报完成。

## 步骤（单模块解析）

1. 读 `docs/dev-docs/<module>/_module.md`（没有则先按 `dev-review` 的「解析模块」补一张）。
2. 通读模块卡「Directory」下的各层及其引用的其他模块入口（Flutter：presentation（pages / widgets / controllers）、domain（实体 / 用例）、application、data（repository / API 客户端 / 本地存储）；其他结构按项目分层惯例读对应的 UI / 逻辑 / 数据入口，如 Views / ViewModels / Services、handler / service / dao）。
3. 按**用户可感知的业务线**拆文档（例如 finance 拆成充值 / 提现 / 记录，而不是一篇超长总表）。
4. 每条业务线一份：`docs/dev-docs/<module>/YYYY-MM-DD-<business>.md`。
5. 已有同名任务（去日期前缀相同）则更新，不重复建。
6. 文档必须能对照代码，每条业务线至少覆盖：
   - **Pages and entry points**: 涉及哪些页面、路由 / 入口按钮——页面优先双链 `docs/page-docs/` 里真实存在的页面卡（无卡写类名，`组件解析` 建卡后补链），每页列出关键组件 `[[组件名]]`（以 `docs/component-docs/` 注册表为准，未入册的写文件名）。页面→组件以代码为准，注册表过期由 `组件影响` 反查纠正
   - **Main flow**: as-is 步骤化描述（用户视角 + 关键代码路径），步骤里引用 `[[页面名]]`
   - **Business rules**: 校验、限额 / 费率 / 计算、状态流转；注明规则所在的代码文件
   - **Branches and exceptions**: 失败、取消、超时、边界条件下的行为
   - **Data and dependencies**: 调用的 API、本地存储、依赖的其他模块（写文件路径）
   - **Assumptions**: 读代码推不准的写成假设清单，不要编接口细节
7. **公用概念**：业务规则里反复出现的领域概念（货币、档位、状态、等级等）——已有概念卡的用 `[[概念名]]` 双链引用；没有的在汇报里列出，建议作者沉淀到 `docs/shared-config/`（AI 可代拟草稿，作者确认后落盘，见技能 `dev-review` 的「公用配置」）。
8. 批量（深度拆解）模式下，模块全部业务文档写完后，更新其 `_module.md` 的「Business breakdown」字段，再进入下一个模块。

## 填写

复制 `dev-review` 的开发文档模板：

- **Module**: feature 名
- **Target directory**: 模块卡「Directory」（如 `lib/features/<module>`）
- **Source**: 流程模式写 `flow`，否则 `business parse`
- **Status**: 流程模式 `awaiting-review`；否则 `closed`（快照，避免误开工）
- **Raised on**: 今天
- **Delivery date**: 留空
- **Requirements**: 当前产品行为（as-is），按上面的六要素组织，不是新需求脑暴
- **Acceptance criteria**: 可逐步核对现状的 checkbox
- **交付** 节保持空表，除非这是后续开工后的交付

## 流程模式

写完后停，列出文档路径，请作者在 Obsidian 开发模式对每条点「调整」或「通过」：

- 调整 → `/dev-review 调整`（只改这些开发文档）
- 通过 → `/dev-review 开工`（才允许改业务代码）

非流程模式：写完即止，汇报拆了哪些业务线。不要开工。

## 不要做

- 不把模块卡 `_module.md` 当成任务去审核或开工
- 不解析用户没点名的模块（`深度拆解` 或用户明确要求全部时除外，仍逐模块串行）
- 不把「现状快照」写成「approved」（会触发批量开工）
