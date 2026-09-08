# req-review-v1 — archive-preflight requirement review（Round 1）

评审基于静态读取；未运行测试，未修改文件。

## 1. 目标状态 B 是否清晰、无歧义

**结论：未通过。**

### REQ-1 — AC-AP-15 的“充分前置”承诺不成立

- **描述**：R1/R2/R3 并不覆盖 gate 的完整 C2/C3/C4 判据：
  - C3 还要求 `change`、`tier`、`track`、`lineage` 存在且无占位符，`change` 与命令参数一致，`tier` 合法；R1 只检查 `current-step`。
  - C4 不只判断终态 token，还要求 `rejected-verified`、`waived` 有理由，且 `waived` 有同条 `gates:` 人类证据；`review/` 根目录异常也会使 C4 BLOCK。
  - C2/C4 对缺失文件有 tier-sensitive 行为，需求尚未定义。
  - 因此无需任何竞态，就能构造“archive readiness 通过、post-archive gate C2/C3/C4 BLOCK”的 change。
- **风险**：high。AC-AP-15 是本 change 的价值命题，但当前无法由实现或测试兑现。
- **建议修复**：把正常、非 `--force` 的 archive readiness 明确定义为复用 gate 完整的 C2、C3 和“archived stage C4”判据，包括缺失文件、required keys、理由、waiver evidence 和 review-root guard；最好抽取共享检查函数，而不只是共享 status token 分类器。或者删除“充分前置/不可能 BLOCK”的承诺，改成准确的较弱保证。任何充分性 AC 必须明确排除 `--force`。

### REQ-3 — `--force` 的可豁免范围与证据协议未定义，并可违反 ABANDONED 硬规则

- **描述**：
  - B3 看起来允许豁免任意 R1/R2/R3 失败，但没有定义哪些失败不可豁免。
  - 依照当前文字，`ABANDONED` 可以凭 `--force` 和一条 gates 记录继续写 store；这直接违反 RUNBOOK §4 的 ABANDONED 路径：“写什么都不进 KB 与 spec store”。
  - 同理，`DONE`、缺失或不安全的 flow-state、非法词汇等结构性错误是否可豁免也不清楚。
  - “对应的人类豁免记录”没有机械语法：记录应包含 `R1/R2/R3`、具体 ledger ID，还是诊断文本？一条能否覆盖多项？匹配是否大小写敏感？“显著声明”也没有可断言格式。
  - 被 force 放行的未勾 tasks 或非终态 ledger 会立即让 post-archive C2/C4 BLOCK，与无条件的 AC-AP-15 冲突。
- **风险**：high。可能把明确放弃的 change 写入 store，也会导致不同实现接受不同证据。
- **建议修复**：增加逐失败类的 waiver matrix。至少将 `ABANDONED`、`DONE`、缺失/不安全文件、非法或占位 flow-state 定为不可 force；明确 `--force` 只影响 readiness，不影响 delta/CAS/temp/containment 等既有 preflight。定义稳定的 gates 证据语法、精确 token 匹配、多项覆盖规则及输出格式，并声明“人类写入”只能通过预存 gates 记录作为机械代理。AC-AP-15 限定为未 force 的成功归档。

### REQ-5 — 共享分类器的归位和 preflight 插入顺序仍允许多种不等价实现

- **描述**：
  - §1.3 的依赖事实属实：`gate.js` 当前 require `archive-merge.js`，反向 require 会形成环。
  - 但“移到一个双方都能依赖的位置”没有指定唯一 owner、导出面和兼容路径。`classifyStatus` 本身只处理 token、终态及理由；C4 的 `gatesEntries`、`waiveEvidence` 和 review-root 规则仍在 gate 内。只搬分类器不能保证 AC-AP-14/15 所需的一致性。
  - B1 说在 delta/CAS 后追加 readiness，但当前 pre-existing temp 和 archive-destination containment guard 更晚才执行。若 readiness 提前返回，会改变这些既有失败的诊断，违反 AC-AP-09；若延后或聚合，输出又不同。
- **风险**：med。实现者必须自行选择模块和顺序，容易产生重复规则、破坏 gate 导出或改变既有 preflight 行为。
- **建议修复**：指定一个确切结构，例如由 `lib/status.js`（或明确命名的新 leaf module）拥有并导出分类器及 waiver-evidence helpers，`gate.js` 从该处导入并继续 re-export `classifyStatus`，`archive-merge.js` 只依赖该共享模块。另给出 readiness 相对所有现有 guards、integrity report 和返回点的精确顺序，明确既有 guard 与 readiness 同时失败时输出哪一组诊断。

