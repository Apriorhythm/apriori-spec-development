change: release-tag-6-0-0
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/release-tag-6.0.0`（worktree `~/terra/wt-tag`，从 v6-dev@143ce0d 开出）；评审接受后 squash、ff 合回 v6-dev；随后由 owner 的发布步骤使用：打 annotated tag `v6.0.0`、`release/v6` 与 `main` 快进到同一提交、`npm publish`；**全部本地完成并发布成功后再推两远端**，任一步失败则先改文档再推（人类 2026-10-23 原话「打 tag，并把 v6-dev 发布为 release/v6，如果最后没有问题，那么把 release/v6 提升为 main，如果还没有问题，那么发布 npm」；公司电脑暂不升级）
- observed: 来源——release-6-0-0 登记的 follow-up FU-A3（打 tag 时把安装行 `#v6-dev` 改掉）；人类同日决定发 npm，因此安装行直接回到 `npm i -g apriori-cli`，不再经过 `#v6.0.0` 形式
- observed: 现状——`#v6-dev` 安装行在 README/README_cn 两处、RUNBOOK §0 一处、docs/ci(_cn) 各一段；CHANGELOG 6.0.0 节的「Not part of this entry」段写的是「未发 npm、无 tag、main 仍 5.0.0」；npm 包 owner 为 apriorhythm，本机未登录 npmjs（registry 配置为 npmmirror），`npm pack --dry-run` = 31 个文件、6.0.0
- decision: approach — 只改文档：安装行全部回到 `npm i -g apriori-cli`；docs/ci 的「6.0.0 还没发到 npm」段换成一步安装；CHANGELOG 该段改为「Release steps」并新增本 change 小节；FU-A3 以本 change 关闭。不动代码、模板、测试、规格（golden-path 接缝两种写法都认，GP-01 仍过）
- observed: 发布步骤在归档之后、由 owner 执行，不在本 change 的证据链内；npm 发布若因未登录/OTP 受阻，CHANGELOG「Release steps」段须在推送前改回事实
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent）= `VERDICT: 2 issues open`：RT-1 无规格增量的 bundle 被 gate/archive 以 exit 2 拒绝（纯文档例外已取消，MIGRATING:112 / RUNBOOK:311）；RT-2 发布失败的退路只写了 CHANGELOG 一段；advisory A-2 本机 registry 是 npmmirror 须 `--registry https://registry.npmjs.org`、A-4 CI 钉大版本、A-5 CI 页提 Node ≥ 22、A-7 cli 规格末句「nothing is published」发布后失实、A-3 无测试钉 npm 写法
- decision: RT-1 修复——cli 规格 release-identity 需求 MODIFIED（安装行全部为已发布包、仓库形式不再出现、owner 的发布步骤在归档之后执行；A-7 一并改掉），新增 ID-07 测试钉五处安装行并扫描 README/RUNBOOK/MIGRATING/docs/guides/templates 无 `github:`/`#v6-dev`（A-3 一并关闭）；A-4/A-5 docs/ci 中英改为 `apriori-cli@6` 并提 Node ≥ 22
- decision: RT-2 退路（完整）——顺序：先 `npm whoami --registry https://registry.npmjs.org` 确认登录；归档、合回 v6-dev 后**只在本地**打 tag、快进 release/v6 与 main；`npm publish --registry https://registry.npmjs.org`（A-2）；发布成功并核对 npmjs latest=6.0.0 后才推 v6-dev / release/v6 / main / tag 到 judge 与 origin。若发布失败或推迟：**什么都不推**；要么稍后重试发布，要么新开一个 change 把五处安装行与 CHANGELOG「Release steps」段改回事实、删本地 tag 重打、release/v6 与 main 重新快进后再推
- observed: Review 第 2 轮（`review/code-review-v2.md`，Opus 子 agent，范围=第 1 轮后的改动）= no spec-vs-code gaps，RT-1/RT-2 ADDRESSED；ID-07 变异 16 种中 14 种变红（另 2 种不在场景要求内）；advisory A-1 CHANGELOG 小节「No code, template or test changes」与 CI 页写法已不实（打 tag 前改）、A-2 不查 npx 前缀（场景未要求）、A-3 若走退路须同步改本需求与 ID-07、A-4 场景「§Install line」措辞
- decision: A-1、A-4 已改（CHANGELOG 小节与场景措辞）；A-2 不改；A-3 记入退路认知
- observed: GitHub CI 只在 push/PR 到 main 触发，v6 线从未在 GitHub 跑过；已开 draft PR #1（v6-dev→main）让 CI 先跑；本地复现 CI 两步：`npm run verify` GREEN 退出 0、examples/python-pytest verify GREEN

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- gate（--test-cmd）→ archive --write → 合回 v6-dev（本地）→ 本地 tag v6.0.0、ff release/v6、ff main → 推 v6-dev 让 PR #1 的 CI 在最终提交上重跑 → 绿后 npm publish（--registry npmjs）→ 核对 latest=6.0.0 → 推 tag、release/v6、main

gates:
  - 2026-10-23T17:07 note: change scaffolded by `apriori new`
  - 2026-10-23T17:08 note: Ground → Review：文档改动完成（README×2、RUNBOOK §0、docs/ci×2、CHANGELOG），无代码；phase 设为 review，等独立评审
  - 2026-10-23T17:17 note: Review 第 1 轮 = 2 issues open（RT-1 无增量、RT-2 退路不全）；已修：cli 规格 MODIFIED + ID-07、docs/ci @6 与 Node 注、退路写全；请求第 2 轮
  - 2026-10-23T17:22 note: Review 第 2 轮 = no spec-vs-code gaps；A-1/A-4 已改；进入 gate / archive
