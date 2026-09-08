# req-review-v2 — archive-preflight requirement review（Round 2）

评审基于静态读取；未运行测试，未修改文件。

## Round-1 findings verification

### REQ-1 — REOPEN

V2 已正确补全 C2/C3/archived-C4 判据，并用 AC-AP-17/18限定了 `--force`；但 B2 的充分性命题仍有反例。

`resolveChange()` 在 active bundle 移走后，会选择同名 archived 目录中字典序最后的时间戳目录。当前 archive 允许同名历史 archive 与新的 active bundle 共存。若已有一个未来时间戳或因时钟回拨而排序更后的同名 archive，新 bundle 即使 readiness 通过并成功移动，紧接着的 `gate --change X` 仍会检查另一个 bundle，其 C2/C3/C4 可以 BLOCK。该反例没有使用 force，也没有并发修改刚归档的 bundle。

建议增加以下任一约束并验收：

- archive preflight 拒绝会导致新目录不是 resolver 所选目录的同名历史布局；
- B2 增加“gate 实际解析到本次刚移动的 bundle”的限定，并使该限定可机械保证；
- 或提供按确切 archived path 检查的方式。

AC-AP-17 应覆盖已存在同名、排序更后的 archive 目录以及时钟回拨情形。

### REQ-2 — VERIFIED

§5.2–5.4 已覆盖：

- flow-state 失败时 tier 不可知，因而不臆测 R2/R3；
- trivial 与 medium/large 的 tasks/ledger 缺失差异；
- symlink、非文件、坏祖先、逃逸及读取期异常；
- `review/` 根的独立保护；
- 进度失败与格式/证据失败的 force 边界；
- 结构性失败不可 force。

AC-AP-04、05、06、10 已使这些分支可测试。原问题已解决。

### REQ-3 — REOPEN

高层 `archive --change` 的 ABANDONED/结构失败 force 路径已关闭，但仍有三个缺口：

1. **单文件形式可绕过全部 readiness。** 当前单文件形式支持  
   `--store … --delta … --change X --write --changes-dir <dir>`，并会移动 `<dir>/X`。因此一个 `current-step: ABANDONED` 的正式 bundle 仍可通过该形式写 store 并被移动。AC-AP-13/O4 的“完全不受影响”与 RUNBOOK 的 ABANDONED 硬规则冲突。
2. **waiver matrix 自相矛盾。** §四把“无理由 `rejected`”列为可 force；§5.3 又正确地将任何 `rejected*` 缺理由归为不可 force 的格式错误。两种实现都能从文档找到依据。
3. `tasks`/`ledger` 失败类标识只要求“含有”，没有像 `archive-preflight-waiver` 一样声明精确 token、大小写和边界规则；授权证据不应允许子串误配。`NOTE:` 还应按实际豁免类精确声明 C2、C4 或两者会 BLOCK，而不是无条件写成 C2/C4 都会 BLOCK。

建议：

- 当单文件形式带 `--changes-dir`、因而实际消费并移动正式 bundle 时，也执行同一 readiness；或者禁止该形式移动正式 bundle。纯粹不带 bundle/move 的单文件 surgery 可继续不受影响。
- 明确“无理由 rejected”不可 force；只有带理由但缺 reviewer concurrence 的 plain `rejected` 属进度类。
- 将 `tasks`、`ledger` 定义为大小写规则明确的精确 token，并增加子串负例。
- AC-AP-10 增加单文件 + ABANDONED 绕过测试。

### REQ-4 — VERIFIED

允许集合已收窄为 `{STEP6}`；STEP5 的拒绝理由与 RUNBOOK 状态机一致，`gate-degrades` precedent 也正确。`DONE` 诊断不再错误推断物理位置，ABANDONED 明确不可 force。原问题已解决。

### REQ-5 — REOPEN

`containsRealAllowingMissing` 的搬迁方案本身可行：

- 新函数可与 `resolve.containsReal` 并存；
- `archive-merge` 原名 re-export 可保持 doctor、managed、check、spec-runner 等现有消费者行为；
- `archive-merge → readiness → resolve/status` 不成环；
- preflight 插入顺序也已明确。

但三个 checker 的结构仍不唯一，尤其是 C3：

