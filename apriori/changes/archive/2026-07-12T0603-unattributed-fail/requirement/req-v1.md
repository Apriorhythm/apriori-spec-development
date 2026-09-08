# 需求:unattributed-fail —— 未归因的测试失败必须阻断 GREEN (v1)

> change: `unattributed-fail` · tier: medium · track: harden
> lineage: v4 分支;不合并到 main/v1/v3
> 来源:GPT-5.6 对 4.0.0 的外部评审 P0-1,已本机复现。

## 目标

`verify` 是整个体系的发布闸口,它对 GREEN 的承诺是"测试套件就是规格"。当前存在假绿:测试进程明确失败(`not ok` + 退出码 1),verify 仍 GREEN/exit 0。已复现输入:

```text
ok 1 - XX-01 pass
not ok 2 - global teardown failed
1..2
```

(进程退出 1)→ 当前输出 `RESULT: GREEN`,exit 0。

## 缺陷机制(现状事实)

- `TAP_RE` 只匹配 `(ok|not ok) N - desc` 全形;带描述但无场景 ID 的 `not ok` 进 `untaggedFails` 并计入 `failCount`,于是 infra 规则(非零退出且 failCount===0 才 ERROR)被"解释掉",而 verdict 的 clean 只看有 ID 的结果——两层各自有理,合起来放行。
- 裸形 `not ok`/`not ok 3`/`not ok - desc` 是合法 TAP,却只被 `POINT_LINE_RE` 计入 plan 点数,既不进 results 也不进 untaggedFails:配合退出码 0(某些 runner 会这样)是完全不可见的假绿。

## 行为需求

1. **任何非 SKIP/TODO 的顶层 `not ok` 都阻断 GREEN**,无论其形状:
   - 带编号带描述但无场景 ID(评审复现形);
   - 无编号、无描述、无 `-` 分隔的裸形/半形(合法 TAP 点)。
   这些统称**未归因失败(unattributed failures)**。
2. **报告**:新报告组(如 `✗ UNATTRIBUTED FAILURES (not ok without a scenario ID): N`),逐行列出原始行文本(截断到合理长度);RESULT 为 GAPS,exit 1——它们是真实测试失败,不是基础设施错误。
3. **退出码硬规则**:`exec.status !== 0` 时 verify 绝不返回 0——有失败归因 → exit 1;全绿 TAP 无归因 → 既有 infra ERROR(exit 2)不变。反向不成立:未归因失败即使配合退出码 0 也阻断(见 1)。
4. **合法 TAP 的宽容面不变**:无 ID 的 `ok` 点照旧可过(untagged 列出、不阻断);SKIP/TODO 指令(含裸形上的指令)照旧不算失败;plan 校验、Bail out!、重号等既有 infra 规则不变。
5. **--json** 增加 `unattributedFailures`(计数 + 原始行数组);既有形状字段不破坏。
6. **gate C1 自动继承**(verify GAPS → blocked),不需要 gate 侧改动——但需一条场景钉住继承。
7. **回归钉子**:评审复现输入(teardown 失败形)与"裸 `not ok` + 退出码 0"两个病例都必须有绑定场景。

## 非目标

- TAP 子测试/嵌套缩进层的重新设计(node 嵌套 TAP 既有处理不变)。
- YAML diagnostics 块解析。
- verify 之外的表面(archive/gate 自身逻辑,除 C1 继承验证)。

## 约束

- 零依赖、纯 Node;既有 SR-01..19 场景与全部现有测试不回归。
- CRLF 行尾与 fence 语义照旧。

## 开放问题

- 无。
