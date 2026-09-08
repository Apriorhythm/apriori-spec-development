# STEP5 implementation review v2 — verify-change-scope

## 结论摘要

Round 1 的主要行为缺陷已修复：

- 严格 sibling attribution 已阻止 malformed、REMOVED、escaping symlink 和 symlinked `.md` 获取 exemption；
- 有效 ADDED sibling 的 GT-26 正例成立；
- duplicate provenance 已覆盖全部 occurrence files；
- human store report 的实现现在具备稳定六类结构；
- module API 的 ERROR 字段确为 absent；
- RUNBOOK 双语 two-view 口径已同步。

“异常 sibling 不产生 ERROR、只是不授予 exemption”的方向合理：exemption 是单调放宽项，拒绝异常输入只会让 verdict 更严格，不会制造 false GREEN。它避免了无关 sibling 单独造成全仓 infra ERROR。

但仍有 4 个未闭合项：一个 sibling 枚举异常仍可直接抛出；两个声称补齐的测试 oracle 实际仍不完整；SPEC-6 的最终措辞及 DESIGN/用户文档尚未完整传播严格信任模型。

## Round 1 findings recheck

| ID | 复核结果 |
|---|---|
| IMPL-1 | verified。严格解析、operation/block 过滤与 symlink 反例已阻止原有 false-GREEN 路径 |
| IMPL-2 | reopened。containment 已修，但 unreadable directory enumeration 仍可能抛出 |
| IMPL-3 | reopened。实现已修，但 scenario INTENT 所需的 human-output oracle 仍不存在 |
| IMPL-4 | verified。跨文件 duplicate 的顶层 provenance deep-equal 两个 suffix |
| IMPL-5 | reopened。部分 guarantees 已加强，但四类完整 JSON oracle 与 post-TAP 路径计数仍缺失 |
| IMPL-6 | verified。双语 matrix 与 sibling 术语已修 |
| SPEC-6 | reopened。核心机械规则可接受，但最终形式化措辞和 DESIGN 仍互相矛盾 |

## Formal findings

### IMPL-2 — sibling directory enumeration 的 unreadable 分支仍未 fail-closed

Risk: high

`collectSiblingTitles()` 对 `changesDir`、`lstat(specsDir)`、单文件 `lstat/readFileSync` 做了降级处理，但直接执行：

```js
for (const f of mdFiles(specsDir))
```

见 `lib/spec-runner.js:138-153`。

`mdFiles()` 内的 `statSync()`、`readdirSync()` 以及递归调用均无异常保护（`lib/spec-runner.js:87-97`）。因此 sibling `specs/` 或其嵌套目录在枚举时发生 `EACCES`、`ENOENT` race、I/O error 等情况，会从 `verify()` 直接抛出，而不是“grant NOTHING”。CLI 也没有在该层捕获异常。

这违反 amended SPEC 中“unreadable sibling material grants NO exemption”以及“不因 broken sibling 产生 ERROR”的目标。当前测试只覆盖 symlink；没有注入 directory enumeration failure。

Suggested fix:

- 将 sibling 扫描改为专用 safe walker，每层 `lstat/readdir` 都捕获异常并返回零 attribution；
- 或至少包住 `mdFiles(specsDir)`，但专用 walker 更能保持逐层 containment/type guard；
- 用 monkeypatch/fault seam 对 sibling `specs/` 和嵌套目录的 `readdirSync` 注入异常；
- 断言 `verify()` 不抛出、不产生 sibling exemption，原 failing orphan 仍为 GAPS。

这里应精确区分：异常 sibling 不应单独产生 infra ERROR；但若 TAP 中同时存在因此无法归属的 red，该 red 仍会按 fail-closed 规则阻断为 GAPS。

### IMPL-3 — human store report 实现已修，但没有测试其完整 INTENT

Risk: medium

`formatReport()` 现在确实实现了：

- 六类 count 恒定输出；
- `boundRed`、`unbound`、`orphan` 的项目列表；
- `unidentified` 的 file/title；
- `unattributedFailures` 的 20 行、120 字符截断；
- `duplicates` 的全部 files。

见 `lib/spec-runner.js:446-459`。

但测试中没有任何 `STORE REPORT`、`bound-green:`、`unattributed failures:` 或 `duplicate IDs:` 的 human-output assertion。SR-60 仍只检查 JSON。因而一个删除所有 human 明细、只保留 JSON 的回归仍会保持 302 tests GREEN。

这未满足本次评审的“每个测试 faithfully exercises scenario INTENT”，也未证明 B2 的 human completeness 保证。

Suggested fix:

- 建立一个同时含六类数据的 `--change` human fixture；
- exact/golden 断言六类 count 恒在；
- 断言 unidentified 带 file/title、duplicates 带全部 files；
- 注入至少 21 条 unattributed failures，并断言只列前 20 条、120 字符上限及 `… and N more`。

### IMPL-5 — SR-63/SR-64 的完整 guarantees oracle 仍未补齐

Risk: medium

已补齐的部分真实有效：

- normal、invalid-pattern、projection-failure 的 projection build 计数；
- invalid-pattern/projection-failure 的 0 spawn；
- sibling title 位于第一 matcher payload，且总共两批；
- idempotent ADDED rerun 仍进入 scope；
- pre/post ERROR 的 module-level `Object.hasOwn()` absence；
- gate detail 完整字符串。

仍缺两组明确要求的 oracle。

第一，B3 是四路径表，但新 build counter 仅覆盖：

- normal；
- invalid-pattern；
- projection-failure。

