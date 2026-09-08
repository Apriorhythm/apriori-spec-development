# spec-review-v4 — gate-id-pattern

## 复核结论

SPEC-6 已关闭。SPEC-2 的 child 隔离方案在安全契约层成立，但尚未落实到各模块的调用设计；SPEC-7 缺少非 timeout 失败场景；SPEC-8 在 `tasks.md` 中仍残留已撤销的 64-char cap。

## 正式问题

### SPEC-2：模块设计仍沿用进程内匹配，未接入 config child 通道

**描述**

安全契约要求 config 来源的每一次实际匹配都进入 `lib/id-match-child.js`。但各模块的具体设计仍描述旧路径：

- G2：构造 `idRe` 后调用现有 `collectScenarios*` 和 `parseTap`；这些函数当前直接调用进程内 `leadId`。
- G4：`checkScenarioIds` 内部直接调用 `leadId`。
- G5：D6 把 `idp.source` 传给现有 `collectScenarios`，同样是进程内匹配。
- `resolveIdPattern` 只返回 `{source, origin}`，设计没有定义负责按 origin 选择 child/in-process 的共享 matcher API，也没有说明 `origin` 如何贯穿 scenario 与 TAP 两个批次。

因此安全契约与模块实现指令互相冲突。实现者逐项执行 G2/G4/G5 时，会完全绕过新 child。

**风险**

config 中的灾难性 regex 仍可能在 `verify`、`gate`、`check`、`doctor` 主进程内执行并挂死 CI；或者实现阶段被迫重构 `collectScenarios*`、`parseTap`、`checkScenarioIds` 的签名与返回形状，造成显著返工。

**建议**

在 design 中定义并贯穿一个明确的共享匹配抽象，例如：

```text
matchLeadIds(texts, resolvedPattern)
  config  -> id-match-child.js
  flag/default -> leadId in-process
```

并逐模块写明：

- `collectScenarios*` 先收集 title，再批量匹配并重建 `byId`/`unidentified`/`duplicates`；
- `parseTap` 先 lex/decode descriptions，再批量匹配并重建 `results`/`untagged`/`unattributedFailures`；
- CK-04 和 D6 使用同一 abstraction；
- child failure 如何进入现有 run/result shape；
- exported `leadId`、`parseTap`、`collectScenarios*` 的兼容签名是否保持。

### SPEC-7：五类 child failure 只覆盖了 timeout

**描述**

requirement 和 design 声明 timeout、spawn error、signal、non-zero exit、malformed output 全部 fail closed。但新增的 SR-54、GT-25、CK-16、DR-18 都只构造灾难性 regex，并断言 child 被 timeout/kill。

没有 scenario 或测试 seam 能证明以下路径：

- child 无法 spawn；
- child 意外 signal/crash；
- child non-zero exit；
- stdout 不是 JSON；
- JSON 可解析但 `{ids}` shape、元素类型或批次长度不合法；
- `maxBuffer` 超限。

“shape 不符”的精确定义也没有写明。

**风险**

实现可能只正确处理 timeout，而在安装损坏、child bug、输出截断或资源错误时抛异常、错误回退或产生错误绑定，破坏四个命令的 fail-closed 契约。

**建议**

补充一个覆盖全部失败分类的 scenario，定义可注入的 child-runner 测试 seam。明确成功响应必须是唯一 JSON 文档，`ids` 长度等于输入 `texts` 长度，每项只能是 `string|null`；其他任何结果都按 config-origin failure 处理。分别断言 verify/check exit 2、gate structured ERROR、doctor D6 finding 且 D5 sentinel 不执行。

### SPEC-8：`tasks.md` 仍要求实现已撤销的 64-char cap

**描述**

spec、requirement amendment 和 design 安全契约已经撤销 64-char cap，并明确保持 `leadId` 公共语义。但执行清单 T4 仍写：

```text
实现 ... 64 字符识别上限 ...
```

`tasks.md` 是 STEP5 的有序实施清单，该指令会直接要求实现一个 spec 明确禁止的行为。

**风险**

执行者可能按 tasks 引入 breaking change，使长 ID 或依赖后续 context 的自定义 pattern 静默失配；即使测试发现，也会造成确定性的返工。

**建议**

从 T4 删除“64 字符识别上限”，并增加一句“不得截断 title/TAP description；保持 `leadId` 完整输入语义”。

## 已验证关闭

### SPEC-6：verified

主 `resolveIdPattern` 样例已完全移除原始 `e.message`，所有 pattern 错误统一通过 `sanitizeMsg`；80/200 字符上限都包含 ellipsis，SR-52 覆盖 flag/config 两个来源。

SPEC-1、SPEC-3、SPEC-4、SPEC-5 保持 verified。

## 外部共享状态

没有新增持久化外部共享状态。child process 的创建、运行和终止已在协议中声明；其异常分类覆盖缺口记录为 SPEC-7。

## Advisories

- design 的测试布局仍写 SR-50..53、GT-22..24、CK-13..15、DR-16..17，未包含新增 SR-54、GT-25、CK-16、DR-18；`tasks.md` 的测试范围已更新，建议同步 design。
- ledger 的 SPEC-1 行含未转义 pipe，Markdown 列结构已损坏；当前 `parseLedger` 因取最后一列仍可能读到 `verified`，但代录本轮 delta 时应把单元格内 pipe 写成 `\|` 并恢复标准五列。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-2 | 合法但灾难性回溯的外部 regex 可阻塞四个命令；设计只有语法校验，没有 ReDoS 边界。 | high | STEP2·r1 | open — reopened in spec-review-v4：安全契约要求 config child matching，但 G2/G4/G5 仍明确走进程内 `leadId`，未设计 matcher 接线 |
| SPEC-6 | 错误消息拼接原始 `e.message` 会二次泄漏未净化 source；`boundedSource` 实际上限 81 字符。 | med | STEP2·r2 | verified |
| SPEC-7 | child probe 的输入传递与失败分类未定义（`-e` 插值为注入面；spawn/signal/non-zero/malformed 无契约；三消费点缺 probe-failure 场景）。 | high | STEP2·r3 | open — fixed incomplete：stdin/`shell:false` 协议已定义，但 scenarios 只验证 timeout，其他失败类及响应 shape 未覆盖 |
| SPEC-8 | 64-char cap 是未兼容的公共识别语义变更，且违反 req 范围外“不动 `leadId`”声明。 | high | STEP2·r3 | open — reopened in spec-review-v4：spec/design 已撤销，但 T4 仍明确要求实现该 cap |
| SPEC-ADV-1 | Advisory batch acknowledged (2 items: design 测试布局未列新增 scenarios；ledger SPEC-1 行的 pipe 未转义导致五列表结构损坏)。 | — | STEP2·r4 | advisory-acked |

VERDICT: 3 issues open
