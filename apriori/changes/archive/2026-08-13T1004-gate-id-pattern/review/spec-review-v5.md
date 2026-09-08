# spec-review-v5 — gate-id-pattern

## 复核结论

SPEC-2、SPEC-8 已完整关闭。SPEC-7 的协议与 scenario 已补齐，但新增 SR-55 没有传播到 STEP5 执行清单和 design 测试布局，仍存在一个会导致返工的缺口。

## 正式问题

### SPEC-7：SR-55 未进入测试实施清单

**描述**

spec-runner delta 已新增 SR-55，完整覆盖：

- timeout；
- spawn error；
- signal；
- non-zero exit；
- malformed output；
- 合法 success shape；
- flag/default origin 不调用 child。

但 `tasks.md` T3 仍写“SR-50..SR-54”，design 的测试布局也仍写“SR-50..53”。两处都明确排除了 SR-55。

`tasks.md` 是 STEP5 的有序执行清单。按其实施时，shared child runner 最关键的五类 fail-closed 路径不会获得对应红测试；只有 timeout 路径会由 SR-54、GT-25、CK-16、DR-18 间接覆盖。

**风险**

spawn、signal、non-zero 和 malformed-output 分支可能实现错误或异常逃逸，直到 T16 的机械绑定发现 SR-55 未绑定才返工；若机械验证被误用或绕过，则损坏安装或 child protocol 错误可能进入生产。

**建议**

同步修改：

- T3：`SR-50..SR-55`，明确 SR-55 通过 injectable child-runner seam 表驱动覆盖全部五类失败、success shape 和 inline origins；
- design 测试布局：列出 SR-50..55、GT-22..25、CK-13..16、DR-16..18。

## 已验证关闭

### SPEC-2：verified

设计已定义 `makeIdMatcher(resolved)`，明确 config → child、flag/default → inline，并将 matcher 贯穿：

- scenario structure collection → `bindIds`；
- TAP lex/decode → description batch matching；
- CK-04 CLI 主路径；
- doctor D6；
- gate 通过 verify 继承。

旧 exports 保留兼容签名，`leadId` 原样导出。config 来源已不存在未声明的进程内实际匹配路径。

### SPEC-8：verified

64-char cap 已从 spec、design 和 T4 全部撤销；T4 反向明确不得截断 title/TAP description，`leadId` full-input 语义保持。

SPEC-1、SPEC-3、SPEC-4、SPEC-5、SPEC-6 保持 verified。

## 外部共享状态

没有新增持久化外部共享状态。child process 的初始化、运行、终止、输出校验与失败清理均已定义；仅其测试任务传播缺口记录为 SPEC-7。

## Advisories

- `makeIdMatcher` 的具体模块归属和 export 名单未显式写出。依赖方向表明放在 `spec-runner.js` 最自然，因为 `leadId`、collect、`parseTap` 均由该模块持有，且 check/doctor 已依赖它；建议在 design 中直接注明。
- ledger 的 SPEC-1 行仍因未转义 pipe 而不是标准五列表格；flow-state 的 gate⑤ 记录称“无 reopened ID”，但此前多轮确有 `fixed/rejected → open` 事件。两者不改变本 change 的产品行为，但建议修复审计记录。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-2 | 合法但灾难性回溯的外部 regex 可阻塞四个命令；设计只有语法校验，没有 ReDoS 边界。 | high | STEP2·r1 | verified |
| SPEC-7 | child probe 的输入传递与失败分类未定义（`-e` 插值为注入面；spawn/signal/non-zero/malformed 无契约；三消费点缺 probe-failure 场景）。 | high | STEP2·r3 | open — fixed incomplete：SR-55 已定义协议与完整 oracle，但 tasks T3 和 design 测试布局均未纳入该 scenario |
| SPEC-8 | 64-char cap 是未兼容的公共识别语义变更，且违反 req 范围外“不动 `leadId`”声明。 | high | STEP2·r3 | verified |
| SPEC-ADV-1 | Advisory batch acknowledged (2 items: 明确 `makeIdMatcher` 模块归属/export；修复 ledger SPEC-1 表格结构及 gate⑤ reopened 记录)。 | — | STEP2·r5 | advisory-acked |

VERDICT: 1 issues open
