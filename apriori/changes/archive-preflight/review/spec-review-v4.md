# spec-review-v4 — archive-preflight technical review（STEP2 Round 4）

评审基于静态读取；未运行测试，未修改文件。

## SPEC-2 verification — REOPEN

新的 disposition ladder 本身已经正确：

1. lexical claim 无法由同一 bundle 的 realpath containment 印证时先拒绝；
2. 否则任一 archived identity 拒绝；
3. 否则按 distinct active `bundleDir` 的 0 / 1 / >1 分流。

在候选 root 和 identity 已成功构造的前提下，这三个步骤有明确优先级，覆盖所有集合基数，且每个输入只产生一个结果。AM-60/T24e、AM-61/T24b、AM-69/T24c 分别钉住 escape、archived 和 ambiguous 分支。Round 3 的 ladder 重叠问题已解决。

但 root normalization 仍未完整定义，且当前措辞会与“lexical path 不解 symlink”发生安全冲突。

### SPEC-2 — Realpath 去重可能丢失 lexical root alias

**ID:** SPEC-2  
**Risk:** high  
**Status:** BLOCKING

规范同时要求：

- lexical measure 使用不解 symlink 的 normalized delta path；
- candidate roots 先全部解析成 absolute real paths，再去重；
- attribution 对解析后的 candidate roots 求值。

它没有规定 realpath 去重后是否保留每个 root 的原始 absolute lexical spelling。两种合理实现会产生不同结果：

1. 只保留 canonical real root；
2. canonical real root 用于 identity equality，同时保留全部 lexical aliases 供 lexical measure 匹配。

第一种实现存在 fail-open 路径。例如：

```text
<c​​wd>/apriori/changes -> /real/changes       # default root 是 symlink
<c​​wd>/apriori/changes/X/specs/delta.md       # 调用方使用 lexical default spelling
delta.md -> /outside/delta.md                  # leaf realpath 逃出 bundle
```

若 candidate root 只剩 `/real/changes`：

- unresolved lexical delta 以 `<cwd>/apriori/changes/...` 开头，无法匹配 `/real/changes`；
- delta realpath 又在所有 roots 外；
- identity set 为空；
- ladder 落入 rule 3 的 “0 active → surgical”，而不是 rule 1 的拒绝。

不带显式 `--changes-dir` 的 single-file 调用会跳过 N namespace checks，因此 N2 的 root-symlink defect 不会兜底。一个形式上属于正式 bundle 的路径于是可以绕过 readiness 和 escape refusal，将 bundle 外的 delta 写入 store。

还有一个相关边界未定义：canonical default root 不存在或 realpath 失败时，现有 genuinely surgical single-file 调用应该继续工作，但“每个 candidate root 先取 realpath”没有说明是忽略该 root、拒绝调用还是抛出错误。

#### Minimum fix for the human gate

无需改动 ladder。最小修复是把 candidate root 数据模型和失败处置写清：

- 每个候选 spelling 先形成不解 symlink 的 absolute lexical alias；
- realpath 只用于 canonical root identity 和去重；
- 去重时合并而不是丢弃该 canonical root 的所有 lexical aliases；
- lexical measure 对全部 aliases 求值；
- realpath measure 和 `bundleDir` equality 使用 canonical resolved paths；
- 若 default root 不存在且 delta 不 lexically claim 它，则忽略该候选，保留 surgical 旧行为；
- 若 delta lexically claim 一个无法解析或无法 corroborate 的 root/bundle，则命中 ladder rule 1 拒绝；
- 显式 move root 的既有/N2 defect 继续优先处理。

至少增加两个场景及任务：

- default root 是 symlink，delta 使用该 lexical spelling且 leaf realpath 逃逸：必须命中 rule 1，不能成为 surgical；
- default root 不存在，delta 位于外部且两种 measure 均不归属 bundle：保持既有 surgical 行为。

在该定义补齐前，root normalization 仍不能按唯一方式实现。

## 1. 场景是否覆盖全部可见行为及失败边界

**结论：未通过。**

