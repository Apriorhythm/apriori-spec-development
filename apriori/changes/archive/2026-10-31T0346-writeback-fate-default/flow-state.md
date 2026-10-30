change: writeback-fate-default
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a18e56-ee39-7f50-99e2-15fe98b4ceb1                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/writeback-fate-default`（从 v6-dev@0cdebfc 开出）；本地提交；评审接受后 squash 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag、不发版（人类 2026-10-30：不发 6.0.1，继续改）
- observed: 来源——Claude × Astra 共识 `/root/asd-lab/work/astra-discuss/r1030/R1030-CONSENSUS.md` §二（2026-10-30，一轮 CONSENSUS；人类「聊到你们都统一意见」后 10-31「开工」）；人类 10-31 另定：apriori 本体改动由主会话亲手做，评审用 Astra（codex gpt-6-astra，只读）
- observed: 触发证据——evaluate-projects `comparisons/ref-0cdebfc-custom-properties-1.report.md` §二/§三：0cdebfc（含 ground-writeback-trace）在 custom-properties@3 两次 B4 仍栽。rep-1 Ground 追到了写回并写出「表示不了的部分下一次页面编辑时被丢掉」（Reality Check 第 20 行），但 Specify 自己定「保持本改动之前的行为」（继续丢），没有来源、没交业主；rep-2 到评审第 1 轮 CR-01 才把 OR/NOT 的命运推进 `## Open` O-01 交业主 → 无业主回答 → ownerStop，代码仍覆盖。两次都没有跑「已存视图 → 编辑 → 保存 → 重读」这条路径
- observed: 断点一（触发范围）——RUNBOOK §4 Ground bullet（290 行）与 P1（366 行）把 decision/Open 路由限定在「this change builds or replaces the write-back」；rep-1 只是扩展了既有适配器（加 `customproperty*` 叶），可以读成「不算替换」，于是落回「既有路径的命运是 observed」而没有被要求选择。Astra（astra-r1-reply.md 事实 3）：P2 第 376 行「a user-visible behavior no source settles is the owner's question」本来就覆盖，但 Ground/P1 的字面缺口让生产方停在「照旧」
- observed: 断点二（默认命运）——现行文本（Ground 290、P1 366、§4 Specify 306、P2 377）只说命运要「有来源的 decision，否则 Open 交业主」；没有说「没有来源时默认是什么」，也没有说「既有实现就会丢」不构成授权。在无业主的基线里 Open 必然成 ownerStop，代码照旧丢；在有业主的真实项目里，业主拿到的是「要不要继续丢数据」这种本不该问的问题
- observed: 断点三（证据）——§4 Build & Test「Run the tests the risks call for」bullet（312 行）与 P2 Build & Test 段要求运行时行为实跑并记 observed，但没有点名「已存对象含表示不了的内容 → 编辑 → 保存或拒绝 → 独立重读」这条路径；rep-1 的浏览器 65 项检查全过，就是没跑它
- observed: 回声落点——docs/concepts.md 463 与 docs/concepts_cn.md 463（三时机句括号）；docs/cli.md 263 与 docs/cli_cn.md 263（§8.1「2. Update at runtime」行）；契约 `apriori/specs/protocol/spec.md` 最后一个场景 PR-76（337 行），本 change 加 PR-77；delta 文件头 `apriori-base` = 当前 base sha256 53d81f98b7824266df09eebd6ef3e370f7c823074f91cd5f4436b41ea7e680c8；CHANGELOG 条目放 `## 6.0.0` 下 `### Unreleased since 6.0.0 · writeback-fate-default`（ID-06 禁止 `## Unreleased`）；现有守卫 `test/ground-writeback-trace.test.js` 对 290/366/306/377 行与 concepts/cli 回声做逐句断言，改字必须同步改它
- observed: 基线——`npm test` 919/919（node scripts/run-tests.mjs），`node bin/apriori.js --version` 6.0.0（全局 `apriori` 是 6.2.0-rc.0 旧装，不用）
- decision: approach（共识 §二 (a)(b)(c)，最小形态）——(a) Ground 290 与 P1 366 的路由句触发范围改为「本 change 改变了持久化内容如何进入编辑路径、如何被表示、编辑或写回——包括扩展既有适配器或表示，不要求写回函数本身被改」；(b) 同一句加默认命运：没有来源授权删除时，表示不了的部分不得因编辑器能力有限而被静默丢弃——能保持原结构与语义就保留未编辑的部分并应用编辑（改变已存含义的机械拼接不算保留），保留不了就在破坏发生前拒绝编辑或把该区域设为只读并说明原因、重读后存储不变；这是引用本规则的 `decision: runbook — …`，不等业主；「既有实现本来就丢」只说明现状、不是授权；来源明确要求可编辑时只读不算完成，冲突照常解决；业主在安全默认之外的偏好是 follow-up。§4 Specify 306 与 P2 377 的运行时更新从句同步；(c) §4 Build & Test 312 与 P2 Build & Test 段加一句：对本 change 扩展的结构，至少完整走一次「已存对象含表示不了的内容 → 尝试编辑 → 保存或明确拒绝 → 独立重读」，证据证明未编辑部分及其语义仍在（拒绝分支：有提示且存储不变）；只测适配器转换、只看 API 200、只刷新页面都不算。concepts 中英、cli 中英各加半句回声；protocol delta 一个 ADDED Requirement + PR-77；CHANGELOG 小节；新守卫 test/writeback-fate-default.test.js，旧守卫 ground-writeback-trace.test.js 改到与新文本一致。不加 gate、字段、图、文档，不加任何题目特定文字
- observed: Build——`test/writeback-fate-default.test.js` 先红（Ground 句仍是「builds or replaces」）后绿；改动落点：RUNBOOK §4 Ground bullet 路由句改触发范围 + 安全默认段、P1 同义句、§4 Specify「Minimal means minimal」与 P2 共享状态句的运行时更新从句各加「无来源时按 §4 Ground 安全默认记 decision」、§4 Build & Test「Run the tests the risks call for」与 P2 Build & Test 段各加「完整走一次 读 → 编辑 → 保存或拒绝 → 独立重读」句、docs/concepts(.md/_cn.md) 463 与 docs/cli(.md/_cn.md) 263 各加半句默认、CHANGELOG `### Unreleased since 6.0.0 · writeback-fate-default`；旧守卫 `test/ground-writeback-trace.test.js` 三处断言改到新文本（注明 PR-77）；`npm test` 920/920（原 919 + 1）；`apriori check` PASS；`apriori verify --change writeback-fate-default --test-cmd "node scripts/run-tests.mjs --test-reporter=tap"` GREEN（`npm test` 不吐 TAP，verify 报 ERROR 不可信，换 TAP reporter）
- observed: Review 第 1 轮（`review/code-review-v1.md`，Astra = codex gpt-6-astra 只读，P3 逐字；R2 异构）= `VERDICT: no spec-vs-code gaps`，实质发现 0：触发范围覆盖扩展适配器、区分「观察到的丢弃」与「授权」、保留结构与语义、破坏前拒绝、只读不满足必须可编辑的来源；Specify/P2 引用默认；Build & Test/P2 要求独立重读；中英文档一致；P3 未动；守卫测试检查真实文本并拒绝旧触发；一条证据链即可，不必 SPLIT。它自己跑了两条守卫（TAP）通过。未审：下游应用的编辑/保存流程与 agent 评测（守卫只证明规则措辞，不证明 agent 一定照做）
- decision: advisory A-1（P1 只是缩写并引用 §4 Ground；建议把语义保留与必须可编辑两条写进 P1）——不改：评审已接受，P1 明确指向 §4 Ground 的完整表述，且 docs/P 段落按人类 10-23 口径非关键；下次触及这段文字时一并对齐
- decision: 不承诺消除所有 ownerStop（Astra R1030 二(b)）：本 change 只消除「安全默认尚待业主批准」这一种阻塞；拒绝编辑能消除销毁，但不保证某个外部验收全项通过

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write（不接管道）→ squash 合回 v6-dev，推 judge 与 GitHub

gates:
  - 2026-10-31T03:34 note: change scaffolded by `apriori new`
  - 2026-10-31T03:35 note: Ground 完成：来源（R1030 共识 §二）、触发证据（0cdebfc ×2 B4 仍栽：rep-1 Specify 自定照旧丢、rep-2 评审才进 Open）、三个断点（触发范围字面缺口、无默认命运、证据没点名路径）、回声落点与 base sha 已记入 Reality Check；approach 按共识 (a)(b)(c) 最小形态
  - 2026-10-31T03:42 note: Specify（protocol PR-77）→ Build：test/writeback-fate-default.test.js 先红后绿；RUNBOOK Ground/P1 触发范围+安全默认、Specify/P2 运行时更新从句、Build & Test/P2 Build 段走路径句、concepts 中英、cli 中英、CHANGELOG；旧守卫同步；全量 920 通过、check PASS、verify GREEN（TAP reporter）；phase → review
  - 2026-10-31T03:46 note: Review 第 1 轮（Astra，codex gpt-6-astra 只读，P3 逐字）接受：no spec-vs-code gaps，实质发现 0；advisory A-1（P1 缩写）记录不改；进入 check / gate / archive
