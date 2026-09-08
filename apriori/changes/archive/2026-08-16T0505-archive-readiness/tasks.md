# tasks — archive-readiness

> 按 `design.md` §D6 的八个可回滚批次推进，**每批跑完全量回归再进下一批**。
> 每条对应 `requirement/req-final.md` §四 的一个验收 ID；归属见 `design.md` §D6c 与 §D7。
> **本文件按 STEP2·r1 的 SPEC-4 / SPEC-6 / SPEC-7 重排过**：
> 判据从「期望 `--write` 成功」改为「会越过 readiness 插入点」；
> archive 端到端场景从 B3 移到 B4；新增 B0 的状态 A golden 采集。

## B0 — 基线、golden 与清点（**必须最先做完**）

- [x] B0-1 跑一次全量测试，记录**全绿基线**（当前 420 tests）
- [x] B0-2 **状态 A golden 采集（SPEC-4，必须在动 `gate.js` 之前）**：
      **采集入口只能是 `runGate(...).checks` 的 C2/C3/C4 三项**——状态 A 的 `gate.js`
      只导出 `{runGate, resolveChange, classifyStatus, cli}`，三个 checker 是私有的（A-5）；
      诊断文本里的语料绝对路径须替换为固定占位符 `<CORPUS>`，比对时对实际输出做同样替换。
      用覆盖 C2/C3/C4 正常与异常路径（含抛错路径）的固定语料跑状态 A 的 `runGate()` 与三个 checker，
      把返回对象与每条 detail 存成 `test/fixtures/gate-state-a.golden.json`
      （抛错路径只存 class/code/message，**不存 stack**）。
      **B2 之后不得重新生成**——重新生成等于取消这条保证
- [x] B0-3 **迁移面清点（SPEC-7 的新判据）**：范围为 **CLI 调用 + 直接 `archiveChange()` API 调用两类**，
      判据是「状态 A 下这个调用会执行到 readiness 的新插入点」，**不按 write/success 过滤**。
      已知必须纳入而旧判据抓不到的：dry-run 成功用例（AM-13 类）、
      `test/archive-change.test.js` 4 处与 `test/modified-integrity.test.js` 2 处的编程式调用、
      readiness 之后才注入失败的用例（mid-commit / move failure）、integrity-report 成功路径。
      **逐文件人工走完，含跨行拼装的调用；不得以 grep 表收尾**
- [x] B0-4 确认 6 个单文件调用点中落在 changes root 内的确为 **0** 个

## B1 — fixture 迁移（**只补 fixture，断言一字不改**）

- [x] B1-1 给 B0-3 清单里**每一个**会越过插入点的 bundle 补：
      `current-step: STEP6` 的合法 flow-state、全勾 `tasks.md`、全终态 `review/issues.md`
- [x] B1-2 补完后跑全量测试，确认**仍全绿**（此时尚无就绪度实现，等于验证 fixture 没写坏）
- [x] B1-3 若有任何断言被迫修改 → **停下**，说明本 change 改变了不该改变的行为

## B2 — `lib/readiness.js` 基础层

- [x] B2-1 从 `gate.js` 原样搬入 `STEP_ENUM`/`TIER_ENUM`/`STATUS_RE`/`classifyStatus`/
      `gatesEntries`/`waiveEvidence`/`checkFlowState`/`checkTasks`/`checkLedger`/`reviewDirDefect`
- [x] B2-2 **抽出纯函数 `ledgerFindings(rows, flowText, stage)`（SPEC-1）**，
      `checkLedger` = `ledgerFindings` + 状态 A 的格式化，**detail 字节不变**
- [x] B2-3 `reviewDirDefect` 的 `containsReal` 改取 `require('./resolve').containsReal`
- [x] B2-4 `gate.js` 改为从 `readiness` 取（含 `runGate` 的四个调用点与 `TIER_ENUM.includes`），
      **继续再导出** `classifyStatus`
- [x] B2-5 **RY-01** 基础层三条判据 vs **B0-2 的 golden**（**不是** refactor 后的 gate）逐条相同
- [x] B2-6 **RY-02** `runGate()` 返回对象与每条 detail vs **golden** 字节相同；
      抛错分支只比 class/code/message，**显式排除** stack 的文件名与行号
