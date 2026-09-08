# req-v3 — gate-id-pattern：id-pattern 成为项目级配置，gate 获得收窄通道

target lineage: main（v4 产品线；不合并 v1/v3）

## 背景（现状 A，实测证据）

真实棕地样本（/mnt/d/agent-base/t_just-projects，规格库仓，git HEAD 即 2026-08-13 现场；只读）实测：

- store 中存在两类默认 pattern `[A-Z]+-\d+` 不认的合法 ID：字母后缀（`AC-08a`）与多段式（`AC-BIS-01`）。项目自用 pattern 为 `[A-Z]+(-[A-Z]+)*-\d+[a-z]*`（tools/ 桥接脚本注释）。
- `apriori verify --specs apriori/specs`（默认 pattern）：71 identified / **36 UNIDENTIFIED**；加 `--id-pattern '[A-Z]+(-[A-Z]+)*-\d+[a-z]*'` 后 **107 identified / 0 UNIDENTIFIED**。
- `apriori gate --change dashboard-launch-surface-slim`（archived stage）：C1 BLOCKED（`verify GAPS: 71 unbound, 36 unidentified`），C2–C7 全过。gate 没有任何 id-pattern 通道。
- `apriori check`：CK-04 把上述 36 个场景全部误报 "scenario without a bindable ID"（exit 1 FAIL）。
- `apriori doctor`：D6 用写死 DEFAULT_ID，同样误报。

机制层根因：id-pattern 是**项目恒量**，但工具把它当每次调用的参数，四个消费点（verify/gate/check/doctor）中两个不可配、一个只可手输。

## 目标（目标态 B）

### B1. 新配置键 `id-pattern`

`apriori/process-config.md` 表中一行，值为**裸 JS 正则源串**（不带 `/` 定界符、不带 flags）。人类持有（R3），agent/CLI 只读。**完整继承 config-contract**（共享 `lib/config.js` 读取；fenced/注释行不生效；同值重复容忍；异值重复为 CONFLICT，问题仅在消费时上浮；空值单元格按共享解析器现行规则视为无此行——该规则对所有键一致，本 change 声明并测试而不更改）。

### B2. 统一解析优先级（一处实现，四处复用）

每个消费点解析"生效 pattern"的规则：CLI `--id-pattern` flag（仅 verify、gate 有）> process-config `id-pattern` 行 > 内置 `DEFAULT_ID`。flag 存在时**不消费配置键**——坏配置对带 flag 的调用不可见、不报错（与 C7 casWaiver 的"flag 是人类意志、压过坏配置"先例一致）。

### B3. 消费点与错误矩阵（REQ-2/REQ-6 收口）

非法生效 pattern = `new RegExp(source)` 抛异常的源串。校验发生在**读取任何 spec 文件、启动任何 test command 之前**。错误继承各命令既有错误契约，`RegExp` 异常不得逃逸出库入口：

| 命令 | 合法配置行为 | 非法生效 pattern 行为 |
|---|---|---|
| `verify` | 无 flag 时回退配置行 | infra ERROR：`errors[]` 增加一条消息（flag 来源含 `--id-pattern`，配置来源含 `process-config`），文本模式 `error:` 前缀 + `RESULT: ERROR`，`--json` 用既有 verify ERROR shape（`result:"ERROR"`），exit 2，不跑 test command |
| `gate` | 新增 `--id-pattern` flag；无 flag 读配置；C1 两种 stage（in-flight 投影 / archived 全 store）均用生效 pattern | `runGate` 返回既有 `{result:'ERROR', errors:[...]}` 结构，文本 `gate:` 前缀，`--json` 保持纯 JSON shape，exit 2 |
| `check` | CK-04 用生效 pattern（**本 change 不给 check 加 flag**——CI 门应吃项目恒量，加 flag 制造新遗忘面）；root=cwd | `error:` 行 + `RESULT: ERROR`，exit 2（沿用现有 spec-store-missing 的 ERROR 通道） |
| `doctor` | D6 用生效 pattern 扫 store；D6 detail 中显示所用 pattern 来源（config/default） | D6 产生一条点名 `process-config` 的 `finding`（fix: 修配置行），**不扫场景、不抛异常**；无其他 unusable 条件时总结果 FINDINGS、exit 1（doctor 的职责是诊断可修问题，非法配置正是待诊断物；exit 2 仅保留给 doctor 自身既有 UNUSABLE 类） |

