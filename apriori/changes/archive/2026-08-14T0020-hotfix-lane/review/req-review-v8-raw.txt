<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r8 transport=codex-exec-wsl-proxy -->

八条核验结果：REQ-23、26、28、32、33、36 已闭合；REQ-34 的原始“bundle 自身导致 dirty”问题已消除，但排除集产生新绕过；REQ-35 未闭合。

### Findings

**REQ-35 — `doc-fix` 仍使分级函数存在无结果合法输入**  
风险：阻断  
依据：[req-v8.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:41) 允许 `doc-fix`，[req-v8.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:50) 只说 delta“允许”，没有要求非零。合法的 `doc-fix + 零 delta + 单模块 + 本仓 fix-ref + 无 decisions` 不命中 [req-v8.md:55](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:55) 至 [req-v8.md:60](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:60) 的任何判定行。与此同时，B-C 保留 R1×docs 格，却未说明 `doc-fix` 如何进入 R1。应明确 `doc-fix` 必须有 delta，或定义其零-delta 半径。

**REQ-37 — `doc-fix` 让 docs oracle 与 scoped-verify 契约发生实质冲突**  
风险：阻断  
依据：[req-v8.md:77](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:77) 把所有 R2 delta 的证明定义为 scoped verify，并以“块有 scenario”作为可测试前提；[req-v8.md:91](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:91) 对 docs 却只要求 `check`，符合 state A 中 docs-only 的 `check + P8` 替代测试语义。新增 `doc-fix` 后该组合已可达：它既被要求跑 scoped verify，又没有 docs 测试/TAP oracle；而仅包含 scenario 也不能证明 `check` 覆盖了该 scenario。需给 docs delta 单列证明契约，或明确 docs 不进入这条 R2 降级路径。

**REQ-38 — clean-tree 排除集可绕过 profile、类型表和证据规则变更**  
风险：阻断  
依据：[req-v8.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:73) 排除整个 `apriori/**`，其中包含 `process-config.md`、living spec、truth 和 runbook，而非仅在途 bundle/tmp。具体绕过：证据生成后未提交地把 profile 从 `ui` 改为 `backend`，或修改模块类型表，HEAD 与工件基线仍相等，clean-tree 也不报错，preflight 却按较弱的新配置判定。另一个“项目声明的证据输出路径”没有禁止指向代码目录，声明过宽即可隐藏源码 dirty。应缩为精确的当前 bundle/tmp 路径，并把所有影响判定的配置纳入 clean 检查或摘要哈希。

**REQ-39 — gate③ 的 owner 决策面仍漏项**  
风险：高  
依据：[req-v8.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:73) 新增 t1/t2 候选并给出倾向，但 [req-v8.md:123](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:123) 的 Q-6 未列 t1/t2，也未列证据路径排除策略。类似地，[req-v8.md:63](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:63) 说 γ′ 必须绑定 d 或特定评审、且要确认“未来整块替换授权”，但 [req-v8.md:118](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:118) 的 Q-1 仅列 β′/γ′。owner 可能在不知道连带授权和合法组合的情况下作出不完整裁定，违反“不代 owner 预裁”。

**REQ-40 — `doc-fix` 静默预用了尚待 Q-8 裁定的 fix-ref 强校验**  
风险：高  
依据：[req-v8.md:43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:43) 的通用契约只校验仓域格式；prior art 的“本仓 ref 是否验证存在”仍是 v1/v2 待裁候选。新增的 [req-v8.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:50) 却要求 `doc-fix` 的 fix-ref 指向“本仓文档变更 commit”，没有说明在 v1 案下仅作声明，还是新增 commit 存在性及文档路径归属检查，也没有对应错误谱。当前既可能预裁 v2，也可能只留下不可验证的强措辞。

**REQ-41 — 类型表配置的 malformed 输入域仍未定义**  
风险：高  
依据：[req-v8.md:44](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v8.md:44) 定义了合法映射值和“模块未覆盖→R3”，但未定义类型表整行缺失、重复模块冲突、未知类型、未知模块、配置重复行冲突或不可解析时是 F1、全体 R3，还是回退无类型表申报案。state A 的 `process-config` 会区分缺失、冲突和消费时错误，不能把这些输入等同处理。AC-I 仅写“含类型表行”，也缺上述负例，因此“派生变量语义完整”尚不成立。

VERDICT: 6 issues open