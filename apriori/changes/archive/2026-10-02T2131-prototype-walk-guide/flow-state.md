change: prototype-walk-guide
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0fcbe-eb66-7a00-bdb0-d2de4f02bccc   # codex exec, round 1 (2026-10-02)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/prototype-walk-guide`（从 v6-dev@2bcbd45 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub
- decision: requirement — 人类 10-02：「GPT 给的那两个原型图走查 md……要不要直接复制进 apriori 项目里面，然后如果有原型图或之类的，可以提醒用户是否要做走查这一步」→「可以在 apriori 里面新建一个子目录，然后 Runbook 引用它们，而不是直接再往 Runbook 加东西」「本次暂时不拆分 runbook，暂时是原型走查这块先用 Runbook 引用的形式」；Claude × Astra 共识（`/root/asd-lab/work/astra-discuss/r59/R59-CONSENSUS.md` §四、第 6–7 轮）定为计划 C-b（`/root/asd-lab/work/r59-1002/PLAN-改造计划.md` §一），人类「执行」：仓库 `guides/prototype-walk.md`（英文，通用化，短入口在开头）随包发布；只受管这一精确文件，装到 `apriori/guides/prototype-walk.md`；init/update 覆盖首次补装、重复执行、未改刷新、改动或同名未受管保留、路径逃逸与文件类型、dry-run，区分「从未安装」与「已登记被删」；MIGRATING 写降级限制；不套命令模板世代钉；Runbook 只加适用条件、一次提示、执行前读取路径，并把「self-contained」声明改准确；doctor 诊断已引用指南缺失并给修复命令，gate 不加闸；operator 两版短入口；层 2 五场景（首次选择走查、已有授权、已有有效走查证据、无原型、只有截图），实际执行器、新上下文、不预塞指南，正例要求工具调用里确实读取完整指南且产物合约定，失败场景修复后定点复跑一次，仍失败则报告并停止推广
- decision: producer — 输出目录分两处：`OUT` = `apriori/changes/<change>/prototype-walk/`（checklist.md、REPORT.md、JSON 图谱，随归档保存——后续实现核对要读它，放进被 gitignore 的 tmp 会丢）；`SCRATCH` = `apriori/tmp/prototype-walk/<change>/`（截图、原始动作日志、运行副本：大而可重建，不提交）；change 尚不存在时由 owner 指定路径
- decision: producer — update 计入首次安装：`created (first install)` 计入汇总的「已刷新」数，避免装了文件却报「everything already matches」（BD-03 同一原则）
- observed: 来源 —— 5.9 的 `stash/prototype-dive/run-test.md` 与 `TEST_SPEC.md`（`/srv/r59/mnt/d/Apirori/JHKJ/requirement/20260920-1501-新中后台5.9/002-document/stash/prototype-dive/`，1434 行中文，GPT 生成）；其中 §2 写死原型文件名、§17.3–17.7 是该需求的组件；在 5.9 的作用见 `/root/asd-lab/work/r59-1002/G1-5.9原型知识链.md`
- observed: 机制现状 —— `lib/managed.js` allowedTargets 只有 runbook 与命令文件；`readManifest` 对未知路径抛「not a refresh target」（旧 CLI 读到新路径会使 init/update 失败）；`lib/update.js` 已有「已登记缺失 → 交 init」「未登记存在 → unmanaged」；`lib/init.js` seed 不覆盖已有文件；`lib/doctor.js` D2 逐项报脚手架缺口；package.json files = bin/ lib/ templates/ RUNBOOK.md MIGRATING.md docs/operator.md
- observed: 本机无 Playwright（仅 snap chromium），层 2 的运行时遍历测不到；按指南 §6.3，正例应报告缺口而不是假装覆盖
- observed: Build 完成 —— guides/prototype-walk.md；managed.js（GUIDE_REL/GUIDE_SRC/installGuide，allowedTargets 加入）；init.js 安装并登记；update.js 首次安装/其余走既有受管语义，汇总计入首次安装；doctor.js D2 指南缺失；package.json files 加 guides/；RUNBOOK Ground 一条 + 头部声明；operator 两版短说明；MIGRATING（含降级限制）、CHANGELOG；测试：新增 test/prototype-walk-guide.test.js（PW-01..06，改前在 v6-dev 上因指南不存在整文件失败），既有 doctor/init/multi-command/update 测试随「项目里多一个受管文件」调整（UP-08 改为精确断言两条被保护记录不变、manifest 只多指南一条）；全套 881/881；`check --self` PASS；`verify --change` GREEN；P3 不动
- observed: 层 2 五场景（`/root/asd-lab/work/next-improve-1002/C-b-层2实测.md`，候选包 90e245f，HM 账号 4，新上下文，不预塞指南）全部符合期望：G-pw-first 第 1 轮只提议一次，获准后先完整 `cat` 指南（工具调用 #19）再写产物（#23），清单 8 字段 43 行，抓到金额 >0 与删除无效两处，报告运行时缺口、不称全覆盖，答复记为 decision；G-pw-auth 不再询问，先读指南（#6）再写（#12），清单 8 字段 38 行，缺口登记为 Open；G-pw-evidence 不提议，读清单与指南并在契约里引用清单 id，不重走；G-pw-noproto、G-pw-screens 不提议并说明理由（后者识破截图是纯色占位图）。设施两处问题已修并照实记录（导出漏 guides/；场景名前缀）。局限：各 1 次；运行时遍历未测（无 Playwright）；跨 change 不重复提示只间接覆盖
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 4 issues open`。PW-R1：update 只在首次安装分支查类型，已登记/已存在分支直接进 consider，会经符号链接写穿、目录占位会在 runbook 已刷新后读失败、未登记的悬空链接被忽略——修：managed.js 新增 `guideObstruction`（逃逸、apriori/guides 非普通目录、路径上是符号链接/目录/其他非文件），update 每个分支先查、有障碍就报告并跳过，installGuide 复用它；PW-02 加四个对抗用例（已登记指南换成哈希仍匹配的符号链接、apriori/guides 为符号链接、路径上是目录且其余刷新照常落地、未登记悬空链接），在修复前代码上 PW-02 失败、修复后通过。PW-R2：改正的原型缺陷归 `not-reproduced`，而核对只要求 `in` 行——修：`scope`（交付是否必须体现：in/out）与 `ruling`（如何体现：as prototype / corrected — <来源> / not built — <原因> / owner — <Open id>）分开，改正的缺陷是 `in` 行、按裁定核对；去掉 `not-reproduced`；登记行改为「in <a>, of which corrected <c> / out <b>」。PW-R3：截图在不提交的 SCRATCH，而清单可以只引用截图名——修：被清单引用的截图（脱敏后）存 `OUT/evidence/`，随归档保存，未被引用的才留 SCRATCH。PW-R4：「版本不变不重走」挡住合法补全——修：同版本只对已覆盖范围复用；经 owner 授权可在同一清单内继续走未覆盖/被阻塞/新纳入/当时跑不了的部分，保留已有 id；一次提议只管「开始」走查。PW-05 规格与测试同步；评审方确认 UP-08 调整未削弱
- observed: Review 第 2 轮（`review/code-review-v2.md`，resume 同一会话）= `VERDICT: 1 issues open`；PW-R1..R4 均 ADDRESSED。PW-R5（第 1 轮修法引出）：「在同一清单里续写」与归档冻结冲突——清单默认在首个 change 的 bundle 里，该 change 归档后再续写就会改动冻结的历史——修：清单所在 change 在途时原地续写；已归档时在当前 change 的 OUT 建继任 `checklist.md`，逐行带过 id、来源与证据引用（归档证据原地不动），首行写明继承自哪份、哪个归档 bundle，此后继任者是唯一当前进度源，归档的前任永不改；后续核对填 implementation / verification 同理。PW-05 规格与测试同步
- observed: Review 第 3 轮（`review/code-review-v3.md`，resume 同一会话）= `VERDICT: no spec-vs-code gaps`；PW-R5 ADDRESSED，PW-R1..R4 仍成立；无新发现、无 advisory。评审方注明：层 2 运行未执行修订后的继任清单生命周期

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev

gates:
  - 2026-10-02T20:42 note: change scaffolded by `apriori new`
  - 2026-10-02T20:54 note: Ground、Specify、Build 完成（全套 881/881）；开层 2 实测
  - 2026-10-02T21:12 note: 层 2 五场景完成（5/5 符合期望）；review-ready；开 Review 第 1 轮
  - 2026-10-02T21:22 note: Review 第 1 轮落盘（4 issues open）；已修；开第 2 轮
  - 2026-10-02T21:27 note: Review 第 2 轮落盘（1 issues open：PW-R5）；已修；开第 3 轮（review-progress 见下一行）
  - 2026-10-02T21:27 note: review-progress code-review round 3 — issues: PW-R5; actions: PW-R5 continuation after the checklist's change is archived → a successor checklist in the current change carrying every row with its id and naming its archived predecessor, which is never edited; the same for a later reconciliation; evidence: guides/prototype-walk.md §5 and §9, test/prototype-walk-guide.test.js PW-05, delta protocol PW-05; approach: kept — a lifecycle gap in the guide's wording, not the approach
  - 2026-10-02T21:30 note: Review 第 3 轮接受（no spec-vs-code gaps）；进入 gate / archive
