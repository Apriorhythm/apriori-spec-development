# spec-review-v3 — gate-degrades

## 维度 1：场景覆盖

结论：通过。

场景继续覆盖测试命令分类、四值结果、projection 失败、三个零调用保证、archived/hotfix/flow-state、doctor 分支、JSON 与人类输出。没有新增遗漏。

## 维度 2：共享状态的三个时刻

结论：通过。

两个模块级 seam 的初始化、运行期替换和 `finally` 清理仍完整。T14 的所有 override 也明确纳入 `finally`。

## 维度 3：状态 A 与既有约定

结论：通过。

本轮没有修改 spec 或 design。delta CAS、既有场景保留、doctor 分支顺序、共享 projection 实现和输入校验均保持有效；`check --self` 通过。

## 维度 4：spec、design 与 tasks 闭合性

结论：通过。

SPEC-5 已正确修复。T14 现在是可满足且可机械验证的三阶段测试：

1. gate 在任何 override 安装前加载，因此模块加载时捕获引用的错误实现会失败；
2. wrapper A 保持不变，gate T7 与 `verify --change` 都经过同一个 A，并比较六类 fixture 的完整 projection 与 errors；
3. 前两次调用完成后才切换到 B/default，再执行第三次调用，证明后续调用重新读取当前引用。

这同时满足 SR-73 的“同一个 wrapper”要求和 D1.3 的 call-time resolution 要求，不再存在互斥断言。

tasks 对 SPEC-1–4 的修复也保持完整：T6b、T7b、T9b、T16b 及 I1 的精确导出集合均未改变。

## 维度 5：安全性

结论：通过。

本轮只修订测试步骤，没有改变输入、权限、进程执行、路径解析或日志边界。此前确认的安全约束保持成立。

## Prior issue verification

- SPEC-1：保持 `verified`。
- SPEC-2：保持 `verified`。
- SPEC-3：保持 `verified`。
- SPEC-4：保持 `verified`。
- SPEC-5：`fixed (r2) → verified`。T14 已拆成先共享 A、再切换 B/default 的独立阶段。
- ADV-STEP2-r1：保持 `advisory-acked`。

## Advisories

无。

## Ledger delta

精确状态翻转：

- SPEC-5：`fixed (r2) → verified` — T14 现在先让两个消费者共同经过 wrapper A，完成等价性断言后才切换引用并进行第三次调用，任务可满足且完整绑定 SR-73/D1.3。
- SPEC-1：保持 `verified`。
- SPEC-2：保持 `verified`。
- SPEC-3：保持 `verified`。
- SPEC-4：保持 `verified`。
- ADV-STEP2-r1：保持 `advisory-acked`。

无新 ledger 行。

VERDICT: no major issues, ready to proceed to execution
