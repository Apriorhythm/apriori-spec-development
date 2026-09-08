# gap-report — verify-change-scope

依据：req-final；lib/spec-runner.js（含 gate-id-pattern 工作区改动）、lib/gate.js、lib/archive-merge.js 实读；副本复现（batch3 复活）。

## 现状 A（代码事实）

1. `verify --change`：`buildChangeProjection` → `am.buildProjection` 产出全 store 投影 texts；`collectScenariosFromTexts` 对**全投影**收集场景；`evaluate(byId, unidentified, results)` 对全集判 verdict——UNBOUND/ORPHAN 全局化，正是噪音来源。`am.buildProjection` 的 `perModule` 携带每 suffix 的 merge 结果（merged/modified/renamed/unchanged/deprecated），但 spec-runner 侧丢弃；delta 的操作桶可由 `parseDelta` 在 spec-runner 侧廉价重取（零改 archive-merge）。
2. exit 规则：`infraErrors` 的"非零且 failCount===0 → ERROR"已经允许"可解释非零"通过 infra 关——现状下全局 red 导致 GAPS exit 1；收窄后 change clean 即可 exit 0，**无需改 infraErrors**，只改 clean 判据（D-SR-x 限定的实现落点）。
3. `formatReport` 单 verdict 渲染；`verifyJson` 顶层字段全局语义；gate `checkBinding` 直接消费 `run.verdict`/`run.duplicates`。
4. 上一 change 引入的机制原样可用：resolveIdPattern/makeIdMatcher/单次 TAP parse/fail-early 顺序（B3 四路径表与之完全一致）。
5. 副本复现数字（改前）：`--change` 107 场景 61 UNBOUND 2 ORPHAN 42 unattributed GAPS；`--specs <delta>` 46 ORPHAN。

## 缺口清单

| # | 位置 | 改动 |
|---|---|---|
| G1 | lib/spec-runner.js `buildChangeProjection` | 附带 per-suffix 的 delta 操作桶（parseDelta 重取）：added/modified/renamedPairs/removed 名单 |
| G2 | lib/spec-runner.js 新 scope 计算 | 投影文本 parseRequirementsStrict → change 块集（ADDED∪MODIFIED∪renamed-new − REMOVED'd）→ occurrence 级场景收集（含 idempotent unchanged 路径）；`changeScope={requirements:[{file,name,operations[]}],scenarioIds}` |
| G3 | lib/spec-runner.js verdict 拆分 | change verdict（scoped byId/unidentified/duplicates<跨全投影计数>）+ storeReport（全投影六类）；clean 判据改 scoped；零范围真值表；vacuous 文案 |
| G4 | lib/spec-runner.js 输出 | formatReport 两段式；verifyJson 顶层改 change 语义 + storeReport/changeScope（仅 GREEN/GAPS，absent 非 null）；--specs 路径零变化 |
| G5 | lib/gate.js checkBinding | in-flight 消费 scoped verdict/duplicates；detail 改 change-scoped 文案 + store 六类计数尾缀；archived 分支不动 |
| G6 | RUNBOOK.md/RUNBOOK_cn.md | §4 STEP5 投影段两段式改写 + 验证矩阵一句 |
| G7 | docs/cli*.md + CHANGELOG | verify/gate 节；三处行为变化声明 |
| G8 | specs delta + tests | spec-runner SR-56..64、gate GT-26..27；测试先行 |

## 风险

- R1（高）：`--specs` 路径必须 byte 级不动——所有改动以 `opts.change` 分支门控；AC7 回归断言。
- R2（中）：scoped duplicates 的"跨全投影计数"实现易错（scope ID 在块集外撞 ID）——AC4 专项。
- R3（中）：RUNBOOK 双语改写需过 check --self 的 heading/verdict-phrase 检查。
- R4（低）：gate detail 文案变化可能碰existing GT 测试断言——同步修。

## 结论

改动集中于 spec-runner 单模块 + gate 一处消费；无需 spike。进 STEP2。