- [x] B2-6b 实现 **`stepOverlay(state, name)`**（design §D1.5 的具名生产函数）——
      RY-03/RY-04 必须测这个函数，**不得**在测试里重述 `current-step === 'STEP6'`（SPEC-7）
- [x] B2-7 **RY-03** `stepOverlay`：C3 失败时返回 `{class:'legality', detail:<C3 原始 detail>}`，不报 STEP6 措辞
- [x] B2-8 **RY-04** `archive 就绪 ⇒ gate C3 pass`，反之不成立（逐个合法非-STEP6 取值）
- [x] B2-9 **RY-05** 静态断言：`archive-merge.js` 无 `require('./gate')`；`gate.js` 不重实现三条判据；
      `gate.js` 仍导出 `classifyStatus`
- [x] B2-10 **RY-06** 基础层不含任何 `fileReadDefect` 调用
- [x] B2-11 **RY-07** `readiness.js` 不 require `archive-merge.js`；`reviewDirDefect` 换 `containsReal` 后
      五例差分（正常目录 / symlink / 非目录 / 逃逸 / 不存在）与 golden 一致
- [x] B2-12 全量回归

> B2-7 / B2-8 在 B2 阶段以**基础层 + readiness 判据函数**为对象验证（不需要 archive 接线）。

## B3 — archive 层三个新函数（**只放 helper 级验收**，SPEC-7）

- [x] B3-1 实现 `containDefect(root, target)` → `null | enoent | escape | io-error`
      （各 realpath 一次，按 `e.code` 分类；**`enoent` 是公开返回类型的一员**，SPEC-3）
- [x] B3-2 实现 `artifactDefect(bundleDir, p)`：单趟 `lstat`、`isFile()`、
      祖先探测**不吞非-ENOENT**、`containDefect` 的 `enoent` → 走祖先探测 → `missing`
- [x] B3-3 实现 `reviewRootDefect(bundleDir)`：`isDirectory()`/`not-dir`、
      `lstat` 的 ENOENT → `null`、`containDefect` 的 `enoent` → **也返回 `null`**
- [x] B3-4 **RY-08** `artifactDefect` vs `resolve.fileReadDefect` 的**六例**差分
- [x] B3-5 **RY-09** `reviewRootDefect` vs `gate.reviewDirDefect` 的**五例**差分
      （含 **`null`（目录不存在）** 必测项）
- [x] B3-6 **RY-10** 静态断言：三个新函数体内不出现 `fileReadDefect`、基础层 `reviewDirDefect`、`containsReal`
- [x] B3-7 纯函数级错误注入：五个注入点各一例的**函数返回值**断言（端到端行为留给 B4）
- [x] B3-8 全量回归

## B4 — `readinessOf` 与 `archiveChange` 接入（**archive 端到端场景在此首次变绿**）

- [x] B4-1 实现 `readinessOf({bundleDir, name, force})`——**自己拥有 guard → read → parse**，
      `state`/`tier`/`flowText` 一律从安全读取的 flow-state 派生，**签名不接收它们**（SPEC-1）
- [x] B4-2 R1 有序（**R1 的 legality/step 判定必须调 `stepOverlay`**）、R2/R3 一次报全；
      ledger 逐条 forceable 由 **`ledgerFindings` 的 `kind`** 映射；
      **RY-11** 静态断言 `readinessOf` 不重述 STEP6 比较
- [x] B4-3 接进 `archiveChange`：既有 preflight 全部守卫之后、`pushIntegritySection` 之前
- [x] B4-4 **AM-74** B7 表逐格（三个 artifact × 五个缺陷类 × 两个 tier 侧）
- [x] B4-5 **AM-75** `ABANDONED` bundle 的 `flow-state.md` 是指向 bundle 外 `STEP6` 文件的 symlink
      → refuse，带 `--force` 仍 refuse
