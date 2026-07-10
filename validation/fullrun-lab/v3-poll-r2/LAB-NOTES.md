# LAB-NOTES — v3-poll-r2 full-run friction log

(experiment overlay only — not a runbook artifact; one line per friction moment, logged as it happens)

- 2026-07-08 kickoff: project is a bare `apriori init` scaffold (no commits yet, `master` branch has no commits). Noted for STEP6/KB-writeback later — "greenfield repo: commit first, then stamp" applies.
- 2026-07-08 brainstorm: human overrode my storage recommendation (SQLite) → "存文件就行" + "并发那个你想办法解决一下". Absorbed: file store + explicit concurrency-safety obligation (in-proc write serialization + atomic temp-file+rename). This becomes a hard-guarantee claim to test at STEP5 (P8 guarantee-claim discipline).
- 2026-07-08 sizing: external shared state (poll store shared across dozens of voters) → **Large tier** by the §2 tripwire regardless of small diff size. Full STEP0–STEP6, every gate. Runbook is unambiguous here — no friction, just noting the forced tier.
- 2026-07-08 STEP0: codex sandbox 反复打印 websocket 404（wss://...komiai.cn/api/codex/v1/responses）到 stderr，但 HTTP 回退成功、exit=0、正常产出评审——噪声非致命，需从 stderr 分离才看得清。已用 --json + < /dev/null 抓取，session id 从 thread.started 事件取。
- 2026-07-08 STEP0·r1: codex 把一条明确标注 "Advisory batch" 的行给了 status=open 并计入 verdict 的 N（说 9，实际 formal=8）。按 P0 规范化为 advisory-acked 不计数；不影响 pass/fail。轻微 friction：verdict 的 <N> 与规范化后 formal 计数可能不一致，全靠 producer 落账时纠偏。
- 2026-07-08 STEP1: greenfield → KB pre-check 整段跳过（"whenever the project already has code" 不成立），module=none。runbook 对空仓的处理是干净的。
- 2026-07-08 STEP2·r1: 我自己的 Bash 工具 2min 超时把一个正在跑的 codex P5 评审 SIGTERM 掉了（reviewer 已经读完输入、正找 XSS，但 verdict 没落）。这不是 provider 故障，是我这侧的中断——正好触发 R2 的"reviewer 死在 verdict 之前→resume 同一 session 续跑，绝不代填"。已在 round1 打印时就把 thread id 记进 flow-state 的 reviewer-session（R2 要求），resume 有据可依。教训：评审类 codex 调用要给足超时/后台跑。
- 2026-07-08 STEP2·r2: codex 的 SPEC-1 reopen 有一半是 markdown 渲染假象——我在 design 里写的 `&lt;`→`&lt;` 之类 HTML 实体在 reviewer 眼里渲染成了原字符，看起来像空操作转义。但它坚持要求"写成明确 \uXXXX 序列"是对的：模糊的转义描述会被实现者误读。friction 属于 spec 表达介质（markdown 会吞实体），不是流程缺陷。改成 < 后 r3 一次通过。
- 2026-07-08 STEP2 总览: 3 轮收敛。真正的价值发现只有一条 SPEC-1(stored XSS)，但它是 high/security——异构评审确实抓到了 producer 自己容易漏的安全出口。R2 的"security 永不 advisory"在这里生效。
- 2026-07-08 STEP5: 实现顺利，一次红→绿。两个真实 bug 在 Playwright E2E 层才暴露（单测没抓到）：(1) 服务端把分享链接的 origin 写死成 http://localhost，丢了真实 host:port——单测用 fetch 直连不受影响，E2E 真浏览器点链接才炸；(2) 我 E2E 自己的贪婪正则解析链接。教训印证 P7"UI 别盲飞、要真渲染真点"——绑定门全绿 ≠ 端到端能用。已修 origin 取 req.headers.host。
- 2026-07-08 STEP5: node:test 的 tap reporter 对每个 test() 输出 `ok N - <name>`，场景 ID 前缀被 apriori verify 干净绑定；PC-13/PC-13b 两个测试都前缀匹配 PC-13（[A-Z]+-\d+ 在 'PC-13b' 处停在 PC-13），聚合成 2p/0f，不产生 orphan。设计上要注意 ID 后缀字母会被并入同一场景。
- 2026-07-08 STEP5: 截图肉眼确认——注入的 <img onerror> 与 <b> 在结果页显示为字面文本、未执行，XSS 防线可视化成立。UI 无样式但功能完整（样式非 v1 目标）。
- 2026-07-08 STEP5 P8: 又一次 provider websocket 404 中断（这已是本次运行第 3 个 codex 会话遭遇流式端点掉线）。R2 的 resume 规则再次生效，同一 session 续跑给出 "no spec-vs-code gaps"。观察：komiai 代理的 wss 流式端点在这段时间高度不稳定，但 resume 幂等、能续；把评审类调用后台化 + 记录 session id 是关键防线。
- 2026-07-08 STEP6: apriori archive/check/verify 三个 CLI 对空仓起步的 store 处理干净——手动建了个带 header 的空 store 文件后 --write 一次合并成功，change dir 自动按 date-time 戳归档。flow-state 随 change dir 一起被移动到 archive/，之后要在新路径继续更新（容易忘，记一笔）。
