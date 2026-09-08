# req-v2 需求评审

## 维度 1：目标状态 B 是否清晰且无歧义

结论：未通过。REQ-1、REQ-2 需重新打开。

### REQ-1 — REOPEN

- 描述：§1.2、O5 和源码触及范围已经明确要求“导出既有 projection 构建路径，gate 不得重建”，方向正确；但 AC-GD-15 不能证明这一约束。两个独立实现完全可能在一个测试 fixture 上产生相同的 `modules / conflicts / unstampedMutations`。该 AC 还遗漏现有 projection 的 `notes` 字段，没有覆盖 projection 构建的错误结果，也无法通过 `runGate()` 的公开返回值直接观察 T7 路径内部取得的 projection。因此“AC-GD-15 钉死只有一套实现”的声明不成立。
- 风险：high。实现仍可能复制 projection 逻辑，之后与 verify 在 delta validation、CAS mismatch、conflict 或新增 projection 字段上发生漂移，再次造成 C7 false-negative。
- 建议修复：保留现有规范约束，并增加可机械检查的结构性验收：
  - `lib/gate.js` 必须调用 `lib/spec-runner.js` 导出的同一个 projection-only 函数；
  - `gate.js` 不得直接调用或重新组合 `discoverDeltas()` / `buildProjection()`；
  - `verify()` 与 gate 的 T7 路径必须共享该函数；
  - 对 clean、unstamped mutation、malformed delta、CAS mismatch、merge conflict fixtures 比较完整 projection 和错误结果，而不只比较三个字段。若采用注入 seam，可直接断言 T7 恰调用该共享 builder 一次且测试 runner 零次。

### REQ-2 — REOPEN

- 描述：新增的分类和矩阵解决了大部分组合，GT-25 不可达及 M8 无需 projection 的判断本身正确：
  - config-origin matcher 只在场景收集/匹配时启动；C1 skipped 时仅编译 id-pattern，因此 GT-25 的运行期前提确实不可达。
  - archived 阶段 C7 恒为 `n/a`，C1 又 skipped，C2–C6 均从归档 bundle/store 读取，因此不需要构建 in-flight projection。
  
  但所谓“穷举”仍不完整且有不可判定的行：
  - T6 与当前 `lib/config.js:64-68`、`truth/config.md` 冲突。配置单元格会先 trim，空值和仅空白值随后被统一跳过；对所有 key，它们都与“无该行”不可区分。因此现有共享 reader 无法把 T6 判成 ERROR，只能得到 T7。若实现 T6，必须修改 `lib/config.js` 及其全局契约，或绕过共享 reader；两者均不在声明范围内。
  - T1 的“非空”包含仅空白字符串，与 T3 重叠，七类并非互斥。
  - 无 flag 且 `process-config.md` 存在但不可读是当前可达的 config error，分类表未覆盖。
  - 缺命令同时 id-pattern config 冲突或不可读时，`resolveIdPattern()` 也会返回 ERROR；M3 只写了“不可编译”，没有覆盖这些 config problem。
  - M8 未限定 id-pattern 有效，因此与 M3 重叠；按声明顺序，archived + invalid id-pattern 应落入 M3，而不是 M8 的常规结果。
  - `runGate({testCmd: ''|null|undefined})` 这一公开接口如何区分显式空 flag 与缺席仍未声明；只有 CLI 层拥有 flag-presence 信息。
- 风险：high。实现者无法同时满足 T6、共享 config 契约和声明的源码范围；不同实现还会对不可读配置、archived + invalid id-pattern 及直接 API 调用给出不同结果。
- 建议修复：让分类与状态 A 对齐：
  - 将空/仅空白 config 值归入 T7，因为共享 parser 按契约将其视为 absent；若坚持 ERROR，则必须显式扩大到 `lib/config.js`，修改 config KB/living spec，并说明所有 key 是否受影响。
  - 把 T1 改为“至少一个非空白字符”，消除与 T3 的交集。
  - 增加“config 存在但不可读”行，结果为当前的 ERROR/2。
  - 将 M3 扩为 id-pattern 的全部解析期问题：空/不可编译 flag、不可编译/conflicting/unreadable config。
  - 将 M8 限定为 id-pattern 解析成功；失败时明确由 M3 优先。
  - 明确 CLI flag presence 如何传入 `runGate`，以及直接调用 `runGate` 时 `''`、`null`、`undefined` 的契约。