## 2. 边界、异常与回滚路径是否覆盖

**结论：未通过。**

### REQ-2 — tasks/ledger 缺失及三个 readiness 文件的读取失败语义缺失

- **描述**：
  - 需求没有回答无 `tasks.md` 或无 ledger 时怎么办。gate 的既有规则是 trivial tier 为 n/a，medium/large BLOCK。
  - `tasks.md`、ledger 的不可读、目录冒充文件、symlink、坏祖先、realpath escape、读取中消失均未定义；flow-state 的“不可读”也没有展开为这些结构化类别。
  - 这会影响退出码、是否可 force、AC-AP-05 的三项聚合，以及 AC-AP-15。
  - 仓库已有 `resolve.fileReadDefect` 和 status 的安全读取先例；若直接使用 `existsSync/readFileSync`，可能读取 bundle 外文件或抛出未结构化异常。
- **风险**：high。既是缺失边界，也是路径安全与失败闭合问题。
- **建议修复**：增加 tier × artifact × defect 的完整表：
  - trivial 缺 tasks/ledger 是否 n/a；
  - medium/large 缺失如何 BLOCK；
  - symlink、not-file、bad-ancestor、escape、权限错误和读取竞态统一如何诊断及退出；
  - 哪些失败不可 force；
  - flow-state 缺失导致 tier 不可知时如何聚合 R2/R3。
  明确不得跟随 bundle 外 symlink，并为每类写 if/then AC。

### REQ-6 — readiness 快照与归档写入之间的并发语义未定义

- **描述**：readiness 文件在 phase 1 读取后，change bundle 一直到 phase 4 才移动。另一进程可在检查后、store commit 前修改 tasks、ledger 或 flow-state，使一个已不满足 readiness 的 bundle仍被归档。现有 `.tmp-archive` guard 只保护 store temp 所有权，不锁定这些文件。该竞态也直接推翻 AC-AP-15 的“永不 BLOCK”绝对保证。
- **风险**：high。核心完整性关卡存在 TOCTOU，可在真实并行工作流中归档错误状态。
- **建议修复**：二选一并写入 AC：
  - 提供锁或等价的原子快照机制，使 readiness 快照在 commit/move 期间不可变；或
  - 明确声明从 readiness 开始到 bundle move 期间不得并发修改 change bundle，将其列入 out of scope/调用前置，并把 AC-AP-15 降级为“bundle 在该区间保持不变时”。
  若承诺检测并发修改，应提供能在 readiness 后、首个写入前注入变更的测试 seam。同步本地读取不存在独立 timeout 行为，也应明确标成 n/a。

## 3. 是否有隐含但未声明的状态变化或副作用

**结论：通过。**

需求已声明 store 写入、bundle move、dry-run 行为变化、`--force` 不代替人类写 gates，以及 gate 的导出兼容要求。未发现额外的隐式磁盘写入要求。共享模块重构的具体导出副作用仍需按 REQ-5 固化。

## 4. 验收标准是否均可测试

**结论：未通过。**

- AC-AP-01 至 AC-AP-07、AC-AP-09 至 AC-AP-14 大体可转写为 if/then，但 AC-AP-04 的“不可读”需按 REQ-2 枚举。
- AC-AP-08 中“对应的人类豁免记录”和“显著声明”没有稳定语法，当前不能写出唯一断言，见 REQ-3。
- AC-AP-15 当前不是实现应满足的性质，而是可被普通输入和 `--force` 反例推翻的假命题，见 REQ-1、REQ-3、REQ-6。

## 5. 是否与 state A 冲突

**结论：未通过。**

### REQ-4 — 允许 `current-step: STEP5` 与 RUNBOOK 状态机及仓库现实不一致

