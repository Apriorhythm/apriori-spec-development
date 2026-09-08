# req-v1 — verify-change-scope："本 change 达标"成为一等公民，历史缺口出 verdict 入报告

target lineage: main（v4 产品线；不合并 v1/v3）

## 背景（现状 A，实测证据）

多 change 并行的棕地 store（真实样本副本 ~/tmp/sample-replica，83+ 活跃场景、19 归档 change、复活 1 个活 change dashboard-bugfix-batch3，id-pattern 配置行已就位，真实 TAP 存档复放）：

- `verify --change dashboard-bugfix-batch3`：投影 = 全 store + 本 delta → **107 个场景全部被要求**，61 UNBOUND + 2 ORPHAN + 42 unattributed → GAPS。本 change 自己的 9 个场景（2 green / 7 unbound）淹没在里面，肉眼不可分辨。
- `verify --specs <本change delta>`：9 个场景干净了，但别的 change/存量的测试全部误判 **ORPHAN 46**（它们绑定的场景不在 delta 里）→ GAPS。
- 复盘定性："本 change 是否达标"要跑两个命令再人工写一段解释，每个 change 重写一遍（落地时 8 个并行 change，每次归档都要写免责说明）。
- 机制层根因：工具把"**store 的健康**"与"**本 change 的达标**"混在同一个 verdict 里。棕地需要两个问题分开回答、且都有一等公民形态。

## 目标（目标态 B）

### B1. `verify --change <name>` 的 verdict 收窄为"本 change 达标"

- **change 范围**定义（在既有投影之上，投影机制不变——merge 冲突/CAS/hygiene 检查全保留）：
  - **本 change 场景集** = 该 change delta 中 ADDED/MODIFIED 块在**投影后**所含的场景 ID（MODIFIED 取替换后的块内容；REMOVED 块的场景不再要求；RENAMED 取改名后的 ID）；
  - **本 change 测试集** = TAP 中 leading ID ∈ 本 change 场景集的结果行。
- **verdict（exit 0/1 的判据）只看 change 范围**：本 change 每个场景 ≥1 个 passing 测试、无 red、（change 范围内）无 duplicate、delta 内无 unidentified → GREEN。
- **范围外测试不判 ORPHAN**：绑定到投影 store 中其他场景的测试是别人的事；leading ID 在**整个投影 store 中都不存在**的测试仍是 orphan——但记入 store 报告（见 B2），不进本 change verdict。
- **unattributed failures（无 ID 的 not ok）**：不属于任何 change，移入 store 报告，不进 change verdict（现行为是全局判死——收窄后多 change 并行时别人的红测试不再枪毙本 change；此为语义变化，需显式声明与评审）。
- infra ERROR（exit 2）类不变：投影失败、TAP 不可信、id-pattern 非法等照旧全局 fail-closed。

### B2. store 视角保留为**同一次运行的信息性报告**

`--change` 运行的输出分两段：①**change verdict 段**（判 GREEN/GAPS 的唯一依据）；②**store report 段**（信息性）：全投影 store 的 UNBOUND / true-ORPHAN / unattributed failures 计数与清单——历史缺口持续可见但不再有噪音伤害。`--json` 同步新增结构化字段（既有字段语义与形状的兼容性需显式声明——机器消费者在用）。store 健康的独立判定形态维持现状：post-archive 的 `--specs` 形式不动。

### B3. gate C1（in-flight）随之变为"本 change 达标"

C1 的 in-flight 分支消费收窄后的 verdict——多 change 并行时各 change 的 gate 可独立变绿（复盘 P0-2"各自独立可绿"的诉求）。archived 分支（全 store）不动。C1 detail 附 store report 摘要（信息性）。

### B4. 文档与流程文字同步

- RUNBOOK.md / RUNBOOK_cn.md §4 STEP5 对 `verify --change` 的描述（"projected form"段）更新为两段式语义；runbook-version 是否需要动由评审裁（CLI major 未变）。
- docs/cli*.md verify/gate 节；CHANGELOG 条目（行为变化显式声明）。

## 范围外（won't do）

- MODIFIED 块完整性检查——change `modified-block-integrity`。
- hotfix 通道——本轮不做。
- `--specs` 形式与 post-archive 语义、场景 ID 三态词汇（BOUND-GREEN/UNBOUND/ORPHAN/UNIDENTIFIED 的定义本身）不动——复盘§三别改清单（三态"各立过一功"）；本 change 只改**哪些东西计入哪个 verdict**。
- 跨 change 的协调视图（"所有活 change 一起看"）——不做。
- id-pattern 机制（上一 change 已定）不动。

## 验收标准（确定 oracle）

- AC1（fixture：store 2 个 Requirement 各 1 场景 XA-01/XB-01；change delta ADDED 1 个 Requirement 含 XC-01；TAP：XA-01 ok、XC-01 ok、XZ-99 ok、1 条无 ID not ok）：`verify --change` → **GREEN exit 0**（XC-01 绑定即达标）；store report 段列出 XB-01 UNBOUND、XZ-99 orphan、1 条 unattributed；`--json` 的 change 段 clean=true。对照现行语义：同 fixture 现在是 GAPS。
- AC2（本 change 有缺口）：XC-01 无测试 → GAPS exit 1，change 段 UNBOUND=[XC-01]；XC-01 not ok → GAPS，boundRed=[XC-01]。
- AC3（MODIFIED/REMOVED/RENAMED 语义）：delta MODIFIED 某块（替换后含 XA-01+新场景 XA-02）→ 两者都进 change 范围；REMOVED 块场景不被要求且其测试进 store report 的 orphan；RENAMED 后按新 ID 要求。
- AC4（范围内严格性）：delta 内 unidentified 场景 → 判入 change verdict（GAPS/ERROR 按现行 unidentified 语义）；change 范围内 duplicate ID → 不 GREEN。
- AC5（gate）：多 change fixture（两个活 change，各自场景+测试独立）→ 各自 `gate --change` 的 C1 同时 pass；一个 change 的 red 测试不影响另一个的 C1。
- AC6（真实样本对比，证据入 review/）：副本上 batch3 复活 + id-pattern 行——改前 `--change` = 107 场景 61 UNBOUND 2 ORPHAN 42 unattributed GAPS；改后 `--change` 的 change 段只含 batch3 的 9 个场景（2 green / 7 unbound → GAPS，**缺口终于是本 change 自己的**），store report 段计数与改前全局数一致；`--specs <delta>` 的 46 ORPHAN 误报不再是判达标的必要步骤。记录不可变身份（样本 HEAD、CLI、命令、确切计数）。
- AC7（兼容）：无 `--change` 的一切形式行为不变；`--change` 的 infra ERROR 类不变；284 存量测试保持绿（数量不钉死）。
- AC8（文档）：RUNBOOK 双语 STEP5 段、docs/cli 双语 verify/gate 节、CHANGELOG；`check --self` 绿。

## 开放问题（评审请裁）

- Q1：`--json` 兼容策略——顶层 `clean/result` 直接改为 change 语义（消费者少、变化声明于 CHANGELOG）还是新增并列字段保双语义？（倾向前者：--change 的机器消费者就是 gate 与 CI，本来就想要"本 change 达标"。）
- Q2：unattributed failures 移出 change verdict 是否过宽？（倾向移出但在 store report 置顶显示；无 ID 的红是 store 级问题，多 change 并行时归属不明。单 change 仓库里它仍会被人看到。）
- Q3：RUNBOOK 文字的变更幅度——只改 §4 STEP5 投影段描述，还是同时在验证矩阵处补一句两视角？（倾向最小：投影段 + 一句话。）
