# codex P5 raw — STEP2 review round 2 (resumed thread 019f3f1c-1a41-7553-acde-5da7c5d889ef)

我会从磁盘重读更新后的 spec 和 design，重点核对 `PC-15` 是否同时约束 SSR、内联 JSON、客户端 DOM 写入和回归测试范围，然后再扫新增文本有没有引入新的执行风险。

我看到 `PC-15` 的 spec 覆盖面是完整的；我还要确认 design 里 `jsonForScript` 的替换目标是不是实际写成了安全的 `\\u003c` 这类序列，因为普通渲染里看起来像被显示成原字符了。

A) SPEC-1 判定 + 新问题

SPEC-1 不能 flip 到 verified，需要 reopen。

spec 里的 `Requirement: Output Safety (XSS)` 与 `PC-15` 覆盖面是对的：明确了 `SSR` 文本插值要 `HTML-escape`，内联 `<script>` 中的 JSON 要额外转义 `<`, `>`, `&`, `U+2028`, `U+2029`，前端渲染用 `textContent`，并要求 regression 覆盖 `PC-01` / `PC-06` / `PC-09`。

不足在 design §5b：`jsonForScript(obj)` 的具体替换说明写成了 `JSON.stringify` 后替换 `<`→`<`、`>`→`>`、`&`→`&`、`U+2028`→实际分隔符字符、`U+2029`→实际分隔符字符。按字面实现等于没有安全转义，`</script><script>...` 仍可逃出内联脚本上下文，stored XSS 仍成立。建议把设计改为明确替换为安全 ASCII escape 序列，例如 `<`→`\u003c`、`>`→`\u003e`、`&`→`\u0026`、`U+2028`→`\u2028`、`U+2029`→`\u2029`，并在 `PC-15` 测试中断言内联脚本源码不含裸 `</script`、裸 `<script` 或实际 `U+2028/U+2029` 分隔符。

新 formal gap：未发现新的独立 formal issue。  
Advisory：design 的目录布局仍漏列新增 `src/escape.js`；§8 测试策略的场景清单未显式加入 `PC-15`，虽 §5b 已写测试计划，但建议同步，避免执行清单遗漏。

B) LEDGER DELTA

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | Reopen: `PC-15` spec covers stored XSS, but design `jsonForScript` replacement mapping shows literal `<`, `>`, `&`, `U+2028`, `U+2029` preserved instead of safe escape sequences, so inline JSON can still break out of `<script>`. | high | STEP2·r2 | open |
| ADV-STEP2-r2 | advisory batch: add `src/escape.js` to directory layout; mirror `PC-15` into §8 test strategy list. | — | STEP2·r2 | advisory |

VERDICT: 1 issues open