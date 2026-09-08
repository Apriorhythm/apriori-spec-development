<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r33 transport=codex-exec-wsl-proxy -->

核验结论：REQ-70 已收口；REQ-72 的“取消代 owner 预裁”已落实，但新增的 Q-4c 尚未形成完整可执行契约，因此不能关闭。本轮另发现 1 个新问题。

### REQ-72 — 阻断：Q-4c 只有决策摘要，没有贯穿正式契约

**风险：** owner 即使在 gate③ 选择 Q-4c，也无法唯一生成字段、验证步骤与验收预期；尤其混合 `tests:` / `no-test:` 的 R2 bundle 存在两种相反解释。

**依据：**

- Q-4 已扩展为 a/b/c，并把 c 定义为全域保留 no-test；这一点诚实反映了 goal 未限制半径：[req-v31.md:124](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:124)。
- 但绑定需求函数正文仍只实现 Q-4a 与 Q-4b，[req-v31.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:31) 至 [req-v31.md:34](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:34) 仍称“Q-4 两案”；载体推论也仍称“两案”：[req-v31.md:65](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:65)。
- B-C 表仍规定 R2 的 `no-test` “无此选项”：[req-v31.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:94)。
- AC-I 仍只要求“Q-4 两分支”，并断言 R2 `no-test` 恒拒绝：[req-v31.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:117)。
- B4 虽称 Q-4b/c 可跳过“对应 scope”，却没有定义混合 bundle 的 scope 切分：[req-v31.md:80](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:80)。prior art 原契约允许每个目标键分别声明 `tests:` 或 `no-test:`，[req-v13.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:49)、[req-v13.md:58](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:58)。因此若一个 R2 delta 同时含两类键，当前文本无法判定是：
  - 整个 bundle 跳过 verify，从而 `tests:` 键也未被证明；还是
  - 运行完整 delta scope，从而 `no-test:` 键导致 GAPS，无法归档。

Q-4c 至少还需贯穿：适用 profile/change-kind、keyed 与 singleton 形状、混合键的 verify scope、全 no-test 分支、doc-fix 排除、B-C 投影、AC 正反例，以及与 Q-8/Q7b 的 g1 联动。

### REQ-73 — 高：prior-art 取代数量与参数化 Q-4 不一致

**风险：** AC-D6 是 gate③ 的验收 oracle，但固定要求解释“3处”，实际数量随 Q-4 选择变化，导致同一合法裁定既可能被误拒，也可能被迫虚构第三处取代。

**依据：**

- 正文已把“新拍板取代清单”缩为 2 处，并明确 no-test 半径限制只是本 change 的派生提案：[req-v31.md:27](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:27)。
- AC-D6 仍固定要求 prior art 采纳/取代“3处”：[req-v31.md:116](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v31.md:116)。
- 数量实际上取决于 Q-4：选择 a/b 时 no-test 契约发生条件性取代；选择 c 时恢复 prior art 原义，不构成第三处取代。AC-D6 应按 Q-4 分支参数化，而非固定计数。

VERDICT: 2 issues open