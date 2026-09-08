# 需求:unattributed-fail —— 未归因的测试失败必须阻断 GREEN (final = v2)

> change: `unattributed-fail` · tier: medium · track: harden
> lineage: v4 分支;不合并到 main/v1/v3
> 来源:GPT-5.6 对 4.0.0 的外部评审 P0-1,已本机复现。
> v2 修订:UF-1..5(JSON/截断合同、infra 优先级、精确分类器、SR 范围、untagged-ok 措辞)+ 两条 advisory。

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

1. **任何非 SKIP/TODO 的顶层 `not ok` 都阻断 GREEN**,无论其形状。**精确分类器(UF-3)**:与 plan 预扫描同口径逐行处理(每行剥至多一个尾随 CR);行在**列 0**(无任何前导空白——缩进行是 node 嵌套子测试,照旧不计)匹配 `/^not ok\b/` 时:
   - 余文含 `/#\s*(SKIP|TODO)\b/i` 指令 → 不是失败(裸形上的指令同样豁免);
   - 匹配既有严格形 `N - desc` 且描述带场景 ID → 归因失败(既有路径,计入该场景);
   - 其余一切(带编号带描述但无 ID;无编号/无描述/无 `-` 分隔的裸形半形)→ **未归因失败(unattributed failure)**。
2. **报告与 JSON 合同(UF-1)**:
   - 人类报告:新组 `✗ UNATTRIBUTED FAILURES (not ok without a scenario ID): N`,列出前 20 行,每行截断到 120 字符(超出以 `…` 结尾);超过 20 行追加 `… and N more`。
   - `--json`:新增顶层 `unattributedFailures: { count: <int>, lines: [<原始行全文,不截断>] }`;其余既有字段形状不变。
   - RESULT 为 GAPS,exit 1——它们是真实测试失败,不是基础设施错误。
3. **退出码硬规则与优先级(UF-2)**:`exec.status !== 0` 时 verify 绝不返回 0——有失败归因 → exit 1;全绿 TAP 无归因 → 既有 infra ERROR(exit 2)不变。**infra ERROR 优先**:`run.errors` 非空(Bail out!、plan 不符、重号、spawn/signal、zero-TAP 等)一律 exit 2,未归因失败绝不把既有 ERROR 降级为 GAPS;两者并存时报告都打印、退出码取 2。反向不成立:未归因失败即使配合退出码 0 也阻断(见 1)。
4. **合法 TAP 的宽容面不变(UF-5)**:无 ID 的 `ok` 点照旧不阻断,且报告/JSON 形状除新增 unattributedFailures 外**不因 untagged ok 点发生任何变化**;SKIP/TODO 指令照旧不算失败;plan 校验、Bail out!、重号等既有 infra 规则不变。
5. **--json** 增加 `unattributedFailures`(计数 + 原始行数组);既有形状字段不破坏。
6. **gate C1 自动继承**(verify GAPS → blocked),不需要 gate 侧改动——但需一条场景钉住继承。
7. **回归钉子**:评审复现输入(teardown 失败形)与"裸 `not ok` + 退出码 0"两个病例都必须有绑定场景。

## 非目标

- TAP 子测试/嵌套缩进层的重新设计(node 嵌套 TAP 既有处理不变)。
- YAML diagnostics 块解析。
- verify 之外的表面(archive/gate 自身逻辑,除 C1 继承验证)。

## 约束

- 零依赖、纯 Node;既有 SR-01..32 场景与全部现有测试不回归(UF-4);新场景自 SR-33 起编号。
- CRLF 行尾与 fence 语义照旧。

## 开放问题

- 无。
