# 参考文件：文档检查（报告闭环）

检查报告格式、六项检查与整改规则的正本（`组件比对` 的报告格式与整改纪律同以本文件为准）。单源：改细则只改本文件，改完按「技能正本规则」同步项目副本。

## 文档检查 \<模块|整改\>

开发文档**规范检查**闭环：**检查出报告 → 按报告整改 → 改完删报告**。检查只写报告不改文档；整改只按报告逐项修文档，**一律不动状态**（状态纠偏走面板按钮）。业务文档、页面卡、组件卡的漂移（含**页面布局图**缺卡/槽位漂移）归 `组件比对`——它同样出报告 `docs/component-docs/_compare-report.md`，不在这里重复。

**检查**（无参数＝全库，或点名模块）：按下列六项扫 `docs/dev-docs/` 全部任务文档（含微改档案；发现旧 `dev-requirements/`、`dev-deliveries/` 未迁移档案，列入待迁移），发现写入报告 `docs/dev-docs/_check-report.md`（`_` 前缀＝非任务文件，插件不当任务扫；每次检查**覆盖重写**，以最新扫描为准），并在对话里给摘要。条目归档（`docs/archive/<module>/`）不做全量检查，只查两小项：原文档指针指向的归档文件是否存在（死链进⑤）、归档内有没有滞留的未处理条目（有＝搬回正文对应节）。

```markdown
# Doc check report

- **Time**: YYYY-MM-DD HH:mm
- **Scope**: 全库 / <module>
- **Stats**: 违规 n 项（AI 可修 a / 需作者定夺 b）

## To fix (AI)

- [ ] <module>/<file>｜<check>：<fact> → <fix>

## Author decides

- [ ] <module>/<file>｜<check>：<fact> → <author action>
```

六项检查（①②③进「To fix」，④⑤及存疑的⑥进「Author decides」）：

1. **Basics**（插件状态机与 `整合` 的锚点）：Status / Module / Target directory / Source / Raised on / Delivery date 六字段齐全；状态取值在八个合法值内；**Delivery date 只允许 `交付` 填**——awaiting-review/adjusting/approved/in-development 却有 Delivery date＝预填（面板主按钮会变「closed」、跳过审核门）：Delivery 节为空的归「To fix」（清空安全），有实质内容的归「Author decides」（可能真交付过）；微改档案 `Source` 应为 `minor change`。字段缺失可从路径/文件名推断的（模块/Target directory/Raised on）归「To fix」，状态/来源拿不准的归「Author decides」。
2. **微改档案结构**：应含 Basics / Requirements / Acceptance criteria / Delivery 四节，缺节＝违规（补空节）；多出的章节不罚。
3. **条目格式**（面板统计与「撤回」依赖）：Supplementary requirements 每条 `- (YYYY-MM-DD HH:mm) …`；Defect log / Requirement changes 每个条目 `### YYYY-MM-DD HH:mm` 块＋bullet＋`- **Fix**:`／`- **Landed**:` 占位；时间戳可解析；条目最新在前（节标题后第一条＝最新）。格式坏的条目会让 pending 统计与撤回**静默失效**——修复只排格式与归位，不改条目内容。正文节里「Landed／Fix」已填的条目＝未归档滞留 → 归「To fix」，修法＝原样移入条目归档文件（见 `references/templates.md`「模板：条目归档」）＋节尾指针行；节尾指针行必须是 `> Completed entries archived: [[<doc>-archive]]` 引用行，写成列表行的一并修正。
4. **状态与条目一致性**（漂移，作者定夺）：「bugfix-open」但 Defect log 没有未整改条目、或有未整改条目却不在 bugfix-open；「change-open」但 Requirement changes 全部已落实；「closed」但 Delivery 节为空 → 面板按钮纠偏。
5. **双链健康**（作者定夺）：正文的 `[[概念]]` 死链（`docs/shared-config/` 无对应卡）＝概念未沉淀或拼错 → `建卡` 或改链；`优先复用：[[组件]]` 指向不存在的组件卡；条目指针 `[[<doc>-archive]]` 死链（归档文件被删/改名，AI 无法重建）→ 需作者定夺。
6. **微改滥用提示**（不算违规）：同模块同 Target directory 连续多份微改档案 → 提示攒批或改走 `需求`，写进报告备注。

**整改**（参数＝`整改`）：读 `_check-report.md`——报告不存在就如实说明，先跑检查；不要凭记忆整改。

1. 逐项处理「To fix」：缺节按模板补空节、可推断字段补齐、Delivery 节空则清空预填的 Delivery date、条目格式按面板同款修复。每修一项把 checkbox 改 `[x]` 并在行尾补「（已修：<what was done>）」。
2. 「Author decides」项**不代做**：列出待作者处理（面板纠偏 / 核实日期 / 建卡）。
3. 「To fix」全部勾完、且作者确认定夺项已处理 → **删除报告文件**；仍有未处理项 → 保留报告，如实汇报卡在哪些项。

