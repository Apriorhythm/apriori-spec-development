change: preserve-source-outcomes
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a191da-8c54-7b62-90cb-ee408cb2cbdc # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/preserve-source-outcomes`（从 v6-dev@c6543e7 开出）；本地提交；评审接受后 squash 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag、不发版（人类 2026-10-30：不发 6.0.1，继续改）
- observed: 来源——Claude × Astra 共识 `/root/asd-lab/work/astra-discuss/r1031b/R1031B-CONSENSUS.md`（2026-10-31 晚，两轮 CONSENSUS；§三 措辞逐字定稿；§四 守卫；§五 验证；§六 停止规则）；人类 10-31 晚「开工」；人类口径：apriori 本体改动由主会话亲手做，评审用 Astra（codex gpt-6-astra，只读）
- observed: 触发证据——evaluate-projects `comparisons/ref-c6543e7-custom-properties-1.report.md` §三：c6543e7 两次 rep 在第一次提交的规格里就观察到冲突、例子落到既有入口并测了，但 Ground observed 行已把来源义务缩成「不返回自定义数据」（rep-1 第 13 行、rep-2 第 11 行），测试主动接纳错误结果（rep-1 `status_code in (200, 403, 404)`，rep-2 分支「200 则无字段」）→ CP72 两次栽；`comparisons/ref-c6543e7-worklog-1.report.md` §一：worklog 的内评 CR-01 以代码库既有防护为据，生产者记 fixed、改写规格、改变了输出值 → WL17 栽。共同毛病：把来源转成期望结果、或按评审修改结果时，未经授权缩减了来源义务（两个独立环节：Specify 的解释、评审后的处置）
- observed: 现行文本的缺口——307 行末句「each expected result retains every source obligation applicable to that example」（PR-78）没有挡住：生产者认为已满足；324 行 disposition 规则已有「改变承诺由业主决定」，缺「处置时比较来源结果与建议结果、写明授权」；P3 不是已证实缺口，不动
- observed: 回声落点——RUNBOOK 307 行末（替换 PR-78 尾句）、324 行 disposition 规则（"cites that basis and the evidence of the violation." 之后）、376 行 P2 末（替换 PR-78 尾句）、380 行 P2 [Build & Test] 段末；契约 `apriori/specs/protocol/spec.md` 最后场景 PR-78（351 行），本 change 加 PR-79；delta 头 `apriori-base` = 当前 base sha256 1cbbdac4cf7cd054cfca16007c798676fa9fe2dd2786221f5a8f2ddafbd8beb0；CHANGELOG 条目放 `### Unreleased since 6.0.0 · source-conflict-entry-points` 之前；旧守卫 `test/source-conflict-entry-points.test.js` 两处精确匹配的尾句改为到 "under that condition." 为止，其余断言保留
- observed: 基线——`node scripts/run-tests.mjs` 921/921 全绿；P3 段落 sha256 97a85ca5…（与 d5a5060/c6543e7 同）、P1 段落 sha256 02f384ff…（c6543e7）
- observed: Review 第 1 轮（`review/code-review-v1.md`，Astra = codex gpt-6-astra 只读，P3 逐字）= `VERDICT: no spec-vs-code gaps`，实质发现 0；advisory 1：下游改善声明须区分守卫的安装证据与重放的行为证据（已在共识 §五 V3 的结果解释表里区分，不改文本）
- decision: approach（共识 §二/§三，最小形态）——E：Specify/P2 的例子回到来源条款、逐项陈述可观察结果、排除已观察到的冲突结果（替换没起作用的「保留全部义务」句，不并列）；F 生产方部分：disposition 规则与 P2 Build & Test 段末要求改变来源陈述结果的修法须引用来源、写明差异与授权，不改写契约凑 fixed，真冲突记两方依据交业主；P1/P3 不动；无新机制、门禁、字段或产物
- decision: 过拟合判据（R1031 §二 (i)–(vii)）自检——结构表述无任务名词（守卫禁 CSV/403/404/quoting/export 等）；两个独立机制（期望结果读弱、评审后改写）；无新机制；收紧既有动作；不触发时无新增产物；触发不依赖隐藏验收（来源条款与已观察冲突都是生产者手里的东西）；执行改变由 V1 三截面读数与 V3 固定输入重放证明，守卫只证明安装

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write（不接管道）→ squash 合回 v6-dev，推 judge 与 GitHub

gates:
  - 2026-10-31T20:00 note: change scaffolded by `apriori new`
  - 2026-10-31T20:03 note: Ground 完成：来源（R1031B 共识 §二/§三/§四/§五/§六）、触发证据（c6543e7 cp ×2：observed 行已缩减义务、测试接纳 200；worklog WL17：评审建议盖过来源、规格被改写）、现行文本缺口（307/324/376/380）、回声落点与 base sha
  - 2026-10-31T20:03 note: Specify（protocol PR-79）→ Build：test/preserve-source-outcomes.test.js 先红（RUNBOOK 暂存回 c6543e7 时 fail 1）后绿；RUNBOOK 307/376 行替换 PR-78 尾句、324 行 disposition 加四句、380 行段末加一句；旧守卫两处尾句匹配截到 under that condition.；CHANGELOG 条目
  - 2026-10-31T20:08 note: Review 第 1 轮（Astra，codex gpt-6-astra 只读，P3 逐字）接受：no spec-vs-code gaps，实质发现 0、advisory 1（安装证据与行为证据分开陈述）；进入 check / gate / archive
