change: batch-recheck-fixes
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0fd6c-8d20-79e2-a01a-a7ef11cfd856   # codex exec gpt-6-astra, round 1 (2026-10-03)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/batch-recheck-fixes`（从 v6-dev@9020f02 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub
- decision: requirement — 来源：需求级复核（`/root/asd-lab/work/next-improve-1002/批次核对报告.md` 复核节；原始数据 `/srv/review-1002/recheck/`）：在 9020f02 上 resume 8 个区域的 codex finder 会话，原 19 条全部 ADDRESSED，新发现 3 条经 2 票对抗核验全部成立——check-self-R1、guide-R1、SST-R1；人类 10-02「全部修复完毕」及需求级核对配方（必要修复进 change、走自己的 P3、再由需求级评审方复核）：3 条承接原 id 修复
- observed: check-self-R1 —— `- ~~~` 不被识别为围栏开头，而其缩进的收尾 `  ~~~` 被当成顶层开头，吞掉后面的版本行（误报缺失；两条版本行之间夹一个列表围栏时 `check --self` PASS）；c290842 的反引号读法对这两种情况是对的，这是 batch-review-fixes 引入的回归
- observed: guide-R1 —— 无 /proc 时，读取用的 realpath 退路可被「打开前换目录、打开后换回」骗过；外部文件字节恰为当前 guide 时不需要改写，writePlain 的失败即关闭根本不运行，于是按外部字节给项目内团队自写的 guide 记了账（不覆盖，但所有权记错）
- observed: SST-R1 —— PW-02 无条件期待原地改写/收编成功；在无 /proc 平台（macOS、Windows；CI 含 windows-latest，但只对 main 触发）上规格本就要求拒绝，测试必然失败
- decision: approach — check-self-R1：围栏记下所在容器——引用深度之外再记列表项的内容列，围栏内的行按其容器读（只剥该围栏那么多层引用），收尾须缩进到内容列（再多至 3 空格），更少缩进的非空行结束列表项与围栏；guide-R1：收编要求读取已在描述符上定位（`seen.located`），否则 `not refreshed`（信息同时说明不收编也不改写）；SST-R1：测试按平台给期待（LOCATABLE 探测 /proc/self/fd），依赖符号链接的段落在 win32 上跳过（沿用 update.test.js 的约定），并在隐藏 /proc 的条件下跑全套验证
- observed: Build 完成 —— 代码：lib/check.js（stripFencedBlocks 带容器）、lib/update.js（收编需定位；UNCONFIRMED 文案）、lib/managed.js（注释）；测试：CK-12 新增列表围栏 4 例 + 跨列表围栏的重复 + 列表围栏内的版本行 + 缩进更少结束列表项 + 4 空格非围栏；PW-02 新增 guide-R1 两例（有/无定位）并按平台改写期待；UP-09 按平台；红测试：在 9020f02 的 lib 上 CK-12 与 PW-02 变红，隐藏 /proc 时 9020f02 的测试在 UP-09/PW-02 失败；修复后全套 883/883，隐藏 /proc（NODE_OPTIONS 预加载）也 883/883；文档：MIGRATING、cli 两版、CHANGELOG；delta：check（CK-11 需求 MODIFIED）、update（清单需求与 guide 需求 MODIFIED），场景 id 全保留

- observed: 手写 flow-state 时覆盖了 `apriori new` 生成的 scaffold 行；其时间取自紧接 `apriori new` 之后 `date` 的输出（2026-10-03T00:16），不是原行
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 2 issues open`：BRC-R1（`paragraph\n2. ~~~` 有序列表不能打断段落，新读法开了列表围栏 → 假通过）、BRC-R2（列表续行中的围栏用了基准列 0 → 藏住重复条目）；guide-R1、SST-R1 的修法评审方逐项查过，未提问题
- observed: CK-11 的按行围栏读法连续 4 轮出现同类缺口（BRF-R3 → check-self-R1 → BRC-R1/R2），符合「循环陷阱」判据；咨询 Astra（`/root/asd-lab/work/astra-discuss/r59/R59-R11.txt`、`astra-r59-r11-reply.md`）：建议 C′——头部按字面读、出现连续 3 个以上 ` 或 ~ 即判「不支持的头部格式」、不再解析 CommonMark；并指出这会撤回 CK-12「头部围栏里的出现单独存在时不导致失败」的承诺，属 owner 的决定（R1）；对我提的 B+警告有 1 条分歧（会放过头部别处的重复条目），已采纳 Astra 的意见
- decision: owner — 2026-10-03 人类在本会话的选择题中选了「C′ 字面格式检查」（见 gates 的 owner 行及其代录说明）
- decision: BRC-R1、BRC-R2、check-self-R1 fixed — 按 owner 决定改为字面规则：lib/check.js 删去 stripFencedBlocks，`checkRunbookVersion` 在头部区域（第一个 `## ` 之前）发现连续 3 个以上 ` 或 ~ 即报 `unsupported header format — line N …` 并不再读条目；CK-12 测试把历轮所有容器反例（BRF-R3、check-self-R1、BRC-R1、BRC-R2 原例等 11 例）改为断言「拒绝且指出行号」，另断言单反引号是普通文本、h2 之后的围栏与 CK-11 无关；delta 重写 CK-11 需求与 CK-12 场景（CK-12 同 id 改题）；MIGRATING 新增一节（仅影响本仓库贡献者的 `check --self`）；CHANGELOG 改写；`check --self` 在现行 runbook 上 PASS
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: no spec-vs-code gaps`；BRC-R1、BRC-R2 ADDRESSED；无新发现、无 advisory
## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev，推两远端
- resume 需求级复核方复核 check-self-R1、guide-R1、SST-R1，写回批次核对报告

gates:
  - 2026-10-03T00:16 note: change scaffolded by `apriori new`
  - 2026-10-03T00:21 note: Ground、Build 完成（883/883；隐藏 /proc 亦 883/883）；review-ready 后开 Review 第 1 轮
  - 2026-10-03T00:36 owner: 选择「C′ 字面格式检查 (Recommended)」——CK-11 不再解析围栏：标题到第一个 h2 的头部区域里只要出现连续 3 个以上 ` 或 ~，就报「不支持的头部格式」；撤回 CK-12 中「头部围栏里的出现单独存在时不导致失败」的承诺；正文和 consumer 模式不受影响
  - 2026-10-03T00:36 note: 上一行由 Claude 代录：人类在 Claude Code 会话里回答了一道选择题（问 CK-11 选哪种修法），选中的选项标签是「C′ 字面格式检查 (Recommended)」；owner 行的文字是该选项的说明原文（略去了其中「Astra 的建议」与代价说明两句），不是人类另行写下的句子
  - 2026-10-03T00:39 note: Review 第 2 轮接受（no spec-vs-code gaps）；进入 gate / archive
