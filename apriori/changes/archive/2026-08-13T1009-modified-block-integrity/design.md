# design — modified-block-integrity

## G1 引擎（lib/archive-merge.js，纯共享 helper——r2 advisory 约束）

- `buildProjection` 增量返回 `modifiedBlocks: Map<suffix, [{name, oldBlock, newBlock}]>`——在其 merge 处捕获（MODIFIED 命中 store 时 old=store.get(name) 替换前文本、new=delta 块；rename-then-modify：old=改名前 A 块文本（RENAMED 步骤替换 key 前捕获）、name=G；idempotent unchanged 路径同样捕获（等文本对））。单快照纪律：一切文本来自 buildProjection 已读内容。
- `compareModifiedBlock(oldBlock, newBlock, idOf)`：`idOf(title) → id|null` 由调用方注入（引擎零 matcher/零 fs）。**快路径（SPEC-1）**：`oldBlock.trim()===newBlock.trim()` → 直接返回全空 diff（不扫结构、不调 idOf——archive 面此时无需 matcher）。内部：
  1. `scanBlockStructure(text)`：剥标题行；按 state-A 正则 + 闭合 fence 对感知切出 [prose, ...scenarios{title, bodyLines}]；未闭合开栏行按普通文本。
  2. 基数真值表分类（键 = idOf(title) ?? normalizedTitle；先各侧计数）。
  3. 保序贪心子序列（normalize：CRLF/CR→LF、去行尾空白、剥行首空白、跳过空行；Map<line, 消费队列> 实现按序消费）。
  4. 返回 `{retained, titleChanged, dropped, added, ambiguous, missingLines}`（排序按 req B4：旧块序/新块序/ambiguous 两段式）。
- 导出 `compareModifiedBlock` 与 `formatIntegrityHuman(entries)`（human 段渲染共用；显著性规则在此实现）。**安全渲染（SPEC-5）**：一切外部来源字段先 C0/DEL→`·` 再 119+… 截断；全空结果返回空串且调用方不 push（无空行）。**捕获点模块级 oracle（SPEC-3）**：rename-then-modify 的 oldBlock deep-equal 改名前完整 A 块（在 RENAMED key swap 前捕获）；stamped-rerun repaired 路径同样产出等文本对；测试直接断言 buildProjection().modifiedBlocks 原文。

## G2 verify 面（lib/spec-runner.js）

- collectChangePairs 时从 `b.deltaOps` 已知哪些 suffix 有 MODIFIED；`b.modifiedBlocks`（buildChangeProjection 透传）供旧块——旧块场景标题作为第 4 类 pairs（`kind:'integrity'`）并入同一标题批：makeThenBind 扩展为接受分段（binding pairs / sibling titles / integrity titles），返回各段 ids；binding acc 只由第一段构成（scenarioCount/changeScope/storeReport 不受染——change 2 的全量 deep oracle 是护栏）。
- applyChangeScope 后（GREEN/GAPS 路径）：以批回的 old-title→id 查表构造 `idOf`，逐 MODIFIED 调引擎 → `run.modifiedIntegrity`；ERROR 路径与 --specs 恒不赋值（Object.hasOwn 护栏沿用）。
- verifyJson：`if (run.modifiedIntegrity) json.modifiedIntegrity = run.modifiedIntegrity`（GREEN/GAPS 恒在——含 []）。formatReport：`extras.modifiedIntegrity` → `formatIntegrityHuman`。
- 新块标题已在投影批内（scoped pairs）——其 id 同表可查；无需额外批。

## G3 archive 面（lib/archive-merge.js cli + bin/apriori.js）

- **接口钉死（SPEC-4）**：`archiveMerge.cli(argv, deps = {})` 与 `archiveChange({ ..., idMatcherFactory })`；factory 形状 `(cwd) => matcher|{error}`，惰性构造；**缺席与出错同路**（warning+skip）。bin 组装：`resolveIdPattern` 来自 `lib/config`（其导出处），`makeIdMatcher` 来自 spec-runner；archive-merge 模块自身零新依赖。programmatic 调用不带 factory 时同样走降级路（module 级行为有测试）。
- **插入点（SPEC-2 终裁）**："写前打印"是**输出文本顺序**保证（archive 输出保持 state A 的整体缓冲；不承诺物理 I/O 时序）。报告计算与 push 位于**全部** preflight 守卫之后——含 `preflightFailures` 检查、`--write` 分支的 pre-existing temp 与 destination containment 检查（dry-run 在 preflightFailures 后即为全部）——任何失败路径零报告。位置：per-module 列表之后、写循环/RESULT 之前：对 `p.modifiedBlocks` 全部条目——工厂缺席/解析失败/matcher.batch failure → stderr 一行 `sanitizeMsg('warning: modified-integrity ' + reason)` 后跳过；成功 → 一次 batch（旧+新块全部标题）→ idOf → 引擎 → `out.push(formatIntegrityHuman(...))`。RESULT 行、exit、写入字节零变化。
- 注入失败的 reason 类：`id-pattern resolution failed: …` / `matcher failure: …`。

## G4 文档

- docs/cli.md/cli_cn.md：verify 节（modifiedIntegrity 字段+human 段）、archive 节（integrity 段+warning 降级）；RUNBOOK.md/RUNBOOK_cn.md 在"MODIFIED 整块替换"警告句旁加一句"（`verify --change`/`archive` 会打印机械保真报告——丢失的场景与子句逐条列出）"；CHANGELOG 条目。

## 测试布局

- `test/modified-integrity.test.js`（新）：AM-43..47 + SR-65..68。引擎单测直接 require；verify 面走 CLI/模块混合；archive 面 CLI（bin 注入路径）+ 注入失败用 seam。
- AC7 fixture：`test/fixtures/modified-integrity/`（old-block.md、new-block.md——冻结复制自 change 2 的真实材料）；期望值**人工推导**写死。
- human golden：一个含全类的 --change 文本输出快照断言（段内）。
- 基数真值表八行表驱动。
