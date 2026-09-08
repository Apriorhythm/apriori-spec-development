# gate③ packet — hotfix-lane（STEP2 收敛，硬停待 owner）

状态：**STEP2 于设计评审 r28 收敛（VERDICT: 0 issues open）**；本 change 到此为止不产实现代码、未 commit、未 push、未 touch lib/bin/test。

## 一、packet 组成

| 工件 | 路径 | 说明 |
|---|---|---|
| 决策摘要（**先读这份**） | `decision-summary.md` | 爆炸半径分级表、profile×tier 决策表、耦合规则、Q-1..Q-12 待裁项与倾向、待你特别看的三点、第六节 π2 二选一 |
| 提案 | `proposal.md` | 一句话方案、为什么一个 change、方案骨架、won't-do、风险清单 |
| 设计 | `design.md` | D1 分级函数（字段契约/不变量/判定次序/缺陷账走查/实现触点）、D2 验证缩放与三表全笛卡尔、D3 合法联合选项表、D6 机械定式、**D7 π2 范围声明与重新准入协议** |
| 需求基线 | `requirement/req-v41.md`（+ v1..v40 演进、`goal-verbatim.md`） | STEP0 43 轮收敛，VERDICT 0 |
| 差距盘点 | `gap-report.md` | G1-G9 + KB 核对 + gate② 自决留痕 |
| delta 草案 | `design-drafts/{runbook-hotfix-lane-section,process-config-rows,cli-checkpoints}.md` | RUNBOOK 双语新节+phrase-table+platform note、config 四列行、AC-I 全谱检查点（HL-F/G/B/V/E/R/X/C/N/P/K） |
| 账本 + raw | `review/issues.md` + `review/{req,design}-review-v*.md` 与 `-raw.txt` | REQ-1..82（STEP0，全 verified）、DES 系列（STEP2） |

## 二、评审收敛记录

- **STEP0**：43 轮，verdict 序列 13→…→0（含两次版本落盘事故，均由评审以 cmp/SHA 实证抓获并更正，verbatim 留痕于 flow-state）。
- **STEP2**：28 轮，末轮 verdict verbatim「VERDICT: 0 issues open」（`review/design-review-v28-final.md` + raw）。
- 评审方：codex `gpt-5.6-sol`（read-only sandbox），session `019ff946-122a-7532-ac83-e50910aa0efc`；全部 raw 带 provenance 头。

## 三、账本现状（`apriori status` 显示 5 open——应然，非缺陷）

| 行 | 状态 | 处置 |
|---|---|---|
| REQ-1..82 | 全 verified | STEP0 收敛 |
| DES 各轮 | 全 fixed/verified | STEP2 收敛 |
| **DES24-3..7** | **open（5 行）** | π2 复制事务链——design D7 边界裁定：本包不宣称其机械契约完成。**gate③ 二选一**：改裁 π1/π3 → 两步 `rejected → rejected-verified` 出域；仍裁 π2 → 保持 open、回 STEP2 在原 ID 上收敛并二次 gate③ 后方可实现 |

## 四、机械面自证

- `apriori gate --change hotfix-lane` 报「no delta spec files」——**本 change 的应然状态**：到 gate③ 为止不产 spec delta（RUNBOOK/config 的机器可解析 delta 由未来实现 change 产出；本包只出草案，已归位 `design-drafts/`）。
- 与 sibling change `hotfix-channel`（停 gate②）各自独立判定，互不阻塞——正是 owner 要求自证的 change 作用域语义。
- 工作区未 touch lib/bin/test；三份 P0 归档物与 main 均未动。

## 五、你需要做的

1. 读 `decision-summary.md`（一页）；
2. 裁 Q-1..Q-12 与 Q-8 内嵌 prior art 清单（联动组不能拆开选——非法配对已在 design D3 标明）；
3. 对 π2 做第六节的二选一；
4. 批准或退回本 packet。批准后我方按裁定进 STEP3/4（实现），不批准前不动代码。
