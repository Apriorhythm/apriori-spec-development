change: cl21-windows-blocking-pipes
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/cl21-windows`（worktree `~/terra/wt-cl21`，从 v6-dev@36e7c8c 开出）；评审接受后 squash、ff 合回 v6-dev；本地 tag `v6.0.0` 从 36e7c8c **重打**到新提交（tag 与 release/v6、main 尚未推送，仅本地），release/v6 与 main 重新快进；推 v6-dev 让 PR #1 的 CI 重跑；绿后 npm publish，再推 tag / release/v6 / main
- observed: 来源——6 线第一次 GitHub CI（draft PR #1，2026-10-23）：`test (windows-latest, 22|24)` 在 `node scripts/run-tests.mjs` 一步挂住 >15 分钟（ubuntu 1.5 分钟），其余 6 个任务全绿；两次运行均如此，已取消
- observed: Windows 主机复现——全量加 `--test-timeout=120000`：CL-21 跑满 120 s 超时，之前所有测试通过；三个照搬 CL-21 编排的变体（300 ms 后 resume / 立即 resume / 用 data 监听）全部 12 s 无 close，且**父进程从未收到 stdout 第一块**；读 stderr 从一开始就 flowing 的变体 0.43 s 完成；最小实验：Windows 上读端销毁后写回调 5 ms 收到 EPIPE，真实 CLI 412 ms 退出 0
- decision: 根因——Windows 上 libuv 把子进程 stdio 管道设为阻塞写：preload 的 300 KB stderr 写阻塞到父进程读 stderr，而测试只在 stdout 第一块后才读 stderr → 死锁；同时意味着 Windows 上退出时不可能有排队输出，JP-1 的截断在 Windows 不会发生。**产品无缺陷**，CL-21 在 win32 跳过并写明理由；CL-21 场景加平台范围；bin/lib 不动
- observed: CL-19、CL-20 在 Windows 通过（同一次运行）
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent）= no spec-vs-code gaps；评审方从 Node 24.13 内嵌 net.js 核实 Windows 上 fd 1/2 为管道时 `setBlocking(true)` + 同步写；advisory A1 给 Windows 加配套测试（stderr 从头读、stdout 读一块即关、断言退出 0）、A2 措辞应为「Node 子进程自己把 stdio 管道设为阻塞（net.Socket 经 libuv）」、A3 死锁条件应提父端暂停流仍预读 64 KiB、A4 CL-21 WHEN 的「draining stderr normally」与新 THEN 并读有歧义、A5 合入前等 PR #1 Windows 任务转绿、A6 raw 文件
- decision: A2/A3 措辞已改（规格增量、测试注释、CHANGELOG）；A1 作为 CL-22 放进 windows-ci-portability change（同一发布内）；A4 不改（WHEN 描述的是 POSIX 编排）；A5 已在计划内（CI 绿后才发布/推送）；A6 沿用既有做法（自带 provenance 头的评审文档，C5 接受）

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- Windows 侧验证跳过生效 → Opus 评审 1 轮 → gate → archive → 合回 v6-dev → 重打 tag / ff → 推 v6-dev → CI 绿 → npm publish → 推其余

gates:
  - 2026-10-23T17:54 note: change scaffolded by `apriori new`
  - 2026-10-23T17:54 note: Ground → Review：CL-21 win32 跳过 + cli 规格 CL-21 场景平台范围 + CHANGELOG 小节；无代码改动；phase 设为 review
  - 2026-10-23T18:01 note: Review 第 1 轮 = no spec-vs-code gaps；A2/A3 措辞已改；进入 gate / archive
