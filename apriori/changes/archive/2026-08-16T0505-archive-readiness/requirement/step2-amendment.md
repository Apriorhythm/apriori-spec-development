# step2-amendment — 冻结需求的一处缺陷，由 STEP2·r2 查获

> 本文件是对 `req-final.md`（STEP0 收敛稿）的**具名修正**，不是新一版需求。
> 触发：STEP2·r2 的 SPEC-2 残余缺陷 1。RUNBOOK 对「STEP2 发现需求本身有错」的规定是
> 「回 STEP0（更新状态文件并告知人类）」；本处修正**只动一个 predicate 的字符类**，
> 不改变任何目标状态、判定矩阵或验收 ID，故按 change 1 的 `step5-amendment` 先例
> **就地修正 + 具名留档 + gate④ 单独呈报**，不重开 STEP0 循环。
> **若 owner 在 gate④ 认为这仍属需要重跑 STEP0 的变更，本修正可整体撤回。**

---

## 缺陷

`req-final.md` 的 B3「人类证据协议」写：

> `<reason>` 是该 class token **之后的全部剩余文本**，必须含至少一个 `\w` 字符。

**这条规则在本仓不可用。** 实测：

```
/\w/.test("— 还差两项文档")            → false
/[\p{L}\p{N}]/u.test("— 还差两项文档")  → true
/[\p{L}\p{N}]/u.test("— ")             → false
```

JavaScript 的 `\w` 等价于 `[A-Za-z0-9_]`，**只认 ASCII**。
而本仓的 `flow-state.md` 的 `gates:` 段**整篇是中文**——包括 owner 逐字记录的每一条裁决。

后果：按 B3 的字面规则，owner 用中文写下的 `archive-force tasks — 还差两项文档`
**不构成合法授权**，`--force` 恒无效。这不是措辞问题，是一条**无法同时满足的测试合同**：
D2 的验算表要求第一行授权，B3 的 predicate 要求它不授权。

评审方在 STEP2·r2 的原话：「这是一个无法同时满足的测试合同，不是措辞问题。」

## 修正

**`\w` → `[\p{L}\p{N}]`（Unicode 字母或数字，任何书写系统），正则带 `u` 标志。**

规则的**意图不变**：理由不能是空的，也不能只是一个破折号或标点。
`[\p{L}\p{N}]` 精确表达这个意图，且对中文、日文、西里尔文等一视同仁。

受影响处（全部就地改，并指回本文件）：

| 文件 | 位置 |
|---|---|
| `requirement/req-final.md` | B3 的理由规则、AM-88 的验收 |
| `design.md` | D2 第 3 步的第 3 组约束 |
| `specs/archive-merge/spec.md` | Requirement `--force overrides progress only…` 的正文（"a word character"） |
| `tasks.md` | B5-5 |

## 被否决的替代方案

**「改例子不改规则」**（评审方的建议修复之一：把验算表的中文理由换成含 ASCII 的
`— docs 尚未完成`）。**否决。** 理由：那只是让**示例**避开规则，规则本身仍然禁止纯中文理由。
本仓的人类裁决就是中文写的——一个只在示例里成立、在真实使用中恒假的规则，
正是这一轮反复出现的那类缺陷（「测试 fixture 被悄悄去势」）。
修规则是修因，改例子是遮症。

## 呈报

本修正**必须在 gate④ 单独点名**：它修改了 STEP0 已收敛的冻结需求。
verdict 序列不受影响（STEP0 仍记为在 cap 内收敛于 `no major issues`），
但「冻结稿含一处 STEP2 才查出的缺陷」这个事实要如实呈给 owner。
