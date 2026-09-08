# gap-report — hotfix-lane（STEP1）

req 基线：req-v41（STEP0 于 r43 收敛，VERDICT: 0 issues open；43 轮，账本 REQ-1..82 全 verified）。

## KB 新鲜度核对

- 核心五模块 truth（archive-merge/check/doctor/gate/spec-runner）source-commit = 4127653；`git log 4127653..HEAD -- lib/ bin/` = 0——全新鲜。
- status/init truth stamp = bfadb12，对应 lib 其后 0 commit——新鲜；update.js 轻微滞后（3af2a63 docs 性质）不在触及面，记录不处理。
- new.js / resolve.js 无 truth doc——本 change 设计将触及其未来行为，STEP2 需声明是否为其建 truth（入 gate③ 一并审）。
- 工作区干净（本 change 全部产物在 apriori/changes/hotfix-lane/ 下，未 touch lib/bin/test——隔离约束履行中）。

## 差距清单（state A → 目标态 B）

| # | 领域 | state A | 目标态 B（req-v41） | 未来触及物 |
|---|---|---|---|---|
| G1 | 通道概念 | 只有 change；无 hotfix 单元 | hotfix 最小回写单元（结论强制+可选 delta/decisions+绑定声明+直接归档；F1/F2 事务框架按 prior art 候选空间） | new/resolve/archive-merge/RUNBOOK |
| G2 | 准入判定 | 无爆炸半径概念；tier 自判 | 分级函数（字段契约+跨字段不变量+判定次序三表；输出 (半径, R2 子型)；fail-up；白名单降级 γ'；doc-fix 独立形态） | 归档 preflight、（若 γ'）spec 块标注约定 |
| G3 | 验证声明 | verify 三态；无声明概念 | bindings 两层基数（容器/行）+需求函数 f(change-kind,目标键,Q7c,载体)+载体互斥+keyed/singleton 两型+Q-4 三案行值 | bundle 格式、preflight |
| G4 | 验证证明 | verify GREEN 全量 | Q-3 i（scoped verify——scope 集合语义 (delta∪affected)−no-test 键）/ii（证据契约全谱）；双阶段 oracle（preflight/post-archive）；结果谱互斥有序函数 | spec-runner scope 面（未来）、preflight |
| G5 | profile 缩放 | 验证矩阵按项目类型自判；E2E/截图自觉项 | verification-profile 配置行（human-owned）；证据三层（可判结论/人类可查证物/豁免物）；截图基线绑定+存续期 π 候选；新鲜度 Q-6b 合法集合 | process-config、RUNBOOK、gate/归档检查点 |
| G6 | 耦合 | 无 | 半径×profile×channel/tier 全笛卡尔表；覆盖面=channel/tier、准入=(半径,子型) 机械否决∧human 判定、证据=profile 三正交；评审两轴投影 | RUNBOOK 新表 |
| G7 | 评审 | R2 评审只在正式流程 | hotfix 评审两轴（code-review-scope×docs-P8）+verdict 内容绑定（摘要域实体切分+raw 一致性+基数定式） | 归档 preflight、评审 prompt |
| G8 | 签收 | gate④ 纪律 | 签收候选 a/b/c/d（prior art）×新鲜度/存续期/评审绑定的合法联合选项表 | 归档命令 |
| G9 | 正式流程交互 | trivial 定义、STEP5 tests | 半径否决两态模型（behavior/R3 硬拒；whitelist 按 Q-5）；正式流程零继承 no-test；docs trivial 存废显式归 owner | RUNBOOK trivial 节新增约束 |

## 别改清单交互

五项不动；verify verdict 语义分毫不动（g2 类豁免早在 prior art 阶段移除；本 change 全部后果条件式对齐 state A 聚合语义）；正式 change gate 七项回归断言保护。

## gate② 自决记录

按 goal 预授权（「gate② 预授权自决通过并留痕」）：本 gap report 与 req-v41 核对无缺口，自决通过 gate②，进 STEP2。留痕于 flow-state。
