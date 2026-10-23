change: cli-json-pipe-flush
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/cli-json-pipe-flush`（从 v6-dev@d44a0c2 开出）；本地提交；评审接受后 squash、ff 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag
- observed: 来源——follow-up JP-1，登记于已归档 `apriori/changes/archive/2026-09-27T0704-status-last-recorded/`Open 区第 23 行）；人类 2026-10-23 原话「修 JP-1 和 LG-1，修完再升级公司电脑」
- observed: 复现——v6-dev@d44a0c2，先用 70 个 change 的手工探针：写文件 95,780 字节、经管道 65,536；测试里的 90 个 change 夹具（评审方复测）：写文件 276,158 字节、经管道 65,536，JSON 解析失败；根因 bin/apriori.js 在 console.log 后立即 process.exit，POSIX 管道写异步，内核缓冲 64 KiB
- decision: approach — 入口改为 exitWhenDrained：两条流中 writableLength>0 的，各写一个空块并在回调里计数，全部回调后 process.exit(code)；都为 0 时立即退出（TTY/文件同步写，行为不变）；成功路径与未捕获异常路径都走它；退出码不变
- observed: Build —— 新 test/cli-json-pipe-flush.test.js（CL-19 管道 >64 KiB 完整可解析；CL-20 退出码与错误路径）修复前 CL-19 红（Unterminated string at 145706）；修复后 2/2 绿，真实探针经管道 95,780 字节可解析；全套 900/900
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent）= `VERDICT: 1 issue open`：JP-R1 CL-20 证明不了错误路径——root 下提前 return、信封只有几百字节在修复前也能过、接受 0 或 2、Windows 下 chmod 无效；advisory A1 两流都排队且 stdout 读端早关时未处理的 EPIPE 会把退出码变 1、A2 「TTY 同步」是 POSIX 说法、A3 字节数与提交的夹具不符、A4 CL-19 的结构断言太弱
- decision: JP-R1 fixed — CL-20 改为用 NODE_OPTIONS=--require 预加载让 c000 的读取抛出 70,000 字节消息的 Error：断言退出码 === 2、stdout > 65536、能解析、信封含注入消息；另加文本孪生（stderr 完整、退出 2）；不再依赖 chmod 与 uid；契约 THEN 同步收紧；证据：换回 v6-dev 的 bin 时 CL-20 变红【第 2 轮更正：这条「变红」在并发读的 spawnSync 下并不成立——70,000 字节仍在旧入口能写出的约 146 KiB 之内；当时的红是 `| cat` 场景的印象，不是测试本身。真正能区分的是第 2 轮后的 1,000,000 字节版本】
- decision: advisory — A1 采纳：排队的流各挂一个空 error 监听，EPIPE 不改退出码；A2 采纳：注释与 CHANGELOG 改为「when nothing is queued」；A3 采纳：Notes 与本文件写清两组字节数的来源；A4 采纳：CL-19 断言 changes.length === 90
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: 1 issue open`：JP-R1 NOT ADDRESSED——spawnSync 并发读时修复前能写出约 146 KiB，70,000 字节的注入消息在旧 bin 上也能过；advisory B1 CL-19 夹具余量薄、B2 A1 的退出码保证无测试、B3 本文件被编辑切坏（「（## Open 第 23 行）」被当成标题定位）
- decision: JP-R1 fixed — 注入消息改为 1,000,000 字节，断言改为「整段标记到达」而非字节数；契约 CL-20 与需求句同步（不再以 64 KiB 为界，改为「不论读端排了多少，整体可解析」）；证据：换回 v6-dev 的 bin，CL-19/20 红（CL-21 在旧 bin 上仍绿——旧入口在 EPIPE 发生前就退出了）。去掉 error 监听器时 CL-21 也不红：查明 apriori 所有输出都经 console.log/console.error，Node 的 Console 对异步 EPIPE 自带吞错（写回调里 once('error', noop)），退出码本来就不会经 console 变 1；评审方与我的复现都是直接 process.stdout.write 才出 1（最小复现：两流各 300 KB、stdout 读 10 字节即关，无监听 exit 1、有监听 exit 5）。监听器保留为对将来直接写流的防护，CL-21 守的是端到端保证而非这一行（命令与说明记在 Notes）
- decision: advisory — B1 采纳：夹具 300 个 change；B2 采纳：新增 CL-21（读端读一块就关，退出码仍为 0）与场景；B3 采纳：已把切开的「来源」行接回、评审记录移回 Reality Check 末尾、写法改为「Open 区第 N 行」；同一错误也出现在 status-last-gate-order 已归档的 bundle 里，那边在合并前重做了归档
- observed: Review 第 3 轮（`review/code-review-v3.md`）= `VERDICT: no spec-vs-code gaps`：JP-R1 ADDRESSED（评审方三份副本 × root/nobody 实测：旧 bin 上 CL-19/20 红、CL-21 绿；去监听器后三条仍绿；console 吞 EPIPE 的说法经其 2×2 探针确认）；advisory C1 CL-19 标题仍写 64 KiB、C2 SHALL 句里的本机字节数、C3 第 1 轮决定行的「变红」未加说明——三条均采纳

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev，推两远端

gates:
  - 2026-10-23T12:17 note: change scaffolded by `apriori new`
  - 2026-10-23T12:18 note: Ground → Build（CL-19 红→绿，900/900）；JP-1 以本 change 的退出证据关闭（CL-19/CL-20）——从 ## Open 删去；phase 设为 review
  - 2026-10-23T12:25 note: Review 第 1 轮 1 issue open（JP-R1）已修复，A1–A4 采纳；续接同一评审子 agent 开第 2 轮
  - 2026-10-23T12:31 note: Review 第 2 轮 JP-R1 仍开——已按其建议改为 1,000,000 字节标记并补 CL-21；B1–B3 采纳；续接同一评审子 agent 开第 3 轮
  - 2026-10-23T12:38 note: review-progress code-review round 3 — issues: JP-R1; actions: JP-R1 fixed — the injected message is 1,000,000 bytes and both the JSON envelope and the text twin must carry the whole marker, no byte-count guard; B1 the CL-19 fixture is 300 changes with changes.length asserted; B2 CL-21 added — both streams queued, stdout closed after one chunk, exit code 0; B3 the flow-state split repaired; evidence: test/cli-json-pipe-flush.test.js, apriori/changes/cli-json-pipe-flush/specs/cli/spec.md; approach: kept — drain-then-exit stands; round 2 found the evidence, not the code, insufficient (this record is written after round 3 completed — the producer missed writing it before the round opened; the round's input was the fix diff and the dispositions above)
  - 2026-10-23T12:38 note: Review 第 3 轮接受（no spec-vs-code gaps）；C1–C3 采纳（标题、SHALL 句字节数移入 Notes、第 1 轮决定行加更正）；进入 gate / archive
