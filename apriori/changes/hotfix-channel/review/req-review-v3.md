<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r3 transport=codex-exec-wsl-proxy -->

# req-review-v3 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v3.md`

评审标准：本 change 为 design-first；不要求在 requirement 阶段裁定 Q1–Q8，只判断候选集合、后果、约束和 acceptance 是否完整、真实且可交给后续设计。

## r2 六项核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-2 | reopened | d1 已增加内容绑定，但批准证据写入 bundle 会与“hash bundle 全部内容”形成自失效循环。 |
| REQ-3 | reopened | truth baseline 已加入，但无锁的 read→check→rename 不能保证并发写者必然冲突。 |
| REQ-4 | verified | F1 global preflight 与 F2 commit-time I/O failure 已清楚分离；部分提交、恢复和 completion point 表述完整。并发竞态另由 REQ-3 承接。 |
| REQ-5 | reopened | no-test 的载体和错误谱明显完善，但 g1 对后续 archived gate 的影响未声明，语法仍有歧义。 |
| REQ-6 | reopened | 已列 m1–m3，但 state A check 编号有误，m2 对 `hotfix-state.md` 合法性的处理缺失。 |
| REQ-10 | verified | Q6/Q7/Q8 已承接主要机制选择，次级设计项也明确由 STEP2 提案、gate③ 整体审定。 |

## 正式 findings

### REQ-2 — d1 的批准记录会改变其自身绑定的 bundle

风险：倾向方案 d1 按当前文字无法同时满足“hash bundle 全部内容”“bundle 改动令牌失效”和“批准记录写入 bundle”，可能导致合法批准永远失配，或批准证据实际未被令牌覆盖。

依据：

- d1 对“bundle 全部内容 + spec/truth baselines”计算令牌。
- 批准命令随后必须把令牌、日期和 dry-run 输出存入 bundle。
- AC11 又规定任何 bundle 改动均使令牌失配。
- 若批准记录在重算前写入，令牌必然失效；若在重算后写入，则落入 archive 的 bundle 已不同于被 hash 的 bundle。
- 如果 dry-run 输出本身包含令牌并参与摘要，还会产生自引用问题。

决策空间需要明确批准证据的 canonicalization，例如将机器生成的 approval record 排除在 bundle digest 外、单独摘要业务输入并把该摘要写入记录，或使用外置不可变 approval artifact；无需现在选择具体方案。

### REQ-3 — 无锁 baseline 校验不能兑现“后写者必败”

风险：两个并发归档仍可能基于同一 truth baseline 同时通过检查，随后由后一次 atomic rename 静默覆盖前一次写入，造成 Decision 丢失。

依据：

- B3 明确承认没有跨进程锁，却断言并发写者不会静默覆盖、后写者基线比对必败。
- 两个进程可以同时读取 baseline `H0`、同时确认当前文件仍为 `H0`，然后分别写临时文件并 atomic rename；atomic rename 只保证单次替换不可撕裂，不提供 compare-and-swap。
- state A 的 spec CAS 也存在该 read/check/write 窗口，因此“与 state A 同级”不能推出“后写必败”。
- AC5 的“写入间隙外部改 truth → conflict”若覆盖 check 与 rename 之间的窗口，当前承诺无法通过；若不覆盖，则没有测试文中更强的并发保证。

需要把选项及边界如实列明：接受 residual TOCTOU、按 truth/module 串行、使用互斥锁或其他真正的原子条件写机制。若接受竞态，应删除“不静默覆盖”的硬保证并相应缩窄 AC5。

### REQ-5 — g1 遗漏 archived gate 后果，声明目标语法仍不唯一

风险：一个合法 no-test active scenario 不只让健康报告显示债务，还会使此后正式 change 的 post-archive gate C1 持续 BLOCKED；同时声明粒度的矛盾可能让不同实现生成不兼容 manifest。

依据：

- state A 中，在途 C1 为 change-scoped，但 archived C1 明确运行 whole-store verify。
- RUNBOOK STEP6 要求每个正式 change 在归档后运行 `apriori gate --change <name>`，结果进入 gate④ packet。
- 因而 g1 的 UNBOUND 不阻塞其他 change 的在途 gate，却会阻塞它们归档后的 C1。若 no-test 是长期理由，所有后续正式 change 都可能无法正常完成 STEP6。
- v3 只声明 store-wide verify 从此 GAPS，并特别说明其他“在途”change 不受阻，却没有声明 post-archive gate 的全局后果及解除路径。
- B5 同时写“每个块恰有一条声明”和“有 scenario 时逐 scenario 一条”，两者在多 scenario block 上冲突。
- state A 的 RENAMED 只有 `- Old -> New` 映射，没有“RENAMED 目标块”；需求未说明 rename-only 时声明应绑定目标 Requirement、其每个既存 scenario，还是无需新声明。

需要把 archived gate 后果、永久 no-test 的债务生命周期及精确目标键纳入 Q7；不需要预先选择 g1/g2/g3。

### REQ-6 — gate 映射错认 state A，m2 可能对非法 hotfix 报 PASS

风险：AI 按当前表实现时可能错误重编号现有 checks，或让缺失、损坏、身份不匹配的 `hotfix-state.md` 在 m2 下不受 gate 检查。

依据：

