# tasks — archive-preflight

STEP5 按本表顺序执行；每完成一项立刻打 `[x]`。测试先行：先写失败测试并给出失败运行，再实现。

**实现按 design §D6b 的六个可回滚批次推进**（STEP2·r2 advisory A-3——评审方明确不建议拆成多个正式
change，因为各部分共同维护同一条 archive-safety 不变量，硬拆会产生无法安全落地的中间状态）：
① fixture migration（M）→ ② readiness BASE 抽取且 gate 不变（I1/I2 + T1..T7）→ ③ resolver predicates
（I3 + T8..T10）→ ④ archive overlay 与 N 组（I4..I6 + T11..T21）→ ⑤ 单文件归属与 moveBundle
（I7 + T22..T25）→ ⑥ force / 输出 / 文档（I8..I10 + T26..T30 + D 组）。
**每批结束都要跑一次全量回归**，绿了才进下一批。

## M — 迁移清点（**必须最先做完**，req-final §七 / gap-report §A6）

- [ ] M0 跑一次全量测试并记录**全绿基线**
- [ ] M1 逐文件走完 gap-report §A6 的 **11 个** archive 相关测试文件，列出**每一个**期望 archive 成功（exit 0 / MERGED / 成功移动）的调用点，产出清单落进本文件（**不得以「大概就这两个」收尾**）
- [ ] M2 按清单给每个 fixture 补**就绪 bundle**：`current-step: STEP6` 的合法 flow-state、全勾 tasks、全终态 ledger。**只补 fixture，断言一字不改**
- [ ] M3 补完后再跑全量测试，确认仍全绿（此时尚未加就绪度实现，等于验证 fixture 没写坏）

## T — 测试先行

### 共享模块与分层
- [ ] T1 RY-01 基础层与 gate 的 C2/C3/archived-C4 差分断言（同一批 bundle，逐项一致）
- [ ] T2 RY-02（不抛错分支）gate 的返回对象与 detail 字节不变
- [ ] T3 RY-02（抛错分支）只比 error class/code/message，**显式排除** stack 文件名行号
- [ ] T4 RY-03 overlay 先守卫后读取：构造 symlink / 错类型，断言**未跟随**且诊断为结构性、不可 force
- [ ] T4b RY-03 第二支（SPEC-3）：`review/` 本身是**指向 bundle 内另一目录**的 symlink、而 `issues.md` 完全正常 → archive 必须 refuse（只守叶子会放行，而 gate C4 会阻断，保证就破了）
- [ ] T5 RY-04 每一个合法非 STEP6 取值 → archive block 而 gate C3 pass；并断言「archive pass ⇒ gate C3 pass」
- [ ] T6 RY-05 静态断言：`gate.js` 不出现 `checkArchive*`/`readArchive*`；`archive-merge.js` 不直调基础层三 checker；`readiness.js` 不重实现 resolver 规则
- [ ] T7 gate 继续再导出 `classifyStatus`（GT-15 语料测试在用）

### resolve
- [ ] T8 RS-06 `archiveNamespaceDefect` 逐类缺陷：两个 trust root / active 条目（symlink、非目录）/ 归档候选（合法 stamp 的 symlink 排序早晚各一、日期非法目录）
- [ ] T9 RS-07 **合法 active + 坏归档候选** → `resolveChange` 仍解析到 active（active-first 短路不变）
- [ ] T10 RS-08 resolver 既有答案全不变（in-flight / archived / 找不到 / 非法名 / 逃逸）

### archive 就绪度
- [ ] T11 AM-49 三类失败各自 refuse（含 `DONE` 的措辞断言）
- [ ] T12 AM-50 R1 先判：flow-state 失败只报 R1；R1 通过则 R2+R3 一次报全
- [ ] T13 AM-51 trivial tier 的 tasks/ledger 缺失 = n/a；medium/large 缺失即 refuse
- [ ] T14 AM-52 结构性不安全逐类（symlink / 错类型 / 坏祖先 / 逃逸 / guard 后读异常）→ refuse 且**不可 force**
- [ ] T15 AM-53 既有 preflight 失败时诊断/退出码不变，且就绪度**不被求值**
- [ ] T16 AM-48 unready 的 dry-run 不打印 `RESULT: MERGED (dry-run…)`，exit 1，零写入

