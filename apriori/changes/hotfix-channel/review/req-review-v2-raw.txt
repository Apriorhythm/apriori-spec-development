<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r2 transport=codex-exec-wsl-proxy -->

# req-review-v2 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v2.md`

评审标准：本 change 为 design-first；不要求 Q1–Q5 在 requirement 阶段预先选定，只检查候选空间、后果、约束和 acceptance 是否完整且诚实。

## r1 九项逐条核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-1 | verified | B2 已补两种位置方案的生态代价，并声明专名状态文件互斥、禁止互转、人工升格和同名拒绝。 |
| REQ-2 | reopened | 已增加候选 d，但批准内容的新鲜度和持久证据仍不完整，见下文。 |
| REQ-3 | reopened | 数据格式和错误谱已明显补强，但 truth 并发写入与 ID 分配竞态仍未进入决策空间。 |
| REQ-4 | reopened | 分段失败已声明，但 truth preflight 错误与第二段 commit 错误的边界相互矛盾。 |
| REQ-5 | reopened | 已列三种机制，但声明载体、语法以及合法 no-test 对全局 verify 的后果仍未闭合。 |
| REQ-6 | reopened | AM-17 例外已正确隔离；但 hotfix 对现有 gate 七项检查的适用关系仍未定义。 |
| REQ-7 | verified | B7 与 AC7 已覆盖 conclusion/header 的完整负向错误谱。 |
| REQ-8 | verified | AC1 已给出逐类命令数、文件数、计时边界和明确阈值。 |
| REQ-9 | verified | AC8 已诚实改为基于声明输入的重构 fixture，并要求标注非原件及冻结断言。 |

## 正式 findings

### REQ-2 — 两步签收没有绑定被批准内容

风险：候选 d 可能把“人看过 A”误当成“批准写入 B”，却宣称保持了现行 gate④ 语义。

依据：

- B8 的证据只有 dry-run 输出和第二命令的存在。
- 没有规定 dry-run 与 `--approve` 之间如何绑定同一份 bundle、spec base 和 truth base。
- 两次命令之间 bundle、store 或 truth 均可能变化；第二命令若重新计算后直接写入，人类看到的 diff 已经过期。
- dry-run 输出也没有被要求持久化到 bundle，第二命令的存在不能证明人类批准了哪一份内容。
- B4 明确支持失败重跑，使“批准是否仍有效”成为正常路径而非理论竞态。

决策空间应补充 approval freshness 的候选及后果，例如 digest/token 绑定、输入变化强制重新呈阅，或明确接受“批准不绑定内容”的纪律弱化；无需现在选定。

### REQ-3 — truth 追加缺少并发保护与 ID 分配竞态语义

风险：两个 hotfix 并行追加同一 truth 文件时可能发生 ID 碰撞、lost update，或让最终条目不同于人类 dry-run 时批准的条目。

依据：

- B3 在“按现有条目计数自动分配 ID”和“作者手写 ID”之间留待裁决，却没有陈列两者的并发和重跑后果。
- B4 只声明 CAS 用于第①段 spec stores；truth Decisions 没有 base stamp、compare-and-swap、锁或写前重读规则。
- 两个归档可在同一 truth base 上生成相同 `<n>`；即使单文件用 atomic rename，若没有 CAS，后写者仍可能覆盖先写者。
- 自动分配还会使 dry-run 和稍后的 approve 获得不同 ID；作者手写则需要明确 collision 的检查时点和竞态处理。
- “同 ID 同内容 no-op、异内容 conflict”只定义了已观察到冲突时的逻辑，没有防止 preflight 后到 commit 前的 TOCTOU。

需要把 truth 并发策略及各候选的代价纳入 gate③ 设计空间。

### REQ-4 — truth 错误的 zero-write 与分段失败语义冲突

风险：实现者可能在 spec stores 已提交后才发现 malformed Decisions 或非法 truth 目标，违反 B3/AC5 的“整体拒绝零写入”。

依据：

- B3 将目标不存在、缺失或重复 Decisions 节、symlink/escape、malformed 条目定义为整个归档拒绝且零写入。
- AC5 也要求这些错误整体拒绝零写入。
- B4 却笼统规定第②段失败时第①段已经提交，并只明确 CAS 在第①段前执行，没有声明 truth 的全部确定性校验属于全局 preflight。
- 因而“第②段失败”同时可能表示应当 zero-write 的验证错误，也可能表示允许 spec 已提交的 I/O fault。

应明确区分 global preflight failures 与 commit-time injected failures，并声明所有 spec/truth 输入、目标、格式及冲突检查在任何写入之前完成。

### REQ-5 — no-test 契约仍有三处未闭合

风险：AI 无法确定 metadata 写在哪里、什么算合法声明，以及一个合法 no-test 是否会永久破坏全局 verify/gate。

依据：

