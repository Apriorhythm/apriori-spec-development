# req-review-v1 — id-pattern-and-delta-notes requirement review

评审对象：`requirement/req-v1.md`  
评审轮次：1  
评审角色：P1 senior requirements reviewer  
评审方式：只读静态核对 requirement、KB、living spec 与实际源码。

## 1. 目标状态 B 是否清楚且无歧义

**结论：未通过。** D6 分类规则、`## Notes` 状态边界及非-Requirement h3 的状态矩阵尚未定义完整。

### REQ-3 — “形似 ID 的前导 token”没有可执行定义

- **描述**：B2 / AC-IP-10～12 要求 D6 区分“没有前导 ID”和“有形似 ID、但不匹配当前 pattern”，但没有定义“形似”的语法、token 边界或提取规则。`AC-BIS-01`、`AC-30f` 很直观，但 `ac-01`、`AC_01`、`AC-`、`123`、`AC-01f2`、`AC-01:`、前导空白以及紧邻下划线等输入无法唯一分类。也未明确 detail 中“pattern 的来源”是 regex source、`origin`，还是两者都要。
- **风险**：med。不同实现会给同一标题相反的修复建议，正好破坏本 change 的核心目标；AC-IP-10～12 也无法形成唯一测试 oracle。
- **建议修复**：钉死一个独立、确定性的分类契约。例如：对标题沿用 `leadId(title, new RegExp(DEFAULT_ID))`，能提取 ID 但当前 matcher 返回 null 的归入“pattern mismatch”，否则归入“missing ID”。同时规定：
  - 使用 trim 后标题还是原始标题；
  - 后继字符边界仍为 `[A-Za-z0-9_]`；
  - detail 同时输出 bounded regex source 和 `origin`；
  - 样例数量、选择顺序、截断方式；
  - 两类同时存在时恰好产生几条 D6 finding，以及 `findings` 计数如何变化。

### REQ-4 — `## Notes` 的状态机边界与零操作语义不完整

- **描述**：AC-IP-14 字面上规定“delta 含 `## Notes`”时 archive/verify 正常通过；这也覆盖 Notes-only delta，但 state A 的 D-AM-3 明确规定零操作 delta 必须失败。要求还没有明确：
  - `## Notes` 是否可位于第一个操作段之前、操作段之间及文件末尾；
  - 多个 `## Notes` 是否允许；
  - Notes 在下一个 fence 外 h2 处结束，还是有别的终止规则；
  - Notes-only 是否仍为 zero-op；
  - Notes 位于首个操作段之前时，合法 CAS stamp 必须放在 Notes 之前，还是 Notes heading 本身改变 `sectionSeen`；
  - 未闭合 fence 是否使余下文件继续保持 Notes/opaque。
- **风险**：high。AC-IP-14 与当前零操作契约存在直接冲突；不同实现还会对同一 mutation delta 得出“有 stamp”“无 stamp”或“晚 stamp”的不同结论。
- **建议修复**：给出明确的 `IN_NOTES` 转移表，并将 AC-IP-14 改为“一个除此之外合法且至少含一个操作的 delta”。至少增加这些断言：
  - Notes-only 仍按 zero-op 拒绝；
  - Notes 可出现在哪些状态、是否可重复；
  - 进入 Notes 时 flush 当前 requirement；
  - fence 外的下一个 h2 结束 Notes：合法操作 h2 恢复解析，其它 h2仍按 AC-IP-16 报 problem；
  - Notes 内的 stamp、Requirement、Scenario 全部不改变任何 parser/CAS 状态；
  - Notes 前的合法 stamp 保留；明确 Notes heading 是否计入 CAS 的“first delta section”；
  - fence 内 h2 不结束 Notes，未闭合 fence 使余下内容保持 opaque。

### REQ-5 — 非-Requirement h3 只定义了一个状态，缺少 heading-level/state 矩阵

- **描述**：B3 / AC-IP-17～18 只定义 `IN_REQUIREMENT` 中的非-Requirement h3。未定义同一 h3 位于 `FILE_PREAMBLE`、普通 section preamble、RENAMED section 时是合法自由文本还是 problem；也未明确 h4/h5 的行为。发生问题后，当前 requirement 是保留、丢弃，还是仅删除该 h3 行，也没有规定。虽然 archive/verify 最终拒绝整个 delta，`parseDeltaStrict` 返回的 buckets 仍会因上述选择不同而不同。
- **风险**：med。AI 可以实现出多种均符合 AC-IP-17 字面的状态机，并可能意外收紧 preamble/h4/h5，或继续把错误 h3 后面的内容吸收入 block。
- **建议修复**：增加完整矩阵并固定错误后的恢复策略。建议明确：
  - 只有 `IN_REQUIREMENT` 中匹配 `^###\s`、但不匹配 `REQ_LINE_RE` 的行是新 problem；
  - FILE_PREAMBLE、section preamble、RENAMED 中同类 h3 是否保持 state A 的自由文本语义；
  - `#### Scenario:` 在 requirement 内外继续沿用现有规则；
  - 其它 h4/h5 是否保持正文/自由文本；
  - 非-Requirement h3 是否终止并丢弃当前 block，以及下一合法 Requirement/h2 如何恢复；
  - fence 内所有 heading 继续 opaque。

