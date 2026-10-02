change: fence-tilde-readers
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0fda1-9fd6-78f2-8cb7-2ecc5bd2b671   # codex exec gpt-6-astra, round 1 (2026-10-03)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/fence-tilde-readers`（从 v6-dev@a6c790b 开出，FU-2 合入后换基到 8a93dbb）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub
- observed: 来源——follow-up FU-1，登记于已归档的 `apriori/changes/archive/2026-10-02T2359-batch-review-fixes/`，原文：「共用围栏读法只认 ``` 不认 ~~~（`lib/text.js` stripFences，及 gate.js、config.js、archive-merge.js 各自的反引号正则）；对齐会同时改变 delta 解析与 check/verify 的一致性面，单独一个 change 做」；人类 10-03「两个 follow-up 如果可以开干那就直接开干吧」
- observed: 现状盘点——两种模型：跨行的反引号区段（text.js stripFences；gate.js、archive-merge 的 closedFenceSpans / scanBlockStructure / 题目收集各自复制了同一正则）与按行开合（config.js、archive-merge parseDeltaStrict 的 `/^\s*```/`）；flow.js 已按行读 ``` 与 ~~~（CommonMark 式），不在此列
- decision: approach — 一个共享语法放在 lib/text.js（本工具自己的语法，不是 CommonMark，不建模列表/引用等容器——CK-11 的教训）：反引号保持历史读法逐字节不变；波浪线只在行首（至多 3 空格）以 3 个以上 ~ 开，同字符、不短于开头、只含 ~ 的行关；先开者胜，围栏内另一种标记是内容；区段读法未闭合即普通文本，按行读法沿用各自对未闭合的既有策略；所有复制的正则改为调用共享函数
- observed: 兼容证据——仓库全部 1079 个 Markdown 文件（规格、已归档 bundle、评审、文档）新旧 stripFences 输出逐字节相同；`check --self` 输出与 v6-dev 逐字节相同；全套原有测试不改即全部通过
- observed: Build 完成 —— lib/text.js（fenceSpans、stripFences、fenceOpen、fenceCloses）、lib/config.js、lib/archive-merge.js、lib/gate.js 接入；新增 test/fence-tilde-readers.test.js（TX-01 语法、TX-02 仓库语料的反引号读法不变、TX-03 各读者：config、check 与 verify 的场景发现、delta 解析、存储扫描、MODIFIED 比较引擎、review 的结论与 id 读取）；GT-20 加波浪线用例（非规范 stamp 写在 ~~~ 中不再报格式问题）；在 8a93dbb 的 lib 上 TX-01/TX-03 红，逐文件回退 config/archive-merge/gate 各自让对应断言变红；全套 887/887，隐藏 /proc 亦 887/887；delta：新模块 text（ADDED，TX-01..03）、config 需求 MODIFIED；MIGRATING、CHANGELOG
- observed: FU-1 的退出证据——TX-01..03 与 GT-20：波浪线围栏在每个结构读者处都不透明（存储的需求块边界也在内），反引号的剥离读法与仓库内存储的切块不变；据此关闭 FU-1

- observed: 构建中 ID-03 变红：我在 MIGRATING 散文里写了字面的三个反引号，历史的反引号区段读法把它与后文配对、吞掉了 6.2 标题——正是本 change 处理的那类脆弱性（反引号读法按决定保持不变）；已把新写的规格、MIGRATING、CHANGELOG 散文改为不含字面三反引号（「反引号围栏」等措辞），887/887
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 2 issues open`：FTR-1 store 的需求块边界在 merge、MODIFIED 基线、单文件形式里读的是原文、不认任何围栏（反引号也一样，早于本 change），围栏里的需求标题会切块，MODIFIED 替换后留下幽灵块；FTR-2 未闭合的 ~~~ 开头逐个向后扫描，构造输入可致平方级；advisory：golden-path.mjs 自带反引号提取，需说明「每个结构读者」是否包含它
- decision: FTR-1 fixed — `parseRequirementsStrict` 改为在共享语法的围栏之外找边界（`requirementHeadings`），块内容保留原文（围栏在内），`renderStore` 的头部截取同样跳过围栏里的标题；仓库内全部规格存储与 delta 切块与旧正则逐字节相同（TX-02 新增语料断言），只有 6 份历史评审文档不同（它们在围栏里引用需求标题，本就不是存储）；证据：TX-03 新增 merge→render→重跑用例，把解析换回旧正则时 TX-03 变红
- decision: FTR-2 fixed — 每个长度 L 预先列出不短于 L 的裸 ~ 行，开头用二分查找找闭合，未闭合不再回扫；证据：TX-02 三种病态输入（2 万行未闭合、长开头配短裸行、多种长度）各在 1 秒内（实测约 20 ms）
- decision: advisory — 契约写明本语法之外的两个读者：状态文件读法 flow.js（已认 ~~~）与 golden-path 脚本的 Quickstart shell 块提取（只读一份已知 README）
- observed: 回归——全套 887/887，隐藏 /proc 亦 887/887；`check --self` 输出与 v6-dev 仍逐字节相同；MIGRATING 补一条：存储里围栏中的需求标题不再切块（两种标记皆然），仓库内无此情形
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: 3 issues open`：FTR-1 ADDRESSED；FTR-2 NOT ADDRESSED（每轮仍重做 ``` 搜索；每种开头长度都过滤一遍全部闭合行，构造输入 O(n³)）；新 FTR-3（边界改写后不再跟随旧正则对跨行标题的消费，`### Requirement:\n### Requirement: B` 被切成两块）；新 FTR-4（存储没有活需求、只有围栏示例时，加入第一个需求会丢掉原文）；advisory 已了结
- decision: FTR-2 fixed — 反引号的下一个位置只在越过时才重搜（耗尽即不再搜）；闭合查找改为在裸 ~ 行长度上建最大值线段树，二分定位起点后一次下探；证据：TX-02 加大到 20 万行未闭合、10 万对长短交替、600 种长度压在 36 万裸行上、未闭合反引号后 10 万开头，各 < 2 秒（实测 55–142 ms）；把缓存改回每轮重搜时 1 万/2 万/4 万行耗时 9/22/68 ms 呈超线性，缓存版 7/10/11 ms
- decision: FTR-3 fixed — `requirementHeadings` 按旧正则自身的走法：从当前位置找围栏外的下一个完整标题，块结束于该标题匹配末尾之后第一个围栏外的行首 `### Requirement:`，从那里继续；跨行标题、无名标题行、相邻块、CRLF 与旧正则逐字节相同（TX-02 新增），仓库全部存储与 delta 仍相同
- decision: FTR-4 fixed — `renderStore` 在没有活需求时把整份原文当作前言保留（末尾规整为空一行），空存储仍只渲染新块；这对「只有散文的存储」也是对历史行为（丢弃）的修正，已写入 MIGRATING、CHANGELOG 与契约；证据：TX-03 两种存储加入首个需求后原文保留、重跑无变化；去掉保留逻辑时 TX-03 变红
- observed: Review 第 3 轮（`review/code-review-v3.md`）= `VERDICT: 1 issues open`：FTR-2、FTR-3、FTR-4 ADDRESSED；新 FTR-5——保留前言后，前言里未闭合的 ~~~ 会与新加需求块里的围栏配对、藏起其标题，archive 却报成功（单文件形式直接写盘；重跑会重复添加）
- decision: FTR-5 fixed — 不再逐个补拼接边角（与 FTR-4 同属 render 组合一类，循环征兆），改加一道通用核查：`renderReadback` 把渲染结果按同一语法读回，必须恰为合并后的各块（按序、逐字节），否则该模块拒绝并点名第一个被吞的需求——高层形式记为 projection 冲突（archive 随之拒绝、不写），单文件形式在结构预检前退出 1 `FAILED PREFLIGHT — nothing written`；这道核查同样覆盖反引号围栏等任何组合问题；仓库 15 个存储全部读回为自身（TX-03 断言）；证据：TX-03 新增纯函数、单文件 CLI（存储逐字节不变）与高层 projection 三处拒绝用例；把核查改为恒通过时 TX-03 变红；全套 887/887，隐藏 /proc 亦 887/887，`check --self` 输出仍与 v6-dev 相同
- observed: Review 第 4 轮（`review/code-review-v4.md`）= `VERDICT: no spec-vs-code gaps`；FTR-5 ADDRESSED；评审方另以内存用例核过 ADDED/MODIFIED/REMOVED/RENAMED（LF 与 CRLF）、重跑、空/纯散文/封闭示例前言均能读回；无新发现、无 advisory
## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev，推两远端

