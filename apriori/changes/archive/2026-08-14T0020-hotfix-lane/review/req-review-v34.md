<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r34 transport=codex-exec-wsl-proxy -->

核验结论：REQ-73 已完整收口；REQ-72 的 keyed-delta 部分已贯穿，但“全域”仍有零 delta 缺口，不能关闭。另发现两个新问题。lineage、design-first 边界及 AC-D6 参数化未见新增冲突。

### REQ-72 — 阻断：Q-4c 未覆盖零 delta 的 R2 behavior

**风险：** “保留全域”在 `code-behavior` 分支没有唯一声明形状、准入语义或验收 oracle，owner 选择 c 后仍无法形成完整设计。

**依据：**

- `code-behavior` 零 delta 被明确分为 `(R2, behavior)`：[req-v32.md:61](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:61)。
- 零 delta + Q-8/Q7c=p2 要求 singleton 无键声明，但正式行类型只定义：
  - Q-4a：singleton 只能 `tests:`
  - Q-4b：R1 singleton 可以 `no-test:`
  - 没有 Q-4c 的 singleton 规则：[req-v32.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:31) 至 [req-v32.md:34](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:34)。
- B-C 的 Q-4c 只写“逐键可选”，无法适用于无键的 R2 behavior：[req-v32.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:94)。
- AC-I 的 c 案也只有 keyed 混合/全 no-test 例，没有 R2 behavior singleton 例：[req-v32.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:117)。
- 推论仍漏列 c 案并残留“Q-4 两案”：[req-v32.md:65](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:65)。
- prior art 的 p2 原契约允许零 delta bundle 级 `tests:`/`no-test:`，因此“恢复原义”理应覆盖该分支：[req-v13.md:59](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:59)。

还需明确 Q-4c 下 R2 behavior 的 singleton 合法值、是否豁免整个 `affected-scenario-ids` scope、债务仅存归档载体而不进入 living store 的后果，并补 AC。

### REQ-74 — 阻断：按键切分会静默丢掉既有 affected scenarios

**风险：** Q-4c bundle 可以申报受代码修复影响的既有场景，却不运行这些场景，也无需为其提供 `no-test` 理由，形成无留痕的验证逃逸。

**依据：**

- `affected-scenario-ids` 是所有 code-* 必填的独立 scope 输入，且可引用既有 store 场景或 delta 场景：[req-v32.md:51](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:51)。
- 绑定 keyed 行只覆盖 delta 目标键，并不为额外的既有 affected ID 生成声明：[req-v32.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:31)。
- B4 先定义基础 scope 为 `delta scenarios ∪ affected-scenario-ids`，随即在保留案中改成“运行 scope = tests: 键集合”：[req-v32.md:80](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:80)。这会丢掉所有不属于 delta 目标键的 affected ID。
- “全 no-test bundle = scope 空”也不成立：该 bundle 仍可合法申报额外既有 affected IDs。

唯一集合语义应类似：

`运行 scope = (delta scenarios ∪ affected-scenario-ids) − delta no-test 键`

而不是仅取 `tests:` 键集合；并应补“额外既有 affected ID 仍须 GREEN”的混合正反例。

### REQ-75 — 高：`no-test → UNBOUND → archived gate 阻塞` 被误写成必然后果

**风险：** owner 可能基于“g1 一定自动逼偿”选择 Q-4c，但实际已有或碰巧同 ID 的 TAP 测试会令该场景 GREEN/RED，而非 UNBOUND；债务可能不触发所宣称的阻塞链。

**依据：**

- v32 多处断言 no-test 键归档后必成 UNBOUND，并进一步产生 GAPS/gate 阻塞：[req-v32.md:80](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:80)、[req-v32.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:94)、[req-v32.md:124](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v32.md:124)。
- state A 完全不读取 no-test 声明；它只依据实际 TAP 结果分类：无结果才是 UNBOUND，有通过结果即 GREEN，有失败结果即 RED：[spec-runner.js:383](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:383)。
- archived gate 确实运行 whole-store verify，但只有实际 verdict 不 clean 才阻塞：[gate.js:252](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:252)。
- v32 又规定全 no-test 时不运行 preflight verify，因此更不可能机械证明“没有同 ID 测试存在”。

应将后果改为条件式：“若归档后实际无绑定 TAP 结果，则 UNBOUND→GAPS→阻塞”；若要保证 g1 必然触发，则必须新增对 no-test 键“实际无 TAP 结果”的机械检查及对应 GREEN/RED 冲突语义。

VERDICT: 3 issues open