- state A 的编号是：C1 binding、C2 tasks、C3 flow-state legality、C4 ledger、C5 verdict/raw evidence、C6 KB freshness、C7 CAS。
- B6 却写成“C2 tasks / C3 ledger / C4 raw / C5 verdict”，与代码、spec 和 KB 均不一致。
- m2 把 C2/C3/C4/C5 全设为 n/a，但 hotfix 实际有替代 `flow-state.md` 的 `hotfix-state.md`，且 B7 为其定义了 identity/header/conclusion 合法性。
- 如果 m2 不增加对应状态检查，也不明确 gate PASS 不涵盖 bundle validity，那么一个 archive preflight 必然拒绝的非法 hotfix 仍可能得到 `GATE: PASS`。
- m1/m3 已将等价检查放进 archive preflight；m2 没有说明相同检查由谁承担。

应先按真实编号修正文案，再为 m2 陈列“C3 适配为 hotfix-state legality”与“C3 n/a、gate PASS 不代表 bundle 可归档”等候选及后果。

### REQ-11 — g2 不是已证明保护的“强化”候选

风险：人类可能被要求在 gate③ 从一个被错误描述为“可能强化”的候选中选择，而该候选实际允许无测试 scenario 绕过 fail-closed binding，削弱正式 change 也依赖的全局 verify 语义。

依据：

- state A 的硬语义是 scenario 无通过测试即 UNBOUND/GAPS；普通 `--specs` GREEN 表示每个 active store scenario 均有通过测试。
- g2 被称为“verify 机器豁免（第四种场景状态）”。如果该状态不阻塞 GREEN，它使“无测试”从 GAPS 变成可通过，属于放宽而非强化。
- verify 是正式 change 的 STEP5/archived gate 基础；这不是只影响流程外 hotfix 的局部变化。
- “不改场景 ID 三态，除非证明为强化”的条件不足以把一个实质豁免变成合法选项。

若 g2 保持豁免语义，应标为与 never-weaken constraint 冲突、非可选方案；若希望保留候选，应改写为只增加债务标注而不改变 UNBOUND/GAPS verdict，并诚实说明它不能解决 g1 的 archived gate 阻塞。

### REQ-12 — KB 生命周期只覆盖 active append，遗漏 Contract freshness 与 Decision supersession

风险：紧急代码修复归档后可能留下已知 stale Contract，或在 Decisions 中同时保留互相冲突的 active 条目；后续 gate 才暴露债务，hotfix 本身没有合法处理路径。

依据：

- B1 明确承接紧急代码修复，而 B3 规定 Contract 和 `source-commit` 永不由 hotfix 触碰。
- state A 的 `source-commit` 用于判断 Contract 是否落后于对应代码。事后补记的代码 commit 即使不改变公开接口，也会使该模块的 freshness 检查看到新 commit。
- B6 的 m2 又只在存在 decisions 时运行 C6，带 delta 的代码 hotfix 可能不提示这项已产生的 freshness debt。
- Decisions 条目格式只允许新条目为 `(active)`；但 RUNBOOK 规定旧 decision 只有在新 decision supersede 它时才失效，现有 KB 也实际使用 `superseded-by: <id>`。
- 上线后业务事实可能否定既有 active assumption。当前契约既没有允许原子更新旧条目的 supersession 形态，也没有规定发现冲突时拒绝 hotfix并要求正式 change。

需要补全设计空间：Contract 不受影响的资格判据与 stale `source-commit` 后果；以及“仅追加不冲突事实”“允许 CAS 保护的 supersession 更新”“涉及 supersession 必须升格 change”等候选。

## 其余维度

- 目标态 B：总体结构清楚，Q1–Q8 均为真实的人类设计决策；上述 findings 是候选后果或契约缺口，不是要求提前选边。
- 异常路径：F1/F2、zero-delta 专属例外、结论负向全谱和重跑路径均比 v2 明显完整。
- Acceptance：AC1、AC4、AC6、AC7、AC8、AC9、AC10 已具备可测试形态；AC5/AC11 需随 REQ-2/REQ-3 修正保证边界。
- state A：AM-17、普通 change gate 和现有 archive 部分提交语义均明确声明不变；g2 与 gate 编号仍存在上述冲突。
- target lineage：仍声明 `on-the-fly` v4 产品线、main 暂不动、不合并 v1/v3，与当前仓库历史一致。
- won't-do：存在，且已扩充 AM-17、互转、批量回填与三态约束。

## Advisories

- B4 的 `completion point` 已正确替代容易误导的 `commit point`。
- AC1 已补候选 ii 的含测试总耗时报告，采纳有效。
- 五列表账本及 `flow-state.next-action` 已修正。
- AC2 中 modified-integrity 只对 MODIFIED operation 产生实质报告；REMOVED fixture 可验证该机制未被破坏，但建议 STEP2 避免表述成 REMOVED 本身会产生 integrity diff。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-2 | fixed → open（d1 approval artifact 与全 bundle digest 自相失效） |
| REQ-3 | fixed → open（无锁 baseline check 不能保证并发后写者必败） |
| REQ-4 | fixed → verified |
| REQ-5 | fixed → open（g1 archived gate 后果及声明目标语法未闭合） |
| REQ-6 | fixed → open（C3–C5 编号错误，m2 缺 hotfix-state legality 映射） |
| REQ-10 | fixed → verified |
| REQ-11 | new → open（g2 exemption 与 never-weaken binding 约束冲突） |
| REQ-12 | new → open（Contract freshness 与 Decision supersession 生命周期缺失） |

VERDICT: 6 issues open