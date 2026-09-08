# req-v1 需求评审

## 维度 1：目标状态 B 是否清晰且无歧义

结论：未通过。存在 REQ-1、REQ-2、REQ-3。

### REQ-1

- 描述：需求声称只有 C1 依赖 test command，但当前实现中 C7 也间接依赖 C1 的执行路径。`lib/gate.js:318-334` 将 `checkBinding()` 返回的 `b.projection` 传给 `checkCas()`；该 projection 由 `lib/spec-runner.js` 的 `verify()` 在执行测试前构建，但没有独立导出的 projection-only 接口。若仅删除 `lib/gate.js:316` 的提前返回，缺少 test command 时不能安全调用现有 `verify()`；若直接以空 projection 调用 `checkCas()`，则 `checkCas()` 会把 `unstampedMutations` 当作空数组，从而错误放行 C7。需求同时把源码范围限定为 `lib/gate.js` 和 `lib/doctor.js`，却没有声明如何解除这一依赖。
- 风险：high。实现者可能让 C7 假通过、重复一套与 verify 不一致的 projection 逻辑，或被迫越过已声明的源码范围；这会破坏 CAS 完整性检查，直接重现 false-negative。
- 建议修复：准确记录状态 A：语义上只有 C1需要执行测试，但 C7 的输入目前由 C1/verify 路径生产。明确指定唯一 projection seam：例如导出并复用 `spec-runner` 的 projection-only 构建接口，并把 `lib/spec-runner.js` 加入触及范围；或者明确要求 `gate` 通过 `archive-merge` 的既有原语构建同一 projection，并用差分测试证明其错误、冲突、CAS mismatch 与 verify 完全一致。验收标准还应断言缺少 test command 时测试进程不启动，而 C7 使用真实 projection。

### REQ-2

- 描述：`ERROR > BLOCKED > INCOMPLETE > PASS` 给出了结果类别的抽象全序，但没有完整定义若干可达组合的验证顺序和逐检查输出：
  - 缺少 test command，同时 `--id-pattern` 为空、不可编译，或 config 中的 id-pattern 不可编译；
  - 缺少 test command，同时 config-origin matcher 会超时、被杀或返回畸形结果；
  - 缺少 test command，同时 in-flight projection 出现 validation、hygiene、CAS mismatch 或 merge conflict；
  - 缺少 test command，同时 flow-state 缺失、不可读，或仅为 C3 可判定的非法内容。
  
  AC-GD-04/05 只规定部分情形的最终退出码。它们没有规定 C1 是否仍为 `skipped`、C7 应为 `n/a`/`skipped`/缺席中的哪一种、C2..C6 是否继续，以及 `blocked`/`errors` 的精确值。B1 的“C2..C7 各自产出真实状态”与坏 projection 下 C7 无法得出结论也存在张力。另需明确 test command 的边界分类：缺失、`null`/`undefined`、显式空字符串、仅空白字符串、不可读配置和冲突配置。
- 风险：high。不同实现会产生不同的 JSON、检查数量、错误优先级和退出码；机器消费者无法可靠穷举第四种结果和第四种检查状态。
- 建议修复：增加输入与结果矩阵，至少列出上述组合，并为每格规定：是否读取 id-pattern、是否构建 projection、是否启动测试、C1/C7 状态、是否继续 C2..C6、`errors`、`blocked`、`result` 和退出码。明确早期 ERROR 类是否例外于 B1。保留现有 GT-24/GT-25 时，应明确其在 C1 因缺命令而 skipped 时是否仍适用。

### REQ-3

- 描述：AC-GD-10 写道 `--json` 下“`code` 与进程退出码一致”，容易被解释为 JSON 新增 `code` 字段；但当前 `toJson()` 和 GT-11 的契约都没有 `code` 字段，而 B4/AC-GD-09 又要求有效 test command 下 JSON 形状逐字节不变。这两个要求不能同时成立。
- 风险：med。实现者可能破坏所有既有 JSON 输出的字节兼容性，或省略验收者以为必须新增的字段。
- 建议修复：二选一并写成精确 schema：
  - 若不新增字段，将 AC-GD-10 改为“进程退出码必须与 `result` 的 0/1/2/3 映射一致”，并明确 INCOMPLETE JSON 仍为 `{change,stage,checks,result,blocked,errors}`；
  - 若确实新增 `code`，删除 B4/AC-GD-09 的 JSON 字节不变承诺，并把所有四类 JSON 的完整 schema 和兼容影响写清楚。

明确的 out-of-scope 章节已经存在，O1–O6 边界清楚。

## 维度 2：边界与异常路径是否覆盖

结论：未通过，原因是 REQ-2。

缺配置、显式空 flag、配置冲突、flow-state 失败、projection conflict、未打戳 mutation、归档态和 hotfix 拒绝均已有验收面；但缺命令与 id-pattern 错误、matcher timeout、projection 错误叠加时的逐检查行为仍未定义。并发、回滚不适用于这个只读同步聚合器；有效 test command 下的既有超时和失败语义由 B4 保持。

