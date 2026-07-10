<!-- Recorded on behalf of the reviewer (codex, session 019f3f74-2857-7c12-a72d-77820c69b604, read-only sandbox).
     Raw output archived verbatim at apriori/review/quick-poll-step5-review-v1-raw.txt. -->

# quick-poll STEP5 一致性评审 v1(P8)

`apriori verify` 已证机械绑定(42 scenario 全 bound-green,无 orphan)。本轮查测试是否忠实覆盖 scenario 意图。基于静态阅读(R2:read-only sandbox 不跑测试)。

## 正式问题(5)

- **GAP-1(medium)** `src/validate.js` deadline 仅用 `Date.parse`,接受可解析但非 ISO 8601 的串(如 `01/02/2999`);§12.1 要求 ISO 8601。PC-12 只测了 `not-a-date`。→ 加严格 ISO 校验 + 补测。
- **GAP-2(high)** `src/server.js` close token 优先级用 truthiness:body `adminToken:""` + 合法 header 会回退 header 并成功关闭;SPEC-2 要求"两者都在时 body 优先"。→ 按字段是否存在判优先级。
- **GAP-3(high)** `src/server.js` token 比较在长度/类型不匹配时提前返回,非全程常量时间;CL-04 明确要求常量时间比较。→ 定长 buffer + 恒定 timingSafeEqual。
- **GAP-4(medium)** `src/server.js` 过期 poll 首次访问是 vote 时,`applyVote` 直接抛 POLL_CLOSED,mutate 不写盘,磁盘仍 open;CL-06 要求"首次读取/写入时持久化 closed"。→ vote mutation 内先落 closed 再抛。
- **GAP-5(high)** `src/store.js` `atomicWrite`:rename 成功后目录 fsync/open 失败仍返回 PERSIST_FAILED,但新 JSON 已可见,违反 REQ-3"失败时不更新任何可观测结果"。→ 以 rename 为提交点,提交后 fsync 失败只告警不谎报失败。

## Advisories(GAP-ADV-1,batch)
若干绑定测试比场景意图弱(PC-11 未测 deadline==now;PC-16 只测 create 的 Content-Type;SEC-02 TAP 未覆盖管理页 SSR;VT-08/VT-09 为正则级客户端绑定;SEC-01 shareUrl 断言分散在 PC-01)。建议补强以降回归风险。

VERDICT: 5 issues open
