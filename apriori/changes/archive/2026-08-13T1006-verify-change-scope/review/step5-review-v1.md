# STEP5 implementation review v1 — verify-change-scope

## 结论摘要

主路径的 change-scoped verdict、投影 provenance、零范围真值表、exit taxonomy、JSON 字段存在性以及 gate C1 接线总体符合 SPEC/DESIGN。`--specs` byte golden、单次 test spawn、普通 failing orphan / ID-less failure 的 fail-closed 反例也成立。

发现 6 个 spec-vs-code gap。最高风险集中在 sibling attribution：当前实现不仅存在外部路径 containment 缺口，还把无效或不属于 sibling scope 的任意 scenario heading 当作归属证明，可制造 false GREEN。

SPEC-6 的诚实双 change 用例得到实现，但“声明 ID 即证明测试归属”的形式模型仍允许合法 sibling 声明转移失败责任，因此应 reopen；这是 requirement/design 层问题，不在 6 个 implementation gap 之外重复计数。

## Scenario fidelity

| Scenario | 结论 |
|---|---|
| SR-56 / SR-57 | 基本 verdict、passing orphan、out-of-scope red、ID-less failure、failing orphan 行为符合；sibling 证明边界见 IMPL-1/2、SPEC-6 |
| SR-58 | MODIFIED、REMOVED、RENAMED、rename-then-modify/remove 实现符合；idempotent scope 缺少直接 oracle，归入 IMPL-5 |
| SR-59 | duplicate 阻断边界正确；cross-boundary duplicate 的文件 provenance 不完整，见 IMPL-4 |
| SR-60 | JSON store evaluation 保留相应项目；human store report 不完整，见 IMPL-3 |
| SR-61 | explained non-zero、unexplained non-zero、普通 fail-closed 反例符合 |
| SR-62 | 五项零范围真值表符合 |
| SR-63 | 代码路径为一次 projection、一次 spawn、一次 parse、两次 matcher batch；测试没有证明全部计数契约，见 IMPL-5 |
| SR-64 | 实现的字段语义和 absent 行为符合；测试并非所承诺的四类完整 JSON oracle，见 IMPL-5 |
| SR-16..24 | 修改后的 projection 语义总体符合；新 sibling 输入路径没有继承 SR-21 的 containment/fail-closed 姿态，见 IMPL-2 |
| GT-26 | 诚实、有效、互不重叠的两个 change 用例成立；归属证明可被伪造，见 IMPL-1、SPEC-6 |
| GT-27 | projection-bound red、ID-less failure、普通 true orphan 分支符合 |

## Open issues

### IMPL-1 — sibling attribution 接受无效或不属于 sibling scope 的标题，可产生 false GREEN

Risk: high

`collectSiblingTitles()` 对 sibling 文件只执行文本级 `scanTitles()`，不调用 `parseDeltaStrict()`，也不检查 operation、base stamp、merge conflict 或最终 sibling scope（`lib/spec-runner.js:131-145`）。随后所有提取出的 ID 被无条件加入 `siblingIds`（`lib/spec-runner.js:114-128`），并从 blocking `failingOrphans` 中排除（`lib/spec-runner.js:626-634`）。

因此以下输入都能把 `not ok ZZ-99` 从 GAPS 洗成非阻断 orphan：

- sibling 文件只有 `#### Scenario: ZZ-99 ...`，属于 zero-op/malformed delta；
- 标题位于 REMOVED block，或位于最终不属于 sibling scope 的 block；
- sibling delta 自身存在 base mismatch 或 merge conflict，根本不能形成可信 projection；
- 任意结构上无效但恰好含可匹配标题的 `.md` 文件。

这比 SR-56 的“provably attributable”和 GT-26 的“red belongs to change B's scope”更宽；当前测试只覆盖有效 ADDED sibling，未注入上述反例。

Suggested fix:

- 对 sibling 使用严格 delta parser，只有成功解析且确实进入该 sibling change scope 的 occurrence 才能贡献 attribution；
- 对 malformed、conflicting、ambiguous sibling attribution fail closed，至少不得作为豁免；
- 增加 malformed、REMOVED、conflicting、duplicate-owner sibling 的 failing-orphan 反例；
- 保留有效 sibling ADDED 场景的 GT-26 GREEN oracle。

### IMPL-2 — sibling 文件扫描缺少 realpath containment 和 regular-file guard

Risk: high

新路径直接递归读取 `apriori/changes/<sibling>/specs`（`lib/spec-runner.js:133-143`），没有复用 `discoverDeltas()` 的 containment 检查：

