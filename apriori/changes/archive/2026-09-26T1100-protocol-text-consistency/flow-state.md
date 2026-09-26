change: protocol-text-consistency
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0dba2-cd48-7bb0-841c-29475aea7134   # codex exec, round 1 (2026-09-26)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `v6-dev-s3`（从 v6-dev@84b6e83 开出）；本地提交；合回 v6-dev 须人类裁决；评审未通过则交付候选不合入（ND-CONSENSUS §一 B）
- decision: requirement — `work/astra-discuss/next-direction/ND-CONSENSUS.md` §一 B1–B4 + C5：只把「现行说明」改到与有效裁决和代码现状一致；每处列旧文/依据/新文/受影响检查；不默认代码正确；无依据的分歧列未决；保留仍有效的阻塞语义；不新增义务、不做减法、不改 P3（RIB-10 逐字钉住）
- observed: gate C2/C4 恒 `n/a`（lib/gate.js:31-36，`retired in 6.2`）；archive R1=C3+phase+台账迁移、R4=C5+C8、R5=C9（lib/readiness.js:597-722）；`--force` 只放行已答复的 reframe 与指纹 archive-drop（readiness.js:684-715、archive-merge.js:811-837）；`archive-force ledger` 只解析并打印「has nothing left to force in 6.2」（readiness.js:537-552、635-638）；docs/cli.md:107/113/119 与此一致
- observed: RUNBOOK.md:259 / RUNBOOK_cn.md:250 仍写「no `open` row in a kept ledger」「critical evidence still `blocked`」「C3/C4/C8/C9」「`--force` … only when gates: carries `archive-force ledger`」——c1ed978 引入、15f796b 压缩时删掉了仍有效的 escalation 放行路径、dc4bc9d 退役台账后未改（`git log -S`）；无测试钉住该句
- observed: RUNBOOK.md:81「critical evidence blocked, a pending item」为 8abd7d3 有意写入，docs/concepts.md:252 定义之，保留不改；docs/cli.md:65 引作「critical evidence still blocked」，与 L81 不一致
- observed: CN 漂移三处（各无裁决记录）：RUNBOOK_cn.md:64「(或需求文档的签核)」c1ed978 只删 EN（6.0 不再有需求文档，CHANGELOG:479-482）；RUNBOOK_cn.md:112 R3「每完成一步」为退役「步」术语，c1ed978 改 EN R3/§3 与 CN §3 唯独漏 CN R3；RUNBOOK_cn.md:269 多一句 c63a466 在 EN 已替换的旧句；RUNBOOK_cn.md:302「既有授权」全文他处均译「委托」
- observed: EN 漂移一处：RUNBOOK.md:293「(reviewer P3, on the contract only — never source)」——75fa068 改写时把原属生产方的括注挂到评审方（c1ed978 两版均为 producer revises … contract only），与 R2「reviewer's own source inspection still allowed」、P3「may read the whole repo」冲突；docs/concepts.md:565 现行写「producer's revise pass touches spec/design content only — never source」
- observed: 现行说明失效引用：docs/concepts.md:61/156（cumulative issue ledger 为跨轮记忆与审计记录；现行 = `## Open` 稳定 id + R2 同会话续跑 + R4 review-progress，CLI 不读台账 L337）、:315/:371/:578 与 CN「evidence summary / 证据摘要」（现行四样输入 L310 为 `## Open` items）、:502/CN:500 归档拒绝清单（同 L259）、:554/CN:550「become rows / 进正式行」（L337「become pending items」）、:565/CN:561「spec/design content」（design 已退役）；VISION.md:30-32,34 引用 §4.8 测试名/§7.0 台账/验证矩阵/P11-P12（均退役：L301 测试名可选、L337 无台账、L303「not a matrix」、cb61034 退役 explore 轨）
- observed: 规格文字滞后：protocol PR-08「exactly four things … critical evidence still `blocked`」而 R1 为五类且 test/protocol.test.js:179 已断言 five；readiness RY-17「an open row neither blocks」而 c63a466 后 open 行触发迁移拒绝（slice5-subtraction.test.js:105）；archive-merge AM-82/89/121「open ledger row … archives」「round-5 escalation」（166af35 退役 round-5）；gate spec:17 把 `lineage` 列为必需键（批 C 第 7 行退役，readiness.js:139-140）；test/archive-force.test.js:8 注释仍写 round-5
- observed: scripts/check_docs.py 无任何调用方（package.json/ci.yml/docs 均不引用），实跑 `RESULT: FAIL`（词表含退役 `extraction accepted/rejected`、缺 `escalate`/`gaps found`/ACCEPT|REVISE|ESCALATE、README KB 双节名目标已迁 concepts §5）；lib/check.js 为其超集且词表从 lib/review.js 单一来源导入（check.js:73-77）；唯一未移植的 KB 双节名检查目标文件已不存在；`node bin/apriori.js check --self` PASS
- observed: CHANGELOG 对 92e4ee2..84b6e83 漏 9 个提交（1a35804、b649bc5、ac665ca、7c59510、c38dc5a、e4200c9、4fd899b、0178b67 有可见行为变化；46bb329 内部重构可不补），且 9993347 条目的客户端矩阵句已被 b0cba2c 弄得不准（Codex CLI 亦 not yet supported）
- observed: 未决（不在本 change 处理）：VISION.md:9 冲突理由落点；VISION.md:34 P11/P12 行删或替换；RUNBOOK_cn.md:306 缺「默认:」（放宽 CN 措辞属政策取舍）；R1 #2「Nothing else opens it」与 follow-up 文法 CLI 无法区分；RUNBOOK.md:110 R2 同一机制说两遍（非语义问题）
- observed: Build 完成 —— RUNBOOK 两版 §4 归档句 / CN kickoff / CN R3 / CN Reality Check / EN+CN Specify 句 / CN follow-up 句；docs/cli.md:65 与 R1 措辞统一；concepts 两版 9 处；VISION 两版铺路表 3 行；test/archive-force.test.js 注释；lib/check.js 头注释；删 scripts/check_docs.py；CHANGELOG 本 change 条目 + 8 个漏项 + 客户端矩阵句更正；delta 五模块；test/protocol-text-consistency.test.js 绑 PR-50/51/52、CK-18。全套 830/830；`check --self` PASS；`verify --change` GREEN；`gate --review-ready` YES
- observed: Review 第 1 轮（`review/code-review-v1.md`）= 2 issues：PTC-01 delta 的 readiness RY-21 与 archive-merge 需求句/AM-74 仍写「open 行 gates green / 台账从不读 / 形状无影响」，与 LM-01/LM-05（C3/R1 迁移拒绝、不可读台账为迁移错误）矛盾；PTC-02 store PR-13 两处仍写「evidence summary」而 P3 与 test/protocol.test.js PR-13 断言写 `## Open` items。修：RY-21 改为「open 行 = C3 迁移拒绝，移出后残留 inert」；archive-merge 需求句改为「issues.md 只被 R1 一次性迁移打开；open 行结构性拒绝、不可读为迁移错误、closed/absent 无影响」，AM-74 THEN 同步；PR-13 两处改 `## Open` items（同一 MODIFIED 块）；advisory：concepts 两版跨轮记忆段改为「CLI 读 `## Open`；评审会话由 R2 resume（id 持久化 PR-12）」并把「台账兼作审计记录」改为 `## Open`
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: no major issues`；PTC-01/PTC-02/advisory 判 resolved；P3 两版 RIB-10 哈希未变；「未决」段落确认未动；无需 SPLIT

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- gate → check → archive --write → 本地提交（v6-dev-s3）

gates:
  - 2026-09-26T11:00 note: Review 第 2 轮接受（no major issues）；进入 gate / archive
  - 2026-09-26T10:58 note: Review 第 1 轮落盘（2 issues）；PTC-01/PTC-02 与 advisory 已修；开第 2 轮
  - 2026-09-26T10:54 note: Build 完成，review-ready YES；开 Review 第 1 轮
  - 2026-09-26T10:48 note: Ground 完成（依据 ND-CONSENSUS §一 B1–B4/C5 与 next-direction 调查备料）；进入 Specify
  - 2026-09-26T10:31 note: change scaffolded by `apriori new`
