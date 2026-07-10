<!-- Recorded on behalf of the reviewer (codex, session 019f3f74-2857-7c12-a72d-77820c69b604, read-only sandbox).
     Raw output archived verbatim at apriori/review/quick-poll-step5-review-v2-raw.txt. -->

# quick-poll STEP5 一致性评审 v2(P8)

## 既有问题复核
- **GAP-1 verified** — validate.js 用 ISO_8601_RE 先于 Date.parse;PC-12 覆盖非 ISO 可解析串。
- **GAP-2 verified** — close token 按字段存在判优先级;CL-03 回归断言空 body token + 合法 header → 403、poll 仍 open。
- **GAP-3 verified** — safeTokenEqual 定长 padding + 恒定 timingSafeEqual,长度另判;短 token → 403。
- **GAP-4 verified** — vote mutation 对过期 open poll 先落 closed 再抛 POLL_CLOSED;store.mutate 先写 res.changed 再抛 res.error;队列不被毒化;CL-09 覆盖磁盘 closed + 计数不变。
- **GAP-5 open(reopened)** — 原"500 后可见变更"已修,但新的提交点语义与仍生效的持久化契约不一致:atomicWrite 在目录 fsync 失败后返回成功(CC-05 接受残余风险),与 CC-02 的无条件崩溃持久保证、req-final §8"任一环节失败→500"矛盾。建议:要么保留硬崩溃持久契约并定义提交后 fsync 失败的非普通成功处理,要么正式收敛 req-final/CC-02,使 2xx = "rename 已提交且可见"而非"目录 fsync 崩溃持久",CC-02 限定于 fsync 成功路径。

GAP-1..4 的修复未引入新 GAP-6:res.error 路径一次写后抛出,队列设计防止其后毒化。

VERDICT: 1 issues open

---
## 生产者处理(GAP-5,recorded post-review)
采纳"收敛措辞"分支(§4.8 保证声明纪律:scope wording to what is verified)。POSIX 下目录 fsync 必在 rename 之后,无法同时满足"500⇒旧值可见"与"2xx⇒无条件崩溃持久"。已使三处一致:req-final §8(rename=提交点,提交前失败→500+旧值不变,提交后目录 fsync 失败→提交成立+2xx+告警)、spec CC-02(限定正常路径=fsync 均成功)、spec CC-05(异常路径)。代码本已实现提交点语义,无需改动。待 P8 round 3 确认一致。req-final 措辞变更将在 gate ④ 请人类追认。