配置 CONFLICT（两行异值）与"process-config 存在但读取失败（目录/不可读）"同入此矩阵：消费时上浮为对应命令的配置错误（verify/gate/check exit 2；doctor D6 finding）；读取失败的兜底在共享 `getConfig` 层（不抛异常，返回 problem）。`doctor` 的 D5 探针继续用 DEFAULT_ID 解析 TAP 计数（其结果对 pattern 不敏感——parsed 总数 = results+untagged+unattributed；声明保持现状）。

### B4. 统一识别契约（REQ-4 收口）

四个消费点用**同一识别函数**（`leadId` 语义）：匹配必须从标题起始处开始；匹配串的后继字符若属 `[A-Za-z0-9_]` 则拒绝（截断匹配不算）；**不额外拼接 `\b`**；pattern 源串按原样编译（自带锚点/alternation 是作者的责任，工具不改写）。`check` 的 `checkScenarioIds` 从 `'^('+p+')\\b'` 改为复用共享识别函数。一致性测试覆盖：字母后缀、多段式、紧邻 `_`、紧邻字母数字、以非 word 字符结尾的 pattern、自带 `^` 的 pattern、含 alternation 的 pattern——四消费点判定一致。

### B5. 表格单元格中的 `|`（REQ-1/Q3 收口）

