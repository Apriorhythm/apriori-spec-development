# req-review-v2 — archive-readiness requirement review（Round 2）

评审基于 req-v2、Round-1 review、ledger、提前产出的 gap-report、RUNBOOK、living specs、实际源码与活跃文档；未修改任何文件。

## REQ-1 — REOPENED

已确认修复的部分：

- B7 恢复了基础 checker 与 archive 安全读取的两层结构；
- ledger 明确先判 `reviewDirDefect`、再判 leaf；
- symlink、非文件、逃逸、坏祖先和 guard 后读取竞态都有验收；
- 结构类统一不可 force。

但仍有两个实质缺口。

### 残余缺陷 1：既有 helper 会把权限错误伪装成 missing

`resolve.fileReadDefect()` 在首次 `lstatSync` 抛错时不检查 `e.code`，任何异常都进入 missing 分支；检查祖先时也吞掉所有异常。`reviewDirDefect()` 同样把 `lstatSync(review/)` 的任何异常当成目录不存在。

因此，“复用既有 helper”不能兑现 B7 的权限语义。尤其在 trivial tier：

- tasks/ledger 的 `lstat` 因 `EACCES` 失败；
- helper 可能返回 `missing`；
- B7 将其判为 `n/a`；
- archive 继续写入，而不是按结构/读取失败拒绝。

AM-77 只覆盖“guard 已通过，后续 read 抛错”，捕获不了发生在 guard 自身的 `EACCES`/`EIO`。

### 残余缺陷 2：`reviewDirDefect` 的搬迁依赖仍可能成环

State A 的 `reviewDirDefect` 使用的是从 `archive-merge.js` 引入的 `containsReal`。若所谓“原样搬入 readiness”仍从 archive-merge 取它，就形成：

```text
archive-merge → readiness → archive-merge
```

gap-report 推测可使用 `resolve.containsReal`，但 normative requirement 没有指定；“原样搬入”与该替换也不是同一件事。

- **风险**：high。权限故障存在 trivial-tier fail-open；共享模块也仍有两种不等价依赖实现。
- **建议修复**：
  - archive 安全层在调用 `fileReadDefect` 前/外围区分 `ENOENT` 与其他 `lstat/realpath` 错误；只有真实 ENOENT 可进入 tier-sensitive missing，其他错误一律结构失败；
  - 对 `review/` 根采用相同错误分类；
  - 增加 guard 自身抛 `EACCES`/`EIO` 的 AC，而不只测试 guard 后读取；
  - 明确 `readiness.reviewDirDefect` 使用 `resolve.containsReal`，并以差分测试证明其在该调用域与 state A 相同；静态禁止 `readiness.js` require `archive-merge.js`。

## REQ-2 — REOPENED

已确认修复的部分：

- 可 force 与不可 force 类别已经正确拆开；
- R1、结构错误、缺失 artifact、格式/证据错误不可 force；
- dry-run 与 write 的措辞矛盾已消除；
- evidence token、理由存在性、多失败输出均已进入目标与 AC。

但新的人类证据协议没有机械兑现其声称的授权范围。

### 残余缺陷：一个永久、无范围绑定的 token 被称为“本次运行”的人类批准

一条泛化的：

```text
archive-force <reason>
```

不携带 `tasks`/`ledger` 失败类、ledger ID、当前失败集合或一次性标识，却被规定覆盖“本次运行的全部可 force 失败”。文件内容无法证明“本次”：

- 为两项旧任务写下的记录，会自动授权后来出现的任意 tasks 与 ledger 问题；
- 新增的 open ledger 行不要求人类重新看见；
- 记录不会在一次调用后失效，因此实际语义是 bundle 级永久 blanket waiver，而非本次运行证据。

“该条目由人类写入”也与 RUNBOOK 的实际记录机制不准确：人类作决定，agent 把其原话记录进 flow-state；文件本身无法证明作者身份。AM-88 还要求打印“需要写入的确切文字”，但人类理由尚未知，只能打印模板，不能打印确切完整记录。

