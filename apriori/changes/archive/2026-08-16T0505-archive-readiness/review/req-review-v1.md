# req-review-v1 — archive-readiness requirement review（Round 1）

评审基于 requirement、前身全部评审结论、RUNBOOK、四份 TRUTH-DOC、实际源码及当前分支历史；未修改任何文件。

## 〇、对收窄主张的优先判定

### 断言 1：收窄不违反 advisory A-3

**成立。**

A-3 反对的是把共同维护 archive-safety 的路径拆成可独立落地、但中间会留下绕过口的多个 change。本方案若完整做到“正式 bundle 的单文件入口一律拒绝”，该入口不存在宽松中间态，因此不需要复现前身的 attribution 集合算法。

但是当前草案同时丢掉了前身已经解决的 **G1 安全读取与 force 边界**；这些不属于被拒绝的 G2/G3，必须恢复，见 REQ-1、REQ-2。

### 断言 2：G3 可以整体放弃而不损害本 change 的目的

**成立。**

G3 判断的是归档后 resolver/gate 会选中哪个 bundle；G1 判断的是 archive 写入前眼前这个 bundle 是否就绪。只要需求不再声称 post-archive gate 的充分性，F-2、F-4 不必在本 change 内修复。

因此不要求重新完整建模 G3，但这些 resolver 风险必须继续作为独立 finding 保留，不能把本 change 描述为保证整个 STEP6/gate④ 流程正确。

### 断言 3：拒绝 changes-root 内单文件形式的成本可接受

**按当前证据不成立。**

“全仓 19 处且全部在 test”只统计了测试。排除前身目录后，全仓仍有 38 个 `--delta` 命中，其中 19 个在测试、7 个在 active docs、7 个在 living specs。尤其：

- `docs/concepts.md` 与 `docs/concepts_cn.md` 的 STEP6 教程正使用将被 B2 拒绝的命令；
- `apriori/specs/archive-merge/spec.md` 的 AM-12、AM-19 等仍承诺该单文件路径；
- `SECURITY.md` 仍称显式 `--store/--delta` 路径 “used as given”。

所以拒绝策略本身仍然可行，也不要求恢复 G2 的完整 attribution 模型；但其兼容成本被明显低估，必须补齐迁移面并由 owner 接受该破坏性变更，见 REQ-6。

## 1. 目标状态 B 是否清晰、无歧义

**结论：未通过。**

### REQ-1 — G1 的结构安全读取语义被意外删掉

- **描述**：B1 要求 archive 与 gate 共享 C2/C3/C4，但 RY-02 又要求 gate 行为不变。State A 的 C2/C4 使用裸 `existsSync`/`readFileSync`；只有 C4 外层另有 `reviewDirDefect`。当前需求没有规定 flow-state、tasks、ledger 的 symlink、非文件、坏祖先、realpath escape、权限错误及检查后读取竞态如何处理。
  
  若 archive 直接调用共享基础 checker，它可能跟随 bundle 外的“已完成”文件，或在读取异常时直接抛错。一个实际 ABANDONED bundle可借外部 STEP6 flow-state、全勾 tasks 或终态 ledger 通过。前身的 archive-only `fileReadDefect` wrappers 和 review-root-first 顺序已经解决过这一问题；它们属于 G1，不属于被砍掉的 G2/G3。
- **风险**：high。ABANDONED/未就绪 bundle 仍存在可机械构造的写入绕过。
- **建议修复**：恢复两层结构：
  - 基础 checker 保持 gate 的 state-A 行为；
  - archive wrapper 在任何基础读取前运行 `fileReadDefect`；
  - ledger wrapper 先运行 `reviewDirDefect`，再检查 ledger leaf；
  - 捕获 guard 后发生的读取竞态；
  - 所有结构/读取失败均不可 force。
  
  增加 artifact × defect kind × tier 的判定表和逐类 if/then AC。

### REQ-2 — `--force` 声称只解“进度”，实际却能解格式、证据和缺失错误

- **描述**：B3 称 `--force` “只解进度类”，但矩阵 3.1 将整个 R3 设为可 force，其中包含：
  - 非法 status；
  - `rejected`/`waived` 缺理由；
  - `waived` 缺人类 gates 证据；
  - medium/large ledger 整个缺失。
  
  这些不是进度问题，而是格式、证据或结构问题。需求也删除了前身已经收敛的“预先存在人类豁免记录”协议。RUNBOOK 明确规定 `waived` 只属于人类，并要求同 bundle 的 `gates:` 记录；当前布尔 flag 可由任意调用方直接越过 open/fixed ledger 或未勾 tasks。
  
  此外，“`--force` 只在 `--write` 下有意义”与紧接着的“dry-run 下同样改变结论”直接矛盾。
