# req-review-v3 — id-pattern-and-delta-notes requirement review

评审对象：`requirement/req-v3.md`  
评审轮次：3  
评审角色：P1 senior requirements reviewer  
评审方式：只读核对 v3、r2 review、ledger、KB 与实际源码。

## Round-2 findings verification

### REQ-1 — verified

v3 已消除两处残留冲突：

- K3 明确 D5 不再消费 `DEFAULT_ID`，改用冻结的 `[A-Z]+-\d+` 分类 regex；
- 源码触及范围明确包含 D5 classification-regex decoupling 和 D6 fix 分支。

该设计确实使 AC-IP-09 结构上成立。移除 D5 后，其余 `DEFAULT_ID` 消费者正是有意放宽的 CK-04、D6、verify 和 gate C1；未发现其它生产代码消费者暴露在变化之外。

### REQ-4 — verified

v3 选择“Notes 真正 opaque”的方向后，状态机与 CAS 契约一致：

- 首个操作段之前的真实 stamp 必须位于 `## Notes` 之前；
- Notes 内任何 stamp-shaped line 均被忽略，不改变 `stamp`、`stampSeen` 或 `stampProblems`；
- mutation delta 若只有 Notes 内伪 stamp，仍视为 unstamped，进入既有 CAS 路径；
- Notes 只在下一个 fence 外 h2 结束；
- ADDED、MODIFIED、REMOVED、RENAMED 四种操作段均恢复正常解析；
- Notes-only、重复 Notes、未闭合 fence、未知 h2 和 Notes → RENAMED 均有明确验收。

该契约可以按唯一分支顺序实现，REQ-4 已关闭。

### REQ-5 — REOPEN

真实 state、RENAMED kind、`SKIP_UNRECOGNIZED` 和新 `IN_NOTES` 已正确建模；普通 h3 的 discard/recovery 也已确定。但 P1 对 discarded block 的描述仍与实际 CAS 控制流冲突。

v3 P1 规定：

> `blockDiscard === true` 时，后续所有非-h2、非合法-Requirement 行继续静默吸收。

“所有”包括 CAS stamp-shaped line。然而 state A 在任何非-skipped state 中都会先处理 stamp，再进入 `IN_REQUIREMENT` body 分支。实际反例：

```markdown
## RENAMED Requirements
### Requirement: Bad
<!-- apriori-base: new -->
```

state A 产生两条 problem：

1. requirement block inside RENAMED；
2. apriori-base stamp appears after the first delta section heading。

若按 P1 的“所有非-h2、非合法 Requirement 行静默吸收”实现，第二条 problem 会被吞掉，RENAMED 行为便不是 byte-identical。普通 requirement 因新 h3进入 discard 后也有同一优先级问题。`IN_NOTES` 有意覆盖 stamp 处理，但 discarded requirement block 没有声明这种语法豁免。

- **风险**：med
- **建议修复**：将控制流优先级明确为：
  1. fence；
  2. Notes / legal h2 / unknown h2；
  3. `SKIP_UNRECOGNIZED` 与 `IN_NOTES` 的状态短路；
  4. 既有 CAS stamp handling；
  5. legal `### Requirement:`；
  6. `blockDiscard === true`；
  7. 新的 non-Requirement h3 check；
  8. 其它 body 行。
  
  将 P1 的“所有非-h2、非合法 Requirement 行”收窄为“完成既有 stamp handling 后的普通 requirement-body 行”。增加验收：RENAMED 非法 requirement 后跟 late/malformed/duplicate stamp 时，stamp problem 与 state A 完全一致；普通 block 因坏 h3被 discard 后，stamp handling 也保持现有全局语义。

除此之外，矩阵中的 state/kind/blockDiscard 组合已能确定性落到唯一分支。

## Fresh six-dimension review

### 1. 目标状态 B 是否清楚且无歧义

**结论：未通过。** 唯一剩余歧义是 REQ-5 中 `blockDiscard` 与全局 stamp handling 的先后关系。其余目标状态已经清楚。

### 2. 边界、异常与失败路径是否覆盖

**结论：未通过。** Notes、fence、unknown section、RENAMED recovery 和普通 h3 recovery 均已覆盖；仅缺 discarded block 内 stamp 的边界。

null、out-of-range、matcher timeout、CAS 并发和 archive rollback均继承 state A，未发现新的缺口。

### 3. 是否存在隐含但未声明的状态变化或副作用

**结论：未通过。** 若按 P1 的宽泛文字实现，会隐式取消 discarded block 内既有的 late/malformed/duplicate stamp problems。该变化与“RENAMED byte-identical”目标冲突。

### 4. 每条验收标准是否可写成确定的 if/then

**结论：未通过。** 现有 AC 没有裁定 discarded requirement block 内 CAS stamp 的结果。其余 AC 已具备确定输入和结果。

### 5. 是否与当前状态 A 冲突

**结论：未通过。** P1 的“全部静默吸收”与 `parseDeltaStrict` 当前先处理 stamp 的顺序冲突。除此之外，所有与 state A 的差异均为明确、有验收覆盖的目标变化。

### 6. target lineage 是否声明且符合仓库现实

**结论：通过。**

`brownfield-round2` 的 merge-base 仍为 `main@235a121`；HEAD 包含 change 1 的归档提交，change 2 仍 parked。v4 → main 且禁止 v1/v3 的 lineage 与仓库现实一致。

## Advisories

### ADV-1 — 状态 A 中仍有一处“四种写成三种”

§1.3 和 §1.4 的历史事实说明仍称解析器只认“三种”法定 h2，但同行实际列出 ADDED、MODIFIED、REMOVED、RENAMED 四种。目标状态和验收已改正，因此不影响实现 oracle；建议顺手修正文案。

### ADV-2 — 严格超集应继续按 `leadId` 解释

实际消费者都通过 `leadId`，因此旧绑定逐字节保持成立。裸 `RegExp.exec` 对 `AC-30f` 等输入不会保持相同匹配子串；后续 spec 最好将 AC-IP-02 明写为旧 `leadId` 返回非-null 的输入。

### ADV-3 — out-of-scope section 完整

O1～O9 明确覆盖优先级、配置所有权、边界规则、额外语法、存量修补、parked change、D5 lexer 重计数及模板 active Value 哲学，满足显式 out-of-scope 要求。

## Ledger delta

| ID | Previous status | New status | Round-3 result |
|---|---|---|---|
| REQ-1 | fixed (v3) | verified | K3、源码范围和 AC-IP-09 已与 D5 解耦决定一致 |
| REQ-2 | verified | verified | 无变化 |
| REQ-3 | verified | verified | 无变化 |
| REQ-4 | fixed (v3) | verified | Notes 保持 opaque；真实 stamp 前置；四种操作段与 CAS 默认路径均已覆盖 |
| REQ-5 | fixed (v3) | open | REOPEN：P1 的全吸收规则会吞掉 discarded block 内 state-A 的 stamp handling，无法保证 RENAMED byte-identical |

VERDICT: 1 issues open