此外，“token 后有非空文字”不足以定义理由：仅有 `archive-force —` 是否算理由并不明确；而“打印 gates 条目原文”也没有说明是保留多行原始文本，还是打印 `gatesEntries()` 拼接后的规范化文本。

- **风险**：high。旧授权可静默覆盖后来出现的未完成工作，与“预存的人类证据针对当前 force”的安全主张不符。
- **建议修复**：二选一明确并可测试：
  - 推荐：记录包含精确失败类 token `tasks` / `ledger`；只允许覆盖记录中列出的类。若要绑定具体当前失败，再包含 ledger IDs 或当前失败集合摘要；
  - 或诚实声明它是 bundle 生命周期内持续有效的 standing waiver，直到记录被显式撤销，不再称为“本次运行”的证据。
  
  同时把“人类写入”改成“记录一项先前的人类决定”，用稳定语法要求理由含单词字符，并规定输出使用原始首行或规范化 entry。AM-88 应打印可复制的模板，不能声称打印未知的人类理由全文。

## REQ-3 — VERIFIED

修复真实且完整：

- `--force` 只属于高层 usage；
- 单文件形式收到它时固定 exit 2 + usage；
- B5 明确该路径相对 state A 只保持退出码、不保持诊断字节；
- AM-91 提供直接 if/then 验收。

未发现剩余歧义。

## REQ-4 — VERIFIED

B5/B6 已按源码真实顺序固定 insertion point：

- discovery、projection 和所有既有 failure guards 先执行；
- readiness 位于 temp/destination guards 之后；
- integrity report 位于 readiness 之后；
- 内存 projection 与落盘 commit 已区分；
- AM-83 逐 guard 验证旧诊断优先且 readiness 未调用；
- AM-84 固定未就绪时不打印 integrity report。

修复完整。

## REQ-5 — VERIFIED

B2b 已补全 Round-1 要求的实现语义：

- `path.resolve(cwd, ...)`；
- 路径段边界；
- `.`/`..`；
- prefix sibling；
- lexical 与 realpath 双量度；
- symlinked root 与外部 symlink；
- realpath 失败 disposition；
- 元数据读取与内容读取的时机区分。

AM-93～AM-98 对应这些边界。未发现仍可由不同实现得出相反作用域结论的缺口。

## REQ-6 — REOPENED

### 对生产方两项“更重”判断的明确判定

1. **双语 concepts 是 onboarding 教程的 STEP6 命令，且同时触发 B2a/B2b：确认。**

   `docs/concepts.md:553` 与 `docs/concepts_cn.md:553` 确实位于 “Acceptance & STEP6 · archive” 教程段，并同时：

   - 使用单文件形式的 `--changes-dir`；
   - 把 `--delta` 指向 canonical changes root 内。

   这比普通参考文档中的一次陈旧 usage 更严重。AM-101 的高层形式迁移是必要修复。

2. **AM-12 将变为不可达/空洞：确认；但“需要 `## REMOVED` operation”：反驳。**

   AM-12 是一个 Scenario，不是 Requirement。当前 delta grammar 的 `MODIFIED`/`REMOVED` 操作对象都是 `### Requirement:` 整块；不存在 scenario-level `REMOVED`。

   对 AM-12 所在 Requirement 使用 `## REMOVED` 会把 AM-01～AM-12 整个 Requirement 一并 deprecated，错误删除仍然有效的 AM-01～AM-11。

   正确操作是：

   - 对包含 AM-01～AM-12 的整个 Requirement 使用 `## MODIFIED Requirements`；
   - 保留 AM-01～AM-11；
   - 删除 AM-12 scenario；
   - 让 MODIFIED integrity report 明确报告 dropped scenario AM-12；
   - 在 gate④单独呈报这是唯一一次既有 scenario promise 的删除。

   所以“这是唯一一处语义上的既有承诺删除”可以成立，“应使用 `## REMOVED`”不成立。AM-99 当前会指导实现者生成破坏整个 Requirement 的错误 delta。

