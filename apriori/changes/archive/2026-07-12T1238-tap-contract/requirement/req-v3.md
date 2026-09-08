# 需求:tap-contract —— TAP 是协议,不是文本 (v3)

> change: `tap-contract` · tier: large · track: harden
> lineage: v4;不合并 main/v1/v3
> 来源:GPT-5.6 四审 P0-1 + P1-1 + P1-2 + P2-3(TAP 部分),关键病例均已本机复现。
> v2 修订:TC-1..5(version 行规则、escape 顺序表、YAML 未闭合 fail-closed、stderr 合同、pragma 白名单)+ doctor D5 advisory。

## 目标

verify 的 TAP 解析目前是一组独立 regex,对 TAP 规范的覆盖是"碰巧的子集":接受任意 `TAP version N` 却按不完整子集解析,产生假绿(`\#` 转义被当指令、`bAiL OuT!` 大小写变体被无视、lone-CR 行尾让失败点消失)与误拦(dashless 描述、`# SKIPPED:` 兼容后缀)。本变更把 TAP 处理升级为**版本感知的行级词法器**,并声明明确的支持契约。

## 支持契约(核心决策)

- **版本封闭矩阵(TC-1)**:无 version 行 / 12 / 13 / 14 → 接受;**其余一切数字版本(含 0..11 与 15+)→ infra ERROR**;列 0、YAML 外、以 `TAP version` 开头但不匹配"恰为数字"形状的 attempt(如 `TAP version banana`)→ infra ERROR;缩进/YAML 块内 → 诊断文本。
- **TAP 14 语义面(TC-5 收窄)**:转义序列、大小写不敏感 bail-out 按 14 处理;**唯一被忽略的 14 构造是顶层恰为 `pragma [+-]<word>` 形状的行(不计入 plan 点数)**;缩进 subtest 细节按既有缩进规则排除;除此之外任何顶层 point/plan/bail-out 形状的行一律按普通规则处理——没有其他"14 专属忽略"。
(版本矩阵已并入上条;原则不变:绝不"接受任意版本号却只解析一部分"。)
- **version 行规则(TC-1)**:只识别**列 0、YAML 块外**、恰为 `TAP version <digits>` 形状的行;**至多一个**,且必须出现在任何 plan/test point/bail-out **之前**;多个 version 行、晚到的 version 行、不可解析的数字 → infra ERROR。缩进行/YAML 块内的"TAP version 99"是诊断文本,不参与判定。

## 行为需求

1. **词法器(替换散落的 regex)**:逐行、每行剥至多一个尾随 CR;**lone-CR 行尾的流先归一化**(`\r` 不后跟 `\n` 时视同行尾)——失败点绝不因行尾风格消失。行分类:version 行 / plan 行 / test point(`ok`/`not ok`,列 0)/ bail-out / 注释诊断 / YAML 块(列 0 之外的缩进 `---`…`...` 属缩进行整体排除;**顶层** `---` 开的块内行不参与判定,**至 EOF 未闭合 → infra ERROR(exit 2),消息含起始行号**——错误的 `---` 绝不静默吞掉后续失败(TC-3))/ 其余。缩进行 = 子测试细节,照旧不计入顶层(node 嵌套 TAP 不回归)。
2. **test point 解析**:`(not )?ok` 后可选编号、可选描述(**`-` 分隔可选**——dashless 合法描述参与 ID 绑定,修 P1-2 误拦)、可选指令。**处理顺序(TC-2,写死)**:①左到右扫描找**第一个未转义 `#`**(`\` 转义其后一个字符)作为指令分隔;②指令 = 分隔后(跳过空白)以 `SKIP`/`TODO` 开头的词(大小写不敏感,`SKIPPED:` 等后缀合法——"starts with");③对**描述部分**解码转义表:`\\`→`\`、`\#`→`#`,**其余反斜杠序列原样保留两个字符**(不 ERROR、不吞);④对解码后的描述做 `leadId()` 提取。`\#` 因此绝不是指令分隔符(修 P0-1 假绿)。
3. **bail-out**:`bail out!` 大小写不敏感、允许前导缩进(嵌套 bail-out 同样终止整个 run——TAP 语义如此)→ 既有 infra ERROR 路径。
4. **plan 校验强化**:plan 出现在流中间(前后都有 test point)→ infra ERROR;test point 编号超出 plan 范围(如 `1..1` 配 `ok 2`)→ infra ERROR;既有单 plan/计数/重号规则不变。
5. **stdout/stderr 分离(P1-1,合同精确化 TC-4)**:TAP 只从 **stdout** 解析。`--json` 顶层 `stderr: string` **全结果类恒定存在**(无输出为空串,全文不截断);人类报告仅在 stderr 非空时列 `STDERR DIAGNOSTICS` 组(前 20 行,>120 字符裁到 119+`…`,`… and N more` 尾)。zero-TAP 判定只看 stdout——stdout 无 TAP 而 stderr 有 TAP 形内容时照判 zero-TAP,且提示消息给出 `2>&1` 补救。**行为变更,CHANGELOG 点名**。
6. **doctor 同步(P2-3a,D5 状态矩阵 TC-6)**:`classifyProbe` 复用同一词法器,D5 判定:
   - 探针 TAP 含失败(任意形状)→ D5 **ok**,detail 注明"测试有失败(verify 的业务),TAP 通道本身健康";
   - 不支持的 TAP version → D5 **finding**,detail 点名版本与支持矩阵;
   - stdout 无 TAP 而 stderr 有 TAP 形输出 → D5 **finding**,fix 给 `2>&1`;
   - 其余(含真正 not-TAP)沿用既有分类;doctor 总退出码遵循既有 findings 分级不变。
7. **回归钉子**:P0-1 的三个复现输入(`\#` TODO、`bAiL OuT!`、流中 plan)+ lone-CR 流 + `TAP version 99` + dashless 绑定 + `# SKIPPED:` + stderr 日志误拦,各一条场景。
8. **不回归**:SR-01..38 全部既有场景;计划外形状(plan-less、skip-all、嵌套)照旧。

## 非目标

- 完整 TAP 14 特性的结构化解析。**忽略白名单收窄(TC-5)**:仅顶层恰为 `pragma [+-]<word>` 形状的行被忽略且不计入 plan 点数;其余任何顶层行——只要形状是 test point/plan/bail-out——一律按普通规则处理,没有其他"14 专属忽略"。
- YAML 诊断块的内容解析(只做"不参与判定"的跳过)。
- verify 之外新增表面。

## 约束

- 零依赖;词法器为纯函数可单测;`parseTap` 导出面保持兼容(`untaggedFails` 等,doctor 消费)。
- CRLF 与既有 fence/CRLF 规则不冲突。

## 开放问题

- 无。
