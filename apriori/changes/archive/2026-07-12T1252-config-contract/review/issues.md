# Issue ledger — config-contract

Rows recorded on behalf of the reviewer (codex session 019f5310-28e4-7103-9c14-1c1181180f9b; raws beside their docs in this dir).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CC-1 | configTestCmd 坏配置行为对 verify/gate/doctor 未定。 | 坏配置被当缺失或跑不安全回退。 | STEP0·r1 | verified |
| CC-2 | 表行文法写 \| key \| value \| 但模板行是多列。 | 合法脚手架行被解析器忽略。 | STEP0·r1 | verified |
| CC-3 | fence/注释边界与同值重复语义含糊。 | 未闭合块处理实现分叉。 | STEP0·r1 | verified |
| CC-4 | 无需豁免时(stamped/ADDED-only)的 cas 配置错误未定。 | archive/gate 行为分叉。 | STEP0·r1 | verified |
| CCIMPL-1 | 非法 cas 值不算配置错误(banana 被当普通 token)。 | 静默无豁免而非点名坏配置。 | STEP5·r1 | verified |
| CCIMPL-2 | 行内 HTML 注释吃掉整行 live row。 | 合法配置行失效。 | STEP5·r1 | verified |
| CCIMPL-3 | C7 在无 unstamped 时仍咨询/打印 waiver。 | 违背 GT-16 silent pass。 | STEP5·r1 | verified |
