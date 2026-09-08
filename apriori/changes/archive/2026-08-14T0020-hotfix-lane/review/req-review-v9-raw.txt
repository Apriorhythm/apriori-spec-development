<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r9 transport=codex-exec-wsl-proxy -->

实际 `req-v9.md` 未包含所述修改：它与 v8 的 SHA-256 均为 `7e069c…b275d`，且标题仍为 `req-v8`。因此六条不能核验关闭。

### Findings

**REQ-35 — `doc-fix` 仍存在合法但无分级结果的输入**  
风险：阻断  
依据：[req-v9.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:50) 仍写“delta 允许”，没有“必填非零”；[req-v9.md:55](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:55) 至 [req-v9.md:60](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:60) 仍无 `doc-fix` 零-delta 判定行；[req-v9.md:90](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:90) 的 R1×docs 也未标 n/a。

**REQ-37 — `doc-fix` 与 scoped verify 的证明契约仍冲突**  
风险：阻断  
依据：[req-v9.md:77](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:77) 仍对 delta 使用通用 scoped verify；没有单列 `doc-fix = check + P8`、retain 强制或 waive→R3。耦合表 [req-v9.md:91](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:91) 也仍只写 docs 的 `check`，未闭合 P8 语义面。

**REQ-38 — clean-tree 排除集仍可隐藏规范与配置变更**  
风险：阻断  
依据：[req-v9.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:73) 仍排除整个 `apriori/**`，并允许项目声明任意证据输出路径；没有缩窄为当前 bundle 与 `apriori/tmp/`。未提交的 process-config、spec、truth、RUNBOOK 改动仍不会触发 dirty 拒绝。

**REQ-39 — gate③ 决策摘要仍漏连带裁定**  
风险：高  
依据：[req-v9.md:118](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:118) 的 Q-1 仍未列 γ′ 的整块替换授权及 d/评审合法组合确认；[req-v9.md:123](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:123) 的 Q-6 仍未列 t1/t2 与证据路径排除策略。

**REQ-40 — `doc-fix` 的 fix-ref 仍未与 v1/v2 参数化联动**  
风险：高  
依据：[req-v9.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:50) 仍直接要求 fix-ref “指向本仓文档变更 commit”，没有说明 v1 仅格式声明、v2 校验 ref 存在及路径归属，也没有相应参数化错误谱。

**REQ-41 — 类型表 malformed 输入域仍未定义**  
风险：高  
依据：[req-v9.md:44](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:44) 仍只定义合法值和单模块未覆盖→R3；整表缺失、配置行冲突、重复模块冲突、未知类型、未知模块和不可解析输入仍无唯一结果。Q-2 与 AC-I 也未补这些分支。

**REQ-42 — 版本工件与账本发生事实性漂移**  
风险：阻断  
依据：[req-v9.md:1](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:1) 标题仍是 `req-v8`；`cmp` 证明 v8/v9 字节相同，SHA-256 相同。与此同时，[issues.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/issues.md:41) 至 [issues.md:47](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/issues.md:47) 已把六条标为 `fixed(v9)`。账本裁定记录没有可对应的需求正文，当前 v9 不是真实的新版本。

VERDICT: 7 issues open