- **风险**：high。AI 可把坏掉或未经人类批准的流程证据当成可豁免进度，并据此完成不可逆写入。
- **建议修复**：
  - 恢复完整 force matrix：只有未勾 tasks、`open`、`fixed`、以及有理由但尚未 reviewer-concur 的 plain `rejected` 可 force；
  - 非法 status、缺理由、缺 waiver evidence、缺失或不安全 artifact、R1 失败一律不可 force；
  - 定义预存的人类 gates 证据语法、精确 token、多失败覆盖规则和输出格式；
  - 将措辞改为：“force 在 dry-run 与 write 中同样改变 readiness 结论；只有 write 会产生磁盘副作用。”

### REQ-3 — `--force` 在真正的单文件手术形式上没有唯一语义

- **描述**：AM-86 要求 USAGE 两行都出现 `--force`，意味着单文件形式接受该 flag；AM-84 又要求 changes root 外的单文件形式行为逐字节不变。State A 对该调用传 `--force` 会因 unknown flag 退出 2。新实现只能在以下互相冲突的行为中选择：
  - 接受并忽略 `--force`，从而违反 AM-84；
  - 拒绝它，从而使 USAGE 声明不真实；
  - 让它产生某种效果，但真正 surgery 没有 R2/R3 可越过。
- **风险**：medium。CLI parser、帮助文本与回归测试会得到不同且都能从需求中找到依据的实现。
- **建议修复**：二选一明确：
  - 推荐：`--force` 只出现在高层 usage，单文件形式传入即 exit 2；
  - 或明确单文件 surgery 接受无效果的 flag，并将其列为 AM-84 的唯一兼容性例外，规定输出和退出码。

### REQ-4 — readiness 相对完整既有 preflight 的插入点仍不唯一

- **描述**：B5 举出的既有 preflight 只有 CAS、hygiene、base mismatch 和 conflict；实际源码还包括：
  - `--write` 的预存 `.tmp-archive` guard；
  - archive destination containment guard；
  - guards 之后、dry-run/write 分支之前的 MODIFIED integrity report。
  
  B6 的“既有 preflight → readiness → merge”也与源码事实不符：`buildProjection()` 已在 preflight 内完成内存 merge。实现者可能在 temp/destination guards 前插入 readiness，导致这些既有失败不再保持原诊断；也无法判断未就绪时是否打印 integrity report。AM-78 的泛称不足以固定这些相对顺序。
- **风险**：medium。会改变已有失败优先级和输出，违反 B5 的 byte-preservation 承诺。
- **建议修复**：用源码级顺序明确：
  `discovery/buildProjection/CAS+hygiene+conflict → jobs/temp/destination guards → readiness → integrity report → dry-run或stage/commit/move`。
  
  明确“merge”是内存 projection 还是 store commit，并让 AM-78 分别覆盖所有既有 guard，断言 readiness seam 未被调用。

### REQ-5 — B2 的双路径量度仍不足以直接实现

- **描述**：“词法拼写”没有定义是否先 `path.resolve`、如何做路径段边界、怎样处理 `.`/`..`、前缀兄弟目录、symlinked canonical root、缺失或不可 realpath 的 root/delta。并且“任何读取之前拒绝”与计算 realpath 本身需要读取文件系统元数据在字面上冲突。
  
  不同实现可能把 `apriori/changes-other` 误判为内部、漏掉 `./apriori/changes/X`，或在 canonical root 不存在时破坏原本可工作的外部 surgery。
- **风险**：high。既可能 fail-open 重新产生正式 bundle delta 绕过，也可能错误拒绝合法 surgery。
- **建议修复**：定义完整算法：
  - lexical delta/root 均为相对 cwd 的 `path.resolve` 结果；
  - containment 使用路径段边界，不用字符串裸前缀；
  - lexical alias 即使 root 是 symlink 也保留；
  - realpath 仅用于第二量度；
  - 规定 root/delta 缺失、悬空和权限失败的 disposition；
  - 将“任何读取”改为“读取 store/delta 内容之前；为作用域判断所需的路径元数据读取除外”。
  
  AC 至少覆盖 `.`/`..`、prefix sibling、symlinked root、外部 symlink、缺失 root、缺失/悬空 delta。

### REQ-7 — `DONE` 诊断与 R1 的优先级矩阵互相冲突

- **描述**：
  - 高层 archive 正在读取的是 in-flight `<changes-dir>/<name>`。其中出现 `current-step: DONE` 只能证明位置与状态矛盾，不能断言“这个 change 已经归档过了”。前身已明确修正过这一点，本版重新引入了错误诊断。
  - 3.1 声称各行互斥，但“ABANDONED/DONE”可与缺 tier、缺 lineage 等 C3 错误同时出现。RY-03 要求先完成 C3，AM-76 却无条件要求 ABANDONED/DONE 专门措辞，两条无法同时满足。
- **风险**：medium。实现者无法唯一决定错误优先级，并可能向操作者报告错误的物理状态。
- **建议修复**：
  - 将专门诊断限定为“C3 其余部分已通过”；
  - 明确优先级为读取/结构失败 → C3 基础合法性 → STEP6 overlay；
  - 将 DONE 文案改成“in-flight bundle declares DONE; expected STEP6”，不要声称已经归档。

## 2. 边界、异常与回滚路径是否覆盖

