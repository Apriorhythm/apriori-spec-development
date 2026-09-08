# Design — tap-contract(事实对齐)

## 现状事实
- `runTestCommand`(spec-runner.js:155)把 stdout+stderr 拼接进 `out`——P1-1 病根。
- `parseTap` 由独立 regex 拼成:TAP_RE(全形点)、POINT_LINE_RE(plan 计数)、Bail out 大小写敏感 match、无 version 概念、无 YAML 概念;`#` 搜索不识别转义。
- doctor `classifyProbe` 直接消费 parseTap 的 {results, untagged, untaggedFails, bailout} + zeroTapParsed。

## 方案
- **新纯函数 `lexTap(stdout)`**(spec-runner 内部):先做行尾归一(CRLF→LF;lone-CR→LF),逐行分类为 typed token:
  `{kind: version|plan|point|bailout|pragma|yaml-open|yaml-close|diagnostic|indented|other, line, n}`;
  YAML 状态机(顶层 `---` 开、`...` 闭;未闭合→ lex 级 problem 带起始行号);缩进行一律 kind=indented(nested);version/plan/point/bailout/pragma 只在列 0 识别。
- **point 解析**:`^(not )?ok(?:\s+(\d+))?(?:\s+(-\s+)?(.*))?$`;指令切分:左→右找首个未转义 `#`(`\` 转义下一字符);指令 = `#` 后跳空白以 SKIP/TODO 开头(大小写不敏感);描述解码 `\\`→`\`、`\#`→`#`,其余反斜杠对原样;解码后 leadId。dashless 描述参与绑定。
- **parseTap 重写为 lexTap 消费者**:输出形状保持 `{results, untagged, untaggedFails, unattributedFailures, bailout, plans, points, dupNumbers}` + 新 `{version, lexProblems, planIndex}`;version 矩阵/多 version/晚 version/坏 attempt、YAML 未闭合、流中 plan(planIndex 之前与之后都有 point)、超 plan 编号 → 全部汇入 infraErrors 新条目。bail-out:`/^\s*bail out!/i`。pragma:`/^pragma [+-]\w+$/` 忽略不计点。
- **runTestCommand**:返回 `{out: stdout, stderr, status, signal, error}`——TAP 只吃 stdout;verify run 增 `stderr`;formatReport 尾部非空时列 `STDERR DIAGNOSTICS`(20 行/119+…/and-N-more);verifyJson 顶层 `stderr: string` 恒定;zeroTapParsed 只看 stdout,提示语加 `2>&1` 补救。
- **doctor**:classifyProbe 传入新形状;D5 矩阵:失败→ok(注明 verify 业务);不支持版本→finding(点名);stderr-only TAP 形→finding(fix `2>&1`);其余沿用。
- **兼容**:`untaggedFails` 数值语义保持(= unattributedFailures.length);既有导出面不减。

## SPEC 触点
spec-runner:MODIFIED「the TAP plan is a checked promise」(SR-26..31 保留 + SR-39 流中 plan + SR-40 超 plan 编号)、MODIFIED「unattributed test failures block GREEN」(SR-33..38 保留,归因条款改"含 dashless 的带 ID 描述")、ADDED「TAP is a version-aware protocol」(SR-41..48);doctor:ADDED DR-14(D5 矩阵)。
