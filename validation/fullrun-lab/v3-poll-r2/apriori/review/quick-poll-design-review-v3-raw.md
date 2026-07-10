# codex P5 raw — STEP2 review round 3 (resumed thread 019f3f1c-1a41-7553-acde-5da7c5d889ef)

我会重读更新后的 `design.md` 相关段落和 `specs/poll.md`，重点看 `jsonForScript` 是否已经以可执行实现不会误读的方式表达为安全转义序列，并确认 `PC-15` 已进入测试和目录清单。

A) SPEC-1 判定 + 新问题

SPEC-1 可以 flip 到 verified。更新后的 design §5b 已把 `jsonForScript(obj)` 明确为 `JSON.stringify(obj)` 后替换为安全 ASCII `\uXXXX` 转义序列：`<`→`\u003c`、`>`→`\u003e`、`&`→`\u0026`、`U+2028`→`\u2028`、`U+2029`→`\u2029`，并明确产出的内联脚本源码不含裸 `</script`、裸 `<script` 或实际 `U+2028/U+2029` 分隔符。`htmlEscape(s)` 也明确映射到 HTML entity，且要求先替换 `&`，避免二次转义顺序问题。

测试与执行清单也补齐了：§5b 的 `PC-15` regression 覆盖 `PC-01/06/09` 渲染路径，断言 SSR、内联 `<script>` JSON 源码、前端 `textContent` 路径；§8 已把 `escape/XSS (PC-15)` 纳入测试策略；§9 已把 `src/escape.js` 纳入目录布局。原 stored XSS formal gap 已充分覆盖。

快速复扫未发现新的会导致返工或生产事故的 formal gap。

B) LEDGER DELTA

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | User-controlled `title` / `options[].text` output safety is now specified across SSR `htmlEscape`, inline-script `jsonForScript` safe ASCII escapes, frontend `textContent`, and `PC-15` regression coverage for `PC-01/06/09`. | high | STEP2·r1 | verified |
| ADV-STEP2-r3 | advisory batch: no new advisories. | — | STEP2·r3 | advisory |

VERDICT: no major issues, ready to proceed to execution