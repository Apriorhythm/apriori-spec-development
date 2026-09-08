# spec-review-v1 — gate-degrades

## 维度 1：场景是否覆盖所有可见行为与失败边界

结论：存在两个需要修正的覆盖缺口。

### SPEC-1

- 描述：冻结需求的 M4 明确包含两种失败条件：builder 返回非空 `errors`，或没有产出可信 `texts`。GT-35 将其收窄成“builder reports a reason”，T6 也只使用真实 builder 会返回非空 errors 的五类 fixture，没有覆盖 `{ errors: [], texts: null }`。
  
  D3 虽然提到 `!texts`，但建议的 `{infra: errors}` 在该输入下会形成 ERROR/2 且 `errors: []`，违反 M4 对非空错误原因的要求；若实现者只检查 `errors.length`，所有现有任务仍可能通过并错误继续到 C7。
- 风险：med。冻结需求的一条 fail-closed 防御没有进入 delta spec 和可执行任务，可能在实现或后续 builder 演进时让不可信 projection 继续参与检查，或产生没有诊断原因的 ERROR。
- 建议：
  - 在 GT-35 中明确加入“builder 未产出可信 `texts`，即使 errors 为空”；
  - 在 D3 中规定此时合成确定的 infrastructure error；
  - 在 T6 或独立任务中通过 `_setProjectionBuilder` 注入 `{projection, errors:[], texts:null}`，断言 ERROR/2、`errors` 非空且 C7 不出结论。

### SPEC-2

- 描述：两个负向副作用保证已经写进场景，但 tasks 没有真正观察它们：
  - GT-36 声明 skipped-C1 路径不执行场景匹配、不会启动 matcher child；T7 只测试四种解析失败，未在一个有效 config-origin pattern 下用 `_setChildRunner` 断言零调用。
  - GT-38 声明 archived T7 路径完全不建 projection；T9 只断言 C1/C7/C4/退出码，没有用 `_setProjectionBuilder` 断言零调用。
  
  T15 只覆盖 test-command runner，不能证明上述两个不同的零调用保证。
- 风险：med。错误实现可能在 T7 下启动不必要的 matcher child，或在 archived change 上构建无用 projection；前者可能因 matcher 终止而把应为 INCOMPLETE/BLOCKED 的结果变成 ERROR，后者可能让 archived gate 被不再需要的 delta/projection 错误阻断。
- 建议：
  - 给 GT-36 增加有效 config-origin id-pattern fixture，以 `_setChildRunner` 断言零调用；
  - 给 GT-38 增加 `_setProjectionBuilder` 零调用断言；
  - 将这两项明确写入 T7/T9，而不只依赖实现说明。

其余可见行为覆盖完整：T1–T7 来源分类、四值优先级、JSON/人类输出、projection 失败、C7、hotfix/flow precedence、archived、doctor D5 分支及配置齐备回归均有对应场景和任务。

## 维度 2：共享状态的 init / runtime update / cleanup-invalidation

结论：设计完整，但执行清单遗漏 cleanup 约束。

### SPEC-3

- 描述：D8 正确给出两个模块级 seam 的三个时刻，并要求每次 override 都在 `finally` 中 `_set*(null)`。但它声称 tasks 已为此单列任务，实际 T16 只验证“安装后清空能恢复默认”，没有要求 T14/T15 等所有使用 override 的测试采用 `finally` 清理。
- 风险：low。任何中途失败的断言都可能把模块级 override 留给同进程后续测试，造成级联失败、假阳性或顺序依赖，显著增加 STEP5 返工。
- 建议：在 tasks 中增加明确条目，要求每个 `_setProjectionBuilder` / `_setTestRunner` 使用点都通过 `try/finally`（或等价的测试 cleanup hook）恢复为 `null`；T16 保留作为恢复语义测试。

init 为 `null`、runtime 通过 `_set*` 更新、cleanup 回到真实函数的设计本身正确。对选定的 getter 架构，D1.3 要求在调用点读取 `currentProjectionBuilder()` 也是正确的；SR-73 已明确声明“read at call time, never captured at module load”。

