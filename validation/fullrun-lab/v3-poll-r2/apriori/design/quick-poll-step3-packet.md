# STEP3 技术评审 Packet — quick-poll（gate ③）

> Large tier 技术评审。本 packet 汇总供人类做技术评审决定；决定结果记为 DESIGN-REVIEW-DOC + flow-state `gates:`。

## 1. 一句话
单进程 + 文件存储的匿名快速投票工具：建投票（标题+2..20 选项+单/多选+可选截止）→ 投票链接+管理链接 → 匿名投票 + 浏览器软限 → 投完即看轮询结果 → 到点自动/发起人手动关闭。

## 2. 待评审工件
- 提案：`apriori/changes/quick-poll/proposal.md`
- 规格（15 场景 PC-01..PC-15，全部带可绑定 ID）：`apriori/changes/quick-poll/specs/poll.md`
- 设计：`apriori/changes/quick-poll/design.md`
- 任务清单：`apriori/changes/quick-poll/tasks.md`
- 需求终稿：`requirement/req-final.md`
- 账本：`apriori/review/quick-poll-issues.md`

## 3. 评审历程（异构评审真实跑过）
- STEP0（P1，codex）：3 轮，10 条问题全部 verified，`VERDICT: no major issues`。
- STEP2（P5，codex）：3 轮，`VERDICT: no major issues, ready to proceed to execution`。
  - 唯一 high 发现 **SPEC-1 stored XSS**（用户 title/选项进 SSR/JSON/前端无输出编码）→ 已加 Requirement "Output Safety" + 场景 PC-15 + design §5b（htmlEscape/jsonForScript 明确 \uXXXX 转义/前端 textContent）。r3 verified。
  - 过程 friction：r1 评审被本地超时中断、provider websocket 一度 404 → 按 R2 resume 同一 session 续跑完成，未代填 verdict（存档在 raw 文件可核）。

## 4. 账本状态（rejections 置顶——本变更无 rejection）
- **Rejections：无。** 所有 formal 问题均 accept 并 verified。
- Formal：REQ-1..REQ-10（STEP0）、SPEC-1（STEP2）——全部 **verified**，**0 open**。
- Advisory batches：ADV-r1 / ADV-STEP2-r1 / ADV-STEP2-r2 已 acked（其中 escape.js 入布局、PC-15 入测试清单、unknown pollId GET 404 已采纳进设计）。

## 5. 需要人类拍板的技术要点
1. **架构**：单进程 stdlib http + 每投票一 JSON 文件 + per-poll 内存写队列 + 临时文件原子 rename。已锁"单实例"前提（gate② 确认）。
2. **三条硬保证**（PC-10 不丢票 / PC-11 不半写 / PC-13 无假成功）各配注入对抗测试；design §4 留了失败注入 seam。
3. **安全**：CSPRNG 128-bit pollId/adminKey、timingSafeEqual 关闭鉴权、日志不含 adminKey、PC-15 XSS 输出编码。
4. **测试栈**：node:test + TAP 喂 `apriori verify` 绑定门；Playwright E2E 叠加。

## 6. 请决定（gate ③）
- **A. 通过** → 进入 STEP5（写测试→实现→verify GREEN→P8 一致性评审）。
- **B. 有重大设计改动** → 退回 STEP2。
- **C. 小修** → 记入 DESIGN-REVIEW-DOC，STEP4 应用后再进 STEP5。
