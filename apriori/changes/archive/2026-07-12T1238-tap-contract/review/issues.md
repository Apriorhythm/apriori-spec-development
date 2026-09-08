# Issue ledger — tap-contract

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws beside their docs in this dir).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| TC-1 | version 行的位置/重复/作用域未定义。 | mid-stream 版本被忽略或诊断文本误判。 | STEP0·r1 | verified |
| TC-2 | escape 解码范围与 directive/ID 处理顺序不完整。 | \# 归因/skip/失败分类分叉。 | STEP0·r1 | verified |
| TC-3 | YAML 块未闭合 fail-open/closed 未定。 | 错误 --- 吞掉后续失败成新假绿。 | STEP0·r1 | verified |
| TC-4 | stdout/stderr 分离的报告/JSON 合同不精确。 | 机器合同与迁移补救不一致。 | STEP0·r1 | verified |
| TC-5 | TAP14 未处理构造"行级忽略"范围过宽。 | 真实点被忽略或 pragma 造成假 ERROR。 | STEP0·r1 | verified |
| TC-6 | doctor D5 新分类缺 status/exit 矩阵。 | doctor 实现/测试分叉。 | STEP0·r2 | verified |
| TCSPEC-1 | SR-41 未绑定 0/11/15 边界与 YAML 内版本诊断。 | 实现只拒 9/99/banana 仍过测。 | STEP2·r1 | verified |
| TCSPEC-2 | SR-43 缺 \\# 转义顺序边界。 | directive 分割在转义反斜杠附近漂移。 | STEP2·r1 | verified |
| TCSPEC-ADV-1 | Advisory:SR-47 一场景四行为,拆分降弱测风险。 | 已拆为 SR-47/48。 | STEP2·r1 | advisory-acked |
| TCIMPL-1 | stderr-only TAP 形检测漏 Bail out!(verify 与 doctor 双处)。 | 误接管道的 bail-out 拿不到 2>&1 提示。 | STEP5·r1 | verified |