**结论：未通过。**

正式缺口见 REQ-1、REQ-2、REQ-4、REQ-5、REQ-7。

已有 commit、mid-commit failure、move failure 与 rollback 边界由 state A 保留，本 change 没有新增回滚写入；单文件作用域拒绝也要求零写入零移动。同步本地读取没有独立 timeout 路径。

并发/TOCTOU 已被明确列入 out of scope，因此本轮不另计 formal issue；但见 advisory A-1。

## 3. 是否有隐含但未声明的状态变化或副作用

**结论：未通过。**

### REQ-6 — 单文件拒绝的用户可见迁移面严重漏报

- **描述**：拒绝策略会直接使当前双语 concepts 教程的 STEP6 命令失败，也会改变 living archive/CLI specs 与 SECURITY 文档中的现行承诺。当前 AM-86～AM-88 只要求更新 CLI docs、RUNBOOK 和两个 TRUTH-DOC；未要求更新：
  - `docs/concepts.md`；
  - `docs/concepts_cn.md`；
  - `SECURITY.md`；
  - `apriori/specs/archive-merge/spec.md` 中 AM-12/AM-19 等旧承诺；
  - 必要时的 `apriori/specs/cli/spec.md`；
  - §六已要求但验收项漏掉的 CHANGELOG。
  
  因而 section 零关于成本的事实基础错误，且实现后仓库会继续公开推荐一个必然被拒绝的命令。
- **风险**：high。发布后的主要教程路径损坏，living spec 与实现相冲突，破坏性变更也可能不进 CHANGELOG。
- **建议修复**：
  - 完整清点 active docs/specs，而不只清点 tests；
  - 把双语 concepts 示例迁到高层形式；
  - 同步 SECURITY、archive-merge living spec及必要的 CLI spec；
  - 给 CHANGELOG 添加明确 AC；
  - 在 owner 接受该兼容成本前，不得继续声称断言 3 已成立。

## 4. 每条验收标准是否可测试

**结论：未通过。**

- RY-01～RY-05 的共享基础层方向可测试，但 REQ-1 所述 archive-only 安全层没有 AC。
- AM-76 对 C3-invalid 的 ABANDONED/DONE 输入与 RY-03 冲突。
- AM-78 没有固定完整既有 guard 集合及 integrity report 的相对顺序。
- AM-80 缺少可 force 失败类和人类证据的完整机械协议。
- AM-84 与 AM-86 对 single-file `--force` 给出相反兼容要求。
- AM-82/AM-83 没有覆盖 REQ-5 所列的路径规范化和 realpath-failure 边界。
- 文档验收漏掉 REQ-6 的现存受影响文件。

## 5. 是否与当前 state A 冲突

**结论：未通过。**

- REQ-1 与 gate 当前裸读取行为、`reviewDirDefect` 外层守卫以及已有 `fileReadDefect` 能力不完整对齐。
- REQ-4 未覆盖源码中 temp/destination guards 与 integrity report 的真实顺序。
- REQ-6 与当前双语教程、living archive spec及 SECURITY 契约冲突。
- REQ-7 的 DONE 文案不符合实际解析到的 in-flight 路径。
- §4.11 的 CAS 复核本身正确：当前 store stamp 确为 `sha256:51620e96cd6b3c4a4b1af5e1e0865fd7f55bcf0333ecc47aeca727cf997282c5`，前身触及的 Requirement 块与后来 AM-71～73 所在块不同，未发现 serialize-per-module 冲突。

## 6. 目标 lineage 是否声明且符合仓库现实

**结论：通过。**

当前分支确为 `brownfield-round2`，HEAD 为 `edfdf2e`；`235a121` 是当前 main 且为该分支祖先。v4 已成为 main，禁止合入 v1/v3 的声明与仓库现实一致。

## Out-of-scope 检查

**结论：通过。**

§五存在明确的“明确不做”章节，并列出 G3、F-2、F-4、resolver 不改、gate 对外行为不改及不加锁。

## Advisories

### A-1 — 把 TOCTOU 排除写成精确的调用前置条件

当前已明确不引入锁，因此不计 formal issue。但建议定义稳定区间，例如“从首次 readiness artifact 读取开始，到 dry-run 返回、无 move 的 commit 结束、或 move 尝试结束为止，调用方不得并发修改 bundle”。增加 seam 证明实现不声称检测该竞态，避免“看守一次”被误读为提交时状态保证。

### A-2 — G3 findings 应有独立追踪入口

F-2/F-4 已在文字中保留，但最好给出独立 finding/change 的稳定标识或路径。否则本 change 完成后，“post-archive gate 可能检查错误 bundle”容易只剩历史文档中的叙述。

### A-3 — 收窄后的准确结论

不需要完整建模 G2 或 G3。应完整恢复的是 G1 中已经由前身验证过的安全读取、格式/进度 force 分类及人类豁免证据；这些不是导致 attribution/sufficiency 不收敛的部分，不应随收窄一起删除。

VERDICT: 7 issues open