共享 `parseConfig` 按以下**逐字符切分算法**处理单元格（对所有键统一）：扫描行内每个 `|`，统计其**紧邻前方的连续反斜杠个数 n**——n 为奇数：最后一个反斜杠转义该 `|`（该反斜杠被移除，`|` 进入单元格值，前面 n-1 个反斜杠逐字保留）；n 为偶数（含 0）：该 `|` 是单元格分隔符，n 个反斜杠全部逐字保留于值中。`\|` 之外的反斜杠序列一律不做反转义（parseConfig 不是 Markdown 渲染器，`\\` 不折叠为 `\`——与 GFM 的差异声明于文档）。真值表（原始单元格片段 → 解析结果）：

| 原始 | 解析 |
|---|---|
| `a\|b` | 值含 `a|b`（pipe 入值） |
| `a\\|b` | 值止于 `a\\`（两个反斜杠字面保留），`|` 为分隔符，`b` 属下一单元格 |
| `a\\\|b` | 值含 `a\\|b`（三个反斜杠：移除转义者，余两个 + pipe 入值） |
| `a\\\\|b` | 值止于 `a\\\\`，`|` 为分隔符 |

由上表可知，值中 pipe 前的反斜杠数只能为偶数——正则源串 `\|`（反斜杠+pipe 的字面 pipe 转义）**不可经此通道表达**；需要在正则里匹配字面 `|` 时，**规范写法是字符类 `[|]`**（无需任何反斜杠，语义等价），文档必须给出此写法。这是 config-contract 的语义扩展：同步更新 `apriori/specs/config/spec.md`（新 scenario）与相关 KB 陈述，并为非 id-pattern 键（如 `test-cmd` 值含 `\|`）加兼容性测试。既有配置文件若含字面 `\|`（此前无法表达分隔符外的 pipe，实际不会出现于合法值），行为变化声明于 CHANGELOG。

### B6. 模板与文档（REQ-1/Q2、AC7 收口）

- `templates/process-config.md` 预置 `| id-pattern | [A-Z]+-\d+ | 裸 JS 正则源串；字面 pipe 写 \| | [A-Z]+-\d+ |` 行（值=内置默认，可发现性优先）。
- 必改文件清单（穷尽）：`docs/cli.md` + `docs/cli_cn.md`（verify/gate/check/doctor 四节 + 配置键说明：裸源串、`\|`、优先级、错误语义）、`templates/process-config.md`、`CHANGELOG.md`。README/RUNBOOK **不改**（RUNBOOK 是无状态协议文件，id-pattern 属项目配置，归 process-config 与 docs/cli 管辖）。

## 范围外（won't do）

- verify `--change` 语义收窄（"本 change 达标"）——独立 change `verify-change-scope`。
- MODIFIED 整块完整性检查——独立 change `modified-block-integrity`。
- hotfix 最小回写单元——本轮不做。
- 场景 ID 三态语义、`leadId` 词边界规则本身不动（复盘§三别改清单）；本 change 只统一"谁在用它"。
- `check` 不新增任何 CLI flag。
- 非 JS 生态接入附录（roadmap P2-11）。
- 除 B5 声明的 `\|` 语义外，process-config 其他解析行为不动；`doctor` D5 探针、超时/重试/并发语义均保持现状（ADV-2）。

## 验收标准（确定 oracle）

- AC1（配置生效，每消费点一条 if/then，共享 fixture：一个含 `AC-01`+`AC-08a`+`AC-BIS-01` 三场景的最小 spec + 覆盖 `AC-01` 的 TAP 桩）：配置行 `[A-Z]+(-[A-Z]+)*-\d+[a-z]*`、无 flag 时——
  - verify：3 identified / 0 UNIDENTIFIED（对照：无配置行时 1 identified / 2 UNIDENTIFIED）；
  - gate：C1 detail 不含 `unidentified`；
  - check：CK-04 零误报（exit 0，给定 store 无其他 fail）；
  - doctor：D6 `ok` 且 detail 注明 pattern 来源为 config（对照：无配置行时 D6 finding 列出 2 个无 ID 场景，detail 注明来源为 default）——来源文本两种情形都必须被测试断言。
- AC2（flag 覆盖）：verify/gate 同时给 flag 与配置行时按 flag 判定；且 flag 存在 + 配置行非法时**不报错**（配置未被消费）。
- AC3（错误矩阵，按 B3 表逐格）：非法 flag → verify/gate exit 2、消息含 `--id-pattern`；非法配置行 → verify/gate/check exit 2、消息含 `process-config`，doctor 为 D6 finding + FINDINGS exit 1；`gate --json`/`verify --json` 下 stdout 仍是既有纯 JSON ERROR shape、错误进 `errors[]`。
- AC4（默认回退）：无 flag、无配置行 → 生效 pattern 为 `DEFAULT_ID`，全部既有测试（现 254 个，数量不钉死）保持绿——无行为回归。
- AC5（`\|` 转义）：配置行值 `(AC\|BR)-\d+` 解析为正则 `(AC|BR)-\d+`（`AC-1`、`BR-2` 均识别）；`test-cmd` 值含 `\|` 同样反转义（兼容性测试）；B5 真值表四行（`\|`、`\\|`、`\\\|`、`\\\\|`）各有对应解析断言，并含"字面 pipe 用 `[|]`"的可识别用例；同时保留不含转义的既有配置回归样本（普通 `test-cmd`/`cas` 行、多列表格、fenced/comment 行）断言解析结果与现版本一致。
- AC6（真实样本对比，**flag 路径与配置路径都必须验证**，证据存本 change review/）：
  - flag 路径（样本只读原地）：改后 `gate --change dashboard-launch-surface-slim --id-pattern '[A-Z]+(-[A-Z]+)*-\d+[a-z]*' --test-cmd "cat apriori/tmp/all-full.tap"` → C1 detail `unidentified` 计数为 0（改前同命令无 flag：36 unidentified）；
  - 配置路径（样本副本，副本中 process-config 加 id-pattern 行）：同命令无 flag → 同样 0 unidentified；
  - 剩余 unbound 为真实缺口（样本 TAP 存档未覆盖的历史场景），记录确切计数入证据文件；
  - 证据文件必须记录不可变身份：样本 `git rev-parse HEAD`、本 CLI 版本与 commit、实际命令全文、副本相对原样本的 process-config 差异、`identified`/`unidentified`/`unbound` 确切计数。
- AC7（文档）：B6 清单中每个文件都有对应改动；EN/CN 成对；CHANGELOG 有条目；`apriori check --self` 绿。

## 需求裁定记录（对 r2 评审）

- REQ-7：B5 改为逐字符奇偶算法 + 真值表；值中 pipe 前反斜杠数恒为偶数的推论显式声明；regex 字面 pipe 的规范写法定为字符类 `[|]`（不引入二层转义）；AC5 补四个边界用例。
- r2 advisories（3 条）：样本不可变身份入 AC6；doctor 来源 detail 断言入 AC1；非 regex 键回归样本入 AC5。

## 需求裁定记录（对 r1 评审）

- REQ-1：Q1=check 不加 flag；Q2=模板预置默认值行；Q3=共享 parseConfig 全键统一 `\|` 反转义 + config-contract spec/KB 同步 + 兼容性测试。
- REQ-2：按 B3 矩阵；doctor=finding+exit1（诊断而非拒诊），verify/gate/check=exit 2。
- REQ-3：继承 config-contract 全部边界；空值=共享解析器现行"行不存在"语义（**声明+测试，不更改**——单键特例化空值语义会破坏全键一致性，正是 REQ-4 要避免的分裂；fail-closed 的保护由"配置行在模板中预置、doctor D6 显示 pattern 来源"提供可见性）；读取失败在 getConfig 层兜底为 problem；flag 覆盖坏配置不报错。
- REQ-4：按 B4 单一识别契约，check 改为复用。
- REQ-5：AC 全部重写为确定 oracle；AC4 不钉测试数量；AC6 双路径必做 + 确切计数入证据。
- REQ-6：按 B3 矩阵继承各命令既有输出契约。
