# 问题账本 — quick-poll

> 规则见 runbook §5 P0。评审者只读沙箱：以下 formal 行由 producer 代评审者落盘（recorded on behalf of the reviewer），原始存档见 `apriori/review/quick-poll-*-raw.*`。

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | 「有效选项」/空白选项处理歧义（r2 reopen：静默丢弃 vs 出现即拒绝） | med | STEP0·r1 | verified |
| REQ-2 | 截止时间格式/时区/无效/过去时间规则未定义 | med | STEP0·r1 | verified |
| REQ-3 | 管理密钥强度/生成要求未定义（弱 token 破坏"只有发起人持有"） | high | STEP0·r1 | verified |
| REQ-4 | 创建投票边界（title/option 长度、选项数量上限、非法 mode、malformed deadline） | med | STEP0·r1 | verified |
| REQ-5 | 非法投票 payload 未覆盖（unknown poll/option、重复 option ID、类型错误、空） | high | STEP0·r1 | verified |
| REQ-6 | 投票与关闭/截止并发顺序语义未定义 | high | STEP0·r1 | verified |
| REQ-7 | 写失败/rename 失败/timeout 的回滚与 HTTP 语义未定义 | high | STEP0·r1 | verified |
| REQ-8 | PC-06 轮询间隔"默认约 3s"不可精确测试，配置入口未定义 | low | STEP0·r1 | verified |
| REQ-9 | `pollId` "不可枚举"缺 entropy/生成方式/可测标准 | med | STEP0·r2 | verified |
| REQ-10 | 创建请求 payload 的 null/type 错误 schema 与响应未明确 | med | STEP0·r2 | verified |
| ADV-r1 | advisory batch acknowledged (4 items: 本地标记机制/轮询 endpoint 形状/非空目录/§8 开放问题转化) | — | STEP0·r1 | advisory-acked |
| SPEC-1 | 用户输入(title/options)进入 SSR/JSON/前端渲染但未声明 HTML escape/安全 JSON/DOM 安全渲染 → stored XSS，可窃 adminKey（r2 reopen：jsonForScript 映射写成原字符=空操作） | high | STEP2·r1 | verified |
| ADV-STEP2-r1 | advisory batch acknowledged (2 items: unknown pollId GET 404 覆盖 / counts 表述统一) | — | STEP2·r1 | advisory-acked |
| ADV-STEP2-r2 | advisory batch acknowledged (2 items: escape.js 加入目录布局 / PC-15 镜像进 §8 测试清单) — 已在 r2 采纳 | — | STEP2·r2 | advisory-acked |
| ADV-STEP5-P8 | advisory batch acknowledged (4 items: PC-01 精确 key[采纳]/PC-13 close failRename[采纳]/PC-09 result page 断言/PC-15 admin+前端执行断言) | — | STEP5·P8 | advisory-acked |