### 命名空间 N0..N3
- [ ] T17 AM-54 / AM-68 时钟 seam 注入「检查后、移动前」的前进/回拨 → 实际创建的目录名 = 检查所用名。**高层 `:753` 与单文件 `:860` 两条 move 路径各一**（SPEC-1）
- [ ] T18 AM-55 同名归档目录排序 `>` / `=` / 回拨反转三种 → refuse，不可 force
- [ ] T19 AM-56 N2 三类对象逐情形 → refuse，判据经**同一个** `archiveNamespaceDefect`
- [ ] T20 AM-57 不带 `--changes-dir` 的 `--write` 与 dry-run **不求值** N 组；带 `--changes-dir` 的 dry-run **求值**
- [ ] T21 AM-58 自定义 root 打印「无 post-archive gate 保证」提示

### 归属算法
- [ ] T22 AM-59 单文件 + 不带 `--changes-dir` + delta 在 ABANDONED bundle 内 → refuse，零写入
- [ ] T22b AM-66（SPEC-1）**真外科手术 delta + `--changes-dir apriori/changes`，而 `X` 未就绪/ABANDONED** → 整个调用 refuse，零写入零移动
- [ ] T22c AM-67（SPEC-1）delta 归属默认 root 的 `X`，`--changes-dir` 指向另一 root 的同名 `X` → refuse（不得检查一个、搬另一个）
- [ ] T23 AM-60 外部 symlink → active bundle delta（判为该 bundle）；词法在内 realpath 出界（refuse）
- [ ] T24 AM-61 身份不一致 → refuse；delta 在**已归档** bundle 内 → refuse（ABANDONED 与非 ABANDONED 各一）
- [ ] T24f AM-70 第二支（SPEC-2/r4）**changes root 自身是 symlink**，调用方用词法拼写指定 delta，而 leaf 的 realpath 出界 → 必须被阶梯第 1 条抓住**拒绝**；若去重时丢了词法拼写，它会「谁都不属于」而被当外科手术输入放行（fail-open）
- [ ] T24d AM-70（SPEC-2/r3）**显式 root 与默认 root 实为同一目录**（相对写法 / 结尾分隔符 / 经 symlink 等价）→ 塌缩为一个候选 root，不得自判歧义
- [ ] T24e（SPEC-2/r3）**阶梯优先级**：构造「词法属 active `X` 且 `X` 就绪，但 realpath 出界」→ 必须命中规则 1 **拒绝**，不得因「恰好一个 active bundleDir」而放行
- [ ] T24c AM-69（SPEC-2/r2）**嵌套 root 的歧义集合**：显式 `--changes-dir` 落在 `<default-root>/A/specs/nested`，delta 同时归属 `A` 与 `X` → **拒绝**（判一个消费另一个会给未检查的 `A` 开后门）
- [ ] T24b AM-61（SPEC-2）身份 = `{root, stage, name, bundleDir}` 的三个反例：① 外部 symlink → **archived** bundle delta；② 词法属 active `X`、realpath 经 symlink 落到 **archived** 同名 bundle；③ 两侧都叫 `X` 但 root / bundleDir 不同 —— **全部 refuse**
- [ ] T25 真外科手术输入（词法与 realpath 都不属于任何 bundle）行为不变

### --force
- [ ] T26 AM-62 证据缺失三态（无记录 / 有 waiver token 缺类 token / 记录在别的 bundle）→ 仍 refuse，诊断说明缺哪一条
- [ ] T27 AM-63 类 token 边界：`tasks-later` / `myledger` 不命中；裸 token 任意大小写命中
- [ ] T28 AM-64 放行输出：`WAIVED (--force):` 含类与证据首行；`NOTE:` **按实际豁免类**点名 C2 / C4 / 两者
- [ ] T29 AM-65 每一个不可 force 类逐条（ABANDONED 单列）
- [ ] T30 反向守卫：force 放行 tasks 未勾后跑 gate → C2 **BLOCK**

