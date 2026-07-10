change: music-site
tier: medium          # 单模块（一个静态站点）、新的用户可见行为；无外部共享状态、无跨模块 → 非 Large
track: harden
track-rationale: 头脑风暴后目标与验收均可明确陈述（给朋友听自录歌曲的静态卡片流网站）→ harden
lineage: master（本仓库唯一主线，greenfield，无合并禁忌）
current-step: STEP0
round: 1                # round-started 2026-07-08T01:08
next-action: run P1 reviewer (codex, read-only) on requirement/req-v1.md; archive raw output; land review doc + ledger on reviewer's behalf  # 2026-07-08T01:08
gates:
  - 2026-07-08T01:06 note: change scaffolded by `apriori new`
  - 2026-07-08T01:05 note: brainstorm exit approved by human — verbatim "可以,就这么定"（方案三卡片流 + 路线A 手写静态单页 + 剩余默认值整体通过）
