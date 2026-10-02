change: init-premanifest-adoption
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0fd8c-48c0-7db1-b374-c27506d163d1   # codex exec gpt-6-astra, round 1 (2026-10-03)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/init-premanifest-adoption`（从 v6-dev@a6c790b 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub
- observed: 来源——follow-up FU-2，登记于已归档的 `apriori/changes/archive/2026-10-02T2359-batch-review-fixes/`（其 flow-state 的 Open 段），原文：「没有 manifest 的项目（早于 managed.json 的 CLI 初始化）上跑 init 会写出只含本次创建项的 manifest，update 因此不再按证据收编原有的 runbook 与命令文件（判 `unmanaged`，只能删了重 init）；建议：没有 manifest 且本次没有创建 runbook 时，init 不写 manifest，交给 update 的按证据收编」；人类 10-03「两个 follow-up 如果可以开干那就直接开干吧」
- observed: c290842 上实测（批次修复时）：老项目（无 manifest）上 `init --tools claude,codex` 写出只含 codex 两个命令的 manifest，随后 `update` 把 runbook、guide、claude 命令判为 `unmanaged` 并说 everything already matches
- decision: approach — 采用登记时的建议：没有 manifest 且 runbook 早于本次运行时，init 照常创建但不写 manifest（报 `deferred`），交给 update 的按证据收编（runbook 无条件、命令文件按已发布版本、guide 按已发布版本且读取须定位）；不让 init 自己收编（保留 IN-14「init 不收编已有内容」），新鲜项目与已有 manifest 的项目不变；已被旧 init 写出部分 manifest 的项目，MIGRATING 给出办法（删掉 manifest 再 update 一次），并有测试佐证
- observed: 第一版 Build（deferral）—— lib/init.js（`deferred` 判定与报告；init 报告对未写入的动作不再打勾）；test/init.test.js 新增 IN-21（在 a6c790b 的 lib 上红）；docs/cli.md、cli_cn.md、MIGRATING、CHANGELOG；delta：init 清单需求 MODIFIED + IN-21；全套 884/884，隐藏 /proc 亦 884/884；CLI 冒烟：老项目上 init 报 `· apriori/managed.json (deferred …)`
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 2 issues open`：R1 deferral 下本次新建的 guide 不登记，在不能定位描述符的平台上 update 又不认领它；R2 runbook 位置是目录/越界链接也触发 deferral，update 读 runbook 失败，修好后重跑 init 会让本次新建的命令文件 unmanaged；advisory：什么都没创建时 deferral 不报告
- observed: 咨询 Astra（`/root/asd-lab/work/astra-discuss/r59/R59-R12.txt`、`astra-r59-r12-reply.md`）：建议方案 X（init 照常即时登记，清单加 `adoptPending` 标记，update 对带标记清单补一次按证据认领后清除），认为仍在 FU-2 授权内；否决我倾向的 Y（让 update 对任何清单都按证据认领——会扩大认领权限、削弱 UP-06，属改承诺）；指出旧 CLI 会丢标记须写明、部分清单的恢复不能叫人删清单（DISAGREEMENTS 2，均采纳 Astra）
- decision: approach — 改用 X（取代登记时的 deferral 建议）：仅当 init 开始时无清单、runbook 为项目内普通文件时打标记；init 即时登记并在之后的 init 保留标记；update 对带标记清单像无清单一样认领未登记的 runbook 与命令文件（已登记文件规则不变，guide 规则不变），整次运行完成才写出不带标记的清单，抛错则保留；清单 hygiene 只接受布尔值；部分清单 / 旧 CLI 丢标记的恢复 = 手动加回标记再 update 一次
- decision: R1、R2 fixed — R1：标记下本次新建的 guide 即时登记，任何平台都受管；R2：目录/符号链接的 runbook 不打标记，init 照常登记新建文件，修好后重试不搁浅（IN-21 覆盖）
- observed: 旧 CLI 交互实测（a6c790b 的 git archive）：旧版 update 在带标记的清单上运行后标记消失、runbook 再次 `unmanaged`——已写入 MIGRATING「Finish the migration with this CLI」与恢复办法
- observed: Build 完成 —— lib/managed.js（读写 `adoptPending`，类型校验）、lib/init.js（标记判定、即时登记带标记、报告）、lib/update.js（adopting = 无清单或带标记）；test/init.test.js IN-21 重写（在 a6c790b 的 lib 上红）；docs/cli 两版、MIGRATING、CHANGELOG 改写；delta：init 清单需求（含 IN-21）与 update 清单需求 MODIFIED；全套 884/884，隐藏 /proc 亦 884/884
- observed: FU-2 的退出证据——IN-21：标记下 init 即时登记，update 认领较早的 runbook 与命令文件、已登记被改文件仍受保护、完成后清标记，认领或刷新的每项等于盘上哈希（被改的已登记文件保留原哈希）；目录 runbook 不搁浅；部分清单按 MIGRATING 恢复；据此关闭 FU-2

- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: no spec-vs-code gaps`；R1、R2 ADDRESSED；advisory 两条：(1) init 什么都没创建时不给「仍欠认领」提醒——第 1 轮的 advisory 以较窄形式仍在，归属不会丢（无清单或已带标记时 update 照样认领），不改代码；(2) IN-21 与 Reality Check「每项等于盘上哈希」应排除被改的已登记文件——已改文字
## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev，推两远端

gates:
  - 2026-10-03T00:54 note: change scaffolded by `apriori new`
  - 2026-10-03T00:56 note: Ground（承接 FU-2，pending）→ Build（884/884）；FU-2 依 IN-21 的证据关闭（从 ## Open 删去）；review-ready 后开 Review 第 1 轮
  - 2026-10-03T01:08 note: Review 第 1 轮 2 issues open；咨询 Astra 第 12 轮后改用 adoptPending 标记方案（R1、R2 已修，884/884）；resume 同一评审会话开第 2 轮
  - 2026-10-03T01:12 note: Review 第 2 轮接受（no spec-vs-code gaps）；两条 advisory 只改了规格与状态文字；进入 gate / archive
