# gap-report — modified-block-integrity

依据：req-final；lib/archive-merge.js、lib/spec-runner.js（工作区含前两 change）实读。

## 现状 A（代码事实）

1. `merge()` MODIFIED = `store.set(name, block)` 整块替换零对比；`buildProjection` 处 storeText（旧块可由 `parseRequirementsStrict(storeText)` 取）与 delta 块文本（`delta.MODIFIED` Map 值）同时在手；`deltaOps`（change 2 新增）已携带操作桶。
2. verify --change 的单一标题批（change 2 的 makeThenBind + collectChangePairs）可扩第 4 类 tag（integrity-only，不入绑定 acc）；旧块标题此刻**不在**投影文本中（已被替换），需从 storeText 原块提取后并入同批。
3. archive cli（archive-merge.cli）：high-level form 走 buildProjection（archiveChange 内部？——实施时核对 archiveChange 的路径：它有自己的 preflight/merge 流程，dry-run 输出 merged/modified 列表；报告接线点在其列表打印处）。bin/apriori.js `case 'archive'` 可注入 matcher 工厂参数。
4. sanitizeMsg（change 1）可复用做 warning 整行组装；stripFences/scanTitles 语义为结构扫描基准。
5. 活教材 fixture 原料：apriori/changes/verify-change-scope/specs/spec-runner/spec.md 的 MODIFIED 块 + apriori/specs/spec-runner/spec.md 的原块（冻结复制）。

## 缺口清单

| # | 位置 | 改动 |
|---|---|---|
| G1 | lib/archive-merge.js | 纯共享 helper `compareModifiedBlock(oldBlockText, newBlockText, oldIds, newIds)`（ids 由调用方供给——引擎零 matcher 依赖）：结构扫描（fence 感知 state-A 正则）、基数真值表分类、保序贪心子序列、返回 B4 条目结构 |
| G2 | lib/spec-runner.js | verify --change：旧块标题第 4 类 tag 入同一标题批；从批结果供 ids 给引擎；run.modifiedIntegrity（GREEN/GAPS 恒在）；json + human 段 |
| G3 | lib/archive-merge.js cli + bin | archive high-level form：dry-run/--write preflight 后打印 human 段；bin 注入 matcher 工厂（config>default 解析 + 可终止通道）；失败 → 整行 sanitizeMsg warning + 跳过 |
| G4 | 文档 | docs/cli 双语 verify/archive 节 + RUNBOOK 双语 MODIFIED 警告句旁一句 + CHANGELOG |
| G5 | specs delta + tests | archive-merge 模块 AM-43..（引擎语义）+ spec-runner SR-65..（verify 面）+ archive 面场景；AC7 冻结 fixture 人工推导期望 |

## 风险

- R1（中）：旧块标题入批但不得入绑定 acc/scenarioCount——change 2 的全部 JSON deep oracle 是护栏。
- R2（中）：archiveChange 的实际控制流与 buildProjection 的关系需实读核对（若 high-level archive 不经 buildProjection 而有自己的 merge 循环，报告接线在其 merge 结果处——引擎纯函数不受影响）。
- R3（低）：human 段新增会碰 --specs golden？不会——报告仅 --change/archive 面；golden 复核兜底。

## 结论

引擎纯函数 + 两个消费面接线；无 spike。进 STEP2。
