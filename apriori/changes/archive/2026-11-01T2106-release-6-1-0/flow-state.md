change: release-6-1-0
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a19735-dfca-7740-93c8-d41b17ec32c8 # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/release-6-1-0`（从 v6-dev@0b32a90 开出）；评审接受后 squash 合回 v6-dev，推 judge 与 GitHub；之后按 6.0.0 的发布步骤：draft PR 跑 GitHub CI（只在 main 触发），全绿后本地 main / release/v6 快进到发布提交、打 tag v6.1.0，npm 发布成功后再推 main / release/v6 / tag
- observed: 来源——人类 2026-11-01「OK，先发，公司电脑也升级」；R1101 共识 §六（`/root/asd-lab/work/astra-discuss/r1101/R1101-CONSENSUS.md`）：建议在已有发布检查通过后发 6.1.0 = v6-dev 0b32a90，发布说明逐字用 Astra 的版本（规则要求≠结果保证；未证明整体正确率、相对不用 apriori 的优势、成本改善）；人类口径：apriori 改动由主会话亲手做（11-01 起 Opus 主会话也可以），评审用 Astra
- observed: 6.0.0 的发布身份由 `release-6-0-0` change 定义（archive 2026-10-23T1638-release-6-0-0）：package.json、RUNBOOK 头 `runbook-version`（CK-11 比较 major.minor，lib/check.js:221–258）、CHANGELOG 顶部 h2、MIGRATING 开头、ID-01/ID-06/ID-07（test/identity.test.js；cli 规格「the 6 line's release identity is 6.0.0」，apriori/specs/cli/spec.md 第 98 行起，是该文件最后一个 requirement）
- observed: 6.0.0 之后七个 change 都在 CHANGELOG `### Unreleased since 6.0.0 · <name>` 小节（第 33–60 行），六个只改 RUNBOOK 文字，gates-note-command 新增 `apriori note` 与 `status --json` 的 `advisories` 字段（追加）
- observed: 基线——`node scripts/run-tests.mjs` 922/922；cli spec base sha256 6818031d…；archive-merge 先 RENAMED 后 MODIFIED（lib/archive-merge.js:244），同 ID 改标题不算丢场景（docs/cli.md 第 131 行）
- observed: Review 第 1 轮（`review/code-review-v1.md`，Astra = codex gpt-6-astra 只读，P3 逐字）= `VERDICT: no spec-vs-code gaps`，实质发现 0；advisory 1：PATH 上的全局 `apriori` 是旧装，归因 gate 证据时用仓库入口 `node bin/apriori.js`（本 change 全程用的就是仓库入口）
- decision: approach——最小发布身份变更：package.json 6.1.0；RUNBOOK 头 `runbook-version: 6.1`（只改头部，P1/P3 段落哈希不变）；CHANGELOG 新开 `## 6.1.0 — 2026-11-01`，七个小节去掉 `Unreleased since 6.0.0 ·` 前缀挪入其下，加 `release-6-1-0` 小节，发布说明逐字用共识版本；MIGRATING 开头加一段「6.1.0 是 6 线的小版本，无需从 6.0.0 迁移」；cli 规格改名为「the package's release identity is the current release」并按 6.1.0 重写（ID-01、ID-06 更新，ID-07 原样）；ID 测试先红后绿
- observed: Build——test/identity.test.js 改为要求 6.1.0 后先红（ID-01、ID-06 两条 fail），实现后 7/7 绿；archive 预演：renamed + modified 各一，无 DROPPED

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check / gate / archive --write（不接管道）→ squash 合回 v6-dev → draft PR 跑 CI → tag / npm / 推送

gates:
  - 2026-11-01T21:01 note: change scaffolded by `apriori new`
  - 2026-11-01T21:03 note: Ground 完成：来源（人类 11-01 发版决定 + R1101 共识 §六 发布说明）、6.0.0 发布身份的落点（package.json / RUNBOOK 头 / CHANGELOG / MIGRATING / cli 规格 ID-01·06·07）、七个 Unreleased 小节、基线 922/922
  - 2026-11-01T21:03 note: Specify（cli：RENAMED + MODIFIED 版本身份规格，ID-01/ID-06 改为 6.1.0，ID-07 原样）→ Build：identity 测试先红后绿；package.json 6.1.0、runbook-version 6.1、CHANGELOG 6.1.0 节、MIGRATING 开头一段
  - 2026-11-01T21:06 note: Review 第 1 轮（Astra，codex gpt-6-astra 只读，P3 逐字）接受：no spec-vs-code gaps，实质发现 0、advisory 1（全局 apriori 是旧装，用仓库入口归因）；进入 check / gate / archive