- `specs` 根若是 symlink，`mdFiles()` 的 `statSync()` 会跟随到仓库外；
- 以 `.md` 结尾的文件 symlink 会被 `readFileSync()` 跟随；
- 仓库外文本中的 scenario ID 因而可以进入 `siblingIds` 并改变 verdict；
- 单文件读取异常被空 `catch` 静默跳过，合法 sibling attribution 可无提示失效；
- 目录遍历异常不在该 `catch` 内，可能直接抛出而不是形成受控 ERROR。

这既违反新外部输入路径应有的 containment posture，也允许仓库外内容参与 false-GREEN 决策。

Suggested fix:

- sibling change、`specs/`、每个候选文件分别执行 `lstat`、regular-file 和 realpath containment 检查；
- 不跟随文件或目录 symlink；
- 将 unreadable、escape、race-induced disappearance 转为带路径的受控 ERROR，而不是 silently skip；
- 加入 escaping `specs` symlink、escaping `.md` symlink、非 regular file、注入式 read/readdir failure 测试，并断言外部 ID 不能豁免 failing orphan。

### IMPL-3 — human store report 没有输出规范要求的完整清单

Risk: medium

B2、SR-60 与 design G4 要求 store report 六类完整可见，并沿用逐项展示和 `unattributedFailures` 的 20 行截断规则。`formatReport()` 当前仅：

- 对 `boundRed`、`unbound`、`orphan` 输出一行逗号列表；
- 对 `unidentified` 只输出 count，丢失 file/title；
- 对 `unattributedFailures` 只输出 count，未按 20 行规则列出 lines；
- 对 `duplicates` 只输出 ID，丢失 files；
- 空类别完全省略，store 段本身没有稳定的六类视图。

见 `lib/spec-runner.js:427-435`。SR-60 只检查 JSON，未检查 human output，因此没有捕获该差异。

Suggested fix:

- 为六类逐类输出 count 与项目明细；
- `unidentified` 输出 file/title，`duplicates` 输出全部 files；
- `unattributedFailures.lines` 复用既有 20 行、120 字符截断逻辑；
- 增加包含六类非空项及超过 20 条 unattributed failure 的 human golden。

### IMPL-4 — change-scoped cross-boundary duplicate 丢失范围外文件 provenance

Risk: medium

duplicate 是否阻断按全 projection occurrence count 判断正确，但返回的 `files` 只来自 scoped occurrences：

```js
const scopedFiles = new Map();
...
const scopedDup = scopedIds
  .filter((id) => occCount.get(id) > 1)
  .map((id) => ({ id, files: [...scopedFiles.get(id)] }));
```

见 `lib/spec-runner.js:604-627`。当 changed file 中的 ID 与另一个 untouched file 冲突时，顶层 `duplicates[].files` 不含 untouched file，违背既有 SR-13 的“duplicates are reported with their files”，也不能完整解释 SR-59 的 cross-boundary ambiguity。

现有测试把两个 occurrence 放在同一 `m/spec.md`，且只断言 ID，因而掩盖了缺口（`test/change-scope.test.js:117-121`）。

Suggested fix:

- 从 full-projection `idFiles` 或 `storeReport.duplicates` 中筛选 scoped IDs，保留所有 occurrence files；
- 增加跨两个 suffix/file 的 duplicate fixture，并 deep-equal 两个文件名。

### IMPL-5 — SR-63/SR-64 与 guarantee claims 的测试 oracle 弱于其 INTENT

Risk: medium

测试名称声称证明完整契约，但存在以下缺口：

- SR-63 未计数 `buildProjection`，因此没有证明“exactly one projection”；
- projection-failure 路径没有 sentinel 断言 0 spawn；
- “sibling titles join the SAME batch”没有在双 change + counting child-runner fixture 中证明；
- idempotent rerun 仍属于 change scope 没有 change-scope 级测试；
- SR-64 没有对 GREEN/GAPS/pre-test ERROR/post-TAP ERROR 做完整 JSON deep oracle，只抽查少数字段；
- `absent, never null` 对 module API 仅直接检查了 `--specs` GREEN；pre-test/post-TAP ERROR 只检查序列化 JSON，而 `verifyJson()` 的 truthy guard 即使面对 `run.storeReport = null` 也会隐藏该字段，不能证明 run object 自身 absent；
- GT-26/27 没有断言完整、精确的六类 gate suffix。

已充分证明的保证包括：`--specs` human/JSON byte golden、正常和 post-TAP matcher failure 的单次 test spawn、普通 ID-less/failing-orphan fail-closed。

Suggested fix:

- 包装 `archiveMerge.buildProjection` 计数并在各路径断言；
- 给 projection failure 使用会写 marker 的 test command，断言 marker 不存在；
- 在两个 active changes 下启用 config-origin matcher，断言总调用恰好两次且 sibling title 位于第一次 payload；
- 为四类 JSON 建立完整 deep-equal oracle；
- 直接检查 ERROR run 的 `Object.hasOwn(run, "storeReport") === false` 和 `changeScope`；
- 对 gate detail 做完整字符串断言。

