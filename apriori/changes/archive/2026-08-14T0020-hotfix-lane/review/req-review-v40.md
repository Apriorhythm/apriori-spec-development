<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r40 transport=codex-exec-wsl-proxy -->

核验结果：REQ-77 已收口；REQ-80、REQ-81 正文改动均已落盘，但验收与交叉组合仍存在矛盾。lineage、prior-art 使用、design-first 边界及 state A 对照未见新增问题。

### REQ-80 — AC-I 仍把“工件缺基线字段”无条件判拒

风险：阻断

依据：

- 正文已正确参数化：f1 要求工件内基线行；f2 的绑定由 d1 摘要承担、工件内字段非必需；f3 不要求基线字段。[req-v38.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v38.md:94)
- 但 AC-I 仍将“基线字段缺失”与缺 ID、重复 ID 等并列，写成“各自拒绝”；只有后面的“新鲜度失配”注明按 Q-6b 取形。[req-v38.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v38.md:117)
- 因而合法的 f2/f3 工件会被该 AC 判拒，与正文冲突。

AC 应逐案改为：f1 缺工件内基线行拒绝；f2 缺 d1 摘要中的工件哈希或代码基线拒绝，工件内无该字段通过；f3 缺时间戳拒绝，基线字段缺失不构成错误。

### REQ-81 — 空 scope 的工件基数仍自相矛盾，并与 f1/f2 不可组合

风险：阻断

依据：

- 同一契约先无条件要求“工件存在且可读”，随后又要求 final scope 为空时“工件必须缺席”。[req-v38.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v38.md:94)
- 即使把后者理解为特例，Q-6b 仍冲突：f1 要求基线行位于工件内；f2 要求 d1 摘要包含工件哈希；工件缺席时两者均没有合法输入。[req-v38.md:75](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v38.md:75)
- AC-D3 声称覆盖 Q-6b 全轴，同时 AC-I 明列 `R2-behavior × ii × Q-4c × p2 singleton no-test` 空-scope 组合，因此不能假定这些交叉分支不可达。[req-v38.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v38.md:113)

需显式裁定：空 scope 时 Q-3/Q-6b 是否归一为 n/a；或者定义 f1/f2 的空工件/空哈希语义；或者把相关联合选项列为非法。当前不能机械得出唯一结果。

VERDICT: 2 issues open