- **描述**：RUNBOOK 把 archive action 定义在 STEP6，并要求每步后立即更新 flow-state。STEP5 的退出条件是 tests、verify、lint、tasks、P8 verdict 全部满足；R2/R3 只覆盖其中 tasks 和 ledger，无法证明一个仍标记 STEP5 的 change 已通过出口。允许任意 STEP5 因而恰好保留了“实现仍在进行却归档”的路径。最新 precedent `gate-degrades` 在 archive move 时也是 `current-step: STEP6`。
- **风险**：high。与本 change 防止过早归档的目标正面冲突。
- **建议修复**：正规允许集合只保留 `STEP6`。若必须兼容 STEP5，需求需增加一个可机械验证、不可伪装成“仍在执行”的 STEP5-exited 状态证据，并解释它如何覆盖 RUNBOOK 的全部 STEP5 exit conditions；仅靠 R2/R3 不足。

### REQ-7 — B5 已命中现有成功测试和 living spec，但需求只声明了 CHANGELOG

- **描述**：
  - `test/archive-change.test.js` 的 `twoModuleProject()` 没有 flow-state/tasks/ledger；AM-13 当前断言 high-level dry-run exit 0。
  - `test/modified-integrity.test.js` 的 `archiveProj()` 只有 medium flow-state，没有 tasks/ledger；AM-46 对 `RESULT: MERGED (dry-run…)` 做字面断言，AM-47 也要求 archive 维持成功。
  - living spec `archive-merge` 的 AM-13 将 dry-run 描述为成功报告整个 change。
  - 未发现 scripts、README 或 golden-path 明文依赖“dry-run 永远 MERGED”，但上述测试和 living spec 已构成实际依赖。K4 只要求改 CHANGELOG，未声明如何迁移这些 state-A 合约和无 readiness fixture。
- **风险**：med。直接实现 B5 会使大量与 readiness 无关的 archive 测试在进入其目标路径前失败，并让 living spec 与新行为不一致。
- **建议修复**：在触及范围和 AC 中明确：
  - 给测试其他 archive 行为的 fixture 补齐 ready 的 STEP6 flow-state、tasks 和 ledger；
  - 保留专门的 unready dry-run 失败测试；
  - 将 AM-13 拆成“ready dry-run 成功”和“unready dry-run 失败”，并更新 CHANGELOG。
  明确哪些旧测试应保持 MERGED，哪些应改为 FAILED PREFLIGHT。

`DONE` 与 `ABANDONED` 都属于 RUNBOOK 的合法词汇，表中的枚举本身完整。将两者拒绝是安全方向；但 `ABANDONED` 必须按 REQ-3 明确为不可 force。对于 active bundle 自称 `DONE` 的情况，诊断应描述“active bundle 与 DONE 状态矛盾”，不能断言它物理上已经归档。

## 6. 目标 lineage 是否声明且符合仓库现实

**结论：通过。**

- 当前分支为 `brownfield-round2`。
- `main` 与该分支的 merge-base 均为 `235a121`。
- 当前 HEAD 为 `f415824`，即已归档的 `gate-degrades` store merge。
- `package.json` 为 4.1.0，CHANGELOG 明确 v4 已成为 `main` 主线。
- requirement 声明目标 `main`，禁止落入 v1/v3，与仓库现实一致。

## Out-of-scope 检查

**结论：通过。**

§五提供了明确的 out-of-scope 清单 O1–O6，并给出理由。需要在修订时补入 REQ-6 所要求的并发前置/非目标，若选择不提供锁定保证。

## Advisories

无。本轮发现均属于目标状态歧义、缺失边界、不可兑现的验收条件或与 state A 的冲突，因此均计入正式问题。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | AC-AP-15 的充分性承诺不成立：R1/R2/R3 未覆盖 gate 完整 C2/C3/C4 判据 | high | 1 | open |
| REQ-2 | tasks/ledger 缺失及 readiness 文件的 unsafe/unreadable 路径语义未定义 | high | 1 | open |
| REQ-3 | `--force` 的证据协议和可豁免范围不明确，并可能 force 掉 ABANDONED 硬禁令 | high | 1 | open |
| REQ-4 | 允许 STEP5 归档与 RUNBOOK 的 STEP5→STEP6 状态机及实际 precedent 冲突 | high | 1 | open |
| REQ-5 | 共享分类器归位、完整共享 API 和 readiness 相对既有 preflight guards 的顺序未定 | med | 1 | open |
| REQ-6 | readiness 检查到 commit/move 之间的并发修改与 TOCTOU 未覆盖 | high | 1 | open |
| REQ-7 | B5 与现有 AM-13/AM-46/AM-47 测试及 living spec 冲突，迁移范围未声明 | med | 1 | open |

