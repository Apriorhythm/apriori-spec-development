# req-review-v2 — id-pattern-and-delta-notes requirement review

评审对象：`requirement/req-v2.md`  
评审轮次：2  
评审角色：P1 senior requirements reviewer  
评审方式：只读核对 v2、r1 review、ledger、KB 与实际源码。

## Round-1 findings verification

### REQ-1 — REOPEN

B1b 选择的技术方向成立：只要 D5 改用独立、冻结的 `[A-Z]+-\d+`，`DEFAULT_ID` 的放宽便不会改变 D5 分类。移除 D5 后，其余 `DEFAULT_ID` 消费者正是有意放宽的 CK-04、D6、verify 与 gate C1，没有另一个暴露点。

但 v2 内部仍有两处与该决定直接冲突：

- K3 仍写着“D5 用 `DEFAULT_ID`”，并保留“若实测不成立，STEP2 重新设计”的 v1 处置；
- “触及范围（源码）”只把 `lib/doctor.js` 描述为 D6 fix 分支，遗漏了已经成为目标状态的 D5 解耦。

同一 requirement 因而同时要求“现在解耦”和“仍消费 DEFAULT_ID、以后再决定”，不能直接交给 AI。

- **风险**：high
- **建议修复**：将 K3 改为已裁定的目标风险处置，例如“D5 改用冻结的独立分类 regex；AC-IP-09 验证 DEFAULT_ID 改变前后结果一致”；并把源码范围改为 `lib/doctor.js` 的“D5 分类 regex 解耦 + D6 fix 分支”。

### REQ-2 — verified

AC-IP-21 已覆盖模板 Value、Default 和注释中的三个旧值；AC-IP-21b 覆盖 fresh init 后实际被优先消费的 config-origin 路径，并同时检查标题与 TAP description；AC-IP-21c 覆盖四个产品消费者的一致性。原缺口已关闭。

### REQ-3 — verified

v2 已给出确定性的首 token 提取、digit/separator 谓词、正反例、bounded source、origin、样例上限与顺序，以及每类恰好一条 finding 的计数契约。分类可以生成唯一测试 oracle，原缺口已关闭。

### REQ-4 — REOPEN

`IN_NOTES` 的大部分边界已补齐，但 CAS 规则内部不可同时满足。

按 v2 的状态机：

1. `## Notes` 进入 `IN_NOTES`；
2. `IN_NOTES` 只在下一个 fence 外 h2 结束；
3. Notes 内的任何 CAS stamp 必须忽略。

因此下面的 stamp 仍处于 `IN_NOTES`，必须被忽略：

```markdown
## Notes
说明

<!-- apriori-base: sha256:... -->

## MODIFIED Requirements
```

但 AC-IP-14d 又要求同一位置的 stamp 有效。stamp 不是 h2，无法先结束 Notes；解析器也不能在不破坏“Notes 内 stamp 全部 opaque”的前提下判断作者想让它是说明样例还是真实 stamp。

此外，转移表写“若它是三种法定操作段”，而实际 `SECTION_LINE_RE` 有四种：ADDED、MODIFIED、REMOVED、RENAMED。当前文字没有明确 Notes 后的 RENAMED 是否正常恢复。

- **风险**：high
- **建议修复**：二选一并统一 B3 与 AC：
  - 推荐保持 Notes 真正 opaque：Notes 位于首个操作段前时，合法 stamp 必须放在 `## Notes` 之前；删除 AC-IP-14d 的“stamp 可跟在 Notes 后”要求；
  - 或新增明确的 Notes 终止语法，但这会扩大本 change 的语法面。
  
  同时将“三种法定操作段”改为明确列出四种，并增加 Notes → RENAMED 的恢复用例。

### REQ-5 — REOPEN

普通 requirement block 的 discard/recovery 已基本钉死，但矩阵没有完整映射实际 parser 状态：

- 实际状态还包括 `SKIP_UNRECOGNIZED`，矩阵没有定义该状态中的 h3/h4 行是否继续由原 h2 problem 覆盖，以及遇到 `## Notes` 后是否恢复为 `IN_NOTES`。
- `RENAMED` 不是独立 state，而是正交的 `kind`。当前代码遇到 RENAMED 内非法 `### Requirement:` 后，会进入 `state === 'IN_REQUIREMENT'`、`kind === 'RENAMED'`、`blockDiscard === true`。此时后续非-Requirement h3 同时符合矩阵的：
  - `IN_REQUIREMENT`：新 problem；
  - `RENAMED`：自由文本不变。
  
  两格给出相反结果。
- “已作废 block 后续行不刷屏”要求实现者在 `blockDiscard` 为 true 时先吸收行、再检查新 h3；该优先级应显式写入，否则第二个非-Requirement h3仍可能产生第二条 problem。

