# proposal — hotfix-lane

## 一句话

给 apriori 增加一条 **hotfix 最小回写单元**通道（10 分钟、结论强制、直接归档），其准入由**爆炸半径分级函数**机械判定，其验证下限由 **verification-profile × 半径**的耦合决策表给出——hotfix 定义轻量路径，缩放规则定义轻量路径上验证的下限，一体设计封死"轻量通道零验证"窗口期。

## 为什么是一个 change

复盘实证的两面：UAT 四单全部逃逸流程（BR-007 漂移、1012769 空白档案）说明轻量路径缺失；owner 被迫每个提示词重复强调"测试、E2E、截图"说明验证强度没有机械锚点。分开做，先落地的 hotfix 会在缩放规则就位前成为零验证通道。

## 方案骨架（细节见 design.md，契约基线 = requirement/req-v41.md）

1. **hotfix bundle**：结论（唯一无条件必填）+ 申报字段（change-kind/touched-modules/fix-ref/frontend-touched/backend-touched/affected-scenario-ids）+ 可选 spec delta + 可选 decisions + bindings（载体待裁）。
2. **分级函数**：字段契约表 + 跨字段不变量表 + 判定次序表三表构成的全域机械函数，输出 (半径, R2 子型)；REMOVED/RENAMED/跨模块/无 scenario 块/decisions 越界 → R3 拒绝指路全流程；MODIFIED/ADDED 默认 R3，仅两条白名单降 R2：①人类 blast:low 标注（γ' 案）；②Q-12=yes 案的 ADDED-only 机械白名单（fail-up 原则贯穿）。
3. **验证缩放**：process-config 增 verification-profile 行（human-owned）；证据三层（机械判结论者须 PASS；人类可查证物与豁免物的存在性**按档参数化**——全量档强制、增量档 advisory，owner 裁定 D）；scoped verify 的集合语义与双阶段 oracle；截图观察记录基线绑定。
4. **正式流程交互**：半径否决两态模型（机械否决 ∧ human tier 判定）；正式流程零继承 hotfix 豁免。
5. **签收与评审**：prior art（hotfix-channel req-v13）候选空间按引用采纳；评审两轴（code-review-scope×docs-P8）+ verdict 内容绑定；全部联动约束成组入合法联合选项表。

## 不做（goal §C + 演进裁定）

P2-10 raw 瘦身、P1 五问、RUNBOOK 既有章节重构、实现代码（本 change 到 gate③ 止）；AM-17 等 state A fail-closed 分毫不动；verify verdict 语义（三态/UNBOUND/GAPS）分毫不动。

## 风险与代价（诚实清单）

- 申报信号真实性不可机械验证（整体瞒报拦不住）——补偿链 = 结论强制+审计+后续评审可见；spec-vs-code 一致性在通道内无 P8 级防线（评审轴候选提供部分补偿，owner 裁）。
- γ' 白名单是人类预授权未来整块替换的降级——须 owner 单独确认其语义。
- 无标注的 docs/代码 MODIFIED 修复一律 R3——比 state A 的 trivial 更严，docs trivial 的存废显式归 owner（Q-5）。
- 机械化的代价是形式面契约多（字段/基数/载体互斥/摘要域）——STEP2 设计以 scaffold 预填把作者的实际操作压回 10 分钟预算（AC1 校验）。

## 交付物（gate③ packet）

proposal.md（本文）+ design.md + design-drafts/（RUNBOOK/config/检查点 delta 草案）+ review/issues.md（STEP0 82 条 + STEP2 账本）+ decision-summary.md（owner 一页决策摘要）。
