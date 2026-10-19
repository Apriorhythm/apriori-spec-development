change: archive-unreviewed
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a15514-5811-7530-8c9e-eeada2d1c4d4   # codex exec gpt-6-astra, round 1 (2026-10-20)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/archive-unreviewed`（从 v6-dev@c843e53 开出）；本地提交；评审接受后 squash、ff 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag
- observed: 来源——人类 2026-10-20 /goal 原话 O3「有 spec 但没完成独立评审的 change 都已交付，不再补评审，用新的无评审归档出口收尾，归档声明里写明没有独立评审」，以及第 3 步「新增无评审归档出口：凭 owner 在 gates 里记的原话，合并 spec、照常移入 archive，归档声明和 manifest 写明「没有独立评审」或「评审未收敛」及最后一轮结论；它不放行待处理的 Open 项、结构缺陷和 CAS 冲突，正常路径照旧必须评审；RUNBOOK 和 docs 同步；测试要包括反例」
- observed: 现状——两个真实项目 2026-10-20 的 25 个在途 change 中，按 5d3fc78 规则能直接归档的只有 2 个；其余多数已交付但缺独立评审或评审未收敛，唯一不需要评审的出口 abandoned 不写主库、且把已交付的 change 记成放弃（lab 记录 work/closeout-1020/）
- decision: approach — 双重动作，与 archive-drop/reframe 同一种 owner 条目：`owner: archive-unreviewed <change> — <reason>` + `--unreviewed`；只放宽两项（phase 接受 build；R4 的循环收敛要求，含无轮次、未收敛、escalate 无决定、缺 review-progress、结论无原始记录），其余照旧拒绝（R1 结构与 C3 合法性、其他 phase、R4 结构守卫、R5、全部预检）；评审已收敛时拒绝该参数，避免出现「声称没评审其实评过」的记录；声明保持三种状态（AM-118 不变），在关键证据行注明 independent review: none / not converged + 每族末轮，决定与每条被放过的要求列为 note；manifest 仅在此路径多一个 review 键；check 用一条 note 点名这类归档（CK-24）
- observed: Build —— lib/readiness.js（unreviewedGrant、unreviewedLine、readinessOf 的 unreviewed 参数，R4 的循环要求先收进 owed 再决定放过或拒绝）、lib/archive-merge.js（--unreviewed 参数、声明、拒绝时的提示、单文件形式拒绝）、lib/manifest.js（review 键）、lib/check.js（CK-24）；新增 test/archive-unreviewed.test.js（AM-137..AM-142、CK-24）；实现前 7/7 红；逐文件换回 v6-dev：readiness → AM-137/138/139/141/CK-24 红，archive-merge → 7 条全红，check → CK-24 红，manifest → AM-137/139/CK-24 红；全套 894/894；`check --self` PASS；verify --change GREEN（新场景全部 bound-green）；archive dry-run 只剩 R4 无评审一项
- observed: 文档 —— RUNBOOK §2 一句、§4 新增 CLOSED WITHOUT REVIEW 段；docs/cli.md 与 cli_cn.md 的 archive 用法行与说明段；CHANGELOG
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 3 issues open`：AU-1 结构性的证据问题进了可放过的集合（读不出来的评审摘要在 review.js 里记成 finding 而不抛异常；symlink 的 `-raw` 文件被当成缺失原始记录）；AU-2 一族里先有不可归属的 round 1、后有可归属的 round 2 时，记录把末轮写成 round 1（用的是可归属轮次的个数）；AU-3 build 阶段的放宽没有进放过清单；无 advisory
- decision: AU-1 fixed — 走出口时另查结构性证据：review 读取器的 `unreadable-doc` 与 `review/` 里任何不是普通文件的条目（symlink 等）一律作为不可 force 的结构性 R4 阻断，不进放过集合；证据：AM-140 新增 symlink 原始记录（dry-run 与 --write）与读失败的摘要（进程内替换 fs.readFileSync）两例，修复前的代码上 AM-140 变红
- decision: AU-2 fixed — 每族按其最后一个可归属轮次自己的 ordinal 记（review facts 的 rounds），不再用个数；证据：AM-139 新增混合归属例，记 `code-review round 2 (revise, 2 open)`，修复前变红
- decision: AU-3 fixed — build 阶段的 R1 放宽作为第一条放过项写进声明 note 与 manifest 的 waived；证据：AM-137 在 build 断言该条、在 review 断言没有，修复前变红
- observed: 生产方自己在本地快照试跑中发现（非评审转述）：只认 none / not converged 两种状态会说错话——各族都已接受、只缺原始记录或 review-progress 时被记成 not converged；另有真实 change 评审已收敛但 phase 停在 build（只做过规格评审，代码从未独立评审），旧设计下正常路径卡 phase、出口又因「无可放过」拒绝
- decision: 状态分四种 — none（无可归属轮次）、not converged（有族未解决、escalate 或停住）、evidence incomplete（各族已收敛但证据或 review-progress 缺）、converged（只放宽了 phase）；「无可放过」改为评审无欠项且 phase 为 review 时才拒绝；证据：AM-139 新增 evidence incomplete 例，AM-141 新增 build+已收敛例（声明 converged，waived 只有 R1）；契约、RUNBOOK、cli 中英文、CHANGELOG 同步
- observed: 回归——RY-11（readinessOf 内不得出现字面 phase 比较的源码守卫）因 `b.class === 'review'` 误触，改为函数外的类别集合；全套 894/894，`check --self` PASS，verify --change GREEN
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: 2 issues open`：AU-1、AU-2、AU-3 ADDRESSED；新 AU-4（check 的 note 把 converged 的收尾也说成「没有收敛的评审」）、AU-5（状态由剩下的阻断类别倒推：上限为 1 时欠裁决的 revise 只剩 evidence 类义务而被记成 evidence incomplete；--force 越过的 escalation 在 build 阶段被记成 converged）；advisory：CHANGELOG「a converged review refuses the flag」与 build 阶段的情形矛盾
- decision: AU-5 fixed — 状态改为从各族自己的末轮结论与裁决状态读出（familyConverged：末轮 accept 且无未决、无 escalate，或在上限处由裁决与那一次复核收口），与放过或 force 了哪些要求分开；证据：AM-139 新增 limit 1 欠裁决与 build 阶段 accept-risk+--force 两例，均记 not converged，在 cb213bd 的 lib 上变红
- decision: AU-4 fixed — check 的 note 改为 `closed by the owner's closeout (archive-unreviewed): <n> archived bundle(s) — <dir> (<state>), …`，逐个带 manifest 记下的状态；证据：CK-24 新增 build 阶段已收敛的收尾，note 写 (converged) 且无 without a converged，在 cb213bd 的 check.js 上变红；check delta 与 cli 中英文同步
- decision: advisory 已处理 — CHANGELOG 改为「a change at `review` whose review converged refuses the flag」
- decision: 评审方更换 — 人类 2026-10-20 原话「不要用 codex 评审，用子agent就行，codex 快没额度了」；第 3 轮起改为新开的 Claude 子 agent（不同档位：Fable，异构于生产方 Opus），按 R2 的「without Codex — a fresh claude session on a different tier」，默认输入仍为 P3 四项；第 1、2 轮的 codex 记录不变
- observed: 回归——全套 894/894，`check --self` PASS，verify --change GREEN
- observed: Review 第 3 轮（`review/code-review-v3.md`，Claude 子 agent / Fable，自带 provenance）= `VERDICT: 3 issues open`：AU-4、AU-5 ADDRESSED；新 AU-6（状态只按可归属轮次算——后面一轮缺原始记录、结论被删或只剩孤立原始记录时，状态仍按前面接受的那轮说 evidence incomplete）、AU-7（证据完整性发现——缺轮次、重复轮次、结论被删、孤立原始记录、词表外结论、一文两结论——全进了放过集合，契约两张清单都没写）、AU-8（两条 MODIFIED 句子还写两种状态）；advisory：「converged」拒绝措辞在 accept-risk+--force 时不真；AM-140 文字写了 drop/冲突/done 但测试没有；其余为信息
- decision: AU-6 fixed — review.js 新增 `claimedMax`（每族证据声称的最大轮号，含不可归属的）；某族声称的轮次超过其最后可归属轮次时，记 `<family> round <n> (unattributable)` 并判 not converged；无可归属轮次时 none 那一行也列出这些轮次；证据：AM-139 新增后续 revise 无原始记录、结论被删、孤立原始记录三例，在 39e6acd 的 lib 上变红
- decision: AU-7 — 采评审方给的第二种处置（契约写明）：证据完整性发现在出口下放过，但每条点名、且只要存在就判 not converged，绝不说成 evidence incomplete / converged；理由——真实 change skill-usage-stats 的 req-review 与 spec-review 正是「有原始记录、文档无结论行」，若一律拒绝则 O3 要收尾的它无法收尾；apriori 语汇里的结构缺陷（symlink、读不出、逃逸、非普通文件）照旧拒绝；证据：AM-139 新增缺轮次与一文两结论两例；契约、RUNBOOK、cli 中英文同步
- decision: AU-8 fixed — 两条 MODIFIED 句子改为四种状态（manifest 的取值同步）；三个 MODIFIED 块的场景不变（dry-run 无 DROPPED）
- decision: advisory 处理 — 拒绝措辞改为 `nothing is left for the closeout to waive (the review loop owes nothing and the phase is review)`；AM-140 补 `done`、合并冲突（store 已有同名不同文的需求）与无决定的丢场景三例，契约文字同步；continuation 行理由、doctor D7 措辞、`(unknown)` 兜底按信息处理，不改
- observed: 回归——全套 894/894，`check --self` PASS，verify --change GREEN
- observed: Review 第 4 轮（`review/code-review-v4.md`）= `VERDICT: no spec-vs-code gaps`：AU-6、AU-7、AU-8 ADDRESSED，评审方认定 AU-7 的取舍合理（结构缺陷照旧拒绝；完整性发现逐条点名且必为 not converged）；无新发现
- decision: advisory 处理 — CHANGELOG 补上完整性发现与 (unattributable) 的一句、cli 中英文的 none 行注明可选的 unattributable 轮次（仅文档）；无效 review-round-limit 行在已收敛时记为 evidence incomplete 按信息处理，不改

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev，推两远端