- **风险**：med
- **建议修复**：将矩阵改成“state × kind/blockDiscard”或补充优先级规则：
  - `SKIP_UNRECOGNIZED` 保持现有无洪泛语义，直到下一个 h2；
  - RENAMED 非法 requirement 的 discard block 中，后续所有非-h2、非合法 Requirement 行继续静默吸收；
  - `blockDiscard === true` 优先于新 h3 检查；
  - 明确 `## Notes` 从 `SKIP_UNRECOGNIZED` 和 RENAMED discard block 的转移结果。

## Fresh six-dimension review

### 1. 目标状态 B 是否清楚且无歧义

**结论：未通过。** REQ-1 的文档内部仍自相矛盾；REQ-4 的 CAS 规则不可同时满足；REQ-5 对实际复合状态存在冲突。

### 2. 边界、异常与失败路径是否覆盖

**结论：未通过。** Notes 前置时的 CAS、Notes → RENAMED、`SKIP_UNRECOGNIZED`、RENAMED discard block 和重复坏 h3 的恢复优先级仍未形成唯一行为。Notes-only、重复 Notes、末尾 Notes、未闭合 fence和普通 requirement discard 已覆盖。

null、out-of-range、matcher timeout、并发 CAS 与 archive rollback 沿用 state A，没有发现新的未声明改动。

### 3. 是否存在隐含但未声明的状态变化或副作用

**结论：未通过。** D5 解耦是新的源码行为，但“触及范围”仍只声明 D6 分支；这与 B1b 不一致。其余主要行为变化均已声明。

### 4. 每条验收标准是否可写成确定的 if/then

**结论：未通过。**

- AC-IP-14d 与 AC-IP-15/`IN_NOTES` 终止条件不能同时成立；
- AC-IP-14e 未明确覆盖第四种操作 RENAMED；
- AC-IP-17b～17d 没有为 `SKIP_UNRECOGNIZED` 和 `kind === RENAMED && state === IN_REQUIREMENT` 给出唯一 oracle；
- 其余新增 AC 已具备可测试的输入和结果。

### 5. 是否与当前状态 A 冲突

**结论：未通过。**

有意变更均已清楚声明，但仍有三处未协调冲突：

- K3 保留 state-A 的 D5/DEFAULT_ID 关系，与 B1b 的 target B 冲突；
- Notes 后 stamp 的有效要求与 fully-consuming parser 的连续 Notes 段语义冲突；
- REQ-5 把实际正交的 RENAMED kind 与 IN_REQUIREMENT state写成互斥列，无法映射 state A 的非法 RENAMED block recovery。

### 6. target lineage 是否声明且符合仓库现实

**结论：通过。**

`brownfield-round2` 的 merge-base 仍为 `main@235a121`，HEAD 包含 change 1 的 `f415824`，change 2 仍 parked；v4 → main 且禁止 v1/v3 的 lineage 与仓库现实一致。

## Advisories

### ADV-1 — D6 的 origin 枚举可收窄

D6 当前调用 `resolveIdPattern(cwd, null)`，实际可达 origin 只有 `config` 和 `default`，不会出现 `flag`。保留三值不会造成实现缺陷，但文档若标注“flag 为通用类型值、D6 不可达”会更精确。

### ADV-2 — 严格超集仍应注明是 `leadId` 语义

在所有实际消费者的 `leadId` 契约下，旧绑定的逐字节 ID 保持成立；裸 `RegExp.exec` 对 `AC-30f` 等输入并不保持相同子串。建议后续 spec 将 AC-IP-02 明写为旧 `leadId` 返回非-null 的输入。

### ADV-3 — out-of-scope section 完整

O1～O9 明确存在，并新增了 D5 lexer 重计数与模板 active Value 哲学两个边界。三项打包的风险差异仍存在，但 Large tier 和分组验收足以承载，不构成本轮 issue。

## Ledger delta

| ID | Previous status | New status | Round-2 result |
|---|---|---|---|
| REQ-1 | fixed (v2) | open | REOPEN：B1b 已裁定解耦，但 K3 与源码触及范围仍保留相反的 v1 描述 |
| REQ-2 | fixed (v2) | verified | Value/Default/comment、fresh-init config child 及四消费者一致性均已覆盖 |
| REQ-3 | fixed (v2) | verified | ID-shaped 分类及输出/计数契约已可执行、可测试 |
| REQ-4 | fixed (v2) | open | REOPEN：Notes 后 stamp 同时被要求“忽略”和“有效”，且法定操作段数量写错 |
| REQ-5 | fixed (v2) | open | REOPEN：遗漏 SKIP_UNRECOGNIZED，且 RENAMED kind 与 IN_REQUIREMENT state 的矩阵结论冲突 |

VERDICT: 3 issues open
