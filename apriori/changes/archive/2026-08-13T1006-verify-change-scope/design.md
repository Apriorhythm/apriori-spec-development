# design — verify-change-scope

## 总体：全部改动以 `opts.change` 分支门控，`--specs` 路径零触碰（AC7 R1）

## G1 buildChangeProjection 附带 scope 元数据

**单一快照（SPEC-2）**：delta 每文件只读/解析一次——`am.buildProjection` 在其自身解析处（parseDeltaStrict 成功后）把该次解析的操作桶存入返回值：`perModule` 之外新增 `deltaOps: Map<suffix, {added:[name], modified:[name], renamedPairs:[[old,new]], removed:[name]}>`（不可变，来自投影所用的同一 parsed delta 对象；archive-merge 的**增量返回字段**，不影响既有消费者；KB Contract 归档时注记）。`buildChangeProjection` 直接透传，绝不按路径二次读取。失败路径不带 deltaOps。测试断言 projection 与 provenance 出自同一快照（对 delta 文件在运行中途替换的场景不可观察到分裂——用注入式 fs 不现实，以"实现无第二次 readFileSync(delta)"的代码路径断言 + deltaOps 与投影结果一致性断言表达）。

## G2 scope 计算（新内部函数 `computeChangeScope(texts, scopeOps)`）

对每个 delta suffix：
1. `blocks = am.parseRequirementsStrict(texts.get(suffix)).map`（投影后文本）。
2. 候选名 = added ∪ modified ∪ renamedPairs.new；排除最终为 deprecated 的块（rename-then-remove：REMOVED 命中 renamed new name 时块名带 deprecated 后缀，直接查 blocks 中同名非 deprecated 是否存在）。
3. 每个入选块：`operations` 数组按 merge 序（RENAMED→ADDED→MODIFIED）由三个桶的命中拼出；`scanTitles(blockText)` 收集 occurrence（复用既有结构收集）。
4. 汇总 → `changeScope = { requirements: [{file: suffix, name, operations}] 按 (file,name) 排序, scenarioIds: 排序去重 }` + `scopedPairs`（occurrence 级 [label,title]）。

## G3 verdict 拆分（verify() --change 收尾段重构）

既有流程不变至 TAP parse 完成，然后：
- **全投影集合**（现 collected）继续算，产出 `storeEval = evaluate(byId_full, unidentified_full, results, unattributedFailures)` + duplicates_full → **run.storeReport**：`{ boundGreen: storeEval.boundGreen.length, boundRed, unbound, orphan, unidentified, unattributedFailures: {count, lines}, duplicates: duplicates_full }`（orphan 定义不变——leading ID 不在全投影 byId 即 true orphan）。
- **scoped 绑定（SPEC-3 oracle 化）**：全投影 bindPairs 时保留 `titleIds`（pairs 索引 → id 的对照数组）；scoped occurrence 直接携带其全投影索引查表——**matcher.batch 全程恰好两次**（标题批一次 + TAP 描述批一次），SR-63 用计数 seam 断言恰好 2 与两次 payload 形状，scoped 视图零额外调用。
- **兄弟 change 归因（STEP5 折返修正，P8 复核）**：GT-26 的独立变绿在无此机制时不可能——并行 change 的场景只在各自 delta 里，其失败测试在本 change 投影中是 failing orphan。机械归因（r2 收严后的最终算法）：对每个兄弟活 change，目录/specs/文件三级 lstat+realpath containment+regular-file 守卫（不跟随任何 symlink），枚举经 safeMdWalk（任意层 readdir/lstat 异常 → 该分支零条目，绝不抛出）；每个文件 `parseDeltaStrict` 零 problems 且 >0 ops 才有效，仅其 ADDED/MODIFIED 块体内的场景标题计入（REMOVED 名下排除），并入**同一个标题批**（SR-63 两批契约保持）。failing orphan 的 ID ∈ 兄弟归因集 → 不阻断（仍在 storeReport.orphan 列示）；任何异常兄弟材料零豁免且不独立制造 infra ERROR——未获归因的失败照旧按 GAPS 阻断。
- **change verdict（SPEC-1 修订：失败信号 fail-closed）**：`verdict.boundGreen/boundRed/unbound` 由 scoped byId × results 计算；`run.duplicates`（change 语义）= scoped ID 在全投影 occurrence 计数 >1 的项；`verdict.orphan` = **failing** true orphan（全投影查无此 ID 且含 fail 的测试 ID——阻断；passing orphan 只进 storeReport）；`verdict.unidentified = unidentified_scoped`；`verdict.unattributed = unattributedFailures`（**保持阻断**——无 ID 即无 provenance，可能正是本 change 漏写 ID 的红测试）。clean = 无 red/unbound/scoped-unidentified/scoped-duplicate/failing-orphan/unattributed。仅"绑定到范围外投影场景的 red"不阻断。
- **零范围**：scopedPairs 空时按 B5 真值表：投影场景全空 → 既有全局 vacuous ERROR 不动（infraErrors 已有 zero-scenarios 规则——注意该规则看全投影，保持）；否则 vacuous GREEN，`run.vacuousNote = '0 scenario(s) in change scope' + (removal-only ? ' (removal-only change)' : ' (ops: …)')`。
- **exit**：cli 的 `run.verdict.clean && run.duplicates.length === 0 ? 0 : 1` 判据文本不变——语义随字段收窄自动生效；infraErrors 不改（"可解释非零"本就不在 infra 清单）。
- run.changeScope / run.storeReport 仅在 GREEN/GAPS 路径赋值（errorsRun 恒不带——absent 非 null）。

