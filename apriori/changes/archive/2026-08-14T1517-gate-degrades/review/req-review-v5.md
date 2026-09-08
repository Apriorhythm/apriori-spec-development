# req-v5 需求评审

## 维度 1：目标状态 B 是否清晰且无歧义

结论：通过。

REQ-1 已正确修复。§五的源码范围现在逐项列出 O5 允许的三项 `spec-runner` 改动：

1. 导出 projection-only 入口；
2. 新增 `_setProjectionBuilder` 与 `_setTestRunner`；
3. 让 `verify()` 自身改走相同的可替换引用。

该行还明确指定 O5 为范围的唯一定义，不再存在更窄的“仅导出入口”限制。它与 §1.4、§3.1c、AC-GD-14/15a/15b/15c 和 O5 完全一致，可直接交给实现者。

## 维度 2：边界与异常路径是否覆盖

结论：通过。

v5 未改变已经验证的 T1–T7 分类、`runGate()` 类型域或 M 行矩阵。测试命令来源仍互斥且穷举；M 行优先级仍与源码控制流一致；config 不可读、projection 失败、archived、hotfix、非法 id-pattern、非字符串输入及 blocked/incomplete 优先级均有确定结果。没有不可构造的验收分支。

并发、超时和回滚结论不变：命令只读且同步，T7 不启动测试进程，有效测试命令路径保持状态 A 行为。

## 维度 3：是否存在隐含但未声明的状态变化或副作用

结论：通过。

退出码 3、`skipped` 状态、doctor D5 finding、公共 projection 入口、两个测试 seam、文档更新和仓外 CI 影响均已声明。v5 的范围修正没有引入新的状态变化或副作用。

## 维度 4：每条验收标准是否可测试

结论：通过。

AC-GD-01 至 AC-GD-25 仍可由确定 fixture 和输出断言机械验证。修正后的源码范围明确允许 AC-GD-14/15b 所需的两个 seam，因此不再与这些验收标准冲突。

## 维度 5：是否与状态 A 冲突

结论：通过。

v5 没有改变状态 A 描述。projection 构建顺序、CommonJS 词法绑定、现有 `_setChildRunner` 职责、config 空值语义、gate 控制流、archived C7、JSON 形状和仓内退出码消费者等结论仍与当前源码及知识库一致。

## 维度 6：目标 lineage 是否声明且符合仓库现实

结论：通过。

目标仍声明为从 `main@235a121` 切出的 `brownfield-round2`，最终进入 main，禁止进入 v1/v3。当前分支和提交基线与该声明一致。

## Prior issue verification

- REQ-1：`fixed (v5) → verified`。源码范围矛盾已消除；O5 现在是清晰且唯一的范围定义。
- REQ-2：保持 `verified`。
- REQ-3：保持 `verified`。
- REQ-4：保持 `verified`。
- REQ-5：保持 `verified`。

明确的 out-of-scope 章节仍存在，O1–O7 边界清楚。

## Advisories

无。

## Ledger delta

精确状态翻转：

- REQ-1：`fixed (v5) → verified` — §五的源码范围现与 O5 完全一致，明确允许并仅允许导出 projection-only 入口、新增两个测试 seam、以及让 `verify()` 改走共享可替换引用。
- REQ-2：保持 `verified`。
- REQ-3：保持 `verified`。
- REQ-4：保持 `verified`。
- REQ-5：保持 `verified`。

无新 ledger 行。

VERDICT: no major issues
