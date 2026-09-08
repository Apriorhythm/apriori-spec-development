# req-review-v4 — id-pattern-and-delta-notes requirement review

评审对象：`requirement/req-v4.md`  
评审轮次：4  
评审角色：P1 senior requirements reviewer  
评审方式：只读核对 v4、r3 review、ledger、KB 与实际源码。

## REQ-5 verification

### REQ-5 — verified

v4 已正确收窄 P1：

- `blockDiscard === true` 只抑制本 change 新增的 non-Requirement h3 检查；
- fence、h2、`SKIP_UNRECOGNIZED`、`IN_NOTES`、CAS stamp、合法 Requirement 等既有或已明确新增的高优先级处理均不受 P1 改写；
- `STAMP_ATTEMPT_LINE_RE` 保持在 `REQ_LINE_RE` 和 requirement-body 分支之前；
- 新 h3 discard 与既有 RENAMED illegal-Requirement discard 中的 stamp-shaped line均继续走 state-A stamp handling；
- AC-IP-17h 对两个关键 discard 来源给出了直接、可测试的回归断言；
- 普通 discarded block 中后续 non-Requirement h3被静默吸收，不产生第二条 problem；
- 任一合法 Requirement 或 h2仍按 P2 flush/discard 并恢复；
- discarded block 不进入 buckets。

按实际控制流检查后，每个相关的 state、kind、`blockDiscard` 和 line-shape组合均能落到唯一分支，RENAMED 的既有语料行为保持不变。REQ-5 已关闭。

## Fresh six-dimension review

### 1. 目标状态 B 是否清楚且无歧义

**结论：通过。**

目标状态已明确覆盖：

- 新 `DEFAULT_ID` 及其 `leadId` 边界；
- D5 与项目 ID 词汇解耦；
- D6 的确定性分类与输出；
- `IN_NOTES` 的进入、退出、重复、fence、CAS 和 zero-op语义；
- non-Requirement h3 的唯一收紧位置、discard 与恢复顺序。

文档已足以直接交给实现者。

### 2. 边界、异常与失败路径是否覆盖

**结论：通过。**

已覆盖的关键边界包括：

- 旧 ID、新多段 ID、字母后缀、重复 ID和无 ID；
- config override、fresh-init config-origin child、matcher failure继承；
- D5 的 SKIP/TODO反例与冻结分类语义；
- Notes-only、前置/中间/末尾 Notes、重复 Notes、未闭合 fence；
- Notes 内外 CAS stamp及 unstamped mutation路径；
- Notes → 四种操作段、unknown h2、`SKIP_UNRECOGNIZED`；
- 普通、ADDED、RENAMED、discarded block中的 h3和 stamp；
- parser problem触发后的 whole-delta refusal。

timeout、并发 CAS、failure rollback等未修改路径明确继承 state A，没有发现遗漏。

### 3. 是否存在隐含但未声明的状态变化或副作用

**结论：通过。**

所有可见变化均已声明：默认绑定范围扩大、D5 regex解耦、D6 finding可能由一条拆成两条、fresh init模板变化、新 Notes语法、h3 fail-closed收紧，以及可能新增的 duplicate/UNBOUND结果。未发现隐含写入、修复、迁移或 rollback变化。

### 4. 每条验收标准是否可写成确定的 if/then

**结论：通过。**

AC-IP-01～24 已提供可判定的输入和结果。特别是此前存在问题的 AC-IP-09、14b～14g、17b～17h及21b～21c现均有唯一测试 oracle。

### 5. 是否与当前状态 A 冲突

**结论：通过。**

与 state A 的差异均是明确目标，并有对应验收。要求保留的 state-A行为——`leadId` 边界、config优先级、D5既有分类、stamp处理顺序、unknown-section无洪泛、RENAMED discard、CAS default-deny及 archive failure semantics——均被明确保留。

### 6. target lineage 是否声明且符合仓库现实

**结论：通过。**

`brownfield-round2` 的 merge-base 为 `main@235a121`，当前 HEAD 为包含 change 1 归档的 `f415824`；change 2仍 parked。v4 → main且禁止 v1/v3 的 lineage与仓库现实一致。

## Advisories

### ADV-1 — 历史事实段仍把四种操作写成“三种”

§1.3/§1.4 仍称 state A 有“三种”法定 h2，但同行实际枚举 ADDED、MODIFIED、REMOVED、RENAMED四种。目标状态和验收已经正确，不影响实现；建议最终整理时修正文案。

### ADV-2 — `blockDiscard` 还有既有 duplicate-block 来源

P1 的谓词是泛化的，因此也会正确覆盖同 kind重复 Requirement产生的 `blockDiscard`，保持其 state-A h3吸收行为。正文只列举“新 h3”和“RENAMED illegal Requirement”两个来源，属于解释性枚举不完整，不构成语义缺口。

### ADV-3 — 严格超集按 `leadId` 语义成立

所有实际消费者均通过 `leadId`，所以旧绑定逐字节保持。裸 `RegExp.exec` 对 `AC-30f` 等输入不会保持同一搜索子串；后续 living spec最好将 AC-IP-02继续表述为旧 `leadId` 成功识别的输入。

### ADV-4 — out-of-scope section 完整

O1～O9 明确覆盖优先级、配置所有权、边界规则、额外语法、存量修补、parked change、D5 lexer重计数及模板 active Value哲学，满足显式 out-of-scope要求。

## Ledger delta

| ID | Previous status | New status | Round-4 result |
|---|---|---|---|
| REQ-1 | verified | verified | 无变化 |
| REQ-2 | verified | verified | 无变化 |
| REQ-3 | verified | verified | 无变化 |
| REQ-4 | verified | verified | 无变化 |
| REQ-5 | fixed (v4) | verified | P1仅抑制新增 h3检查；state-A stamp顺序与两个 discard来源由 AC-IP-17h钉死 |

VERDICT: no major issues
