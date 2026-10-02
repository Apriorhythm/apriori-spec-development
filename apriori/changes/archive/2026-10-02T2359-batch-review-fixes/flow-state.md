change: batch-review-fixes
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0fd3f-14d0-7460-8c18-7a0bdbb927db   # codex exec gpt-6-astra, round 1 (2026-10-02)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/batch-review-fixes`（从 v6-dev@c290842 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub
- decision: requirement — 来源：需求级独立核对报告 `/root/asd-lab/work/next-improve-1002/批次核对报告.md`（被核对提交 c290842，范围 v6-dev `5d3fc78..c290842`，codex gpt-6-astra 找问题 + 每条 2 票对抗核验，19 条成立）；人类 10-02「全部修复完毕，然后，这个过程中的 code-review 使用 codex」：19 条全修，承接原 id（check-self-1..4、guide-1..4、goal-1、PW-1/2、SST-1..6、shipping-docs-1/2）；本 change 的 P3 与需求级复核分别闭合，复核结果写回该报告
- decision: scope — check-self-4 只在 CK-11 的版本行检测里同时剥 ``` 与 ~~~ 围栏（CommonMark：字符 + 长度），不动共用 `lib/text.js` stripFences：它同时被 check/verify 的规格解析（CK-14 两面一致）与 archive-merge 使用，改它会连带改变 delta 解析；共用读法的波浪线对齐登记为 follow-up（见 Open）
- decision: approach — guide-2 = 预防 + 恢复：init 装上 guide 后立即落 manifest；update 对未登记、字节等于某一已发布版 guide 的文件按证据收编（`adopted`），版本表 `GUIDE_GENERATIONS` 收录 e22e8d8、c290842 两版与本次新版，测试钉住现行 guide 必须在表中。update 不提前写 manifest：未有 manifest 的老项目提前写会让中途失败后的命令文件失去收编资格，恢复交给收编
- decision: approach — guide-1 用独占创建（`wx`）：路径在检查之后出现任何东西（含符号链接）都 EEXIST → 跳过并说明，不跟随、不覆盖；残余：检查后把 `apriori/guides` 换成指向项目外的符号链接仍可在外面**新建**文件（不能覆盖已有文件），Node 没有 openat，记入代码注释与 MIGRATING
- observed: SST-1 —— PR-11 的测试断言 runbook 不含 fsync/chmod（教程已删），而 PR-11/PR-16 规格仍要求写出；以现行 runbook 与测试为准改规格文字，场景 id 全保留
- observed: 同一 MODIFIED 块里 PR-08（「at its round limit」）、PR-10（「一条 `## Evidence` 行」）、PR-16 的归档句（`--changes-dir` 而非默认移动）同样过时，一并对齐（与 SST-1 同类）；update 的清单需求仍把可刷新目标写成 runbook + 命令文件，C-b 加了 guide 却没改这句，一并补上
- observed: UP-09（预清单项目收编）原测试预期清单只含 runbook + 命令文件；新收编规则下 init 写下的 guide 按字节被收编——测试与 UP-09 场景随之更新（行为变化是 guide-2 的预期结果，不是回归）
- observed: Build 完成 —— 代码：lib/managed.js（guideBlock、独占创建、GUIDE_GENERATIONS 三版）、lib/init.js（guide 创建即落 manifest）、lib/update.js（按已发布版本字节收编；汇总计 missing/obstructed）、lib/doctor.js（lstat，与 update 同一判断）、lib/check.js（空镜像对齐；CK-11 自带 CommonMark 围栏读法）；文档：operator 两版（Review & Deliver 的 25 轮界限；Build & Test 条件写「what is still open」）、concepts 两版 mini-kv goal、cli 两版（--force 三种升级形态；update 汇总与 guide 收编）、guide §4/§7/§9、RUNBOOK Ground 一句、MIGRATING、CHANGELOG；测试：红测试先行（旧代码上 CK-08/CK-12/PW-01/02/03 与文档类 7 项红；SST-2/3/5 用内存变异验证新断言能抓到删除），全套 883/883；`check --self` PASS；`verify --change` GREEN；delta：check（RENAMED CK-11 标题 + 3 MODIFIED）、protocol 5 MODIFIED、init/update/doctor 各自 MODIFIED，场景 id 全保留
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 3 issues open`；19 条原发现评审方逐条判为已处理（check-self-4 与 guide-1/guide-2 各带出一条新问题）；无 advisory
- decision: BRF-R1 fixed — 收编（及已登记 guide 的刷新，同一缺口）原先先按路径算哈希、再按路径普通打开改写，中间换进的符号链接会被跟着写；现在 guide 只读一次（O_NOFOLLOW），判断与改写都用这一次读到的内容，改写时再以 O_NOFOLLOW 打开并核对 dev/ino 一致才截断写入，否则报 `changed during refresh (skipped — …)`、不记账；证据：PW-02 新增「读后写前换成指向外部文件的符号链接」两例（收编旧版本、刷新已登记 guide），把改写换回普通 writeFileSync 时 PW-02 变红
- decision: BRF-R2 fixed — 第 0 轮只让 guide 提前落 manifest，留下的 manifest 会让同一次失败运行里后建的命令文件失去 update 的收编资格；现在 init 每创建一个文件就立即记账（runbook、guide、每个命令文件），最后一步只报告；证据：IN-13 新增 `--tools claude,cursor` 在 `.cursor` 为文件时中途失败的例子——manifest 已含 Claude 两个命令文件，清掉障碍后 update 判 `up-to-date`；把记账改回只记 guide 时 IN-13 变红
- decision: BRF-R3 fixed — CK-11 自带的围栏读法给每个围栏记下所在引用深度：顶层围栏里的 `> ~~~` 是内容、不是闭合；引用内的围栏只在同一深度闭合、随引用结束而结束；证据：CK-12 新增评审方的原例及两例，去掉深度判断时 CK-12 变红；全套 883/883
- observed: 顺查发现一个早于本批次的缺口——在没有 manifest 的老项目上跑 init（只要创建了任何文件）会写出只含本次创建项的 manifest，原有 runbook 与命令文件此后被 update 判为 `unmanaged`（c290842 上实测）；IN-14 明确规定 init 不收编已有文件，属设计缺口而非违约，登记 follow-up FU-2
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: 1 issues open`；BRF-R1、BRF-R2、BRF-R3 均 ADDRESSED；FU-2 评审方认可为独立 follow-up（c290842 上成功的 init 即已如此）；新发现 BRF-R4
- decision: BRF-R4 fixed — O_NOFOLLOW 只管最后一段路径，障碍检查之后把 `apriori/guides` 换成指向外部目录的符号链接，两次打开仍会到达同一个外部文件（同 inode）而覆盖它；现在 readPlain、writePlain 打开后都在描述符本身上判断是否在项目内（Linux 用 `/proc/self/fd`，无 /proc 的平台退回打开后立即 realpath，较窄的窗口，已作为残余写入 MIGRATING）；证据：PW-02 新增「障碍检查后、读取前换掉父目录，外部同名文件为已识别旧版本」一例——不收编、不覆盖、报 `changed during refresh`；去掉描述符判断时 PW-02 变红；全套 883/883，`check --self` PASS
- observed: Review 第 3 轮（`review/code-review-v3.md`）= `VERDICT: 1 issues open`：BRF-R4 未全部解决——描述符定位不到时退回的 realpath 查的是路径而非已打开的文件，「每次打开前把目录换到外面、打开后立即换回」仍可到达外部文件；且 Linux 上 /proc 不可用时也会走这条退路
- decision: BRF-R4 (rest) fixed — 按评审建议改为失败即关闭：改写只在新打开的描述符上同时满足「末段不跟随符号链接、与读取时同 dev/ino、没有其他硬链接、经 `/proc/self/fd` 定位在项目内」时才原地进行；定位不了（macOS、Windows、无 /proc 的容器）一律不改写，报 `not refreshed (skipped — …)` 并给出「删掉再 init」的办法；有其他硬链接的 guide 同样不原地改写（改写会波及另一个名字，顺手补上的同类缺口）；只读判断仍可退回 realpath（读取只用于判断、不写）；dry-run 预测同样的结果。代价：macOS/Windows 上 update 不再原地刷新 guide（已写入 MIGRATING、cli 两版、CHANGELOG、update delta）。证据：PW-02 新增「每次打开前后翻转目录」两例（有/无描述符定位）、无 /proc 时 dry-run 与实跑都 `not refreshed`、up-to-date 不受影响、删掉再 init 能登记新 guide、硬链接两例；把失败即关闭换回 realpath 写入或去掉硬链接检查时 PW-02 变红；全套 883/883

