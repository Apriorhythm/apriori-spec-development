<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r8 transport=codex-exec-wsl-proxy -->

# req-review-v8 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v8.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断每个候选的语义、后果、约束与 acceptance 是否完整、真实。

## r7 两项核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-6 | verified | e1-β 已明确第四态的非阻塞性质，以及 `blocked`、`result`、exit code、human footer、JSON 聚合字段、renderer 和正式 change 兼容边界；AC13 已逐项参数化。 |
| REQ-13 | reopened | `touched∩stale` 的能力声明、Decision 模块正交和 AC14 均已修正；但新加入的 z2 无法按当前时点取得“代码修复前”baseline，并引入未纳入签收摘要与事务边界的 bundle 写入。选填案也遗漏两字段部分缺失的语义与验收。 |

## 正式 findings

### REQ-13 — z2 baseline 与选填头的部分缺失路径尚未闭合

风险：`high`。若 gate③ 选择 z2，AI 无法可靠区分本 hotfix 新增的 freshness debt；不同实现还可能在批准之后改写 bundle，破坏 d1 的“人看过的内容 = 落盘内容”。若选择选填定位头，单字段缺失可能产生不一致的 Q3/C6/B9 行为。

依据：

1. z2 在现有工作流中没有可取得的“修复前”观察时点。

   - B1 将类别 1 定义为紧急代码修复的事后补记，因此代码修复 commit 通常先于 hotfix bundle 和归档命令存在。
   - z2 写成“归档时快照 hotfix 前的 stale 集”。归档时只能观察当前 stale 集；此时代码修复已经发生。
   - hotfix archive 本身又永不更新 `source-commit`，所以在归档动作前后重复计算 stale 集不会产生可用于归因的边界。
   - 若实际意图是以 `fix-ref` 的父提交计算历史 stale 集，则必须声明该算法及适用范围；当前又明确 C6 不消费 `fix-ref`，v1 还允许跨仓不可解析出处。
   - 若实际意图是 scaffold 时保存 baseline，则必须承认它只区分 scaffold 后的变化，不能保证区分事后补记之前的代码修复。

   因此 z1 已是诚实且完整的候选；z2 目前只是目标描述，尚不是可直接实现的候选。

2. z2 新增的 bundle 写入未进入 d1 签收与 B4 事务契约。

   - z2 要求把 baseline snapshot 写入 bundle。
   - d1 的摘要覆盖 bundle 业务内容，并保证批准后业务内容变化使令牌失效。
   - requirement 没有说明 snapshot 是：
     - dry-run 前生成并纳入摘要；
     - dry-run 输出的一部分、由批准命令写入；
     - 还是像 `approval.md` 一样属于排除域。
   - 若批准后才写入普通业务文件，人类批准的内容与最终 archive 不同；若放入排除域，则未经摘要保护的机器工件会影响债务归因。
   - B4 的写集合和恢复报告也没有声明该 snapshot 写入失败属于 F1、F2 哪一阶段，以及重跑如何幂等。
   - AC4、AC12、AC14 均未按 z1/z2 参数化；没有测试 baseline 的生成时点、内容绑定、新旧对比和恢复行为。

3. 选填案没有定义两字段部分缺失的状态。

   定位头包含 `touched-modules` 与 `fix-ref` 两个字段，但“选填只免缺失”及 AC4 只明确覆盖二者都不存在的形态。以下路径未定义：

   - 有 `touched-modules`、缺 `fix-ref`；
   - 有 `fix-ref`、缺 `touched-modules`。

   两者后果不同：前者仍可驱动 Q3/C6/B9 模块定位但缺代码出处，后者有出处却无法计算模块尺度和 freshness。需求需明确两字段是成对出现、允许独立选填，还是部分缺失也按 F1 拒绝。

   此外，选填字段存在时继承一致性 F1，但 AC14 仅标注“必填案”；AC4 又是零-delta fixture，无法验证选填案中 `touched-modules` 漏列 delta module 的拒绝路径。

这不要求人类预选必填/选填、v1/v2 或 z1/z2。需要做的是让 z2 成为时间边界和写入副作用完整的候选，并补齐选填头的部分缺失真值表及相应 acceptance。

## 六维评审

| 维度 | 结论 | 说明 |
|---|---|---|
| 1. target state B | issues open | 主体与 Q1–Q9 已清楚；z2 的 baseline 来源和选填字段组合仍不确定。 |
| 2. edge cases / exception paths | issues open | 既有 stale、类别 1+3 和 present-but-invalid 已覆盖；单字段缺失及 snapshot 写入失败/重跑未覆盖。 |
| 3. implied state changes / side effects | issues open | z2 增加 bundle 写入，但尚未纳入 d1 摘要域和 B4 提交阶段。 |
| 4. acceptance testability | issues open | AC13 已闭合；AC4/AC14 未覆盖 z2，也未覆盖选填案的部分缺失及带 delta 一致性。 |
| 5. state A compatibility | pass | e1-α/β/e2 均明确保护正式 change；AM-17、UNBOUND/GAPS、CAS、modified-integrity 和 gate 七项不弱化约束保持。 |
| 6. target lineage | pass | 当前分支为 `on-the-fly`；`4127653` 存在并对应 P0 trio，lineage 声明真实。 |

## 新鲜审查结果

未新开 `REQ-16+`。z2 和部分缺失均属于 REQ-13 的定位头、freshness 归因及异常路径，应继续 reopened 原 ID。

## Advisories

- z1 已准确限定为“本次触及且当前 stale”，不再声称因果归属，是完整可裁的保守候选。
- e1-β 若同时存在 `blocked` 与 `advisory`，可由“advisory 非阻塞”和既有 blocked 聚合规则推出整体 `BLOCKED`；建议 AC13 增加混合结果样本，但现有目标已足以实现，不计正式问题。
- AC14 已正确把纯 Decision 模块从代码 touched、Q3 计数及重复 C6 来源中移出。
- `won't do` 节存在，并继续保护 AM-17、普通 archive fail-closed、UNBOUND/GAPS、自动互转禁令及 Contract 相关性不做机械判断。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-6 | fixed → verified |
| REQ-13 | fixed → open（z2 缺可取得的修复前 baseline、签收/事务契约及参数化验收；选填头部分缺失未定义） |

VERDICT: 1 issues open