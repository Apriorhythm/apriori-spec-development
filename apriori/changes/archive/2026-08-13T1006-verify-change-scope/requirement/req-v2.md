# req-v2 — verify-change-scope："本 change 达标"成为一等公民，历史缺口出 verdict 入报告

target lineage: main（v4 产品线；不合并 v1/v3）

## 背景（现状 A，实测证据）

同 req-v1（副本复现：`--change` 107 场景 61 UNBOUND 2 ORPHAN 42 unattributed 淹没；`--specs <delta>` 46 ORPHAN 误报；"达标"需两命令+人工解释）。

## 目标（目标态 B）

### B1. change 范围：按 Requirement 块 provenance 定义（REQ-2 收口）

- **change 块集** = 投影后 store 中，由本 delta 的 ADDED / MODIFIED / RENAMED 操作产出或改名的 **Requirement 块**（含 idempotent rerun 的 unchanged 路径——块内容相同仍属本 change 块集；REMOVED 产出的 deprecated 块不属于）。
- **change 场景集（occurrence 级）** = change 块集内的全部场景 occurrence；其 ID 集用于测试归属。
- **RENAMED 语义沿用 state A（REQ-1 收口）**：只改 Requirement 名，块内场景 ID 原样保留（SR-19 不动）；change scope 含改名后目标块的场景；场景 ID 变更必须由 MODIFIED 显式表达。
- **本 change 测试集** = TAP 中 leading ID ∈ change 场景 ID 集的结果行。
- **change verdict（exit 0/1 判据）**：change 场景每个 ≥1 passing、无 red；**duplicate**：任一 change 场景 ID 在整个投影中出现 >1 次（不论另一 occurrence 在不在 change 块集内）→ 不 GREEN（绑定歧义伤及本 change）；完全发生在 change 块集外的 duplicate → 只进 store report。**unidentified**：change 块集内的 unidentified occurrence → 计入 change verdict（不 GREEN）；块集外 → store report。

### B2. store report：同一运行的**完整**信息性评估（REQ-3 收口）

`--change` 输出两段：①change verdict 段（唯一判据）；②store report 段——对**整个投影 + 同一份 TAP 结果**的完整评估，六类全列：`boundRed` / `unbound` / true-`orphan`（leading ID 在整个投影中不存在的测试）/ `unidentified` / `unattributedFailures` / `duplicates`（各类给 count + 清单，human 输出沿用现行每类逐行、unattributed 现行 20 条截断规则；`boundGreen` 只给 count 不展开）。范围外 tagged red / duplicate / unidentified **不阻断** change verdict，但**必须**出现在 store report——不允许任何信息丢失。

### B3. 单次执行契约（REQ-7 收口）

每次 `verify --change`：恰好一次 `buildProjection`、一次 `runTestCommand`、一次 TAP parse、一个 resolved matcher；两段共享同一内存投影与同一 TAP 结果快照。pre-test ERROR（投影失败/pattern 非法/标题批 matcher 失败）照旧不执行 test command；不新增任何 timeout/rollback 语义；matcher 的 2000ms 子进程预算不变。

### B4. exit 语义与 D-SR-x 的 --change 限定（REQ-5 收口）

- infra ERROR（exit 2）类完全不变。
- **仅对 `verify --change`**，非零 `exec.status` 的规则限定为：非零状态**可由已解析的失败解释**（范围内或范围外的 tagged red，或 unattributed failure——即 `failCount > 0`）且无 infra error 时，不再强制非 0 退出——change verdict clean 则 **GREEN exit 0**（范围外失败已完整呈现在 store report）；非零且 `failCount === 0`（无已解析失败可解释）→ 照旧 ERROR exit 2。
- `--specs` 形式与 D-SR-x 原文完全不动；本限定作为 D-SR-x 的 scoped amendment 记入 CHANGELOG 与（归档时）truth Decisions。

### B5. 零范围真值表（REQ-6 收口）

| 情形 | 判定 |
|---|---|
| change scope 空 + delta 有合法操作（如 removal-only）+ 投影非空 | change verdict **GREEN（vacuous-by-design）**，报告显式标注 `0 scenario(s) in change scope (removal-only change)`；REMOVED 场景的 lingering 测试进 store report 的 orphan |
| change scope 空 + 整个投影零场景 | **ERROR exit 2**（沿用 D-SR-1 全局 vacuous 拒绝——投影空是 store 级 infra 事实） |
| change 块集内只有 unidentified 场景（scope 的 ID 集空但 occurrence 非空） | **GAPS exit 1**（unidentified 计入 change verdict，B1） |
| delta 零操作/malformed | 现行投影失败路径不变（ERROR exit 2） |

D-SR-1 的全局面（投影零场景/零文件 → ERROR）原样保留。

### B6. 输出契约定稿（REQ-4/Q1 收口）