- gate 的现有 C3 接受词汇表内所有步骤；
- archive readiness 只接受 `STEP6`；
- §9.2 只声明一个 `checkFlowStateReady` 且 gate 也从 readiness 引入；
- 若 gate 直接使用它，gate 将在 STEP0–STEP5 全部 BLOCK，破坏 state A；
- 若 gate 保留完整词汇表而 archive 额外收窄，AC-AP-16 的“C3 逐项一致”对 STEP0–STEP5 又不成立。

建议明确 API，例如：

- `checkFlowState(state, name)` 拥有 gate 原有 C3；
- `checkArchiveFlowState(state, name)` 先调用前者，再施加 `STEP6` 限制；
- gate 只使用前者，archive 使用后者；
- AC-AP-16 对共享的 C3 基础判据要求相等；对 step 限制改断言为“archive pass ⇒ gate C3 pass”，并单独测试合法但非 STEP6 时 archive block、gate C3 pass。

同时给三个 checker 写明参数、返回 shape 和 archive-specific composition，才能真正实现为唯一结构。

### REQ-6 — REOPEN

“不加锁、声明稳定 bundle 前置条件、明确不声称检测 TOCTOU”是诚实且可接受的方向；未发现 V2 仍声称 crash durability 或并发检测。

但前置条件的结束点只写成“bundle 移动完成”，而 high-level archive 明确支持：

- dry-run：不移动；
- `--write` 无显式 `--changes-dir`：写 store 但不移动；
- commit 后 move 失败：bundle 永远未完成移动。

这些合法路径上，前置条件区间没有定义终点。建议改成“从 readiness 首次读取至本次 archive 调用返回；若调用包含 move，则至少覆盖至 move 完成”，并分别声明 dry-run、write-without-move、move-failure 的边界。AC-AP-19 应明确测试哪一种调用形式，最好覆盖 move 与 no-move 两条路径。

### REQ-7 — REOPEN

§七处理了两个主要 helper，但迁移清单仍不完整。静态源码中还有多组现有成功路径不会经过这两个 helper：

- `test/config.test.js` 的 `proj()` 只有不完整的 medium flow-state，无 tasks/ledger；CF-01/02/03/05 的 archive 成功分支会被 readiness 改成失败。
- `test/archive-change.test.js` 的 `bundleProject()` 只有 `change`/`tier`，无合法 STEP6 flow-state 和 tasks；AM-36–39 的成功路径会失败。
- AM-26、AM-33、AM-34 的若干 standalone `mkProject()` 成功 fixture 没有 ready bundle。
- 其他直接调用 `archiveChange()` 的成功 fixture 也需要逐一判断是应补 readiness，还是因现有 preflight 先失败而保持不变。

“其余 archive 测试与 readiness 正交”不等于它们无需 ready fixture。AC-AP-20 最终会发现失败，但 requirement 的迁移计划仍会把实现者送进额外返工。

建议静态枚举所有 high-level archive 成功调用，至少补入 `config.proj`、`bundleProject` 和 standalone AM-26/33/34；可抽出统一的 ready-bundle fixture，避免多套状态再次漂移。

## New findings

### REQ-8 — 共享安全读取 checker 会改变 gate 的现有行为，但该变化未声明

- **描述**：V2 一方面要求 readiness 的 tasks/ledger 读取全部经过 `fileReadDefect`，另一方面要求 gate 与 archive 使用同一 checker。当前 gate 的 C2 直接读取 `tasks.md`，C4 直接读取 `review/issues.md`；叶文件 symlink 会被跟随，读取异常也可能直接抛出。共享新 checker 后，gate 会改为结构化 BLOCK，且 C2 诊断还可能新增“首个未勾项文本”。这是用户可见且涉及路径安全的 gate 行为变化，不是纯内部重构。
- **风险**：med。若实现者保持 gate 原行为，AC-AP-16 和安全同源目标失败；若采用新 checker，gate 的 state-A 合约和输出在没有规格声明的情况下改变。
- **建议修复**：明确把 gate C2/C4 的安全读取 hardening 纳入触及范围，更新 gate living spec/KB，并增加 gate-side AC：tasks/issues 叶 symlink、非文件、读取异常分别结构化 BLOCK，正常输入的既有结论保持不变。若不准备改变 gate，则不能宣称两个命令复用完整 checker，需重新定义共享边界。

