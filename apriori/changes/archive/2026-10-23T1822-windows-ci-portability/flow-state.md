change: windows-ci-portability
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/windows-ci`（worktree `~/terra/wt-win`，从 v6-dev@36e7c8c 开出；cl21-windows-blocking-pipes 合入后 rebase 到其上）；评审接受后 squash、ff 合回 v6-dev；本地 tag `v6.0.0` 重打到最终提交，release/v6 与 main 重新快进；推 v6-dev 让 PR #1 的 CI 重跑；Windows 矩阵绿后 npm publish，再推 tag / release/v6 / main
- observed: 来源——Windows 主机（Node 24.14）上跳过 CL-21 后的全量：905 个，873 过，8 失败，24 跳过：ID-01/ID-02/OPM-01/OPM-07 `spawnSync npm ENOENT`（Windows 上是 npm.cmd，且 Node 拒绝无 shell 启动 .cmd）；LNG-07 golden 的 `<ROOT>/apriori/specs/...` 与 Windows 报错文本 `<ROOT>\\apriori\\specs\\...` 不等；TX-02 `/[\/]specs[\/]/` 对 `path.relative` 的反斜杠结果匹配 0 个 store；AM-140、GT-57 `EPERM symlink`（本机账户无建链权限；仓库其余建链测试或用 `canSymlink()`、或内联 try/catch 探测（6 个文件）、或按 win32 平台跳过（UP-10、prototype-walk-guide 两处））
- decision: 全部修在测试侧，产品代码与 golden 的钉值不动：npm 统一走 `test/helpers/npm.js`（win32 用 npm.cmd + shell）；corpus normalizer 把 `<ROOT>` 之后的反斜杠归一为 `/`；TX-02 过滤用 `/` 归一后的相对路径；AM-140/GT-57 的符号链接子用例包在 `canSymlink()` 里，其余断言保留；新增 WN-01 钉这三道接缝 + golden 规格 ADDED 一条「套件可在 Windows CI 矩阵运行」
- observed: GitHub 的 Windows runner 可能有建链权限（AM-140/GT-57 在 CI 上也许本就能过），但 npm ENOENT、LNG-07、TX-02 三类在 CI 上一定失败；最终以 PR #1 的 CI 为准
- decision: WN-01 的 (c) 收窄——仓库里另有 4 个建链测试用内联 try/catch 探测（它们在 Windows 本机通过），约定是「先探测」而不是「必须 import canSymlink」；(c) 只钉 AM-140/GT-57 两个文件
- decision: 采纳 cl21 评审 advisory A1——新增 CL-22（stderr 从头读、stdout 读一块即关、断言退出 0，跨平台），cli 规格 MODIFIED 加该场景；基于 v6-dev@7e459a6（cl21 已合入）
- observed: 修复后 Windows 主机全量（提交 a38c241 的导出树）：907 个，882 过，**1 失败**，24 跳过——GT-57 第 222 行 `cases[0].evidence.replace('/ext.txt','')` 对 Windows 反斜杠路径不生效，导致 `evidenceFileInside(<dir>\\ext.txt,'ext.txt')` 为 false；改为 `evidenceFileInside(outside,'ext.txt')`（同一语义，与分隔符无关）；其余 7 个原失败项均已通过
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent，评 c19741f）= `VERDICT: 1 issue open`：WP-1 golden 规格把建链约定说成「探测」，但 UP-10 与 prototype-walk-guide 是按 win32 平台跳过，且内联探测的是 6 个文件不是 4 个；断言计数核实 AM-140 51/51、GT-57 16/16、LNG-07 202/202、TX-02 170→172（多的是本 change 的增量）；WN-01 8 种破坏 7 种变红；advisory A1 win32 参数引号、A2 Node 24 DEP0190 警告、A3 WN-01 (a) 是文本层检查、A4 verdict-corpus 头注释过时、A5 CHANGELOG/Notes 未提 GT-57 222 行且「由 CI 发现」不准、A6 CL-21 对 error 监听无区分力（上一 change）、A7 给 CL-21/22 加 timeout、A8 runner 上 tar 须是 bsdtar、A9 raw 文件
- decision: WP-1 改规格措辞如实写三种形式（探测优先），不改那两个老测试；A1 shell 路径下含空白的参数加引号；A4 注释更新；A5 CHANGELOG 与 Notes 改准；A7 CL-21/CL-22 加 60 s timeout；A2/A3/A6/A8 记录不改（A8 以 CI 为准）；A9 沿用既有做法
- observed: Review 第 2 轮（`review/code-review-v2.md`，Opus 子 agent，范围=第 1 轮后的改动）= no spec-vs-code gaps，WP-1 ADDRESSED（评审方自行清点 27 个建链文件：19 用 canSymlink、6 内联探测、2 按 win32 跳过）；shell 路径引号在 /bin/sh 模拟带空格目录下有效；timeout 选项有效
- decision: advisory A1（规格「in AM-140 and GT-57」易被读成总数）、A5（WN-01 头注释「由 CI 发现」）、A6（Notes 写明 222 行是第二次主机运行浮现）已改；A2（整测试跳过的个别非建链断言）、A3（引号的极限情形）不改；A4：ef945d7 的 npm 接缝与 timeout 已在 Windows 主机复跑 identity / operator-move / cli-json-pipe-flush / windows-portability / lineage-retirement，26 个：25 过、1 跳过（CL-21）、0 失败

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- Linux 全量 + Windows 侧验证 → cl21 合入后 rebase 并加 CL-22 → Opus 评审 1 轮 → gate → archive → 合回 v6-dev → 重打 tag / ff → 推 v6-dev → CI

gates:
  - 2026-10-23T18:00 note: change scaffolded by `apriori new`
  - 2026-10-23T18:02 note: Ground → Review：测试侧 Windows 可移植性修复（npm 接缝、路径归一、canSymlink 守卫）+ WN-01 + golden 规格增量 + CHANGELOG 小节；无 bin/lib 改动；phase 设为 review
  - 2026-10-23T18:04 note: 同步到 v6-dev@7e459a6；WN-01 (c) 收窄；加 CL-22 + cli 规格增量
  - 2026-10-23T18:07 note: Windows 全量 907/882/1：GT-57 第 222 行分隔符问题，已改；Windows 侧复跑该文件
  - 2026-10-23T18:16 note: Review 第 1 轮 = 1 issue open（WP-1 规格措辞）；已修 WP-1 + A1/A4/A5/A7；请求第 2 轮
  - 2026-10-23T18:21 note: Review 第 2 轮 = no spec-vs-code gaps；A1/A5/A6 措辞已改；进入 gate / archive
