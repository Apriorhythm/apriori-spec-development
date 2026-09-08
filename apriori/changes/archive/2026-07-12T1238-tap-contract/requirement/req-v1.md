# 需求:tap-contract —— TAP 是协议,不是文本 (v1)

> change: `tap-contract` · tier: large · track: harden
> lineage: v4;不合并 main/v1/v3
> 来源:GPT-5.6 四审 P0-1 + P1-1 + P1-2 + P2-3(TAP 部分),关键病例均已本机复现。

## 目标

verify 的 TAP 解析目前是一组独立 regex,对 TAP 规范的覆盖是"碰巧的子集":接受任意 `TAP version N` 却按不完整子集解析,产生假绿(`\#` 转义被当指令、`bAiL OuT!` 大小写变体被无视、lone-CR 行尾让失败点消失)与误拦(dashless 描述、`# SKIPPED:` 兼容后缀)。本变更把 TAP 处理升级为**版本感知的行级词法器**,并声明明确的支持契约。

## 支持契约(核心决策)

- **声明支持:TAP 12/13 与无版本行的流**(node --test、pytest-tap 等主流 runner 的实际输出)。
- **`TAP version 14` 流:接受,并正确处理本变更覆盖的 14 语义**(转义序列、大小写不敏感 bail-out、其余与 13 共享的行为);14 独有而本词法器不解析的构造(如 pragma、嵌套 subtest 块语法)保持"行级忽略不计入",与现状一致但**文档写明**。
- **`TAP version 15+` 或不可解析的版本行:infra ERROR(exit 2)**,消息点名版本与支持范围——绝不"接受任意版本号却只解析一部分"。

## 行为需求

1. **词法器(替换散落的 regex)**:逐行、每行剥至多一个尾随 CR;**lone-CR 行尾的流先归一化**(`\r` 不后跟 `\n` 时视同行尾)——失败点绝不因行尾风格消失。行分类:version 行 / plan 行 / test point(`ok`/`not ok`,列 0)/ bail-out / 注释诊断 / YAML 块(`---`…`...`,块内行不参与任何判定)/ 其余。缩进行 = 子测试细节,照旧不计入顶层(node 嵌套 TAP 不回归)。
2. **test point 解析**:`(not )?ok` 后可选编号、可选描述(**`-` 分隔可选**——dashless 合法描述参与 ID 绑定,修 P1-2 误拦)、可选指令。**指令识别**:未转义的 `#` 之后以 `SKIP`/`TODO` **开头**的词(大小写不敏感,允许 `SKIPPED:` 等后缀——TAP 规范"starts with");**`\#` 是转义的字面 `#`,不是指令分隔符**(修 P0-1 假绿);描述中的转义序列(`\\`、`\#`)按 TAP 14 解码后再做 ID 提取。
3. **bail-out**:`bail out!` 大小写不敏感、允许前导缩进(嵌套 bail-out 同样终止整个 run——TAP 语义如此)→ 既有 infra ERROR 路径。
4. **plan 校验强化**:plan 出现在流中间(前后都有 test point)→ infra ERROR;test point 编号超出 plan 范围(如 `1..1` 配 `ok 2`)→ infra ERROR;既有单 plan/计数/重号规则不变。
5. **stdout/stderr 分离(P1-1)**:TAP 只从 **stdout** 解析;stderr 保留为独立诊断通道——报告尾部原样附上(截断策略同 unattributed 组),`--json` 增 `stderr` 字段(全文)。logger 往 stderr 打的 `not ok ...` 不再造成误拦。**行为变更,CHANGELOG 点名**(把 TAP 管到 stderr 的项目会从"碰巧能跑"变为 zero-TAP 提示,提示消息里给出 `2>&1` 补救)。
6. **doctor 同步(P2-3a)**:`classifyProbe` 复用同一词法器——`not ok` + exit 0 的探针诊断为"测试失败"而非"not TAP"。
7. **回归钉子**:P0-1 的三个复现输入(`\#` TODO、`bAiL OuT!`、流中 plan)+ lone-CR 流 + `TAP version 99` + dashless 绑定 + `# SKIPPED:` + stderr 日志误拦,各一条场景。
8. **不回归**:SR-01..38 全部既有场景;计划外形状(plan-less、skip-all、嵌套)照旧。

## 非目标

- 完整 TAP 14 特性(pragma、显式 subtest 语法的结构化解析):行级忽略 + 文档声明,不实现。
- YAML 诊断块的内容解析(只做"不参与判定"的跳过)。
- verify 之外新增表面。

## 约束

- 零依赖;词法器为纯函数可单测;`parseTap` 导出面保持兼容(`untaggedFails` 等,doctor 消费)。
- CRLF 与既有 fence/CRLF 规则不冲突。

## 开放问题

- 无。