## 维度 2：边界与异常路径是否覆盖

结论：未通过，原因是 REQ-2。

projection conflict、flow-state、hotfix、归档态、未打戳 mutation、空/空白 flag 和结果优先级已经覆盖。剩余缺口是不可读 test-cmd 配置、id-pattern 的非编译型 config problem、重叠分类及直接 API 的 presence 语义。

并发和回滚对该只读同步命令不适用；T7 明确禁止启动测试进程。现有有效 test command 的失败和超时行为由 B4 保持。

## 维度 3：是否存在隐含但未声明的状态变化或副作用

结论：通过。

退出码 3、`INCOMPLETE`、`skipped`、仓外 CI 影响、doctor finding、文档更新、测试更新及 `spec-runner` 公共面扩大均已声明。仓内没有依赖 gate 仅返回 0/1/2 的可执行脚本或 workflow；golden-path 使用已配置的 test command，受 B4 保护。

## 维度 4：每条验收标准是否可测试

结论：未通过。

AC-GD-10 已修正为固定 JSON 键集且明确不新增 `code`，与 B4/AC-GD-09 一致，REQ-3 可验证。

但 AC-GD-15 的输出等价断言不能证明没有第二套实现，且只比较部分字段；REQ-1 因此重新打开。T6 又无法通过当前共享 reader 构造为独立于 T7 的可观察输入，REQ-2 也仍不可测试。

## 维度 5：是否与状态 A 冲突

结论：未通过，原因是 REQ-2。

REQ-4 的修复正确：§1.4 已准确说明 doctor 实际执行 D1..D8、KB 文本陈旧而 commit-range 检查仍显示新鲜；AC-GD-20 保留 D8，AC-GD-24 要求修正 Contract 并刷新实现 commit，足以验证该修复。

剩余冲突是 T6：当前 config 契约明确将空值和仅空白值统一视为 absent，req-v2 却要求将其判为配置错误。

## 维度 6：目标 lineage 是否声明且符合仓库现实

结论：通过。

`brownfield-round2`、`main` 和 `origin/main` 当前均位于 `235a121`，分叉计数为 0/0；目标 main、v4 产品线及禁止进入 v1/v3 的声明保持准确。

## Round-1 issue verification

- REQ-1：重新打开。真实耦合、源码范围和共享 seam 已写入，但 AC-GD-15 尚不能机械保证“只有一套实现”。
- REQ-2：重新打开。矩阵显著完善，GT-25 与 M8 的核心判断正确，但分类仍非互斥、非穷举，且 T6 与共享 config 契约冲突。
- REQ-3：verified。JSON 键集固定为 `{change, stage, checks, result, blocked, errors}`，不新增 `code`；只扩展取值域，和 B4/AC-GD-09 一致。
- REQ-4：verified。状态 A 已纠正，D8 有回归护栏，KB 修正有明确验收。
- REQ-5：verified。所列中英文文档确实分别存在 exit-code table、gate Exit 行和 D5 troubleshooting 小节；CHANGELOG 存在 Unreleased 条目位置。RUNBOOK 只说 gate 聚合为一个退出码，并未枚举 gate 的 0/1/2，因此删除原 RUNBOOK 同步标准的理由成立。AC-GD-21/22/23/25 均已改成可机械检查的内容要求。

明确的 out-of-scope 章节仍存在，O1–O7 边界清楚。

## Advisories

无。

## Ledger delta

精确状态翻转：

- REQ-1：`fixed (v2) → open` — AC-GD-15 仅比较部分样例输出，不能证明 gate 与 verify 复用同一个 projection 实现。
- REQ-2：`fixed (v2) → open` — T6 与共享 config parser 冲突，且不可读配置、id-pattern config problem、分类交集及直接 API presence 语义仍未覆盖。
- REQ-3：`fixed (v2) → verified`
- REQ-4：`fixed (v2) → verified`
- REQ-5：`fixed (v2) → verified`

无新 ledger 行。

VERDICT: 2 issues open