## 维度 3：是否存在隐含但未声明的状态变化或副作用

结论：未通过，存在 REQ-5。

### REQ-5

- 描述：机器契约扩展已在 K2/K3 声明，但文档影响面不完整，部分验收措辞也不可机械判定：
  - `docs/ci.md` 和 `docs/ci_cn.md` 的 exit-code cheat table 当前只列 0/1/2；AC-GD-18 未覆盖它们。
  - `docs/troubleshooting.md` 和 `docs/troubleshooting_cn.md` 声称按 doctor findings 排查，但 D5 章节没有“未配置 test-cmd”这一新增 finding；需求未要求更新。
  - AC-GD-19 的“与新语义一致”和 AC-GD-20 的“显著标注”没有规定可断言的文本或表格内容。
- 风险：med。实现完成后，同仓公开文档会给出冲突的机器契约；“一致”“显著”也无法形成确定的自动化验收。
- 建议修复：把上述中英文文件加入文档验收面。为每项规定精确断言，例如 exit-code 表必须含 `3 | INCOMPLETE`，gate JSON 状态枚举必须含 `skipped`，D5 troubleshooting 必须说明缺少 test-cmd 会导致 finding、C1 skipped 及对应修复行；用这些可搜索文本替换“显著”“一致”。

仓内调用点核查结果：`.github/workflows/ci.yml` 不调用 gate；`docs/ci*` 示例显式传入 test command；golden-path 的 README 流程由 `init --test-cmd` 写入配置，因此仍期待 exit 0。没有发现 `scripts/` 或 `.github/` 中把 gate 退出码限定为 0/1/2 的可执行消费者。测试侧 `test/doctor.test.js` 的 DR-07 当前明确断言缺配置为 `n/a`，实施 AC-GD-13 时必须更新；其余主要 gate 调用均传入有效 test command，受 AC-GD-09 保护。

## 维度 4：每条验收标准是否可测试

结论：未通过。REQ-3 使 AC-GD-10 的 JSON 断言不确定；REQ-5 使 AC-GD-19/20 无法表达成唯一的 if/then 断言。其余验收标准原则上可通过 CLI 退出码、JSON schema、检查状态、输出子串和 sentinel test command 表达。

## 维度 5：是否与状态 A 冲突

结论：未通过，存在 REQ-1 和 REQ-4。

### REQ-4

- 描述：需求声称 `truth/gate.md` 与 `truth/doctor.md` 的 Contract 均已验证为新鲜，但 `apriori/truth/doctor.md` 仍把 doctor 描述为“seven checks”并只列 D1..D7；实际 `lib/doctor.js:206-210` 已执行 D8，living spec 也明确写的是 eight checks，并包含 DR-13。该新鲜度声明不符合仓库现实。
- 风险：med。实现者可能依据错误的 KB 摘要忽略 D8，或把 D8 的保留误判为额外范围；B4/AC-GD-17 的“全部行为不变”也缺少准确基线。
- 建议修复：修正需求中的状态 A，明确 doctor 当前有 D1..D8 且本变更只修改 D5、D8 必须原样保留；不要宣称 `truth/doctor.md` Contract 已完全新鲜，除非先完成并验证对应 KB 修正。

REQ-1 另揭示了 C7 与 C1 projection 的真实源码耦合，需求当前的状态 A 描述未包含这一事实。

## 维度 6：目标 lineage 是否声明且符合仓库现实

结论：通过。

需求声明目标为 `brownfield-round2`，从 `main@235a121` 切出，最终进入 `main` 且不得进入 v1/v3。仓库当前 `brownfield-round2`、`main` 和 `origin/main` 均指向 `235a121`，分叉计数为 0/0；package 版本为 4.1.0，属于声明的 v4 产品线。lineage 清晰且与仓库现实一致。

## Advisories

无。

## Ledger delta

将以下行追加到 `apriori/changes/gate-degrades/review/issues.md`：

```markdown
| REQ-1 | C7 currently consumes projection produced through C1 verify, but the requirement claims only C1 depends on that path and limits source scope without declaring a projection-only seam | high | 1 | open |
| REQ-2 | Reachable missing-test-command combinations do not define validation order, per-check statuses, continuation behavior, blocked count, and errors completely | high | 1 | open |
| REQ-3 | AC-GD-10 implies a JSON code field while B4 and AC-GD-09 require the existing code-free JSON shape to remain byte-identical | med | 1 | open |
| REQ-4 | The requirement claims the doctor KB Contract is fresh although it omits the implemented and living-spec D8 check | med | 1 | open |
| REQ-5 | Documentation impact is incomplete and AC-GD-19/20 use non-mechanical consistency and prominence predicates | med | 1 | open |
```

VERDICT: 5 issues open
