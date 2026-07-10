<!-- Recorded on behalf of the reviewer (codex, session 019f3f5c-4773-7d62-b167-4a4eda741ae6, read-only sandbox).
     Raw output archived verbatim at apriori/review/quick-poll-step2-review-v1-raw.txt. -->

# quick-poll STEP2 spec/design 评审 v1

## 1. Scenario coverage vs AC-1..AC-19

### SPEC-1 — POST 的 Content-Type 无可测行为
§12.1 要求所有 POST `application/json`,但无 scenario 定义缺失/错误 Content-Type 的行为,design 也未强制校验。建议加 scenario + 错误码,并在 server.js 声明所有 POST 先校验 Content-Type。

### SPEC-2 — close 的 admin token 传输方式未绑定
§12.1 允许 body 或 header 传 token,但 CL-01/CL-03/CL-04 未声明测试放 header/body,design 未定 close API 的 token contract。建议固定规则(body `{adminToken}` 或 header `X-Admin-Token`,写明优先级)。

### SPEC-3 — 已关闭/过期投票的分享页行为未被 scenario 覆盖
CL-01/CL-02 只覆盖 API 层拒票,未绑定 `/poll/<id>` 在 closed/expired 时隐藏投票表单、渲染结果视图。建议加 CL-07/CL-08。

## 2. 外部共享状态三时刻

### SPEC-4(high)— deadline lazy-close 的"读时写入"未明确进队列
CL-06 首次 load 时把过期 poll 持久化 closed,但 GET 结果/分享/管理页也触发读取。若读时写在队列外,会与 vote/close 并发写同一 JSON,破坏单写者假设(CC-01/CC-03),致丢票/覆盖 close。建议:任何会导致持久化的 load(含 lazy-close)必须经 `runExclusive`。

### SPEC-5(high)— Promise 队列 rejection/cleanup 语义不足
`.then(fn)` 接在 rejected tail 上会跳过后续任务(毒化队列);无条件 settle-delete 可能删掉已被替换的新 tail。CC-04 注入一次失败后同 poll 后续 vote/close 可能失效;CC-03 串行也可能被 cleanup race 打破。建议:`run = prev.catch(()=>undefined).then(fn)`;`tail = run.catch(()=>undefined).finally(()=>{ if(map.get(id)===tail) map.delete(id) })`。

## 3. 当前态/约定
绿地无冲突;方向符合 Node 标准库 + 单 JSON + 单进程队列。

## 4. Spec/design 不匹配

### SPEC-6(high)— SEC-02 只设计 SSR escape,未覆盖投票后客户端渲染
前端 fetch 投票后切换结果视图,若用 API JSON 动态渲染选项文本且用 `innerHTML`,含 `<script>` 的文本会绕过 SSR escape 形成 XSS。安全不能 advisory。建议:客户端 DOM 更新只用 `textContent`/安全属性赋值,禁止拼进 `innerHTML`;SEC-02 测试覆盖 SSR 与投票后动态视图。

## 5. 安全/持久化/并发审视
- path traversal 防线方向对,URL decode 后仍需校验 id。
- CC-02 atomic-write 顺序能支撑"2xx 后崩溃仍持久化",前提 2xx 严格晚于 dir fsync。
- 单进程 per-poll queue 能支撑 CC-01/CC-03,但须先修 SPEC-4、SPEC-5。
- CC-04 旧 JSON 不破坏路径合理;队列 rejection 未定义会把一次失败放大成后续不可用(见 SPEC-5)。

## Advisories(SPEC-ADV-1)
- proposal 写"24 个 scenario ID",实际 >24,需同步。
- design 同时写"启动扫描"与"不预加载",措辞需澄清。

VERDICT: 6 issues open
