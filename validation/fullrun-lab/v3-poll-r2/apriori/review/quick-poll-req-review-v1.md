# 需求评审 — quick-poll req-v1（STEP0 round 1，P1 异构评审）

> 评审者：codex（read-only 沙箱），thread `019f3f0c-e1de-7042-9c59-425211e5801a`
> 原始输出存档：`apriori/review/quick-poll-req-review-v1-raw.md`（及 `.jsonl`）
> 本文档由 producer 代评审者落盘（评审者只读沙箱无法写文件，R2）。

## 按维度的问题列表

### 1. 目标状态 B 是否清晰
- **REQ-1** —「有效选项」无定义（trim / 空白 / 重复 / 超长 / 稳定 option ID 规则未定）。风险：PC-01/02/03/04 实现与测试会分歧。修复：声明选项归一化规则、是否允许重复文本、提交是否用稳定 option ID。

### 2. 边界与异常路径
- **REQ-2** — 截止时间格式/时区/无效/过去时间规则未定。风险：PC-07 关闭时刻不可稳定测试。修复：明确输入格式、存储格式、时区基准、过去时间处理、比较基准。
- **REQ-4** — 创建投票缺少 title/option 长度、选项数量上限、非法 mode、malformed deadline 等边界。风险：输入校验不完整。修复：并入 PC-02 或新增验收项，含拒绝响应 + "不创建记录"。
- **REQ-5** — 非法投票 payload 未覆盖（unknown poll/option、重复 option ID、类型错误、空 payload）。风险：错误计票 / 500 / 状态污染。修复：新增验收项——非法提交返回非 2xx 且计数不变。
- **REQ-6** — 投票与手动关闭/截止并发顺序未定义。风险：并发下同一请求可能被不同实现计入或拒绝。修复：状态检查须在同一 per-poll 临界区内完成，定义判定时点（进入临界区时若已关闭或 now≥deadline 则拒绝）。

### 3. 隐含未声明的状态变化 / 副作用
- **REQ-7** — 写失败 / rename 失败 / timeout 的回滚与 HTTP 语义未定义（可能"成功感知但未落盘"，或浏览器标记已投但服务端未计票）。风险：成功感知与实际落盘不一致。修复：create/vote/close 仅在 durable write 成功后返回成功；失败返回非 2xx 且不改变计数/状态/浏览器标记。

### 4. 验收标准可测性
- **REQ-8** — PC-06「默认约 3s」的"约"不可精确断言，配置入口未定义。风险：自动刷新验收不稳定。修复：默认精确为 3000ms（允许误差带）、配置方式、是否首帧立即拉取。

### 3. 管理密钥（归入目标清晰 / 安全）
- **REQ-3** — 管理密钥强度/生成要求未定义。风险：弱 token 满足字面实现但破坏"只有发起人持有"。修复：声明 CSPRNG、最小 entropy、URL-safe 编码、禁入日志。

### 5. 与状态 A 冲突
- 无冲突（greenfield，无应用代码）。

### 6. 目标 lineage
- 已声明且匹配（master；仓库当前分支 master，无应用代码）。

## Advisory（不计入 verdict）
- PC-05 本地已投标记机制未声明（localStorage / cookie），未声明 key 作用域 → 建议明确。
- 结果轮询 endpoint 的返回数据形状未声明 → 建议明确。
- 仓库非字面空目录（已有 requirement/apriori/CLAUDE.md/LAB-NOTES.md 等文档），不影响"空仓起步、无代码"判断。
- §8 的开放问题应尽量转为验收项或非目标，否则会阻塞直接交付 AI 实现。

## Verdict（原文，逐字）
VERDICT: 9 issues open

> Producer 记账说明：REQ-9 被评审者列为 "Advisory batch" 却给了 open 状态并计入 N。按 P0（advisory 批次终态 advisory-acked、不计入 formal 计数）规范化为一条 advisory 批次行；因此 formal open 实为 8（REQ-1..REQ-8）。这不改变本轮结论（存在 major issues → 进入 round 2 修订）。
