<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r9 transport=codex-exec-wsl-proxy -->

# req-review-v9 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v9.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断每个候选的语义、后果、约束与 acceptance 是否完整、真实。

## r8 REQ-13 核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-13 | verified | z2 已作为不可实现候选移除，且准确说明事后补记缺少修复前观察点及其额外写入面；选填案已形成“成对全缺 / 成对存在 / 半缺 F1”的完整真值表，present 时继承全部校验，AC14 覆盖半缺及带 delta 一致性。 |

## 正式 findings

### REQ-16 — 外仓 fix-ref 无法进入本仓 freshness 检查，可能产生假 clean 信号

风险：`high`。外仓代码修复可能在 C6 中得到 `pass` 或 `n/a`，归档 advisory 也不会列出 stale 模块；使用者可能把本仓 freshness 结果误读为已检查该代码修复。

依据：

- B1 明确允许代码修复位于“另一 repo”，v1 对 `fix-ref` 只做非空及格式校验。
- v2 只写“本仓可解析的 ref 加验存在性”，未说明外仓 ref 在 v2 下被拒绝，还是继续按不可验证声明接受。
- 同一节又明确 C6 不消费 `fix-ref`。
- state A 的 C6 只执行当前仓库中的 `<source-commit>..HEAD` 检查，且 `source-files` 只能指向当前 repo 内的规范相对路径。
- 因此外仓 commit 不会出现在本仓 `git log` 中：
  - 若本仓映射路径没有后续 commit，C6 会得到 `pass`；
  - 若路径无法映射，则得到带原因的 `n/a`；
  - `touched-modules ∩ stale` 也不会因为外仓 commit 而命中。
- B9 却笼统声明“类别 1 的代码修复 commit 会使该模块 C6 freshness 检查看到新 commit”，该结论只对当前仓库且落入 `source-files` 映射的修复成立。
- “机器不判外仓 ref 是否存在”诚实披露了 provenance 验证限制，但没有披露 freshness 同样不可验证；这是另一个直接影响 C6/B9 的后果。
- AC4、AC12、AC13、AC14 都没有外仓 fix-ref fixture，无法验证外仓修复应输出 `pass`、`n/a`、通用提醒还是明确的 `unverifiable` advisory。

这不要求 gate③ 预先禁止或允许外仓修复。决策空间至少应列明：

- 限定类别 1 只承接当前 repo/source-files 可观察的代码修复；或
- 允许外仓修复，但将其 freshness 明确标为不可机械验证，禁止把本仓 C6 `pass` 表述为外仓修复已 fresh，并定义相应的 gate/archive 输出及 acceptance。

## 六维评审

| 维度 | 结论 | 说明 |
|---|---|---|
| 1. target state B | issues open | 本仓路径已清楚；外仓 fix-ref 与 freshness 目标的关系仍不完整。 |
| 2. edge cases / exception paths | issues open | z2、半缺、预先 stale 和混合类别已覆盖；外仓 commit 不可见路径尚未覆盖。 |
| 3. implied state changes / side effects | pass | z2 已移除，没有新增摘要域或事务边界外写入面。 |
| 4. acceptance testability | issues open | REQ-13 原路径已可测；缺少外仓 ref 对 C6/B9 输出的参数化验收。 |
| 5. state A compatibility | pass | 普通 change、AM-17、C1/UNBOUND/GAPS、CAS、modified-integrity 与 gate 七项均保持；REQ-16 是 state A 可见范围未被目标态诚实映射。 |
| 6. target lineage | pass | 当前分支为 `on-the-fly`；`4127653` 存在并对应 P0 trio，lineage 声明真实。 |

## 新鲜审查结果

新开 `REQ-16`。它不是 REQ-13 的定位头真值表或异常契约遗留，而是 v7 起引入的外仓 provenance 与本仓 freshness 检测边界之间的独立缺口。

## Advisories

- 因果归属现在明确选择“不做”，输出严格限定为“本次触及且当前 stale”；该能力声明真实。
- AC14 已正确覆盖选填-present、半缺、类别 1+3 正交和预先 stale 反例。
- 历史裁定记录中仍保留 z1/z2 的演进描述不构成候选残留；现行 B1 已明确 z2 被移除。
- `won't do` 节存在，并继续保护 AM-17、普通 archive fail-closed、UNBOUND/GAPS、自动互转禁令及 Contract 相关性不做机械判断。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-13 | fixed → verified |
| REQ-16 | new → open（外仓 `fix-ref` 不可被本仓 C6/source-files 观察，freshness 后果及 acceptance 未声明） |

VERDICT: 1 issues open