## 六个 P1 维度复审

### 1. 目标状态 B 是否清晰、无歧义

**结论：未通过。**

B2 对同名 archived resolution 仍有反例（REQ-1）；C3 checker 的 archive-specific composition 未定（REQ-5）；单文件 bundle-move 与 no-move 并发边界仍未闭合（REQ-3、REQ-6）。

### 2. 边界、异常及回滚路径是否覆盖

**结论：未通过。**

普通 artifact 缺失和读取异常已覆盖，但单文件 ABANDONED 绕过、同名 archived bundle 选择和 no-move 前置条件仍是缺失边界（REQ-1、REQ-3、REQ-6）。

### 3. 是否存在隐含但未声明的状态变化或副作用

**结论：未通过。**

共享安全 checker 会改变 gate C2/C4 对 symlink、非文件、读取异常及部分诊断文本的行为；该 side effect 尚未进入目标、spec 迁移或 AC（REQ-8）。

### 4. 验收标准是否均可测试

**结论：未通过。**

多数 AC 已可直接表达为 if/then，但：

- AC-AP-16 无法同时满足 gate 的全步骤 C3 与 archive 的 STEP6-only C3；
- AC-AP-17 未覆盖 resolver 选中另一同名 archive 的反例；
- AC-AP-19 未说明 no-move/move-failure 的前置条件区间；
- AC-AP-10/13 未覆盖单文件形式移动 ABANDONED bundle；
- waiver class marker 的匹配规则仍不足以写出唯一断言。

### 5. 是否与 state A 冲突

**结论：未通过。**

- 单文件 `--changes-dir` 当前确实会移动正式 bundle，与 O4/ABANDONED 保证冲突（REQ-3）。
- gate 当前的 C3、C2/C4 文件读取与 V2 的共享 checker 方案存在未声明差异（REQ-5、REQ-8）。
- dry-run/高层 archive 测试迁移仍漏掉多个现有成功 fixture（REQ-7）。

`containsRealAllowingMissing` 的搬迁和原名 re-export 本身与 state A 相容。

### 6. lineage 是否声明且符合仓库现实

**结论：通过。**

当前仍为 `brownfield-round2`；`main` 与 merge-base 均为 `235a121`，HEAD 为 `f415824`。仓库版本为 v4 主线，最终目标 main 且禁止 v1/v3 的声明正确。

## Out-of-scope 检查

存在明确的 O1–O8。O4 目前与单文件形式实际可移动正式 bundle 的行为冲突，需按 REQ-3 修订；O7 的时间区间需按 REQ-6补全。除此之外，out-of-scope 边界明确。

## Advisories

无。本轮保留或新增的发现均属于假命题、目标歧义、遗漏边界、安全相关副作用或与 state A 的冲突。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | AC-AP-15 的充分性承诺不成立：R1/R2/R3 未覆盖 gate 完整 C2/C3/C4 判据 | high | 1 | open |
| REQ-2 | tasks/ledger 缺失及 readiness 文件的 unsafe/unreadable 路径语义未定义 | high | 1 | verified |
| REQ-3 | `--force` 的证据协议和可豁免范围不明确，并可能 force 掉 ABANDONED 硬禁令 | high | 1 | open |
| REQ-4 | 允许 STEP5 归档与 RUNBOOK 的 STEP5→STEP6 状态机及实际 precedent 冲突 | high | 1 | verified |
| REQ-5 | 共享分类器归位、完整共享 API 和 readiness 相对既有 preflight guards 的顺序未定 | med | 1 | open |
| REQ-6 | readiness 检查到 commit/move 之间的并发修改与 TOCTOU 未覆盖 | high | 1 | open |
| REQ-7 | B5 与现有 AM-13/AM-46/AM-47 测试及 living spec 冲突，迁移范围未声明 | med | 1 | open |
| REQ-8 | 共享安全读取 checker 会改变 gate C2/C4 的现有行为，但该 side effect 未声明、未验收 | med | 2 | open |

VERDICT: 6 issues open