## 2. 边界、异常与失败路径是否覆盖

**结论：未通过。** REQ-1、REQ-4、REQ-5 涉及未覆盖的既有分类、零操作、CAS、fence 和 parser 恢复路径。

### REQ-1 — AC-IP-09 的 D5“pattern-insensitive”断言被实际算法反例推翻

- **描述**：`classifyProbe` 用 `DEFAULT_ID` 调 `parseTap`，然后将 tagged result 的 `pass + fail` 与 untagged 数量相加；tagged 的 SKIP/TODO 不进入这个计数。反例：
  - TAP：`ok 1 - AC-30f pending # SKIP flaky`
  - 旧 pattern：`AC-30f` 不绑定，进入 `untagged`，`parsed = 1`，D5 为 ok；
  - 新 pattern：绑定成 `AC-30f`，结果只有 `skip: 1`，`parsed = 0`，D5 落入“truncated or malformed” finding。
  
  `AC-BIS-01` 以及 `not ok ... # TODO` 有同样反例。因此 AC-IP-09 在 state A 算法下不可满足，`truth/doctor.md` 的 pattern-insensitive 声称也不成立。
- **风险**：high。仅替换常量会让合法 TAP plumbing 从 HEALTHY 变成 FINDINGS，且 requirement 同时要求它不得变化；当前文档不能直接交给 AI 实现。
- **建议修复**：在 requirement 阶段决定 D5 的目标语义，不要把决定推迟成“STEP2 若不成立再设计”。可选方向包括：
  - 让 D5 的 TAP 点计数直接基于 lexer 的 point/skip/todo 结果，与 ID 提取彻底解耦；或
  - 明确 D5 保持独立的旧分类 regex，并声明它不再是 `DEFAULT_ID` 消费者。
  
  无论选择哪条，都应增加仅含 newly-recognized SKIP、仅含 TODO、混合 pass/fail/skip、空计划和 unexplained non-zero 的验收用例，并同步修正 doctor living spec 与 KB。

其余 null、out-of-range、timeout、并发和 rollback 类路径主要继承 state A：config-origin matcher 的 timeout/failure channel、CAS 并发保护及 archive preflight failure-atomicity均未被目标显式改写。应在修订版中标记为“继承且不变”，避免实现者误以为遗漏。

## 3. 是否存在隐含但未声明的状态变化或副作用

**结论：未通过。** 新建项目的 active config row 会覆盖新常量，且 D5 会产生未声明的诊断变化。

### REQ-2 — AC-IP-21 只要求修改模板的 Default 列，新建项目仍可能配置旧 pattern

- **描述**：`templates/process-config.md` 的 `id-pattern` 行同时有：
  - `Value`：实际写进新项目并由 `resolveIdPattern` 优先消费；
  - `Default`：说明列。
  
  `lib/init.js` 会把整份模板写成 `apriori/process-config.md`。AC-IP-21 只要求“默认值列”更新；若严格照此实现，只改第四列而保留第二列 `[A-Z]+-\d+`，新项目会走 `origin: config` 的子进程路径，并继续使用旧 pattern，完全遮蔽新 `DEFAULT_ID`。模板第 31 行的 built-in-default 说明也会陈旧。
- **风险**：high。新安装项目无法获得 B1 行为，而静态文档验收仍可能通过；这也是 `makeIdMatcher` config-origin 路径上的具体缺口。
- **建议修复**：AC-IP-21 应要求同一行的 `Value` 和 `Default` 两列以及模板说明文字全部更新。另加端到端验收：
  - fresh `apriori init` 后不手改 config；
  - `resolveIdPattern` 返回新 source、`origin: config`；
  - config-origin child 对 `AC-BIS-01`、`LIFE-DWS-01`、`AC-30f` 的标题和 TAP description 都返回完整 ID；
  - check、doctor D6、verify、gate C1 均得到相同行为。

REQ-1 所述 D5 HEALTHY/FINDINGS 变化也是未声明副作用，必须在目标状态中解决或明确接受。

## 4. 每条验收标准是否可写成可判定的 if/then

**结论：未通过。**

- AC-IP-01、03～08、11～13、16～20、22～24 基本可转换为确定性测试。
- AC-IP-02 在明确限定为 `leadId` 识别语义后可测试。
- AC-IP-09 当前存在确定反例，无法按 state A 实现。
- AC-IP-10～12 缺少“形似 ID”的 oracle，对应 REQ-3。
- AC-IP-14 未限定 otherwise-valid/non-zero-op，与 state A 冲突，对应 REQ-4。
- AC-IP-15、17～18 没有覆盖完整的 Notes/h3 状态转移和恢复语义，对应 REQ-4、REQ-5。
- AC-IP-21 只检查说明列，不能证明 fresh-init 的实际行为，对应 REQ-2。