身份集合的正常、archived、escape、多-root ambiguity 和等价-root去重均已有场景。

仍缺：

- canonical root 去重后如何保留 lexical aliases；
- default root realpath 不可用时的 disposition；
- symlinked default root 加 leaf escape 的 no-move 路径。

这些边界可改变输入是 formal bundle 还是 surgical 的判断，见 SPEC-2。

## 2. 外部共享状态的 init / runtime update / cleanup-invalidation

**结论：通过。**

两个模块级 seam 的生命周期完整：

- init：均为 `null`；
- runtime：
  - `_setClock(fn)` 在 capture 时恰调用一次；
  - `_setAfterReadinessHook(fn)` 在 readiness 通过后、首次写入前恰调用一次；
- cleanup：所有使用点在 `finally` 中复位为 `null`。

T32/T33/T34 覆盖 move、no-move、bundle/namespace mutation 和 cleanup-invalidation。未发现新的共享状态缺口。

## 3. 是否冲突 state A 或破坏既有约定

**结论：未通过。**

以下约定已被正确保护：

- gate BASE 的 bare `existsSync` 行为、返回对象和稳定错误面；
- gate 对 `classifyStatus` 的 re-export；
- resolver active-first shortcut；
- 两条 move 路径的单一 timestamp；
- genuinely surgical single-file dispatch；
- namespace、CAS 和既有 preflight 的优先级。

剩余冲突有两点：

- 冻结需求将 lexical claim 定义为针对默认或显式 changes-root spelling 的不解 symlink 判断；只保留 real root 会丢失该语义。
- State A 的 surgical single-file 调用不要求 default changes root 存在；未定义的 root `realpath` 失败可能无意破坏该行为。

见 SPEC-2。

## 4. 是否存在 spec 未设计或 design 未声明的行为

**结论：未通过。**

Spec、design 和 I7 已同步声明 ordered ladder、absolute-real-path dedup 和 resolved `bundleDir` equality。

缺失的是 lexical matching representation 与 canonical identity representation 的分离。当前设计没有说明去重后的 candidate 是否携带 aliases，也没有说明 root realpath 失败的结果。因此同一规范仍允许 fail-open、fail-closed或异常退出三种实现。见 SPEC-2。

其余 spec/design/task 映射完整；六个可回滚批次及每批全量回归顺序合理。

## 5. Security review

**结论：未通过。**

Ladder 的 escape 优先级、archived fail-closed、nested-root ambiguity、moveBundle 独立 readiness、review-root guard 和 force 边界均已正确覆盖。

唯一剩余安全问题是 realpath root dedup 可能擦除 lexical alias，使 formal-looking escaped delta 得到空 identity set并被归为 surgical。该路径可绕过 readiness，因此不能降为 advisory。

## Advisories

没有新增 advisory。

Round 3 的 advisory 修订保持有效：

- composite-predicate prose 已同步；
- design/tasks 均采用 set/ladder algorithm；
- 六个可回滚执行批次及逐批全量回归已明确。

当前阻断项只需补齐 candidate-root 表示、root-resolution failure disposition 和两个边界场景；不要求重做 attribution ladder，也不要求拆分 formal change。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | 单文件 `--changes-dir` 的实际 move bundle 未与 delta attribution/readiness 绑定，可移动未就绪或不同 root 的正式 bundle；N0 也未钉死 `:860` | high | STEP2·r1 | verified |
| SPEC-2 | Candidate root 的 realpath 去重未规定保留 lexical aliases，也未定义 default root realpath 失败；可令 symlinked-root 下的 escaping formal delta 被误判为 surgical | high | STEP2·r1 | open |
| SPEC-3 | `checkArchiveLedger` 设计未要求先执行 `reviewDirDefect`，内部 review-root symlink 可令 archive 与 gate C4 分歧 | med | STEP2·r1 | verified |
| SPEC-4 | AM-19 与 AC-AP-13f 的旧「行为不变」措辞和新增单文件归属场景冲突，会生成相反验收 | med | STEP2·r1 | verified |

VERDICT: 1 issues open