- **JSON（`--change` 运行）**：顶层 `clean` / `result` / `boundGreen` / `boundRed` / `unbound` / `orphan` / `unidentified` / `unattributedFailures` **改为 change 语义**（Q1 裁定：--change 的机器消费者即 gate/CI，本就要"本 change 达标"；行为变化入 CHANGELOG）；新增恒存在字段 `storeReport`（GREEN/GAPS 两类恒有；ERROR 类照现行——errors-run 不含绑定数据时 storeReport 亦缺省，声明之）：`{ boundGreen: <count>, boundRed: [...], unbound: [...], orphan: [...], unidentified: [...], unattributedFailures: {count, lines}, duplicates: [...] }`；`projection` 形状不变；`specFiles`/`exec` 属整个投影/运行不变。`--specs` 运行的 JSON 完全不变（无 storeReport）。
- **模块 API（`verify()` run 对象）**：`run.verdict` 等既有字段改按 change 语义（--change 时）；新增 `run.storeReport`（同上结构的原始形态）与 `run.changeScope = { requirements: [...], scenarioIds: [...] }`；`--specs` 运行不带这两个字段。`formatReport` 接受可选 storeReport 段渲染。
- **gate C1（in-flight）**：消费 change 语义 verdict 与 change 范围 duplicates；detail 变为 `verify GREEN (in-flight, change-scoped)` / `verify GAPS: <change 范围各类计数>`，尾缀追加 `; store: <boundRed>/<unbound>/<orphan>/<unattributed> outstanding`（纯文本摘要，JSON 的 checks[].detail 仍是字符串——gate JSON shape 不变）。archived 分支不动。

### B7. 文档同步（Q3 收口：最小幅度）

RUNBOOK.md/RUNBOOK_cn.md §4 STEP5 投影段改写两段式语义（verdict=change 达标；store report=信息性），验证矩阵处加一句两视角；runbook-version 不动（4.0 内行为细化，CLI major 未变——评审可再裁）。docs/cli*.md verify/gate 节；CHANGELOG 显式声明三处行为变化（--change verdict 收窄、JSON 字段语义、D-SR-x 限定）。

## 范围外（won't do）

同 req-v1（MODIFIED 完整性、hotfix、--specs/三态定义不动、跨 change 协调视图不做、id-pattern 机制不动）；另加：不改 archive 语义、不改 `merge()`。

## 验收标准（确定 oracle）

- AC1（一等公民）：fixture——store `### R-A`(XA-01)+`### R-B`(XB-01)；delta ADDED `### R-C`(XC-01)；test-cmd 输出 `ok XC-01`、`ok XA-01`、`ok XZ-99`、`not ok`（无 ID）后 `process.exit(1)`。`verify --change` → **GREEN exit 0**；storeReport：unbound=[XB-01]、orphan=[XZ-99]、unattributed.count=1、boundRed=[]；`--json` 顶层 clean=true 且 storeReport 恒在。（对照断言：同 fixture 在 `--specs apriori/specs` 下现行为不变——GAPS。）
- AC2（change 缺口）：XC-01 无测试 → GAPS exit 1 且 unbound=[XC-01]（change 段）；XC-01 not ok → GAPS 且 boundRed=[XC-01]。
- AC3（操作语义）：MODIFIED 替换后块含 XA-01+XA-02 → 两者皆 in scope；REMOVED 块场景不被要求、其 lingering 测试 → storeReport.orphan；RENAMED `R-A -> R-G`（块含 XA-01）→ XA-01 in scope 且 ID 不变（SR-19 兼容）。
- AC4（范围内严格）：change 块内 unidentified → 不 GREEN；change 场景 ID 与块外 store 场景撞 ID → 不 GREEN（duplicate 进 change verdict）；纯块外 duplicate → GREEN 可达 + storeReport.duplicates 列出。
- AC5（gate 独立变绿）：两个活 change（场景/测试互不重叠，另有一红测试属 change-B 范围）→ change-A 的 `gate --change` C1 pass（detail 含 change-scoped 与 store 摘要尾缀）、change-B 的 C1 blocked；同一 fixture 下测试命令 exit 1 不影响 change-A 的 C1（B4 限定生效）。
- AC6（真实样本对比，证据入 review/，含不可变身份）：副本 batch3——改前 `--change`＝107 场景 61 UNBOUND 2 ORPHAN 42 unattributed GAPS；改后 change 段仅 batch3 的 9 场景（2 green/7 unbound → GAPS，缺口属于本 change），storeReport 计数与改前全局一致（61/2/42 保持可见）；无需再跑 `--specs <delta>`。
- AC7（兼容）：`--specs` 一切形式 byte 级行为不变；`--change` infra ERROR 类不变（含"非零且 failCount=0 → ERROR"反例断言）；单次执行契约——sentinel test-cmd 计数恰好 1 次 spawn；存量测试保持绿（数量不钉死，现 284）。
- AC8（零范围真值表）：B5 四行各有对应断言（removal-only GREEN + 标注文案；空投影 ERROR；scoped-unidentified GAPS；malformed 不变）。
- AC9（文档）：RUNBOOK 双语 STEP5 段 + 验证矩阵一句、docs/cli 双语 verify/gate 节、CHANGELOG 三处变化声明；`check --self` 绿。

## 需求裁定记录（对 r1 评审）

- REQ-1：RENAMED 沿用 state A（只改 Requirement 名、场景 ID 保留、SR-19 不动）；AC3 oracle 重写。
- REQ-2：scope 改为 Requirement 块 provenance（occurrence 级）；duplicate/unidentified 的 change/store 边界逐类裁定（B1）。
- REQ-3：store report 定义为完整六类评估（B2），范围外 red/duplicate/unidentified 必须可见。
- REQ-4：JSON/模块 API/gate detail 契约钉死（B6）；Q1 裁定顶层字段改 change 语义。
- REQ-5：D-SR-x 加 --change 限定（非零可解释 + 无 infra + change clean → GREEN；不可解释非零照旧 ERROR）；AC1/AC5 显式 exit 1 fixture + AC7 反例。
- REQ-6：零范围真值表（B5），D-SR-1 全局面保留。
- REQ-7：单次执行契约（B3）+ AC7 sentinel 断言。