post-TAP ERROR 没有同时断言 `buildProjection=1`、spawn=1、matcher batches=2。原有 TAP-batch failure 测试只验证 marker 为一次，没有验证 projection count；其局部 `n3` 也未被断言。

第二，B6/AC7 明确要求 GREEN、GAPS、pre-test ERROR、post-TAP ERROR 各有一个“完整 JSON oracle”。当前 SR-64 仍只是抽查：

- GREEN 的少数字段和一个 requirement；
- GAPS 仅检查 result 及两字段存在；
- ERROR 仅检查 result 和两字段缺省。

它没有 deep-equal 顶层 change semantics、全部六类 `storeReport`、`changeScope.scenarioIds`、array/count 对应关系、projection/exec/specFiles 等完整 shape。大量字段语义回归不会使该测试失败。

Suggested fix:

- 对四种 outcome 各保存或内联一个完整 `deepStrictEqual` oracle；
- 给 GREEN/GAPS fixture 填充足够数据以覆盖所有 change/store 字段；
- 在 post-TAP ERROR 上复用 build/spawn/matcher counters；
- 明确断言 normal 与 store view 对同一 TAP ID 的 pass/fail counts 一致。

### SPEC-6 — trust-model 核心可接受，但最终裁定尚未完整、无矛盾地传播

Risk: medium

在当前明确的 repository-declaration trust boundary 下，严格 sibling attribution 可以接受：cleanly parsed ADDED/MODIFIED block 是 ownership assertion；恶意提交者本就能同时修改 specs/tests，因此它不是要防御的独立攻击主体。当前 change 自己声明同一 ID 时，red 会进入 scoped `boundRed`，不能靠 sibling exemption 洗掉。

但最终材料仍有三处不一致：

1. SPEC 写道 malformed/unreadable material “grants NO exemption”，随后又说 “a broken sibling never blocks this change either”。这两句在存在该 sibling red 时不能同时成立：无 exemption 意味着 red 成为 failing orphan，当前 change 正确地 GAPS；新增 malformed 测试也明确断言 status 1。真正成立的是“broken sibling 不独立制造 infra ERROR”。

2. DESIGN G3 仍规定“文本级 `scanTitles`，无需解析 delta 结构”，见 `design.md:22`；实现已经改成 `parseDeltaStrict`、operation filtering 与 containment guards。作为 folded gate-3 输入，这是实质性 implementation-vs-design drift。

3. CHANGELOG 与 `docs/cli*.md` 仍笼统写“declared/attributed by a sibling delta”，没有说明只有 cleanly parsed ADDED/MODIFIED block bodies 能授予 exemption。REMOVED/malformed 的实际行为与这些公开描述不同。

Suggested fix:

- 将 SPEC 的后半句改为：broken sibling material does not independently create an ERROR; any failure left unattributed still blocks as GAPS；
- 把 DESIGN G3 更新为当前严格 parser、block filtering、containment 和 anomaly-as-no-exemption 算法；
- 在 CHANGELOG、`docs/cli.md`、`docs/cli_cn.md` 收窄 sibling attribution 描述；
- 完成这些传播后，SPEC-6 可标为 verified。

## 其余 scenario 与 guarantees

以下经复核未发现新的实现差异：

- SR-56/57 的 scoped green/red/unbound 和普通 failing-orphan/ID-less fail-closed；
- SR-58 的 MODIFIED、REMOVED、RENAMED、rename-then-modify/remove 及 idempotent rerun；
- SR-59 的 scoped/cross-boundary duplicate 判定；
- SR-61 explained/non-explained non-zero exit；
- SR-62 五项零范围真值表；
- SR-64 的实际字段存在性实现；
- GT-26/27 的 C1 接线及六类 suffix；
- `--specs` byte golden；
- test command 在已覆盖路径中没有二跑；
- `storeReport`/`changeScope` 在已检查 ERROR run object 上为 absent，而非 null。

## Advisories

- idempotent rerun 测试创建了未使用的 `stamp` 变量；不影响语义。
- human report 对 files 使用 `path.basename()`；两个不同 suffix 都叫 `spec.md` 时显示会歧义。现有传统格式也是如此，SPEC 未明确要求 human 使用完整 suffix，因此仅作 advisory。
- 本轮未把 read-only sandbox 下无法独立执行动态测试计为 finding；302/302 x4 与 `check --self` PASS 作为 producer evidence 接受，结论来自静态实现与 oracle 审查。

## Ledger delta

| ID | Status delta | Reason |
|---|---|---|
| IMPL-1 | fixed (r2) → verified | strict parse、ADDED/MODIFIED block filtering、REMOVED/malformed/symlink 反例与 valid ADDED 正例闭合原 false-GREEN 路径 |
| IMPL-2 | fixed (r2) → open | `mdFiles(specsDir)` 的 directory enumeration 异常仍可抛出；unreadable sibling 尚未实现为零 exemption 的稳定分支 |
| IMPL-3 | fixed (r2) → open | human renderer 已修，但没有测试六类完整输出及 unattributed truncation |
| IMPL-4 | fixed (r2) → verified | cross-file duplicate oracle 包含全部 occurrence files |
| IMPL-5 | fixed (r2) → open | post-TAP 路径计数与四 outcome 完整 JSON oracle 仍缺失 |
| IMPL-6 | fixed (r2) → verified | RUNBOOK 双语 two-view 与 sibling 术语已同步 |
| SPEC-6 | fixed (r2) → open | trust rule 主体可接受，但 SPEC 自身措辞矛盾，且 DESIGN/CLI/CHANGELOG 仍未传播严格算法 |

VERDICT: 4 issues open