gates:
  - 2026-10-20T00:44 note: change scaffolded by `apriori new`
  - 2026-10-20T00:51 note: Ground → Specify → Build（894/894，verify GREEN）；phase 设为 review；下一步 review-ready 后开 P3 第 1 轮
  - 2026-10-20T00:59 note: Review 第 1 轮 3 issues open（AU-1、AU-2、AU-3）均已修复；另按本地快照试跑把评审状态细分为四种并允许只放宽 phase；894/894；resume 同一评审会话开第 2 轮
  - 2026-10-20T01:04 note: review-progress code-review round 3 — issues: AU-1, AU-2, AU-3, AU-4, AU-5; actions: AU-1/AU-2/AU-3 addressed in round 2 (no further change), AU-4 fixed — the check note names each closeout with the review state its manifest recorded, AU-5 fixed — the review state is read from each family's own last verdict and ruling state instead of from the obligations left over; evidence: lib/readiness.js, lib/check.js, test/archive-unreviewed.test.js, apriori/changes/archive-unreviewed/specs/check/spec.md; approach: kept — the double-action closeout stands; both findings were reporting defects in it, closed with counterexample tests red on the round-2 code
  - 2026-10-20T01:04 note: 评审方按人类原话改为 Claude 子 agent（Fable）；开第 3 轮
  - 2026-10-20T01:17 note: review-progress code-review round 4 — issues: AU-4, AU-5, AU-6, AU-7, AU-8; actions: AU-4/AU-5 addressed in round 3 (no further change), AU-6 fixed — a round claimed beyond a family's last attributable one is named unattributable and the family is not converged, AU-7 fixed — integrity findings stay waivable but are named and force not converged, written into the contract, AU-8 fixed — both MODIFIED sentences carry the four states; evidence: lib/review.js, lib/readiness.js, test/archive-unreviewed.test.js, apriori/changes/archive-unreviewed/specs/archive-merge/spec.md; approach: kept — the closeout and its four states stand; the findings were classification gaps and one contract choice, now explicit
  - 2026-10-20T01:20 note: Review 第 4 轮接受（no spec-vs-code gaps）；两条文档 advisory 已处理（无产品代码与测试变化）；进入 gate / archive
  - 2026-10-20T01:20 note: review-progress code-review round 4 — issues: AU-4, AU-5, AU-6, AU-7, AU-8, AM-140; actions: AU-4/AU-5 addressed in round 3 (no further change), AU-6 fixed — a round claimed beyond a family's last attributable one is named unattributable and the family is not converged, AU-7 fixed — integrity findings stay waivable but are named and force not converged, written into the contract, AU-8 fixed — both MODIFIED sentences carry the four states, AM-140 (round-3 advisory) — the scenario's done phase, merge conflict and no-decision drop are now asserted; evidence: lib/review.js, lib/readiness.js, test/archive-unreviewed.test.js, apriori/changes/archive-unreviewed/specs/archive-merge/spec.md; approach: kept — the closeout and its four states stand; this entry restates the previous round-4 record, which did not list the AM-140 advisory id
