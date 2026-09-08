# spec-review-v2 — gate-degrades

## 维度 1：场景是否覆盖所有可见行为与失败边界

结论：通过。

- GT-35 现在覆盖 `errors: []` 且无可信 `texts` 的防御分支，并要求合成确定诊断。
- GT-36 现在用有效 config-origin pattern 明确要求 matcher child 零调用。
- GT-38 现在明确要求 archived T7 路径 projection builder 零调用。
- GT-11 的 WHEN 已包含 INCOMPLETE。
- 其余来源分类、优先级、projection 失败、C7、hotfix、flow-state、doctor 和输出场景保持完整。

## 维度 2：共享状态的 init / runtime update / cleanup-invalidation

结论：通过。

SPEC-3 已正确修复。D7/D8 和 T16b 明确规定：

- init：override 为 `null`，回落到真实函数；
- runtime update：测试通过对应 `_set*` 安装 override；
- cleanup：每个使用点都必须在 `finally` 中恢复为 `null`。

T16 只验证恢复语义，T16b 单独约束每个使用点，职责划分正确。

## 维度 3：与状态 A 或既有约定的冲突

结论：通过。

- 三份 delta 的 CAS 基线仍匹配当前 living spec，`check --self` 通过。
- gate 的 MODIFIED block 保留全部既有场景，只改变目标 prose 与 GT-11。
- doctor 分支顺序仍为 invalid id-pattern → config problem → `--no-run` → missing command → probe，与源码和冻结需求一致。
- `resolveTestCmd` 六条规则仍完整覆盖冻结输入域。
- projection、path containment、config reader 和 matcher 的既有实现边界均未被复制或绕过。

## 维度 4：spec、design 与 tasks 是否闭合

结论：存在一个新的任务矛盾。

### SPEC-5

- 描述：T14 同时要求：
  1. gate 与 verify 两次调用经过同一个 wrapper；
  2. 在这两次调用之间更换或清空 override。

  两项无法同时成立。如果 gate 使用 wrapper A 后清空或换成 wrapper B，verify 就不可能再经过“同一个 wrapper”。spec SR-73 和 design D1.3 本身没有矛盾；矛盾只存在于修订后的执行任务。
- 风险：med。T14 无法按字面完成，实施者必须现场猜测测试结构；错误取舍可能放弃共享-wrapper断言，或放弃 call-time lookup 断言，造成 STEP5 返工并让模块加载时冻结引用的实现漏过。
- 建议：拆成两个可同时满足的阶段：
  - 先在安装 override 前加载 gate，安装 wrapper A，然后让 gate 与 verify 都调用并断言二者经过同一个 A；
  - 完成上述两次调用后，再清空或换成 wrapper B，执行第三次调用，断言读取到 default/B，以独立证明引用按调用时解析；
  - 全部 override 在 `finally` 中清理。

SPEC-1、SPEC-2 和 SPEC-4 对应的 spec/design/tasks 映射均已闭合：

- T6b 绑定无 texts、空 errors 分支；
- T7b/T9b 分别绑定 matcher-child 与 archived builder 零调用；
- I1 的公共导出集合现在精确为四个，`currentTestRunner` 保持私有。

## 维度 5：安全性

结论：通过。

外部输入在进入 `spawnSync` 前完成类型和空白校验；缺席路径不执行测试或 matcher child；projection 继续使用共享的 containment 和 validation 实现。没有新增命令注入、路径逃逸、权限绕过或敏感信息泄漏面。

## Prior issue verification

- SPEC-1：`fixed (r1) → verified`。GT-35、D3 和 T6b 已完整覆盖无可信 texts 且 errors 为空的分支。
- SPEC-2：`fixed (r1) → verified`。GT-36/GT-38、D7、T7b/T9b 已分别绑定两个遗漏的零调用保证。
- SPEC-3：`fixed (r1) → verified`。每个模块级 override 使用点现在都有明确 cleanup 任务。
- SPEC-4：`fixed (r1) → verified`。公共导出集合已精确限定，`currentTestRunner` 不导出。
- ADV-STEP2-r1：保持 `advisory-acked`；其中 T14 的修订引入的新矛盾另记为 SPEC-5。

## Advisories

无。

## Ledger delta

精确状态翻转：

- SPEC-1：`fixed (r1) → verified`
- SPEC-2：`fixed (r1) → verified`
- SPEC-3：`fixed (r1) → verified`
- SPEC-4：`fixed (r1) → verified`
- ADV-STEP2-r1：保持 `advisory-acked`

追加以下行：

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-5 | T14 simultaneously requires gate and verify to use the same wrapper and requires changing or clearing that wrapper between those two calls, making the task internally unsatisfiable | med | STEP2·r2 | open |

VERDICT: 1 issues open
