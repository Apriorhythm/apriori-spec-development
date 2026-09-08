# Issue ledger — gate-id-pattern

<!-- recorded on behalf of the reviewer (codex read-only sandbox), R2 transcription rule; raw: review/req-review-v1-raw.txt -->

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | Q1–Q3 未收口，导致 `check` CLI、模板默认内容及 `parseConfig` 的全键语义不唯一。 | AI 可产出多个互不兼容但均看似满足需求的实现。 | STEP0·r1 | verified |
| REQ-2 | 非法 `id-pattern` 在 `doctor` 上应 exit 2 还是形成 D6 finding/exit 1 未定义，库入口异常形状也未声明。 | 可能破坏 doctor 的 FINDINGS/UNUSABLE 契约或让异常逃逸。 | STEP0·r1 | verified |
| REQ-3 | 冲突行、同值重复、空值、不可读/错误类型配置及 flag 覆盖坏配置的边界语义缺失。 | 坏配置可能静默回退、跨命令结果不一致或直接崩溃。 | STEP0·r1 | verified |
| REQ-4 | 四消费点只统一了来源优先级，未统一 pattern 的开头匹配和尾边界语义。 | 同一 `id-pattern` 可能被 verify/doctor 接受而被 check 拒绝。 | STEP0·r1 | verified |
| REQ-5 | AC1、AC4、AC6 和 AC7 含不稳定、可选或无确定 oracle 的表述。 | 无法据此生成唯一、可重复的验收测试。 | STEP0·r1 | verified |
| REQ-6 | 新 pattern 错误在既有文本和 `--json` 契约中的输出形状未声明。 | 可能破坏 gate/verify 的机器可解析接口。 | STEP0·r1 | verified |
| REQ-ADV-1 | Advisory batch acknowledged (3 items: won't-do 已存在确认；并发/超时/回滚不适用注明保持现状；文档清单应含配置格式说明——已吸收进 req-v2)。 | — | STEP0·r1 | advisory-acked |
| REQ-7 | `\|` 全键解析规则未定义 pipe 前连续反斜杠的奇偶语义，也未说明如何表达最终 regex source 中的 literal pipe。 | 不同实现可能产生不同的 cell 边界和配置值，并影响 regex 与 `test-cmd` 等所有键。 | STEP0·r2 | verified |
| REQ-ADV-2 | Advisory batch acknowledged (3 items: 样本证据记录不可变身份 hash/CLI 版本/确切计数；doctor 来源 detail 断言进 AC1；非 regex 键回归样本进 AC5——均已吸收进 req-v3)。 | — | STEP0·r2 | advisory-acked |
| REQ-8 | B6 模板文案「字面 pipe 写 \|」与 B5 语义冲突：`\|` 经解析产出裸 `|`（alternation），非 regex 字面 pipe。 | 用户/AI 照模板得到与文字承诺相反的正则，扩大匹配范围。 | STEP0·r3 | verified |
| REQ-ADV-3 | Advisory batch acknowledged (2 items: AC7 禁止性断言建议语义化——吸收进 STEP5 测试实现措辞；台账 REQ-1 行多余单元格——已就地修复)。 | — | STEP0·r4 | advisory-acked |
| SPEC-1 | `[\|]`（正则字符类中的 pipe）含未转义表格分隔符，无法按文档原样写入 process-config；模板与 literal-pipe AC 不可实现。 | high | STEP2·r1 | fixed (v3) — 模板单元格无 pipe 散文，指南移入 HTML 注释；CF-12 端到端断言整表（r2 复燃：design 模板行含未转义 [| verified |
| SPEC-2 | 合法但灾难性回溯的外部 regex 可阻塞四个命令；设计只有语法校验，没有 ReDoS 边界。 | high | STEP2·r1 | verified |
| SPEC-3 | doctor 在 D6 校验非法 id-pattern 前执行 D5 test command，违反前置校验和无副作用错误路径。 | high | STEP2·r1 | verified |
| SPEC-4 | verify 的 pattern 早退路径未定义如何保持 `--change --json` 的 projection/modules 既有契约。 | med | STEP2·r1 | verified |
| SPEC-5 | verify/gate 用 `|| null` 丢失空字符串 flag 的存在性，错误消费被覆盖配置。 | med | STEP2·r1 | verified |
| SPEC-6 | 错误消息拼接原始 e.message 会二次泄漏未净化 source；boundedSource 实际上限 81 字符。 | med | STEP2·r2 | verified |
| SPEC-7 | child probe 的输入传递与失败分类未定义（-e 插值=注入面；spawn/signal/非零/malformed 无契约；三消费点缺 probe-failure 场景）。 | high | STEP2·r3 | fixed (v5) — 成功形状唯一化（单 JSON 文档/长度相等/string| verified |
| SPEC-8 | 64-char cap 是未兼容的公共识别语义变更，且违反 req 范围外"不动 leadId"声明。 | high | STEP2·r3 | verified |
| IMPL-1 | `readConfig` 的 `existsSync` 早退可能把权限导致的不可见配置当作 absent；CF-11 也未覆盖四命令消费矩阵。 | high | STEP5·r1 | verified |
| IMPL-2 | timeout 因错误判定顺序被归为 `spawn-error`，termination 文案与固定 budget 未被实现和测试完整证明。 | med | STEP5·r1 | verified |
| IMPL-3 | check 与 doctor 直接回显 child failure，doctor 还回显未 bounded 的 config source，绕过统一净化出口。 | high | STEP5·r1 | verified |
| IMPL-4 | child response validator 接受 `{ids}` 之外的额外字段，不符合 exact success shape。 | med | STEP5·r1 | verified |
| IMPL-5 | SR-52 与 DR-17 未通过 adversarial seams 证明 validation-before-read、no-scan 及双来源完整净化保证。 | high | STEP5·r1 | verified |
| IMPL-6 | CK-14 比较两个共享同一 `leadId` 的路径且无 expected oracle，无法证明 edge semantics 或真实消费者一致。 | med | STEP5·r1 | verified |
| IMPL-7 | 四命令文档落点、gate usage 一致性及 CF-12 和 AC7 的文档验收未完整实现。 | med | STEP5·r1 | verified |
| IMPL-8 | GT-24 与 GT-25 未经过完整 CLI error matrix，empty flag、invalid config 与 terminated JSON guarantees 未被证明。 | med | STEP5·r1 | verified |
| IMPL-9 | config matcher 的 TAP 描述批（第二应用分支）无对抗测试；SR-54 same-store 对照未忠实执行。 | med | STEP5·r2 | verified |