1. B5 只说 requirement 块“在 bundle 中”有 `tests:` 或 `no-test:` 行，没有固定载体。若这些行位于 delta Requirement block 内，state A 的 ADDED/MODIFIED 整块 merge 会把流程 metadata 写入 living spec；若位于独立 manifest，又缺少 requirement 到声明的机器映射。
2. 没有定义空值、重复行、同时存在两种行、未知 Requirement、一个 Requirement 内多 scenario 等语法和错误语义；AC3只测“缺失”，不足以验证机器契约。
3. state A 的 `verify` 不识别 no-test exemption。一个真实且获准的 no-test active scenario 与“谎报 tests”完全一样，都会成为 UNBOUND；并非只有谎报才承担该后果。归档后的全局 gate 因而可能持续 BLOCKED。v2 删除了 v1 的“归档后 gate/check/verify 全绿路径存在”，却没有把这一行为变化及选择空间明示出来。
4. AC3 固定检查声明缺失，但候选 ii 是运行 verify、候选 iii 是引用证据；三种候选需要的 artifact 和失败条件并不相同。

决策空间需要分别列明 metadata 载体/语法，以及 no-test 是“接受可见债务并允许全局 GAPS”、成为 verify 的机器豁免，还是只允许在不会产生 active UNBOUND scenario 的情形使用。

### REQ-6 — hotfix 与现有 gate 的映射仍不完整

风险：实现可能把整个 gate 标成 n/a 而静默绕过保护，也可能直接复用 state A gate 导致所有 hotfix 恒 ERROR/BLOCKED。

依据：

- B6 只区分有无 delta，并称无 delta 时 `verify --change`/`gate` 为 n/a、有 delta 时“可选地照常可跑”。
- state A gate 在执行 C1 前就要求 `flow-state.md`，而候选 a 的 hotfix 明确只有 `hotfix-state.md`。
- hotfix 又有意不具备 `tasks.md`、ledger、review verdict/raw；因此 C2、C3、C4、C5 均不能“照常”应用。
- C6 KB freshness、C7 CAS、在途 C1 和 archived C1 是否适用，需求也未逐项说明。
- “gate n/a”没有说明是仅 C1 n/a、部分 checks n/a，还是整个命令 n/a。
- 这直接关系到五项 never-weaken protections 是否只对正式 change 保持，还是被共享 gate 的全局实现意外削弱。

requirement 无需现在决定最终 gate 形态，但必须完整列出专用 gate、按 check 分级复用、完全不适用等候选及其后果。

### REQ-10 — 开放问题清单遗漏了正文中明确要求人类裁决的选择

风险：gate③ packet 可能只询问 Q1–Q5，却在没有人类裁定的情况下由实现者替人决定其他机制。

依据：

- B3 明确把 Decision ID 的自动分配与作者手写标为“裁”。
- B5 标题明确写“gate③ 裁”，并给出声明制、隐式 verify、引用 verify 证据三种互斥机制。
- AC3 又依赖“B5 所裁机制”。
- 但文末 Q1–Q5 没有任何一问承接 B5 机制选择，也没有承接 B3 的 ID ownership。
- Q1 是签收机制，Q2 是位置，Q3 是防逃逸，Q4 是版本，Q5 是命名，不能自然包含上述选择。

应将这些选择纳入现有 Q 的明确子项、增加开放问题，或明确声明它们由 STEP2 设计者提出方案、gate③ 只审整体设计；不需要在 requirement 阶段预先选答案。

## Advisories

- B2 的“生态自动可见”建议改为分项表述：目录枚举和 sibling scan 在候选 a 下接近自动复用，但 `status --change`、身份解析和 gate 均需适配 `hotfix-state.md`。正文已承认消费点需要区分，因此暂不重开 REQ-1。
- B4 的“bundle move（commit point）”容易被理解成此前写入仍可回滚；建议改称 completion point 或 archive-complete point。
- 若最终选择 B5 候选 ii，AC1 排除 test suite runtime 会衡量流程开销而非真实端到端耗时；建议在设计中同时报告 elapsed total。
- `flow-state.md` 的 `next-action` 仍指向 req-v1/r1，账本表头为五列而数据行为三列；这是生产方落盘状态问题，不计入 requirement verdict。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-1 | fixed → verified |
| REQ-2 | fixed → open（批准未绑定具体内容及新鲜 base） |
| REQ-3 | fixed → open（truth 并发、CAS 与 ID 分配竞态未覆盖） |
| REQ-4 | fixed → open（global preflight 与第②段失败边界冲突） |
| REQ-5 | fixed → open（no-test 载体、语法及全局 verify 后果未闭合） |
| REQ-6 | fixed → open（gate C1–C7 适用性未定义） |
| REQ-7 | fixed → verified |
| REQ-8 | fixed → verified |
| REQ-9 | fixed → verified |
| REQ-10 | new → open（人类裁决清单遗漏 B3/B5 选择） |

VERDICT: 6 issues open