- [x] B4-6 **AM-76** `review/` 是指向 bundle 内另一目录的 symlink 而 `issues.md` 正常 → refuse
- [x] B4-7 **AM-77** 守卫通过后 `readFileSync` 抛错 → refuse，诊断含原始 `e.code`，不可 force
- [x] B4-8 **AM-107** 五个注入点各一例（artifact `lstat` / 祖先探测 / `review/` 根 `lstat` /
      artifact realpath / `review/` 根 realpath），每例注入非 `ENOENT`，**每例都带 trivial 层控制**
- [x] B4-9 **AM-108** 真 `ENOENT` 仍走 tier 敏感分支
- [x] B4-10 **AM-115** realpath 阶段的 `ENOENT`：artifact 侧 → 祖先探测 → `missing`；
      review 根侧 → 报告为空（SPEC-3）
- [x] B4-11 **AM-112** 回归护栏：完全正常的 bundle 必须就绪并归档成功
- [x] B4-12 **AM-113** `review/` 不存在 → 按 tier 判
- [x] B4-13 **AM-78** 三类不就绪各自 `RESULT: NOT READY — nothing written`，exit 1，零写入零移动
- [x] B4-14 **AM-79** R1 有序（只报第一个）；R1 通过则 R2/R3 一次报全
- [x] B4-15 **AM-80** `ABANDONED` 与 `DONE` 各有专门措辞
      （`DONE` 文案 `in-flight bundle declares DONE; expected STEP6`），不可 force
- [x] B4-16 **AM-81** C3 有其他错误的 `ABANDONED` bundle → 报 C3 原始 detail
- [x] B4-17 **AM-82** trivial 缺 tasks/台账 = n/a；medium/large 缺失即不就绪且不可 force
- [x] B4-18 **AM-83** 既有 preflight 的**每一个** guard 失败时诊断与退出码一字不变，
      且就绪度**未被求值**（计数 seam 断言调用次数为 0）
- [x] B4-19 **AM-84** 未就绪时 integrity report 不打印；就绪时打印且位置不变
- [x] B4-20 **AM-85** 未就绪的 dry-run 不打印 `RESULT: MERGED (dry-run…)`，exit 1，零写入
- [x] B4-21 **AM-114** TOCTOU hook：`readinessOf` 之后、首次写 store 之前触发；
      在 hook 内改动 bundle，断言 archive **不重读、不检测**
- [x] B4-22 全量回归

## B5 — `--force`

- [x] B5-1 实现 `gatesEntriesRaw(flowText) → [{firstLine, joined, payload}]`（D2 第 1/2 步）
- [x] B5-2 实现 `forceGrants(flowText) → Map<class, {granted, firstLine, payload}>`——
      payload **完全匹配**，同类以最后一条为准；**同一次扫描同时决定授权与保存获胜记录**，
      调用方**不得**再扫一遍推导（SPEC-2 残余 2）
- [x] B5-3 **AM-86** 可 force 类逐项（未勾任务 / `open` / `fixed` / 带理由的 `rejected`）
- [x] B5-4 **AM-87** 不可 force 类逐项（R1 五种 / 结构类**六种** / medium-large artifact 缺失 /
      非法 status / 缺理由 / `waived` 缺人类记录）
- [x] B5-5 **AM-88** 无记录 → `--force` 无效果且打印**可复制的模板**
      （断言含模板骨架，**不**断言含任何人类理由文字）；
      理由不含 `[\p{L}\p{N}]` → 同样无效果（`step2-amendment`）；
      **必测控制**：纯中文理由 `— 还差两项文档` **必须授权**（这是本仓的真实写法）
- [x] B5-6 **AM-89** 按类绑定：只有 `tasks` 时 R3 仍 refuse；只有 `ledger` 时反之；两条时皆过
- [x] B5-7 **AM-110** D2 的**五例验算表**逐条：canonical `gate⑤ (owner):` 前缀授权、
      `note:` 前缀授权、reason 里的 `ledger` 不授权、`do not archive-force tasks` 不授权、
      无 reason 不授权
- [x] B5-8 **AM-111** append-only 撤销：grant → revoke → grant（三条**都带 reason**）；
      无 grant 的 revoke 不授权；**无 reason 的 revoke 被忽略**