### 对 SECURITY.md 部分反驳的判定：不成立

`SECURITY.md:10` 的第一句确实只谈 change-name-derived paths；但同一行随后明确写道：

> Explicit operator-given file arguments (single-file `archive --store <f> --delta <f>`, `stamp <file>`) are used as given, like any file tool.

这就是对单文件形式的显式承诺。B2b 新增了基于 canonical changes root 的作用域判断，并拒绝一部分 operator-given delta；它们不再只是 “used as given”。

因此：

- SECURITY.md 需要同步，至少明确单文件 delta 的新拒绝边界；
- AM-106 当前声称该文件“不含单文件形式承诺”，与文件字面内容直接相反；
- 所谓 grep assertion 在 state A 上就应失败，因为该行明确包含 `single-file archive --store <f> --delta <f>`。

- **风险**：high。错误的 `REMOVED` 会废弃整个 Requirement；SECURITY 文档也会继续发布与实现相反的路径契约。
- **建议修复**：
  - 将 AM-99 改成 MODIFIED enclosing Requirement、删除 AM-12 scenario，并验收 AM-01～AM-11 全部保留；
  - 增加 integrity report 必须只报告 dropped AM-12 的检查；
  - 撤销 AM-106 的“不需修改”结论，改为更新 SECURITY.md 的 explicit-argument 句子并 grep 验证新边界存在。

## REQ-7 — VERIFIED

3.1 已改为明确的有序判定：

```text
读取/结构 → C3 → STEP6 overlay → R2/R3
```

ABANDONED/DONE 专门措辞只在其余 C3 条件通过后使用；DONE 文案也准确描述 in-flight bundle，而不再推断已归档。AM-79～AM-81 能直接验证优先级。修复完整。

## 新问题（按维度）

本轮没有另开新的 formal ID。发现的阻断缺口分别是 REQ-1、REQ-2、REQ-6 修复不完整或错误，按 reopen 规则复用原 ID。

各维度结论：

- **目标状态清晰性**：未通过，见 REQ-1、REQ-2、REQ-6。
- **边界与异常路径**：未通过，见 REQ-1 的 guard 自身权限异常。
- **隐含状态变化/副作用**：未通过，见 REQ-2 的可重放 blanket waiver及 REQ-6 的错误 spec 删除范围。
- **验收可测试性**：未通过，见 REQ-2 的“本次运行/人类写入/确切文字”与 AM-106。
- **state A 一致性**：未通过，见 `fileReadDefect`/`reviewDirDefect` 的真实异常行为、scenario-level delta grammar及 SECURITY.md 原文。
- **lineage**：通过；目标仍为 `brownfield-round2` → v4/main，禁止合入 v1/v3，与仓库现实一致。
- **out of scope**：明确存在。

## Advisories

### A-1 — F-2/F-4 的两条独立 `advisory-acked` 行不符合 ledger 的 batch 形态

RUNBOOK/P0 规定 advisory 每轮在 ledger 中落一个 batch row，而 §五-7 要求两条独立 finding 行直接使用 `advisory-acked`。这不影响 archive-readiness 的实现正确性，因此不计 verdict；建议将稳定 finding 放进一个专门的 known-findings 段，或让本轮 advisory batch row 的 Issue 文本同时携带两个稳定标识。

### A-2 — TOCTOU seam 的措辞应再机械化

§六的稳定区间已经落实 Round-1 advisory。但“seam 可断言未做任何提交时复检”容易被理解成“没有 commit”或“没有 recheck”两种意思。建议明确成：hook 在 readiness 全部完成后、首次 store 写入前触发；测试在 hook 中修改 bundle，并断言 archive 不重新读取、不检测该修改。

### A-3 — 源码行号只作定位，不应成为验收接口

B6 的顺序已经足够明确；其中 `:676`、`:733` 等行号会随函数搬迁立即漂移。后续 design/tasks 应绑定命名步骤和函数调用，而不是继续依赖行号。

VERDICT: 3 issues open
