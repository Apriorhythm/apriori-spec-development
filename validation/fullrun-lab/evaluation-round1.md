# 全流程三方对比 · 第一轮评估(quick-poll,Sonnet ×3)

同一 kickoff「我想做一个快速投票的小工具」+ 同一用户底牌,三家各跑完整生命周期(脑暴→规格→写码→测试→归档)。人类闸口由我扮演。评估手段:独立重跑测试 + 统一 12 项黑盒闯关(独立子代理) + codex 静态对抗审计(每家一份) + 规格库终态核对。

## 硬数据

| 维度 | V3 | OpenSpec | Superpowers |
|---|---|---|---|
| 黑盒闯关 12 项 | 11/12 | 12/12* | 11/12 |
| codex 静态缺陷 | **3(med3)** | 7(med5 low2)**+严重** | 5(med3 low2) |
| 崩溃/DoS | 无(超大体 413 优雅) | **有:超大 body 崩整个进程** | 无(超大 body 粗暴断连) |
| 独立重跑测试 | 28 绿 + verify GREEN | 17+25 绿 | 18+1 绿 |
| 规格库终态 | living store(28 场景绑测)+ KB(契约+D1-D8)+ 全档 | living store(5 能力 16 需求)+ 档,无 KB | 仅设计文档+计划文档,**无 living 规格、无绑定** |
| 过程开销/轮数 | 最重(脑暴6+STEP0×3+STEP2×2+P8);~182k tok;扛过 2 次中断 | 最轻(explore 3 轮);~87k | 中;~123k |

\* OpenSpec 12/12 的防重靠服务端 cookie,行为上过了,但闯关同时发现它有本次实验最严重的缺陷:**一个超过 16KB 的 POST 就能让整个服务进程崩溃**(未 await 的 promise rejection 逃出 try/catch,Node 默认 throw)——所有投票一起挂,直到手动重启。

## 三个决定性观察

1. **V3 的评审在过程中抓到并修掉了另两家原样出厂的同一个数据丢失 bug。** id/token 碰撞时 `store.put` 盲写覆盖旧投票——codex 在 OpenSpec 和 Superpowers 里都独立标为 med 缺陷,而 V3 的 STEP2 评审当场抓到(台账 verified),改成了 `fs.link` 不覆盖路径。V3 还抓到 promise 链一次失败永久断链(也修了)。这正是异构对抗评审的核心价值兑现。

2. **代码质量 V3 明显最优**:缺陷最少(3 vs 5 vs 7+严重)、无崩溃、超大体优雅返回、XSS 全转义、并发原子写。codex 对三家测试质量的评语:V3「强——真实 HTTP + 注入式 FS 故障」;OpenSpec「有价值但部分照抄实现,漏了畸形/碰撞/持久性」;Superpowers「非纯照抄,但多数锁死当前文案、漏对抗输入」。

3. **G4"防重"三家都弱,但性质不同**:V3 和 Superpowers 是纯客户端 localStorage,裸 API 可无限灌票;OpenSpec 用服务端 cookie(略强,但也可清 cookie 绕过)。**关键:V3 的规格诚实写明了「localStorage 标记 / storage 不可用则退化为允许投票」——规格与代码一致,没有过度承诺。** 用户底牌原话是「cookie 级别、简单防即可」,三家都在"浏览器级"范围内,属可辩护的产品取舍,非缺陷。

## V3 唯一真实的规格-代码缺口(值得修进协议)

**崩溃持久性过度承诺。** V3 的 KB 两次写下「成功响应 ⇔ 已落盘」,但代码 tmp+rename 后未 fsync——断电/OS 崩溃可丢掉已确认的写。这是 V3 唯一"说了没做到"的地方,P8 理应抓到。三家都没 fsync,但只有 V3(和 OpenSpec)把这个保证写进了规格,所以对 V3 是真缺口。

## LAB-NOTES 暴露的 runbook 摩擦(第一手,写码全程)

1. **tasks.md 由哪步产出未明确**:P4 只列 proposal/spec/design,工件表和 STEP5 却都依赖它,producer 只能自行推断在 STEP2 顺手写。
2. **评审 session-id 未落盘**:rounds 2+ 要 `codex exec resume <session-id>`,但没任何字段存它;中断后只能去 `~/.codex/sessions` 文件名考古(**第二次遇到,clamp-kit 那轮也踩过**)。
3. **flow-state 粒度**:要求"每轮之后"更新,但一轮内含多动作(spawn 评审→落 ledger→修订),中断在轮中时 next-action 指向已完成动作。
4. **advisory 台账两规则打架**:R2 要"reviewer ledger delta 逐字代录",P0 要"advisory 归一成批次行";评审员自创格式时 producer 不知遵哪条。
5. **跨 STEP 复用同一 ledger 时轮次列歧义**:STEP0 round 1 与 STEP5 round 1 同值,未规定带阶段前缀。

## 净判决

**这一轮 V3 已在质量维度全面领先**(bug 最少、无崩溃、规格最诚实、资产最厚、且抓到别家出厂的 bug)。代价是最重的过程开销。改进空间集中在:一个真缺口(fsync 过度承诺)+ 五条 runbook 清晰度摩擦。→ 值一轮聚焦改进,改完只重跑 V3 验证,若干净则提前收(不必跑满 5 轮)。