- [x] B5-9 **AM-90** dry-run 与 `--write` 同样改变结论；dry-run 零磁盘副作用
- [x] B5-10 **AM-109** 输出逐条 `forced: …` + `forceGrants` 返回的 `firstLine`
      （控制：跨行记录时打印的是 `firstLine` 字面文本，不是 `joined`；
      且该 `firstLine` 直接来自 `forceGrants` 的返回值，测试断言调用方未二次扫描）
- [x] B5-11 全量回归

## B6 — 单文件形式收窄

- [x] B6-1 实现 `deltaScope(cwd, deltaArg)`（`path.resolve` / 段边界 / 双量度 / realpath 失败处置）
- [x] B6-2 三道闸接进 `cli()`：`--changes-dir` → exit 2；`--force` → exit 2；作用域命中 → 拒绝
- [x] B6-3 `USAGE` 两行按 D3.3 改
- [x] B6-4 **AM-91** 单文件 + `--force` → exit 2 + usage
- [x] B6-5 **AM-92** 单文件 + `--changes-dir` → exit 2 + usage，零写入零移动
- [x] B6-6 **AM-93** 词法命中三例
- [x] B6-7 **AM-94** 段边界：`apriori/changes-other/...` **不**拒绝
- [x] B6-8 **AM-95** realpath 命中：bundle 外 symlink 指向 changes root 内 delta
- [x] B6-9 **AM-96** 词法命中而 root 自身是 symlink → 仍拒绝
- [x] B6-10 **AM-97** root 不存在 / delta 悬空 / realpath 权限失败 → 该量度不命中；
      落入既有行为时**退出码与诊断与状态 A 一致**
- [x] B6-11 **AM-98** changes root 之外的单文件手术（含 `--write` 成功路径）**逐字节不变**
- [x] B6-12 全量回归

## B7 — 文档、living spec 与 KB（**一次性迁移验收，无 living scenario**，见 §D7）

- [x] B7-1 **AM-99** `archive-merge` 的 `## MODIFIED` 整块去除 AM-12：
      ① 合并后该块含 AM-01..AM-11 共 **11** 个场景且内容逐字节不变；
      ② 完整性报告恰好打印
      `    ! dropped: AM-12 the store commit and the dir move are one transaction (single-file form)`
      且**无其他 dropped**；③ AM-12 的绑定测试相应处置；
      ④ 同一份 delta 里 `AM-19` 所在块的互斥规则更新（**普通子项，不另编 ID**）。**不得改 formatter**
- [x] B7-2 **AM-100** `apriori/specs/cli/spec.md` 的 usage 场景 `## MODIFIED`，
      范围写作 `AM-01..AM-98, AM-107..AM-115`（**不得引用不存在的 AM-99..AM-106**）
- [x] B7-3 **AM-101** `docs/concepts.md` 与 `docs/concepts_cn.md` 的 STEP6 教程命令迁移到高层形式；
      可 grep 断言：两份文件不再出现 `archive --store`
- [x] B7-4 **AM-102** `docs/cli.md` / `docs/cli_cn.md` 的 archive 段落 + USAGE 两行
- [x] B7-5 **AM-103** `RUNBOOK.md` / `RUNBOOK_cn.md` 的 archive 算法段落
- [x] B7-6 **AM-104** `CHANGELOG.md` 显著位置声明**三项破坏性变更**
- [x] B7-7 **AM-105** `truth/archive-merge.md`、`truth/gate.md` 更新；**新增** `truth/readiness.md`
- [x] B7-8 **AM-106** `SECURITY.md:10` 末句同步新的拒绝边界 + 可 grep 断言
- [x] B7-9 全量回归 + `apriori check --self` + `apriori verify` GREEN

## 收尾

- [x] X-1 三份 spec delta 重新盖戳（`apriori stamp`），dry-run 归档核对 MODIFIED 完整性报告
- [x] X-2 台账全部终态；本 change 自己的 flow-state 置 `STEP6`、tasks 全勾
- [x] X-3 `apriori gate --change archive-readiness` 全绿
      （**注意：本 change 的就绪度会检查它自己**——这是最好的自举验收）