## 维度 3：与状态 A 或既有约定的冲突

结论：通过。

- gate 的 MODIFIED block 与 living spec 比较后，16 个既有场景全部保留；只有 requirement prose 和 GT-11 按预期扩展。
- doctor 的 MODIFIED block只改变 DR-07。
- 三份 delta 的 `apriori-base` 均与当前 living spec 指纹匹配，`check --self` 通过。
- D2.2 的六条 `resolveTestCmd` 规则覆盖缺席/null/undefined、空字符串、纯空白、合法字符串、config error、config value 和所有非字符串输入，结果与冻结需求一致。
- D6 的目标顺序 `idPatternBroken → cfgCmd.error → noRun → missing → probe` 与当前源码结构兼容，并正确处理“无配置 + `--no-run`”：D5 保持 `n/a`。invalid id-pattern 与 config problem 的既有优先级也未破坏。
- projection 仍通过共享 archive-merge 实现，未引入新的路径解析或文件读取约定。

## 维度 4：spec、design 与 tasks 是否闭合

结论：除 SPEC-1 外，另有一处任务与设计/规格不一致。

### SPEC-4

- 描述：D1.2 明确的新导出集合是 `buildChangeProjection`、`currentProjectionBuilder`、`_setProjectionBuilder`、`_setTestRunner`；`currentTestRunner` 仅供 `verify()` 内部读取。SR-73–75 也只要求导出 projection resolver、builder 和两个 setter seam。
  
  tasks I1 却要求“导出四个符号 + `buildChangeProjection`”。结合前面列出的四个新增函数，这会额外导出 `currentTestRunner`，扩大公共 API，超出 design、delta spec 及冻结范围。
- 风险：med。实现者按 tasks 执行会产生未声明的公共接口，并迫使 STEP6 KB 记录或删除它，造成直接返工。
- 建议：把 I1 改为明确的精确集合：只导出 `buildChangeProjection`、`currentProjectionBuilder`、`_setProjectionBuilder`、`_setTestRunner`；`currentTestRunner` 保持模块私有。

除上述问题外，spec、design 和 tasks 的映射完整，包括文档、CHANGELOG、D8 回归、JSON 键集、配置齐备路径及 STEP5 出口。

## 维度 5：安全性

结论：通过。

新路径继续使用共享 projection builder 和既有 containment/validation；没有复制 delta 解析逻辑。非字符串和空白 test command 在进入 `spawnSync` 前被拒绝；T7 不运行测试命令。错误消息不回显任意对象或执行输入。doctor 的分支调整不改变权限、文件写入或命令执行边界。

## Advisories

- GT-11 的 WHEN 枚举仍写 PASS、BLOCKED 和 exit-2，未显式列出 INCOMPLETE；THEN 与 T10 已覆盖该类别。建议补上 INCOMPLETE，使场景自包含。
- T14 建议明确规定 gate 模块在安装 override 前已经加载，并在连续调用之间更换或清空 override，从而确定性地击穿“模块加载时 hoist builder”的错误实现。
- gap-report R2 要求在新增失败测试前记录一次全量绿色基线；tasks 当前第一次全量运行是 T20，此时新测试已加入。建议在 T1 前增加基线运行，便于区分既有失败与预期 TDD 红灯。

## Ledger delta

追加以下行：

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | GT-35 and tasks omit the frozen M4 branch where the builder returns no trustworthy texts with empty errors, while D3 would produce an opaque empty-errors ERROR | med | STEP2·r1 | open |
| SPEC-2 | Tasks do not observe GT-36's zero matcher-child call or GT-38's zero projection-build guarantee, leaving two negative side effects unbound | med | STEP2·r1 | open |
| SPEC-3 | Design requires every module-level seam override to be reset in finally, but tasks only test manual clear/restore and do not enforce cleanup at each use site | low | STEP2·r1 | open |
| SPEC-4 | Task I1 exports currentTestRunner in addition to the exact public symbols declared by the spec and design, expanding the API beyond the frozen scope | med | STEP2·r1 | open |

VERDICT: 4 issues open