## 5. 是否与当前状态 A 冲突

**结论：未通过。**

- **明确且有意的变更**：DEFAULT_ID 扩宽、D6 文案分支、Notes 语法及 requirement-body h3 收紧，均与当前 living spec/KB 不同，但 requirement 已将这些列为目标，不构成额外问题；后续 delta 与 KB writeback 必须同步。
- **未解决的冲突**：
  - `truth/doctor.md` 声称 D5 pattern-insensitive，但 REQ-1 的反例证明现有算法不是；
  - AC-IP-14 的无条件“正常通过”与 D-AM-3 的 zero-op refusal 冲突；
  - AC-IP-21 不足以改变 `init` 实际写出的 active config 值。

源码 grep 显示 §1.4 对 `DEFAULT_ID` 的实际消费者清单是完整的：config fallback、check helper default、doctor D5、doctor D6、verify/gate 路径均已覆盖；未发现遗漏的生产代码消费者。

## 6. target lineage 是否声明且符合仓库现实

**结论：通过。**

Requirement 声明 `brownfield-round2` 自 `main@235a121` 分出、产品线 v4、最终目标 main、禁止进入 v1/v3。实际仓库中：

- `main` / `origin/main` 位于 `235a121`；
- `brownfield-round2` 的 merge-base 为 `235a121`；
- 当前 HEAD 为 `f415824`，包含已归档的 change 1；
- change 2 保持 parked bundle，未混入本 change 的实现目标。

lineage 与实际分支关系一致，禁止合并目标也明确。

## Advisories

### ADV-1 — 严格超集结论应限定为 `leadId` 行为

对所有被旧 `leadId` 成功识别的输入，新 pattern 确实返回逐字节相同 ID：旧匹配后的字符必然不是 `[A-Za-z0-9_]`，因此新 pattern 不会继续吞后缀。check 的默认参数及 config-origin child 最终也都调用同一 `leadId` 契约。

但若把“匹配子串”理解为裸 `RegExp.exec`，结论不成立：`AC-30f` 的旧裸 regex 匹配 `AC-30`，新 regex 匹配 `AC-30f`；`AC-BIS-01` 的旧裸 regex还会从中间匹配 `BIS-01`。建议将 AC-IP-02 明写为“对每个旧 `leadId` 返回非-null 的标题”，避免测试作者验证错层。

### ADV-2 — 整个 delta 拒绝是与 state A 一致的 fail-closed 严重度

`parseDeltaStrict` 的任何 problem 已使 verify/archive 拒绝输入；非-Requirement h3 采用同一严重度能阻止 ADDED 路径静默污染 store，方向合理。应保留 CHANGELOG 中“改成 `## Notes` 或降级为正文”的迁移说明。

### ADV-3 — 三项打包具有不同风险轮廓

DEFAULT_ID/D6 属绑定与诊断行为；Notes/h3 属持久化语法和 archive preflight。后者兼容承诺更长期、失败面也更强。拆成两个 change 会降低失败耦合；若继续打包，至少应在 design/tasks/tests 中保持两条独立工作流和独立回归组。当前 Large tier 能覆盖这一点，因此仅作 advisory。

### ADV-4 — living spec 与 KB 的同步面应在后续产物中显式列出

至少涉及 config、doctor、archive-merge、check、spec-runner；尤其要修订 spec-runner 中写死旧默认的 SR-08/SR-53、doctor 的 D5/D6 契约及 archive-merge 的 fully-consuming parser requirement。该同步属于既有 Apriori writeback 流程，不计为本轮 requirement issue。

### ADV-5 — 明确 out-of-scope 已存在

§四提供了明确的 out-of-scope section，覆盖优先级、配置文件所有权、`leadId` 边界、额外 Notes 类别、存量修补和 parked change 2，满足本轮显式范围要求。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | AC-IP-09 的 D5 pattern-insensitive 断言不成立：newly-recognized SKIP/TODO 可使 D5 从 ok 变成 truncated/malformed finding；须先确定并声明 D5 的目标语义 | high | 1 | open |
| REQ-2 | AC-IP-21 只要求更新模板 Default 列；fresh init 的 active Value 仍可配置旧 pattern 并覆盖新 DEFAULT_ID，config-origin 路径因而得不到 B1 行为 | high | 1 | open |
| REQ-3 | D6 的“形似 ID 前导 token”没有语法、边界、样例选择及 pattern source/origin 输出契约，AC-IP-10～12 无唯一 oracle | med | 1 | open |
| REQ-4 | `## Notes` 未定义完整状态转移、位置、重复、fence 与 CAS 关系，且 AC-IP-14 未排除 Notes-only delta，和 state A 的 zero-op refusal 冲突 | high | 1 | open |
| REQ-5 | 非-Requirement h3 仅定义 IN_REQUIREMENT；FILE_PREAMBLE、section preamble、RENAMED、h4/h5 及错误后 block 恢复/丢弃语义未声明 | med | 1 | open |

VERDICT: 5 issues open