VERDICT: 7 issues open
tokens used
114,635
# req-review-v1 — archive-preflight requirement review（Round 1）

评审基于静态读取；未运行测试，未修改文件。

## 1. 目标状态 B 是否清晰、无歧义

**结论：未通过。**

### REQ-1 — AC-AP-15 的“充分前置”承诺不成立

- **描述**：R1/R2/R3 并不覆盖 gate 的完整 C2/C3/C4 判据：
  - C3 还要求 `change`、`tier`、`track`、`lineage` 存在且无占位符，`change` 与命令参数一致，`tier` 合法；R1 只检查 `current-step`。
  - C4 不只判断终态 token，还要求 `rejected-verified`、`waived` 有理由，且 `waived` 有同条 `gates:` 人类证据；`review/` 根目录异常也会使 C4 BLOCK。
  - C2/C4 对缺失文件有 tier-sensitive 行为，需求尚未定义。
  - 因此无需任何竞态，就能构造“archive readiness 通过、post-archive gate C2/C3/C4 BLOCK”的 change。
- **风险**：high。AC-AP-15 是本 change 的价值命题，但当前无法由实现或测试兑现。
- **建议修复**：把正常、非 `--force` 的 archive readiness 明确定义为复用 gate 完整的 C2、C3 和“archived stage C4”判据，包括缺失文件、required keys、理由、waiver evidence 和 review-root guard；最好抽取共享检查函数，而不只是共享 status token 分类器。或者删除“充分前置/不可能 BLOCK”的承诺，改成准确的较弱保证。任何充分性 AC 必须明确排除 `--force`。

### REQ-3 — `--force` 的可豁免范围与证据协议未定义，并可违反 ABANDONED 硬规则

- **描述**：
  - B3 看起来允许豁免任意 R1/R2/R3 失败，但没有定义哪些失败不可豁免。
  - 依照当前文字，`ABANDONED` 可以凭 `--force` 和一条 gates 记录继续写 store；这直接违反 RUNBOOK §4 的 ABANDONED 路径：“写什么都不进 KB 与 spec store”。
  - 同理，`DONE`、缺失或不安全的 flow-state、非法词汇等结构性错误是否可豁免也不清楚。
  - “对应的人类豁免记录”没有机械语法：记录应包含 `R1/R2/R3`、具体 ledger ID，还是诊断文本？一条能否覆盖多项？匹配是否大小写敏感？“显著声明”也没有可断言格式。
  - 被 force 放行的未勾 tasks 或非终态 ledger 会立即让 post-archive C2/C4 BLOCK，与无条件的 AC-AP-15 冲突。
- **风险**：high。可能把明确放弃的 change 写入 store，也会导致不同实现接受不同证据。
- **建议修复**：增加逐失败类的 waiver matrix。至少将 `ABANDONED`、`DONE`、缺失/不安全文件、非法或占位 flow-state 定为不可 force；明确 `--force` 只影响 readiness，不影响 delta/CAS/temp/containment 等既有 preflight。定义稳定的 gates 证据语法、精确 token 匹配、多项覆盖规则及输出格式，并声明“人类写入”只能通过预存 gates 记录作为机械代理。AC-AP-15 限定为未 force 的成功归档。

### REQ-5 — 共享分类器的归位和 preflight 插入顺序仍允许多种不等价实现

- **描述**：
  - §1.3 的依赖事实属实：`gate.js` 当前 require `archive-merge.js`，反向 require 会形成环。
  - 但“移到一个双方都能依赖的位置”没有指定唯一 owner、导出面和兼容路径。`classifyStatus` 本身只处理 token、终态及理由；C4 的 `gatesEntries`、`waiveEvidence` 和 review-root 规则仍在 gate 内。只搬分类器不能保证 AC-AP-14/15 所需的一致性。
  - B1 说在 delta/CAS 后追加 readiness，但当前 pre-existing temp 和 archive-destination containment guard 更晚才执行。若 readiness 提前返回，会改变这些既有失败的诊断，违反 AC-AP-09；若延后或聚合，输出又不同。
- **风险**：med。实现者必须自行选择模块和顺序，容易产生重复规则、破坏 gate 导出或改变既有 preflight 行为。
- **建议修复**：指定一个确切结构，例如由 `lib/status.js`（或明确命名的新 leaf module）拥有并导出分类器及 waiver-evidence helpers，`gate.js` 从该处导入并继续 re-export `classifyStatus`，`archive-merge.js` 只依赖该共享模块。另给出 readiness 相对所有现有 guards、integrity report 和返回点的精确顺序，明确既有 guard 与 readiness 同时失败时输出哪一组诊断。