### IMPL-6 — RUNBOOK 双语传播不完全，且 sibling 口径过宽

Risk: low

requirement B7 和 design G5 要求在 verification matrix 明确补充“两视角”说明；实际只改写了前一段，英文和中文 verification-matrix bullet 均未增加该句。

此外 RUNBOOK 使用“a failing ID no active change declares”／“任何活变更都不认领”，而 SPEC 明确限定为 `SIBLING active change`。当前 change 的 REMOVED declaration 等并不能获得 sibling 豁免，因此该文案比实现和 SPEC 更宽。`docs/cli*.md` 与 CHANGELOG 使用 sibling 口径，造成文档内部不一致。

Suggested fix:

- 在 RUNBOOK.md/RUNBOOK_cn.md verification matrix 明确写出：本 change readiness 使用 `--change`，独立 store health 使用 post-archive `--specs`；
- 把“any active change”收窄为“sibling active change”；
- SPEC-6 重新裁定后同步最终的归属信任模型。

## SPEC-6 formal review

结论：reopen。

已验证的部分：

- 对有效、互不重叠的 sibling ADDED scope，A 的 failing orphan 能归属 B，A GREEN、B GAPS，解决了最初的 GT-26/SPEC-1 矛盾；
- sibling titles 确实加入 projection-title 的同一个 matcher batch，没有新增第三次 matcher 调用；
- 如果 A 自己把同一个 ID 放入 A 的 scoped block，该测试会成为 A 的 `boundRed`，不会因 B 也声明该 ID而被豁免；这个最直接的同-ID攻击被现有判定顺序挡住；
- amended rule 已传播到 SPEC、DESIGN、实现、GT-26、RUNBOOK、CLI docs 和 CHANGELOG。

仍不 sound 的部分：

- 即使修复 IMPL-1/2，只要任意有效 sibling delta 声明某 ID，系统仍无法证明 TAP 中该 ID 的失败测试实际“属于”哪个 change；
- 操作者可以新建或修改一个有效 sibling change，使其声明待豁免 ID，从而把 A 的 failing orphan 转移为“B's business”；
- 当前模型证明的只是“repository contains a sibling declaration”，不是“this failing test originated from that sibling”；
- repo 没有 all-active coordination gate，本次 scope 又明确不做协调视图，因此被转移的 red 可以在 A gate 中消失，只留在 B gate/store report。

建议二选一：

1. 明确信任边界：把“provably attributable”收窄为“repository-declared sibling attribution”，声明 active delta 是可信 ownership assertion，并承认其不防恶意/错误声明；或
2. 保持 fail-closed 声称：引入不可歧义的 test ownership 证据，例如显式 change-to-test manifest、per-change test command/source mapping，或对多 change ownership 冲突一律阻断。仅凭 scenario ID 无法证明测试来源。

无论采用哪一项，IMPL-1/2 的严格解析与 containment 仍必须修复。

## Ledger delta

| ID | Risk | Status | Delta |
|---|---|---|---|
| IMPL-1 | high | open | sibling attribution 接受 malformed、conflicting、REMOVED/非 scope 标题并可 false GREEN |
| IMPL-2 | high | open | sibling scan 缺少 containment/type guard，且 unreadable 分支 silently skip |
| IMPL-3 | medium | open | human store report 未输出六类完整清单 |
| IMPL-4 | medium | open | cross-boundary scoped duplicate 的 `files` 不完整 |
| IMPL-5 | medium | open | SR-63/SR-64/GT guarantees 缺少所承诺的完整 adversarial oracle |
| IMPL-6 | low | open | RUNBOOK verification matrix 未补两视角，且 active/sibling 口径不一致 |
| SPEC-6 | high | reopened | honest parallel case 可用，但 ID declaration 不能形式上证明 test ownership；关联 IMPL-1/2 |

既有 REQ-1..8、SPEC-1..5 保持 verified；SPEC-6 的 reopen 不作为额外 implementation issue 重复计入 verdict。

## Advisories

- human change 段显示 whole-projection `fileCount`、scoped scenario count，容易被读成同一范围。当前 JSON contract 明确 `specFiles` 属整个 projection，因此不计 gap；可在标签中注明 `projection files`。
- 建议让 sibling attribution 返回 `{change,file,requirement,id}` provenance，而不是裸 `Set<ID>`，便于报告、冲突诊断和未来 ownership policy。
- 动态最小反例因沙箱连 `/tmp` 也为只读而无法执行；按 R2 仅使用可直接追踪的静态控制流证据，未把该环境限制计为 finding。

VERDICT: 6 issues open
