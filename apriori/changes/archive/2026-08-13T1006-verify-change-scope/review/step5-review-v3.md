# STEP5 implementation review v3 — verify-change-scope

## 结论摘要

Round 3 的实现层修复成立：

- `safeMdWalk` 将 sibling 枚举异常收敛为零 exemption；
- EACCES 注入证明 broken sibling 不会抛异常或独立产生 infra ERROR，未归因 red 仍按 GAPS 阻断；
- post-TAP ERROR 路径已证明一次 projection、一次 spawn、两次 matcher batch；
- GREEN/GAPS 与 pre-test ERROR 的 JSON shape 得到显著加强；
- SPEC-6 的最终信任模型已在 SPEC、DESIGN、CHANGELOG 和双语 CLI 文档中一致传播。

因此 IMPL-2 和 SPEC-6 可以关闭。

仍有 2 个测试忠实度问题。相关产品代码看起来正确，但 hard guarantees 尚未被所需的对抗条件完整锁定。

## Round 2 findings recheck

| ID | 复核结果 |
|---|---|
| IMPL-2 | verified |
| IMPL-3 | open：renderer 已实现，oracle 仍弱于完整 human contract |
| IMPL-5 | open：执行次数已补齐，但 post-TAP ERROR 仍非完整 JSON oracle |
| SPEC-6 | verified |

## Formal findings

### IMPL-3 — human store-report oracle 尚未证明全部展示保证

Risk: medium

`formatReport()` 的实现现在符合目标：六类 count 恒定输出，非空项目列明细，unidentified 包含 file/title，unattributed 最多列 20 行且单行截至 120 字符，duplicates 包含 files。

新增测试仍有三个可绕过点：

1. 21 条 unattributed 输入均为短行：

```js
`not ok ${i + 10} - naked ${i}`
```

因此只证明了 20-item 截断，没有注入超过 120 字符的 adversarial line，不能证明单行 120-char cap。

2. duplicate assertion 为：

```js
/duplicate IDs: 1  \(XB-01: spec\.md, spec\.md\)|duplicate IDs: 1  \(XB-01: /
```

第二个 alternative 在冒号后的文件列表为空时也可匹配，所以没有可靠证明 duplicate files 被列出。

3. fixture 的六类均非空，只证明非空 count 存在；没有证明 empty class 仍恒定打印 `0`。这属于“stable six-class view / counts always present”的另一分支。

Suggested fix:

- 将一条 unattributed failure 扩展到超过 120 字符，截取 store section 中对应行，断言展示长度上限和末尾 `…`；
- 对 duplicate line 做完整字符串或严格正则断言，至少验证两个预期文件 token；
- 再使用一个存在多个 empty classes 的 GREEN human run，断言六个 count label 均存在且相应值为 `0`。

### IMPL-5 — post-TAP ERROR 仍缺完整 JSON oracle

Risk: medium

SR-63 的 post-TAP 路径计数已经闭合：

- `buildProjection === 1`；
- sentinel 写入一次；
- matcher batches 为 2；
- `storeReport` absent。

GREEN、GAPS 和 pre-test ERROR 也已使用完整 `deepStrictEqual` shape。

但名为“四个 full deep-equal JSON oracles”的测试，对 post-TAP ERROR 只检查：

- `result`；
- `exec.status`；
- `storeReport` / `changeScope` absent；
- error message fragment。

它没有锁定该 outcome 的完整顶层字段、projection、specFiles、exec 其余成员、binding arrays、duplicates、stderr 和 unattributed shape。B6 明确要求四类各有完整 JSON oracle，因此此项尚未完全关闭。

Suggested fix:

- 像前三类一样对 post-TAP ERROR 执行完整 `deepStrictEqual`；
- 仅将动态 error string写为 `[je2.errors[0]]`，随后另行 `assert.match()`；
- 明确包含 `projection`，并确认 `storeReport`/`changeScope` 在 expected object 中缺省。

## SPEC-6 formal disposition

SPEC-6 可以标为 verified。

最终模型已经自洽：

- sibling declaration 是仓库内的 ownership assertion；
- 只有 strict-parse、zero-problem、nonzero-op delta 的 ADDED/MODIFIED block scenarios 能授予 exemption；
- REMOVED、malformed、escaping、symlinked、unreadable material 均不授予 exemption；
- sibling anomaly 本身不产生跨 change infra ERROR；
- 因异常而仍无法归属的 failing orphan 继续使当前 run 成为 GAPS；
- sibling titles 与 projection titles 共享第一次 matcher batch；
- 当前 change 自身 scoped red 仍进入 `boundRed`，不能被 sibling exemption 覆盖。

这既满足 GT-26 的独立变绿，也保留 SPEC-1 的 fail-closed 边界。

## P8 checklist summary

- Scenario semantic fidelity：除上述两项 oracle 强度外，SR-56..64、SR-16/18、GT-26/27 的测试与场景 INTENT 一致。
- Missing behavior：未发现新的已规定但未实现行为。
- Continue/skip/silent branches：sibling anomaly 的 skip 是明确的 exemption-denial 分支，并由 EACCES、malformed、REMOVED 和 symlink 反例覆盖。
- External input handling：sibling roots/files具备 containment、type guards、no-symlink-follow 和 fault-tolerant enumeration；未发现新的读取逃逸。
- Guarantees：
  - `byte-identical`：golden 覆盖；
  - `exactly two batches`：normal、TAP failure、post-TAP ERROR 覆盖；
  - `never re-runs tests`：spawn sentinels覆盖相关路径；
  - `fail-closed`：ID-less、ordinary orphan、invalid sibling、EACCES sibling 均覆盖；
  - `absent never null`：module-level ERROR checks覆盖；
  - human 120-char cap 与完整 post-TAP JSON shape 仍待补齐。
- Design fidelity：最终 sibling attribution、scope、report、gate detail 和 docs 已与实现一致。

## Advisories

- `safeMdWalk` 注释称处理“readdir/lstat failure”，其自身只执行 `readdirSync`；文件 `lstatSync` 位于调用方。整体路径确实容错，因此不构成 gap，但注释可写成“walker + caller guards”以免误读。
- idempotent rerun 测试中的 `stamp` 变量未使用，不影响语义。
- 本轮未把 read-only sandbox 无法独立执行动态测试计为 finding；接受 producer 提供的 306/306 和 `check --self` PASS，判断依据为静态代码及测试 oracle。

## Ledger delta

| ID | Status delta | Reason |
|---|---|---|
| IMPL-2 | fixed (r3) → verified | `safeMdWalk` 与 EACCES 注入证明异常分支不抛出、不授予 exemption，未归因 red 仍为 GAPS |
| IMPL-3 | fixed (r3) → open | 未注入 120-char 单行截断；duplicate-files 正则可被空列表绕过；未证明 empty classes 的 count 恒显 |
| IMPL-5 | fixed (r3) → open | post-TAP execution-count contract 已闭合，但 post-TAP ERROR 尚无完整 JSON `deepStrictEqual` oracle |
| SPEC-6 | fixed (r3) → verified | trust boundary、异常语义、single-batch 规则及 SPEC/DESIGN/docs/CHANGELOG 传播已一致 |

VERDICT: 2 issues open
