# codex P8 raw — STEP5 consistency review (thread 019f3f30-7ade-71d1-9eed-bcf6931122ca; interrupted then resumed, R2)

我会按审查口径先读 spec、design、实现和测试，再逐个 PC 场景核对测试强度与实现行为。当前是只读环境，我不会改文件。

---

已看到测试覆盖了全部绑定 ID，包括 PC-10/11/13 的对抗注入。接下来我会对照实现细节，重点看测试是否漏掉了 spec 明确要求的用户可见行为和安全/持久化边界。

---

实现路由里 close 使用了 `timingSafeEqual`，错误响应没有打印 key；但管理页会把 key 放入内联脚本，这是设计允许的管理功能面，不算日志泄露。现在继续核对验证器、ID、前端脚本，以及是否有缺失的静态文件导致场景语义落空。

---

有两个候选点需要区分：一个是测试忠实度偏弱但实现实际满足，另一个是实现与 spec 直接不一致。按你的 Scope，我会只把后者列入 verdict，前者放 advisory。

---

目前没看到硬保证的“空跑”：PC-10 用 50 个并发请求，PC-11 注入 tmp 写后 rename 前中断，PC-13 注入 rename failure。我要再用一次测试结果和若干全文搜索确认没有隐藏 spec/KB claim 或日志路径。

---

本地 `node --test test/quick-poll.test.js` 只给了文件级失败，没有展开断言；我会用 TAP reporter 重跑一次拿具体失败。若失败是只读沙箱造成的，会按你的指示不计入 finding。

---

未发现需要计入 verdict 的 spec-vs-code gap。实现层面看，PC-10/PC-11/PC-13 的硬保证都有真实对抗条件：并发 N=50、tmp 写后 rename 前中断、rename failure 注入；`adminKey` 没有进入错误响应或日志，关闭鉴权使用 `timingSafeEqual`，XSS 出口也按 HTML escape / `jsonForScript` / `textContent` 分层处理。

我本地尝试跑了 `node --test`，失败原因是只读沙箱里 `/tmp` 无法 `mkdtemp`，按 R2 说明不作为 finding。

**Advisory**
这些不是 spec-vs-code gap，因为代码本身基本满足；但绑定测试的忠实度还有弱点，建议补强：

- PC-01: [test/quick-poll.test.js](/root/terra/fullrun-lab/v3-poll-r2/test/quick-poll.test.js:44) 允许 `adminUrl` 只要含 `key=` 就通过，应改成断言真实包含 `json.adminKey`。
- PC-05/PC-06: 主要靠 HTML 正则，未执行浏览器 localStorage 跳转、加载即 fetch、`setInterval` 刷新。
- PC-08: 测了 wrong key，未测缺失 `adminKey`。
- PC-09: 只测投票页 closed，不测结果页 closed、到期 closed、关闭原因/截止信息。
- PC-13: 覆盖 create/vote 写失败，但未注入 close 写失败，也未用浏览器断言失败响应不写 localStorage。
- PC-15: 覆盖 escape 单元和投票/结果 SSR，但未覆盖管理页、closed 页面、前端轮询实际 DOM 渲染无脚本执行、注入场景下 `adminKey` 不泄露。

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
| advisory-batch | 绑定测试存在若干忠实度弱点，但未发现对应实现违反 spec | advisory | R2 | open |

VERDICT: no spec-vs-code gaps

---

我会补看两个前端静态脚本，主要确认创建后的链接呈现、关闭请求和本地标记时机；然后给最终评审结论。

---

没有发现需要计入 verdict 的 spec-vs-code 不一致。实现与 spec 的主要语义对齐：

PC-01..PC-04、PC-12、PC-14 的创建/投票校验、计数不变、结果跳转语义都由 server + validate + store 路径覆盖。PC-05 的 localStorage 软限只在 2xx 后置标记，投票页加载时按 `origin + pollId` key 跳结果页。PC-06 结果 endpoint 返回 `title/options/total/status/deadline`，结果页加载即 `pull()`，并以 `3000ms` `setInterval` 轮询。PC-07/PC-08/PC-09 的截止关闭、adminKey 手动关闭、关闭后不可投和关闭态 SSR 呈现均在代码中成立。PC-15 的 SSR HTML escape、内联 JSON `jsonForScript`、前端 `textContent` 渲染路径也对齐；未看到 adminKey 日志泄露，关闭鉴权使用 `crypto.timingSafeEqual`。

三条硬保证测试是实质对抗测试，不是空绑定：PC-10 用 `Promise.all` 并发 50 次 vote，并断言总数守恒及两个选项分别 25；PC-11 用 `afterTmpWrite` 在 tmp 写完、rename 前抛错，断言目标文件仍可 JSON.parse 且为旧完整内容；PC-13 用 `failRename` 注入写失败，断言 vote 返回非 2xx，计数与状态不变，另有 create 写失败不留记录测试。

**Advisory**
- PC-01 的测试里 `adminUrl.includes(json.adminKey) || adminUrl.includes('key=')` 偏弱；建议改成必须包含实际 `adminKey`。
- PC-09 测试只直接断言 vote page 的关闭态；代码的 result page 也实现了关闭 banner，建议补一条 result page 断言。
- PC-13 未单独覆盖 close 写失败；代码路径看起来正确，建议补 `failRename` 下 close 返回非 2xx 且 `status` 仍为 `open`。
- PC-15 测试覆盖了 escape 单元、投票页、结果页；建议补 admin page/closed page 和一次真实前端执行断言，覆盖 spec 提到的管理页与无脚本执行回归。

**Ledger Delta**
正式行：无。

ADVISORY | ADV-BATCH-1 | 测试断言强度可提升：PC-01 adminUrl 精确包含 key、PC-09 result page、PC-13 close failRename、PC-15 admin/closed/脚本执行路径 | Low | P8 | open

VERDICT: no spec-vs-code gaps