## G4 输出

- `formatReport`：--change 运行两段：change 段沿用现版式（组标题不变）+ vacuousNote；追加 `— STORE REPORT (informative) —` 段渲染六类（unattributed 沿用 20 条截断；boundGreen 只打 count）。
- `verifyJson`：--change 且非 ERROR → 顶层数组换 scoped 数据 + `storeReport`/`changeScope` 字段；ERROR → 现状（不带两字段）；--specs → 现状。
- gate `checkBinding`：in-flight 用 run.verdict（已 scoped）+ run.duplicates（已 scoped）；detail：pass=`verify GREEN (in-flight, change-scoped)${storeSuffix}`；block=`verify GAPS: <scoped 各类计数>${storeSuffix}`；`storeSuffix = '; store: R red, U unbound, O orphan, N unidentified, A unattributed, D duplicate(s) outstanding'`（从 run.storeReport 取；无 storeReport（ERROR）时走既有 infra 通道）。既有 GT-01 等断言检查 `verify GREEN (in-flight)` 前缀——detail 文案变化需同步既有测试（gap R4）。

## G5 文档

- RUNBOOK §4 STEP5 投影段：改写为"mid-change 的 gate 是 change-scoped verdict + informative store report"两句式；验证矩阵行加一句"store 健康的独立判定是 post-archive 的 --specs 形式"。CN 同步；`check --self`（heading/verdict-phrase 检查）须过。
- docs/cli*.md verify 节（两段输出+exit 语义+JSON 字段）、gate 节（C1 detail）；CHANGELOG 三处行为变化。

## 测试布局

- `test/change-scope.test.js`（新）：SR-56..64 + GT-26..27（fixture 工厂：store 2 块 + delta 组合 + 可控 TAP+exit）。
- 既有 gate.test.js 中 C1 detail 断言同步（`(in-flight, change-scoped)`）。
- **--specs byte golden（SPEC-4）**：实现前先以 state A 采集 golden（human GREEN/GAPS/ERROR、JSON 三类、duplicates/unidentified/unattributed/stderr 类、直接 verify()/verifyJson() shape），存 test/fixtures/specs-golden/；实现后逐字节比较 stdout/stderr/exit + run object own-properties 断言无 storeReport/changeScope。既有 254+ 测试作为第二道回归。
