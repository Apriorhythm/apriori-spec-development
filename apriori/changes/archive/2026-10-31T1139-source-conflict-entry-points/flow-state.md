change: source-conflict-entry-points
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a19008-33bc-7892-be3c-b1b5b9067332 # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/source-conflict-entry-points`（从 v6-dev@d5a5060 开出）；本地提交；评审接受后 squash 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag、不发版（人类 2026-10-30：不发 6.0.1，继续改）
- observed: 来源——Claude × Astra 共识 `/root/asd-lab/work/astra-discuss/r1031/R1031-CONSENSUS.md`（2026-10-31，三轮 CONSENSUS，§四 措辞逐字定稿，§二 七条过拟合判据，§五 验证与停止规则）；人类 10-31「开工」；人类 10-31 口径：apriori 本体改动由主会话亲手做，评审用 Astra（codex gpt-6-astra，只读）
- observed: 触发证据——evaluate-projects `comparisons/ref-d5a5060-custom-properties-1.report.md` §一/§二：d5a5060（含 writeback-fate-default）在 custom-properties@3 两次 CP72 栽、rep-1 B1/B3 栽（主读法 A 4）。两次 Ground 都已观察到既有权限捷径（rep-1 flow-state 第 15 行、rep-2 第 12 行：`creator=True` 让创建者免项目成员身份通过、`allow_permission` 让工作区 Admin 通过任何角色检查），rep-2 推成「new endpoints need a strict active-project-role check」；rep-2 规格的角色表覆盖了工作区 Admin 无成员身份 × 新端点、Guest × 他人详情，唯独没有「退出项目的创建者 × 既有详情 GET → 403/404」；B1/B3 是前端复用既有权限 helper（工作区 Admin → 项目 Admin）而后端新代码做对；rep-1 的 or/not observed（第 25 行）没进 decision（第 26 行）是同一断点。断点 = 已观察到的「来源否定既有行为」冲突，在转成规格承诺时被缩到本次新写的入口，既有入口没有例子、没有证据
- observed: 现行文本的缺口——§4 Ground「Do」bullet（285 行）要求针对「each main observable's entry point」定向读取而不扫全仓，没有说来源的约束也适用于既有或复用的入口，也没有说「只在新代码里检查」不算解决；§4 Specify「Minimal means minimal」（306 行）与 P2（375 行）的例子句（PR-75）要求覆盖「同一条规则可能出错的入口」，但没有把 Ground 已观察到的冲突和既有入口连起来，也没有要求代表共用须有 observed 依据；P1（359 行）同样只列「each main observable's entry point」。Build & Test 312 行与 P2 379 行已要求每个选定例子执行其条件与入口并完整断言，不缺句；P3 第 2 问已核入口证据，不改（共识 §三：B 不开）
- observed: 回声落点——RUNBOOK 285 行之后插入新 bullet、306 行末追加 Specify 句、359 行末追加 P1 句、375 行末追加 P2 句；契约 `apriori/specs/protocol/spec.md` 最后一个场景 PR-77（344 行），本 change 加 PR-78；delta 文件头 `apriori-base` = 当前 base sha256 8773fcf8ff10b3761bdacdb895a29b6d749ba0364994c6d0a8da9ec15845680b；CHANGELOG 条目放 `### Unreleased since 6.0.0 · source-conflict-entry-points`（ID-06 禁止 `## Unreleased`）；现有守卫 discriminating-examples / ground-writeback-trace / writeback-fate-default 对 306/375 行用 `line()` + 正则 match，句末追加不破坏它们；docs/concepts、docs/cli 中英都没有 PR-75 入口句的回声，无需同步（人类 10-23：文档非关键）；P3 段落（`### P3 — independent review` 到 `### P4 —`，2324 字符）sha256 97a85ca560d41c70630d2ca1656c6b3af4dfc02eb3c8bf3a71dbd5875f0f414c，守卫用它做「P3 不变」的实际比较
- observed: 基线——`node scripts/run-tests.mjs` 920/920 全绿，`node bin/apriori.js --version` 6.0.0（全局 `apriori` 是旧装，不用）
- observed: Build——`test/source-conflict-entry-points.test.js` 先红（新 bullet 不存在）后绿；改动落点：RUNBOOK 285 行后新 bullet、306 行「Minimal means minimal」末句、359 行 P1 末句、375 行 P2 末句、CHANGELOG `### Unreleased since 6.0.0 · source-conflict-entry-points`；全量 921 通过、check PASS、verify GREEN、review-ready YES；P3 段落 sha 不变
- observed: Review 第 1 轮（`review/code-review-v1.md`，Astra = codex gpt-6-astra 只读，P3 逐字；R2 异构）= `VERDICT: no spec-vs-code gaps`，实质发现 0、advisory 0：Ground 覆盖两个触发、范围按交付行为不按文件、四项记录；Specify/P2 把冲突带到既有入口、按决定路径取代表、共用须 observed；守卫对真实文本断言、P3 哈希与基线一致、Build & Test 未动；PR-75/76/77 守卫与 PR-78 守卫都过；一条证据链即可，不必 SPLIT。未审：下游 agent 执行与外部评测（守卫只证明交付的指令，不证明 agent 照做）
- decision: approach（共识 §三/§四，最小形态）——只改 Ground→Specify 的连接：Ground 新 bullet「Source constraints apply to existing entry points too.」（触发一：来源明确排除某条件下的例外/覆盖/延续；触发二：Ground 已观察到的来源与现状冲突；范围 = 本次交付的行为及来源点名或隐含的调用方入口与其复用代码，不是文件范围；追到能解释该条件下可观察结果的地方，记 condition / entry point / deciding code / current result 进既有 observed；只沿解释结果所需路径，不扫全仓；只查新代码不算解决既有入口）；Specify 例子句（每个观察到的冲突，例子带触发条件落到受影响的调用方入口含既有入口，按决定结果的不同路径取代表，共用代表须有 observed 证明同一路径在该条件下决定结果，预期保留该例子适用的全部来源义务）；P1/P2 各一句同步。措辞逐字取共识 §四。不改 P3、不改 Build & Test、不加 gate/字段/清单/文档；不写题目名词
- decision: 过拟合判据（共识 §二 (i)–(vii)）作为本 change 的自检：结构表述无题目名词；解释 CP72 与前端角色推导两个独立机制（or/not 范围丢失为第三证据）；无新机制；收紧既有动作；无触发时无新增产物/测试/停点/全仓扫描（查过后发现无冲突仍有定向读取成本，不承诺零增量）；触发不依赖隐藏验收；文字不证明执行——由评测仓的验证运行（cp@3 ×2 两截面四读数 + member-reactivation ×1，停止规则）检验，验证登记在 evaluate-projects，不在本 change

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write（不接管道）→ squash 合回 v6-dev，推 judge 与 GitHub

gates:
  - 2026-10-31T11:33 note: change scaffolded by `apriori new`
  - 2026-10-31T11:35 note: Ground 完成：来源（R1031 共识 §二/§三/§四/§五）、触发证据（d5a5060 ×2：两次 Ground 已观察到既有权限捷径、rep-2 写成「新端点要严格检查」、角色表缺既有详情 GET、B1/B3 前端复用既有 helper、rep-1 or/not observed 未进 decision = 同一断点）、现行文本缺口（285/306/359/375）、回声落点与 base sha、P3 段落 sha 已记入 Reality Check；approach 逐字取共识 §四，不改 P3/Build & Test，不加机制
  - 2026-10-31T11:36 note: Specify（protocol PR-78）→ Build：test/source-conflict-entry-points.test.js 先红（Ground 新 bullet 不存在）后绿；RUNBOOK 285 行后新 bullet、306/359/375 行末各一句、CHANGELOG 条目；全量 921 通过、check PASS、verify GREEN（TAP reporter）、review-ready YES；phase → review
  - 2026-10-31T11:38 note: Review 第 1 轮（Astra，codex gpt-6-astra 只读，P3 逐字）接受：no spec-vs-code gaps，实质发现 0、advisory 0；进入 check / gate / archive