gates:
  - 2026-10-03T00:59 note: change scaffolded by `apriori new`
  - 2026-10-03T01:16 note: Ground（承接 FU-1，pending）→ Build（887/887）；FU-1 依 TX-01..03 与 GT-20 的证据关闭（从 ## Open 删去）；review-ready 后开 Review 第 1 轮
  - 2026-10-03T01:28 note: Review 第 1 轮 2 issues open（FTR-1、FTR-2）均已修复，advisory 已在契约中写明；887/887；resume 同一评审会话开第 2 轮
  - 2026-10-03T01:51 note: review-progress code-review round 3 — issues: FTR-1, FTR-2, FTR-3, FTR-4; actions: FTR-1 addressed in round 2 (no further change), FTR-2 fixed — cached backtick search and a max segment tree for closers, FTR-3 fixed — the boundary walk follows the historical regex's own consumption, FTR-4 fixed — a store without a live requirement keeps its text; evidence: lib/text.js, lib/archive-merge.js, test/fence-tilde-readers.test.js, MIGRATING.md; approach: kept — one shared fence grammar; each finding was an implementation gap in it, closed with a regression and a corpus or scaling check
  - 2026-10-03T02:00 note: review-progress code-review round 4 — issues: FTR-2, FTR-3, FTR-4, FTR-5; actions: FTR-2/FTR-3/FTR-4 addressed in round 3 (no further change), FTR-5 fixed — every rendered store is read back against its merged blocks and the module refused in both archive forms when a part swallows another; evidence: lib/archive-merge.js, test/fence-tilde-readers.test.js, MIGRATING.md; approach: kept for the grammar, changed for composition — instead of patching each composition edge, one general readback check refuses any rendered store that does not read back as its blocks
  - 2026-10-03T02:03 note: Review 第 4 轮接受（no spec-vs-code gaps）；进入 gate / archive
  - 2026-10-03T02:03 note: review-progress code-review round 4 — issues: FTR-2, FTR-3, FTR-4, FTR-5; actions: FTR-2/FTR-3/FTR-4 addressed in round 3 (no further change), FTR-5 fixed — every rendered store is read back against its merged blocks and the module refused in both archive forms when a part swallows another; evidence: lib/archive-merge.js, test/fence-tilde-readers.test.js, MIGRATING.md; approach: changed — for composition, one general readback check replaced patching each edge; the shared fence grammar itself is kept (this entry restates the previous round-4 record, whose approach field was malformed)