- observed: Review 第 4 轮（`review/code-review-v4.md`）= `VERDICT: no spec-vs-code gaps`；BRF-R4 ADDRESSED；无新发现、无 advisory
## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>
- FU-2: follow-up → init-premanifest-adoption — 没有 manifest 的项目（早于 managed.json 的 CLI 初始化）上跑 init 会写出只含本次创建项的 manifest，update 因此不再按证据收编原有的 runbook 与命令文件（判 `unmanaged`，只能删了重 init）；建议：没有 manifest 且本次没有创建 runbook 时，init 不写 manifest，交给 update 的按证据收编
- FU-1: follow-up → fence-tilde-readers — 共用围栏读法只认 ``` 不认 ~~~（`lib/text.js` stripFences，及 gate.js、config.js、archive-merge.js 各自的反引号正则）；对齐会同时改变 delta 解析与 check/verify 的一致性面，单独一个 change 做；本 change 只修 CK-11 的版本行检测（check-self-4）

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev，推 judge 与 GitHub
- 需求级复核：resume 各区域的 codex finder 会话复核修复与受影响路径，写回批次核对报告

gates:
  - 2026-10-02T23:11 note: change scaffolded by `apriori new`
  - 2026-10-02T23:17 note: Ground 完成（来源 = 批次核对报告 19 条）；进入 Build
  - 2026-10-02T23:31 note: Build 完成（883/883，check --self PASS，verify GREEN）；review-ready 后开 Review 第 1 轮
  - 2026-10-02T23:44 note: Review 第 1 轮 3 issues open（BRF-R1..R3）均已修复（883/883）；resume 同一评审会话开第 2 轮
  - 2026-10-02T23:51 note: review-progress code-review round 3 — issues: BRF-R1, BRF-R2, BRF-R3, BRF-R4; actions: BRF-R1/R2/R3 addressed in round 2 (no further change), BRF-R4 fixed — containment judged on each opened descriptor in readPlain/writePlain, regression added to PW-02; evidence: lib/managed.js, lib/update.js, test/prototype-walk-guide.test.js, test/init.test.js, test/check.test.js; approach: kept — each round's finding was a narrower hole in the same guarded write, closed in place; nothing in the reviews questions the approach
  - 2026-10-02T23:57 note: review-progress code-review round 4 — issues: BRF-R4; actions: BRF-R4 rest fixed — a rewrite fails closed unless the new descriptor is located inside the project (/proc/self/fd), same dev/ino, no other hard link; regressions added to PW-02; evidence: lib/managed.js, lib/update.js, test/prototype-walk-guide.test.js, MIGRATING.md; approach: kept — the reviewer's suggested fail-closed rule, the same guarded write narrowed again; its cost on platforms without /proc is stated in MIGRATING and the CLI reference
  - 2026-10-02T23:59 note: Review 第 4 轮接受（no spec-vs-code gaps）；进入 gate / archive
