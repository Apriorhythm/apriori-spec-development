<!-- Recorded on behalf of the reviewer (codex, session 019f3f74-2857-7c12-a72d-77820c69b604, read-only sandbox).
     Raw output archived verbatim at apriori/review/quick-poll-step5-review-v3-raw.txt. -->

# quick-poll STEP5 一致性评审 v3(P8)

- **GAP-1 verified** — deadline 先 ISO 8601 正则再 Date.parse。
- **GAP-2 verified** — close token 按字段存在性判优先级,空 body token 不回退 header。
- **GAP-3 verified** — token 比较对定长 buffer 恒定 timingSafeEqual + 单独查长度。
- **GAP-4 verified** — 过期首次 vote 同一 mutation 内先写 closed 再经 res.error 抛 POLL_CLOSED;队列 tail 吞 rejection 不毒化。
- **GAP-5 verified** — 三处耐久性契约已一致:req-final §8(rename=提交点;提交前失败→500+旧值可见;提交后目录 fsync 失败→提交成立+2xx+告警)、CC-02(限定正常路径 kill-after-ack)、CC-05(异常路径);src/store.js 与契约匹配。CC-02 测试仍覆盖正常路径,验证的是收窄后的 success-path guarantee。

未发现新增 spec-vs-code gap。

VERDICT: no spec-vs-code gaps
