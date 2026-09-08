<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r6 transport=codex-exec-wsl-proxy -->

# req-review-v6 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v6.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断决策空间、候选后果、约束与 acceptance 是否完整、真实。

## r5 五项核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-5 | verified | 载体与证明层已明确正交；任何证明机制下 no-test 键都必须保存非空理由，ii/iii 的准入边界及 AC3 均已补齐。 |
| REQ-6 | reopened | `touched-modules` 已补上 C6 第三触发源，e1/e2 也已进入 Q8；但 e1 的 “advisory 级”尚未映射到现有 gate 状态、聚合及输出契约，也没有对应 acceptance。 |
| REQ-13 | reopened | 类别 1 已有机器可见定位头，但 Q9 的选填分支缺失时无法继续驱动 Q3/C6/B9；字段值及代码出处的有效性、与实际修复的关系亦未形成错误谱和 acceptance。 |
| REQ-14 | verified | 已停止假设 scenario ID 唯一，并完整列出 k1 拒绝与 k2 occurrence/requirement 定位两个设计候选；AC3 随裁决断言。 |
| REQ-15 | verified | c1 的三文件成本冲突已明示，c1′、调整阈值等出路完整，AC1 要求按最终载体重新核算。 |

## 正式 findings

### REQ-6 — e1 的非阻塞 advisory 没有可实现的 gate 结果契约

风险：`high`。若 Q8 选择 m2+e1，AI 无法确定 C6 应输出既有 `pass`、新增第四种 status，还是 gate 外的独立 warning；不同实现会改变 JSON schema、控制台输出、聚合结果或下游消费者行为。

依据：

- B6 将 e1 定义为 hotfix 专属的“非阻塞 advisory 级”，但没有规定它在 `checks[]`、`result`、`blocked`、exit code 和 human output 中的表示。
- state A 的公开契约只有 `status: 'pass'|'blocked'|'n/a'`；`lib/gate.js` 的控制台 mark 表和 `truth/gate.md` 也只承认这三态。
- 如果 e1 新增 `advisory` status，现有 human renderer 没有对应 mark，且会改变已声明的 JSON schema；聚合代码虽只统计 `blocked`，但这并不足以定义兼容契约。
- 如果 e1 仍使用 `pass` 并在 detail 中附带 advisory，则需要明确其 `GATE: PASS`、`blocked: 0` 和机器可区分性，而当前文本没有说明。
- AC10 只断言正式 change 的七项行为不变；AC12 只覆盖 archive freshness advisory。没有 AC 覆盖 m2 下 e1/e2 的 C6 status、aggregate verdict、exit code、JSON 与 human output。
- 这不是要求人类现在选择 e1 或 e2；缺口在于 e1 本身尚不是一个闭合候选。

应为 e1 声明兼容现有三态的具体外部语义，或如实列明新增 status 带来的 API、renderer 和消费者变化；并为 e1/e2 各增加参数化 acceptance。

### REQ-13 — 定位头的选填分支与字段有效性仍未闭合

风险：`high`。合法的零-delta代码修复仍可能没有可用的模块或代码出处，使防逃逸尺度、C6 freshness 和归档 advisory 全部失去依据；非空但伪造、不可解析或无关的值也可能被接受。

依据：

- B1 声明 `touched-modules` 与代码出处会同时驱动 Q3、B6/C6、B9，并区分“本 hotfix 引入的债务”与既有 stale。
- Q9 却允许“选填+缺失时 advisory”。对于没有 delta、没有 Decisions 的类别 1，字段缺失后不存在任何替代模块来源：
  - Q3 无法计算跨模块数；
  - m2 的 C6 模块并集为空，会退化为 `n/a`；
  - B9 无法定位应打印 advisory 的模块；
  - 也无法关联当前 hotfix 与具体代码修复。
- 文本只为必填案定义“缺失/空值 = F1”，没有定义 `touched-modules` 的规范命名空间、重复/未知模块、与 delta/Decisions 不一致等错误语义。
- “代码出处（commit/ref）”没有定义最低语义保证：ref 是否必须可解析、是否允许可变 branch、是否必须包含该修复、一个修复跨多个 commit 时如何表达。
- state A 的 C6 只根据模块读取 truth `source-commit`，再检查 `<source-commit>..HEAD`；它不会消费 hotfix 的代码出处。因此仅新增一个未校验的 ref，不能自动区分此前 stale commits 与本次 hotfix commit。
- AC4 只覆盖必填案的缺失拒绝，以及“按该头打印”advisory；没有覆盖选填缺失后的 Q3/C6/B9 行为，也没有覆盖 malformed、unknown、unresolvable 或与修复无关的值。
- 这不是要求人类现在裁定必填或选填；两个候选都必须先拥有完整后果。选填案可以明确承认放弃哪些机械能力，也可以定义 fallback，但当前只写“advisory”不足以闭合。

应补齐定位头的语义有效性、错误谱以及与 C6/B9 的实际关联算法，并为 Q9 的必填和选填两案分别定义可测行为。

## 六维 verdict

| 维度 | Verdict | 说明 |
|---|---|---|
| 1. target state B | issues open | 三类对象和 Q1–Q9 总体清楚；定位头选填案尚不能兑现其声明用途，见 REQ-13。 |
| 2. edge cases / exception paths | issues open | F1/F2、TOCTOU、重复键及部分提交已覆盖；定位字段缺失、非法或无关值仍缺路径。 |
| 3. implied state changes / side effects | issues open | e1 可能隐式扩展 gate status/JSON/renderer 契约，后果未声明，见 REQ-6。 |
| 4. acceptance testability | issues open | AC3 已收口；AC4 未覆盖定位头完整错误谱，且没有 m2+e1/e2 的 gate 输出验收。 |
| 5. conflict with state A | conditionally open | AM-17、普通 change gate、UNBOUND/GAPS、CAS 与 modified-integrity 均明确不弱化；e1 若新增 status 则会改变 state A 外部契约，需先按 REQ-6 定义。 |
| 6. target lineage | pass | 当前分支确为 `on-the-fly`；`4127653` 存在且为 P0 trio commit，v4 产品线及 main 暂不动的声明真实。 |

## 新鲜审查结果

未新开 `REQ-16+`。v6 新增的 B1 定位头和 C6 e1/e2 选择暴露出的缺口，分别仍属于原 REQ-13 与 REQ-6 的同一问题链，应 reopened 而不是另造重复 ID。

## Advisories

- p1 已明确允许零-delta类别 1 放弃机器可见 test/no-test 声明，文末也要求 gate③ packet 明示该代价；这是诚实陈列的产品选择，不计正式问题。
- s3 与现行 Decision supersession 语义的张力已经明示，并建议优先比较 s1/s2；决策空间足够诚实。
- B1 允许类别 3 与类别 1/2 并存。STEP2 应把“承接类别”设计为能表达组合的机器格式，并明确类别 1 与类别 2 是否互斥；现阶段由已声明的并存语义可推导，不单独计正式问题。
- `won't do` 节存在，并继续保护 AM-17、普通 archive fail-closed、UNBOUND/GAPS 三态、自动互转禁令及 Contract 相关性不做机械判断。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-5 | fixed → verified |
| REQ-6 | fixed → open（e1 advisory 未映射到现有 gate status、聚合、输出及 acceptance） |
| REQ-13 | fixed → open（选填缺失案无法驱动 Q3/C6/B9，定位值及代码出处缺有效性契约） |
| REQ-14 | fixed → verified |
| REQ-15 | fixed → verified |

VERDICT: 2 issues open