### 充分性命题
- [ ] T31 未 force + 规范 root + 就绪度通过并成功归档 → 紧接着 gate 的 C2/C3/C4 **均不 BLOCK**（trivial 与 medium/large 各一）
- [ ] T32 并发 seam：就绪度通过后、首次写入前注入 bundle 修改 → 归档照常，实现**不声称**检测；**move 与 no-move 两条路径各一**
- [ ] T33 并发 seam：N 组检查后替换/改名 `<changes-dir>/archive` trust root → 同上
- [ ] T34 **每一个** seam 使用点 `try/finally` 复位（change 1 的 T16b 教训）
- [ ] T35 跑全量测试，记录失败清单（应大面积红）

## I — 实现

- [ ] I1 新建 `lib/readiness.js`：从 `gate.js` **搬迁**基础层七个符号（行为一字不改），只 require `./status` + `./resolve`
- [ ] I2 `lib/gate.js`：改为从 `./readiness` 引入基础层；**继续再导出** `classifyStatus`；其余一字不动
- [ ] I3 `lib/resolve.js`：新增导出 `archiveNamespaceDefect(changesDir, name)`；`resolveChange` 的 active-first 短路**一字不改**
- [ ] I4 `lib/readiness.js` 叠加层：`checkArchiveFlowState` / `readArchiveFlowState` / `checkArchiveTasks` / `checkArchiveLedger`（**先守卫后读取**）+ 聚合入口 `readiness()`
- [ ] I5 `lib/archive-merge.js`：preflight 末尾挂就绪度（既有 guards 优先，同时失败时不求值就绪度）
- [ ] I6 `lib/archive-merge.js`：N0 时间戳捕获一次并传给 phase 4；N1/N2 经 `archiveNamespaceDefect`；N3 只对会移动的调用求值
- [ ] I7 `lib/archive-merge.js`：单文件形式的归属**集合算法**（两种 measure × 全部候选 root → 身份集合 `{root,stage,name,bundleDir}`；候选 root 先解析绝对实路径再去重；处置是**有序互斥阶梯**，见 design §D3.4b）；以及独立于 delta 的 `moveBundle` 判定
- [ ] I8 `lib/archive-merge.js`：`--force` flag + 豁免矩阵 + gates 证据精确 token + `WAIVED:` / `NOTE:` 输出
- [ ] I9 dry-run 路径：unready 时不打印 MERGED
- [ ] I10 时钟 seam 与并发 seam（模块级，默认 null，`try/finally` 复位）
- [ ] I11 全量测试到绿；`check --self` PASS；`verify --change archive-preflight` GREEN

## D — 文档与 KB

- [ ] D1 `docs/cli.md` + `docs/cli_cn.md` 的 archive 小节：新增就绪度、`--force`、dry-run 语义、自定义 root 无保证
- [ ] D2 `CHANGELOG.md`：归档准入收紧（行为变更）、dry-run 语义变化、`--force` 的证据要求
- [ ] D3 `--force` 的可发现性（advisory A-3）：两处 archive usage 字符串与 `--help` 输出都含 `[--force]`
- [ ] D4 逐条核对 AC-AP-01..20 与 13b..13j / 16b..16f / 17b..17i 全部有证据，对照表进 flow-state。**AC-AP-13f 按 SPEC-4 勘误理解**为「词法与 realpath **均**不属于正式 bundle」，不得按旧字面写出与 AC-AP-13i 相反的测试

## S — STEP5 出口

- [ ] S1 `apriori verify --change archive-preflight` GREEN
- [ ] S2 P8 异构一致性评审（R2，codex），verdict 落盘 + raw 存证
- [ ] S3 ledger 全行终态

（STEP6 的 KB 写回在 P9 阶段做。**本 change 自举**：它自己归档时要过自己这一关。）
