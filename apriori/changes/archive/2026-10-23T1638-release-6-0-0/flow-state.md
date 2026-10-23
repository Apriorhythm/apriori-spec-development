change: release-6-0-0
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/release-6.0.0`（worktree `~/terra/wt-rel`，从 v6-dev@d1a447d 开出）；本地提交；评审接受后 squash、ff 合回 v6-dev，推 judge 与 GitHub，删分支；**不打 tag、不发 npm、不建 GitHub release、不动 main 与 release/v6**（人类 2026-10-23 原话「暂时不要 release 或者发 npm」）
- observed: 来源——人类 2026-10-23「把这个版本定义为正式的 6.0.0 版本，重新检查 README.md 还有 doc，看看有没有需要更新的，全部更新完毕后，push 代码」；此前裁定 6.0.0 而非 6.2.0 的事实：npm 只发过 5.0.0；6.0 slice / 6.1 / 6.2 都是开发阶段名，从未发布；唯一 6 系 tag 是 v6.0.0-rc1（08-30，v6-dev 祖先）；MIGRATING 原文自称「6.x 是未发布开发线」
- observed: 现状——package.json 6.2.0-rc.0；RUNBOOK 头 `runbook-version: 6.2`（CK-11 与包版本比 major.minor）；test/identity.test.js ID-01 钉 6.2.0-rc.0、ID-03/ID-04 钉 MIGRATING「## 6.2」与 CHANGELOG「## Unreleased — 6.2」标题；运行时字符串含 6.2 的只有 gate C2/C4 detail、doctor D7 fix、readiness 三处 note/refusal；CHANGELOG 5.0.0 之上全是「## Unreleased — …」与一条 Preview snapshot
- decision: approach — 身份面全部改 6.0.0：package 版本、runbook 头、identity 测试（ID-01 改钉、ID-04 改定位、新增 ID-06）；用户可见的运行时字符串 6.2→6.0（gate/doctor/readiness 五处，对应测试同步，gate 规格三个需求块 MODIFIED）；CHANGELOG 顶部新增 `## 6.0.0 — 2026-10-23` 总节，其下所有 `## Unreleased — X` 与 Preview snapshot 降为 `###` 小节（5.0.0 之上不再有 Unreleased）；MIGRATING 开头段改为「6.0.0 已发布、下面各节是它的开发阶段」，标题去掉 (Unreleased)；cli 规格 ADDED 一条 release identity 需求绑定 ID-01/ID-06
- decision: 不改的 — 规格正文、代码注释、CHANGELOG/MIGRATING 历史小节里的阶段名 6.0 slice / 6.2 原样保留（历史记录，非版本）；`--json` 形状、检查 id、判定逻辑不动；不改 main、不动 release/v6、不发 npm、不打 tag
- observed: 文档审计——两个只读 Opus 子 agent 分别核对 README/README_cn/VISION/VISION_cn/SECURITY（15 条）与 docs/*（中英）+ guides/prototype-walk.md（23 条）对照代码；SECURITY 与 guide 无发现
- decision: README/VISION 处置——15 条全部采纳：安装说明改为从仓库安装（`npm i -g github:Apriorhythm/apriori-spec-development#v6-dev`，本机实测可装、`--version` 可用）并写明 npm 仍是 5.0.0；两张 gif 加「录制于 4.x」说明而不重录；verify 的表述改为「测试没跑/有可归属失败才不给绿，绑定缺口只报告」；去掉 mode/fast/standard、「本轮」「本机」、V1/V2/V3 等内部叫法；补 `/apriori-discuss` 与 `archive --unreviewed`；VISION 的设计说明→Reality Check decision、P8/§6/P11-P12/§1.5 指向改为现行（PR-52 要求保留「P8 narrows to what binding cannot prove」历史句，保留并加当下注释）
- decision: docs/ 处置——23 条交 Opus 子 agent 按清单改（只动 docs/，中英同步，阶段标记 6.2/batch C/V3 去掉，npm 安装处加说明，不改测试）；RUNBOOK 两处「(6.2)」标记与 §4 archive-force 句由生产方自己改（P3 段未动，RIB-10 哈希测试通过）
- observed: 运行时字符串改动波及 10 个测试的正则与 LNG-07 golden（70 条 C3 detail 文字，`_meta.repins` 记录 release-6-0-0，仅文字）；改后全量 904/904
- observed: README Quickstart 的安装行是 `scripts/golden-path.mjs` 机器读取的接缝（替换为本地包/tarball 安装）；改成仓库安装形式后 GP-01/GP-05 失败 → 接缝同时识别 `npm i -g apriori-cli` 与 `npm i -g github:Apriorhythm/apriori-spec-development`（golden 规格未钉字面量，不需增量）；golden-path 5/5
- observed: `verify --change release-6-0-0 --test-cmd "node scripts/run-tests.mjs --test-reporter=tap"` = GREEN，change 范围 25 个 scenario 全绑定（含 ID-01/ID-06）
- observed: docs/ 23 条已由 Opus 子 agent 改完（10 个文件，+135/−119）：22 条按审计意见、第 9 条按 RUNBOOK §4 改（审计建议的「把上一轮发现交给新评审方逐条核对」同样违反 RUNBOOK 316-317，改为新会话评审方只拿四项默认输入）；另改三处（review-ready 段的「已删两项」为未发布阶段产物、cli_cn gate 段「其余七项」计数、C3 段 6.2）；改后 904/904、check --self PASS
- observed: gate 规格改标题须走 `## RENAMED`（MODIFIED 按标题找目标，改名后无目标），已改为 RENAMED + MODIFIED 新名；gate 现仅 C8 阻塞（待评审）
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent）= `VERDICT: 1 issue open`：RL-1 RUNBOOK §0 仍写 `npm i -g apriori-cli`（装到 5.0.0；评审方实测 5.0.0 CLI 读 6.0 项目会把 change 当 5.x、update 退出 1）；advisory A-1 ID-06 扫描今日正确但对不存在的四种构造会漏、A-2 D7 文字无测试钉、A-3 `#v6-dev` 是分支会漂移、A-4「verified for 6.0.0」言过其实、A-5 旧问题 golden-path --packed 无参会改 bin 权限（评审方已恢复 644）、A-6 CHANGELOG「ten tests」计数不准
- decision: RL-1 修复——RUNBOOK §0 安装行改为仓库安装并注明 npm 仍是 5.0.0、发布后用 `npm i -g apriori-cli`（RUNBOOK 是随项目分发的协议文件，不算非关键文档）；A-2 在 MD-12 钉 D7 fix 文字；A-4 README 中英改为「6 线上已实测」；A-6 改为「13 cases in 8 files」；A-1 不改（扫描覆盖现状，构造不存在）；A-3 不改——tag 未打之前只能指分支，打 `v6.0.0` tag 时 README/docs/ci/RUNBOOK §0 的 `#v6-dev` 同步改为 `#v6.0.0`（登记为后续）；A-5 不在本 change 范围，登记为后续

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>
- FU-A3: follow-up → release-tag-6-0-0 — 打 `v6.0.0` tag 时，把 README/README_cn、docs/ci(_cn)、RUNBOOK §0 的安装行 `#v6-dev` 改为 `#v6.0.0`（分支会漂移，tag 不会；本 change 不打 tag，人类 2026-10-23 决定）
- FU-A5: follow-up → golden-path-packed-guard — `scripts/golden-path.mjs --packed` 无 tarball 参数时会把 checkout 本身 `npm i -g` 进 prefix 并把 bin/apriori.js 权限改成 755（评审第 1 轮 A-5，早于本 change）；应拒绝缺参

## Next                  # at most three concrete actions; the first is the resume point
- gate（--test-cmd）→ archive --write → squash、ff 合回 v6-dev，推 judge 与 GitHub；不打 tag、不发 npm、不建 release

gates:
  - 2026-10-23T15:51 note: change scaffolded by `apriori new`
  - 2026-10-23T15:56 note: Ground → Build：身份面改 6.0.0（package/runbook 头/identity 测试 ID-01、ID-04、新 ID-06）、五处运行时字符串 6.2→6.0 及其测试、CHANGELOG 6.0.0 总节与小节降级、MIGRATING 开头段、gate/cli 规格增量；phase 设为 build，等全量测试与文档审计
  - 2026-10-23T16:07 note: 文档审计完成并处置：README/README_cn/VISION/VISION_cn 15 条已改；docs/ 23 条交子 agent 修改中；RUNBOOK 去掉三处 6.2 标记；gate 增量改用 RENAMED+MODIFIED
  - 2026-10-23T16:17 note: Build 完成：docs/ 23 条改完；全量 904/904、check --self PASS、verify --change GREEN（25/25 绑定）；phase 设为 review，等独立评审
  - 2026-10-23T16:32 note: Review 第 1 轮 = 1 issue open（RL-1 RUNBOOK §0 安装行）；已修并处置 A-2/A-4/A-6；904/904、check PASS；请求第 2 轮（范围：RUNBOOK §0 一行、MD-12 一条断言、README/README_cn 一处措辞、CHANGELOG 两处措辞）
  - 2026-10-23T16:38 note: Review 第 2 轮（`review/code-review-v2.md`，Opus 子 agent，范围=第 1 轮后的改动）= no spec-vs-code gaps，RL-1 ADDRESSED；advisory A-7/A-8 已处置（Open 区登记 FU-A3/FU-A5 两条 follow-up、Next 更新），A-9 不改；进入 gate / archive
