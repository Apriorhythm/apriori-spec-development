change: bd08-windows-separators
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/bd08-win`（worktree `~/terra/wt-bd08`，从 v6-dev@59fb177 开出）；评审接受后 squash、ff 合回 v6-dev；本地 tag `v6.0.0` 重打到新提交，release/v6 与 main 重新快进；推 v6-dev 让 PR #1 CI 重跑；全绿后 npm publish，再推 tag / release/v6 / main
- observed: 来源——PR #1 在 59fb177 上的 CI：ubuntu ×2、golden-path ×2、python ×2 全绿；`test (windows-latest, 22|24)` 都是 907 个、904 过、1 失败、2 跳过，失败项同为 BD-08：`path.relative` 结果 `kv\\spec.md` ≠ `'kv/spec.md'`；runner 有建链权限，所以跑到了我本机（无权限、24 个跳过）跳过的建链循环用例
- observed: `mdFilesUnder` 返回绝对路径，消费方（discoverDeltas、store 列表、risk.scanDeltas）自行计算相对键；Windows 上 manifest / store 相关测试全部通过，因此不是产品问题；同一测试后面的 `/escapes the walk root: .*kv\\/out/` 在 Windows 也会不匹配（消息带主机分隔符），一并改
- decision: 只改测试两处（归一为 `/` / 接受任一分隔符）；golden 规格「可移植」需求补一句；bin/lib 不动；本机无法验证建链用例，以 CI 为准
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent）= no spec-vs-code gaps；评审方核实 mdFilesUnder 的消费方各自以 `/` 算键、manifest 不经过它；同类断言排查：7 处未归一的 path.relative 都不与 `/` 字面量比，约 100 条 `\/` 正则匹配的都是 lib 自拼字符串；advisory A1 BD-08 是孤儿 id（改动前即如此）、A2 out.sort() 按主机分隔符排序只影响报告顺序、A3 BD-08 202–215 行等下次 CI 首跑、A4 manifest 里 link: 目标保留主机分隔符（范围外）
- decision: advisory 均记录不改；以下一次 CI 为准

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- Opus 评审 1 轮 → gate → archive → 合回 v6-dev → 重打 tag / ff → 推 v6-dev → CI 全绿 → npm publish → 推其余

gates:
  - 2026-10-23T18:27 note: change scaffolded by `apriori new`
  - 2026-10-23T18:27 note: Ground → Review：BD-08 两处断言改为分隔符中立 + golden 规格一句 + CHANGELOG 小节；无代码改动；phase 设为 review
  - 2026-10-23T18:33 note: Review 第 1 轮 = no spec-vs-code gaps；进入 gate / archive