## 2. 边界、异常与回滚路径是否覆盖

**结论：未通过。**

### REQ-2 — tasks/ledger 缺失及三个 readiness 文件的读取失败语义缺失

- **描述**：
  - 需求没有回答无 `tasks.md` 或无 ledger 时怎么办。gate 的既有规则是 trivial tier 为 n/a，medium/large BLOCK。
  - `tasks.md`、ledger 的不可读、目录冒充文件、symlink、坏祖先、realpath escape、读取中消失均未定义；flow-state 的“不可读”也没有展开为这些结构化类别。
  - 这会影响退出码、是否可 force、AC-AP-05 的三项聚合，以及 AC-AP-15。
  - 仓库已有 `resolve.fileReadDefect` 和 status 的安全读取先例；若直接使用 `existsSync/readFileSync`，可能读取 bundle 外文件或抛出未结构化异常。
- **风险**：high。既是缺失边界，也是路径安全与失败闭合问题。
- **建议修复**：增加 tier × artifact × defect 的完整表：
  - trivial 缺 tasks/ledger 是否 n/a；
  - medium/large 缺失如何 BLOCK；
  - symlink、not-file、bad-ancestor、escape、权限错误和读取竞态统一如何诊断及退出；
  - 哪些失败不可 force；
  - flow-state 缺失导致 tier 不可知时如何聚合 R2/R3。
  明确不得跟随 bundle 外 symlink，并为每类写 if/then AC。

### REQ-6 — readiness 快照与归档写入之间的并发语义未定义

- **描述**：readiness 文件在 phase 1 读取后，change bundle 一直到 phase 4 才移动。另一进程可在检查后、store commit 前修改 tasks、ledger 或 flow-state，使一个已不满足 readiness 的 bundle仍被归档。现有 `.tmp-archive` guard 只保护 store temp 所有权，不锁定这些文件。该竞态也直接推翻 AC-AP-15 的“永不 BLOCK”绝对保证。
- **风险**：high。核心完整性关卡存在 TOCTOU，可在真实并行工作流中归档错误状态。
- **建议修复**：二选一并写入 AC：
  - 提供锁或等价的原子快照机制，使 readiness 快照在 commit/move 期间不可变；或
  - 明确声明从 readiness 开始到 bundle move 期间不得并发修改 change bundle，将其列入 out of scope/调用前置，并把 AC-AP-15 降级为“bundle 在该区间保持不变时”。
  若承诺检测并发修改，应提供能在 readiness 后、首个写入前注入变更的测试 seam。同步本地读取不存在独立 timeout 行为，也应明确标成 n/a。

## 3. 是否有隐含但未声明的状态变化或副作用

**结论：通过。**

需求已声明 store 写入、bundle move、dry-run 行为变化、`--force` 不代替人类写 gates，以及 gate 的导出兼容要求。未发现额外的隐式磁盘写入要求。共享模块重构的具体导出副作用仍需按 REQ-5 固化。

## 4. 验收标准是否均可测试

**结论：未通过。**

- AC-AP-01 至 AC-AP-07、AC-AP-09 至 AC-AP-14 大体可转写为 if/then，但 AC-AP-04 的“不可读”需按 REQ-2 枚举。
- AC-AP-08 中“对应的人类豁免记录”和“显著声明”没有稳定语法，当前不能写出唯一断言，见 REQ-3。
- AC-AP-15 当前不是实现应满足的性质，而是可被普通输入和 `--force` 反例推翻的假命题，见 REQ-1、REQ-3、REQ-6。

## 5. 是否与 state A 冲突

**结论：未通过。**

### REQ-4 — 允许 `current-step: STEP5` 与 RUNBOOK 状态机及仓库现实不一致

