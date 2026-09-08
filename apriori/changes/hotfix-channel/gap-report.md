# gap-report — hotfix-channel（STEP1）

req 基线：req-v13（STEP0 于 r13 收敛，VERDICT: 0 issues open，六维全 pass）。本报告盘点 state A 与目标态 B 的差距，供 gate② 呈阅。

## KB 新鲜度核对（STEP1 前置）

- 核心五模块 truth（archive-merge/check/doctor/gate/spec-runner）source-commit = 4127653；`git log 4127653..HEAD -- lib/ bin/` = 0——**全新鲜**。
- status/init truth stamp = bfadb12，对应 lib 文件其后 0 commit——新鲜。
- update truth stamp = bfadb12，lib/update.js 其后 1 commit（3af2a63，MIGRATING URL 指针，docs 性质）——**轻微滞后但不在本 change 触及面**，记录在案不处理（清偿归 owner 或后续 change）。
- **new.js / resolve.js 无 truth doc**——本 change 将首次触及它们的行为语义；STEP2 需决定是否为其建 truth（Large tier 触及新子系统的常规动作），入 gate③ 一并审。

## 差距清单（state A → 目标态 B，按 req-v13 的 B 节映射）

| # | 领域 | state A 现状 | 目标态 B | 触及物 |
|---|---|---|---|---|
| G1 | 概念与身份 | 只有 change 一种单元；resolve/status/gate 只认 `changes/<name>/flow-state.md` | hotfix 单元（三类承接对象）；身份候选 a/b（Q2）；身份不变量四条（互斥/不可互转/升格人工/同名拒绝） | lib/new.js、lib/resolve.js、templates/、（候选 b 则加路径规则） |
| G2 | 脚手架 | `apriori new` 只出 change 骨架 | hotfix 骨架（状态文件+结论占位+可选 delta/decisions/bindings 区） | lib/new.js 或新命令、templates/ |
| G3 | 归档机械 | `archive --change`：AM-17 zero-delta fail-closed；只写 spec stores + bundle move；无 truth 写入；无 dry-run/批准概念 | hotfix 专属归档：F1 global preflight（全谱）→ ①stores ②truth Decisions ③bundle move（completion point）；zero-delta 合法（仅 hotfix 路径）；AM-17 对普通 change 分毫不动 | lib/archive-merge.js（或新模块）、bin/apriori.js |
| G4 | 人类签收 | 无任何签收机制（gate④ 是 RUNBOOK 纪律） | Q1 候选 a/b/c/d；倾向 d+d1（dry-run 令牌 + 排除域 approval.md + 二步写入） | 归档命令、RUNBOOK |
| G5 | truth 回写 | truth 只在正式 change 的 KB 写回（人工）中更新 | Decisions 机器追加：module 头寻址、ID 归属（Q6 t1/t2）、truth 基线校验（o1 残余 TOCTOU 诚实声明）、supersession（Q9 s1/s2/s3） | 归档命令、truth 文件 |
| G6 | 测试绑定声明 | verify 三态判定，无"声明"概念 | bindings 载体（Q7a c1/c1'/c2/c3）+ 目标键规则（scenario ID 优先、重复键 k1/k2）+ no-test 全局后果（Q7b g1/g2'/g3——archived gate 阻塞即逼偿）+ 零 delta 类别 1 声明（Q7c p1/p2） | bundle 格式、preflight |
| G7 | gate 映射 | 七项全部假定正式 change 物料 | Q8 m1/m2(α/β)/m3；C6 三源并集+等级 e1-α/e1-β/e2；混合 bundle 逐模块语义 | lib/gate.js（若 m2）或仅归档 preflight |
| G8 | KB 生命周期 | C6 机械查 stamp；无外仓概念 | Q9：freshness r1(+r2)；定位头（touched-modules+fix-ref 成对，必填/选填）；仓域 w1(strict/weak)/w2+λ1；preflight 路由分区 | 归档 preflight、（若 m2）gate C6 |
| G9 | 流程语义 | RUNBOOK 4.0 无 hotfix 节 | hotfix channel 节（何时合法/禁止、与 STEP0-6 关系、人类角色）；runbook-version（Q4）；命名（Q5）；防逃逸（Q3） | RUNBOOK.md/RUNBOOK_cn.md、docs/cli*.md、CHANGELOG |
| G10 | 生态 | status/verify 兄弟归因未对 hotfix 测试过 | status 标注列出；兄弟归因对活 hotfix delta 生效（现行为预计自动成立，需测试确认）；AC10 回归断言 | lib/status.js、test/ |

## 别改清单交互（§三五项）

hotfix 不修改五项中任何一项——它是流程外新增的最薄路径；唯一交叉点：verify 三态语义分毫不动（g2 豁免形态已在 STEP0 被移除出候选空间）；正式 change 的 gate 七项行为有回归断言保护（AC10）。

## 人类决策清单（gate②/③ 必答，req-v13 开放问题节为准）

Q1 签收（a/b/c/d + d1/d2/d3）· Q2 位置身份（a/b）· Q3 防逃逸（i/ii/iii+阈值）· Q4 runbook-version · Q5 命名 · Q6 ID 归属（t1/t2）+并发（o1/o2/o3）· Q7 载体（c1/c1'/c2/c3）+后果（g1/g2'/g3）+零 delta 声明（p1/p2）+重复键（k1/k2）· Q8 gate 映射（m1/m2α/m2β/m3）+C6 等级（e1-α/e1-β/e2）· Q9 freshness（r1/r1+r2）+定位头必填性+仓域（w1-strict/w1-weak/w2）。

倾向组合（一句话版）：**d+d1 · a · ii · 4.1 · hotfix · t1+o1 · c1'+g1+p1+k1 · m1 或 m2-α+e1-α · r1+r2+必填+w2**。

## 规模预估（STEP2 输入）

触及 lib 5-6 个文件 + bin + templates + RUNBOOK/docs 双语 + CHANGELOG；新测试面 AC1-AC15（约 40-60 案）；Large tier 全程。
