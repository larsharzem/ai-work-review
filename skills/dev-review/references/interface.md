# 参考文件：接口命令（摄取 / 变动 / 比对 / 列表）

接口文档模板与四条子命令细则的正本。单源：改细则只改本文件，改完按「技能正本规则」同步项目副本。

## 接口 \<摄取|变动|比对|列表\>

维护外部接口文档 `docs/api-docs/`（每服务一份总汇，模板见「模板：接口文档」）。接口命令不改业务代码。

**接口摄取 \<来源\> [服务名]**——把外部接口资料规范化成 markdown：

1. 判断来源：网页（用可用的抓取能力取正文；需登录的页面请作者另存为本地文件或粘贴）；本地文件（任意格式按扩展名解析；docx / xlsx / pdf 等二进制先用 textutil / pandoc / python 等转成文本，转不了让作者另存 txt / md）；对话粘贴。
2. 提取：端点（方法＋路径）、请求参数（名称 / 类型 / 必填 / 说明）、响应要点、认证、分组。
   - 原文没有的字段**填「n/a」**，不留空、不写「原文未提供」。
   - 接口名称 / 说明 / HTTP Method 缺失时，可从函数名、路径、参数或既有代码调用**推断**一个合理值，**逐条列给作者确认后写入**；作者不确认的填「n/a」。
   - 响应 JSON 示例一律**格式化**：```json 代码块、2 空格缩进、每个字段一行；原文截断的示例排版到可读并注明「原文截断」。散文说明用正文，不要塞进代码块。
3. 服务名缺省从文件名或域名推断，拿不准就问。
4. 写 `docs/api-docs/<service>/_api.md`；原始快照存同目录 `_source.<ext>`；更新 `docs/api-docs/_index.md`（服务、快照日期、接口数、来源，双链到各 `_api.md`）。
5. 汇报：接口数、分组、存疑字段清单。

**接口变动 \<服务\>**——检测对方接口变化：

1. 按 `_api.md` 的「Source / Fetched via」重新获取；拿不到（链接失效 / 文件没更新）就问作者要新资料，不要用旧源猜。
2. 用与摄取相同的规则重新规范化（临时，不落盘），与现有 `_api.md` 逐接口比对，产出**变动清单**：新增 / 删除 / 变更接口，变更给字段级明细（参数增删、类型、必填、路径、说明）。
3. 更新 `_api.md`（正文＋快照日期＋「Change history」追加一行 `- YYYY-MM-DD HH:mm：新增 x、删除 y、变更 z`），覆盖 `_source`，刷新 `_index.md`。
4. **问作者是否生成适配需求**：确认后在 `docs/dev-docs/<module>/` 按 `需求` 建「<service>接口变动-<日期>」文档（状态 awaiting-review），变动明细写进 Requirements 与 Acceptance criteria；受影响的旧文档提示作者记「Requirement changes」。作者不确认就不碰开发文档。

**接口比对 \<服务\> [模块]**——接口文档对照代码与开发文档，找漂移：

1. 读 `_api.md`；无模块参数则扫全项目调用点（Flutter：`*_api_repository.dart` 的 path 常量与参数 map；iOS：API 宏清单＋VM 调用；其他结构按网络层惯例），点名模块则只扫该模块；同时对照 `docs/dev-docs/` 里描述的接口。
2. 报告三类不一致：**文档有、代码未用**（漏实现或已废弃）／**代码在用、文档没有**（文档缺失，建议向后端确认）／**同名接口参数或路径不一致**（实现漂移，风险最高）。
3. 只报告不改代码；要修的走 `需求`（补实现）/ `变更`（改实现）。

**接口列表**：扫描 `docs/api-docs/`，刷新 `_index.md` 并向作者展示。


## 模板：接口文档

`docs/api-docs/<service>/_api.md`，每服务一份总汇；同目录存原始快照 `_source.<ext>`（粘贴内容存 `_source.txt`）：

```markdown
# API doc: <service>

- **Service**:
- **Source**: (URL / local path / paste)
- **Fetched via**: (web page / local file / paste)
- **Snapshot date**: YYYY-MM-DD HH:mm
- **Base URL**: （没有填「n/a」）
- **Auth**:
- **Change history**: 无

## <分组>

### <METHOD> <path>
- **Notes**:
- **Request params**:
  | Name | Type | Required | Notes |
  |---|---|---|---|
  （缺失信息填「n/a」；参数栏为空写「no params」）
- **Response**: （字段表或 ```json 代码块格式化示例，每字段一行）
- **Remarks**:
```