- **描述**：RUNBOOK 把 archive action 定义在 STEP6，并要求每步后立即更新 flow-state。STEP5 的退出条件是 tests、verify、lint、tasks、P8 verdict 全部满足；R2/R3 只覆盖其中 tasks 和 ledger，无法证明一个仍标记 STEP5 的 change 已通过出口。允许任意 STEP5 因而恰好保留了“实现仍在进行却归档”的路径。最新 precedent `gate-degrades` 在 archive move 时也是 `current-step: STEP6`。
- **风险**：high。与本 change 防止过早归档的目标正面冲突。
- **建议修复**：正规允许集合只保留 `STEP6`。若必须兼容 STEP5，需求需增加一个可机械验证、不可伪装成“仍在执行”的 STEP5-exited 状态证据，并解释它如何覆盖 RUNBOOK 的全部 STEP5 exit conditions；仅靠 R2/R3 不足。

### REQ-7 — B5 已命中现有成功测试和 living spec，但需求只声明了 CHANGELOG

- **描述**：
  - `test/archive-change.test.js` 的 `twoModuleProject()` 没有 flow-state/tasks/ledger；AM-13 当前断言 high-level dry-run exit 0。
  - `test/modified-integrity.test.js` 的 `archiveProj()` 只有 medium flow-state，没有 tasks/ledger；AM-46 对 `RESULT: MERGED (dry-run…)` 做字面断言，AM-47 也要求 archive 维持成功。
  - living spec `archive-merge` 的 AM-13 将 dry-run 描述为成功报告整个 change。
  - 未发现 scripts、README 或 golden-path 明文依赖“dry-run 永远 MERGED”，但上述测试和 living spec 已构成实际依赖。K4 只要求改 CHANGELOG，未声明如何迁移这些 state-A 合约和无 readiness fixture。
- **风险**：med。直接实现 B5 会使大量与 readiness 无关的 archive 测试在进入其目标路径前失败，并让 living spec 与新行为不一致。
- **建议修复**：在触及范围和 AC 中明确：
  - 给测试其他 archive 行为的 fixture 补齐 ready 的 STEP6 flow-state、tasks 和 ledger；
  - 保留专门的 unready dry-run 失败测试；
  - 将 AM-13 拆成“ready dry-run 成功”和“unready dry-run 失败”，并更新 CHANGELOG。
  明确哪些旧测试应保持 MERGED，哪些应改为 FAILED PREFLIGHT。

`DONE` 与 `ABANDONED` 都属于 RUNBOOK 的合法词汇，表中的枚举本身完整。将两者拒绝是安全方向；但 `ABANDONED` 必须按 REQ-3 明确为不可 force。对于 active bundle 自称 `DONE` 的情况，诊断应描述“active bundle 与 DONE 状态矛盾”，不能断言它物理上已经归档。

## 6. 目标 lineage 是否声明且符合仓库现实

**结论：通过。**

- 当前分支为 `brownfield-round2`。
- `main` 与该分支的 merge-base 均为 `235a121`。
- 当前 HEAD 为 `f415824`，即已归档的 `gate-degrades` store merge。
- `package.json` 为 4.1.0，CHANGELOG 明确 v4 已成为 `main` 主线。
- requirement 声明目标 `main`，禁止落入 v1/v3，与仓库现实一致。

## Out-of-scope 检查

**结论：通过。**

§五提供了明确的 out-of-scope 清单 O1–O6，并给出理由。需要在修订时补入 REQ-6 所要求的并发前置/非目标，若选择不提供锁定保证。

## Advisories

无。本轮发现均属于目标状态歧义、缺失边界、不可兑现的验收条件或与 state A 的冲突，因此均计入正式问题。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | AC-AP-15 的充分性承诺不成立：R1/R2/R3 未覆盖 gate 完整 C2/C3/C4 判据 | high | 1 | open |
| REQ-2 | tasks/ledger 缺失及 readiness 文件的 unsafe/unreadable 路径语义未定义 | high | 1 | open |
| REQ-3 | `--force` 的证据协议和可豁免范围不明确，并可能 force 掉 ABANDONED 硬禁令 | high | 1 | open |
| REQ-4 | 允许 STEP5 归档与 RUNBOOK 的 STEP5→STEP6 状态机及实际 precedent 冲突 | high | 1 | open |
| REQ-5 | 共享分类器归位、完整共享 API 和 readiness 相对既有 preflight guards 的顺序未定 | med | 1 | open |
| REQ-6 | readiness 检查到 commit/move 之间的并发修改与 TOCTOU 未覆盖 | high | 1 | open |
| REQ-7 | B5 与现有 AM-13/AM-46/AM-47 测试及 living spec 冲突，迁移范围未声明 | med | 1 | open |

VERDICT: 7 issues open
