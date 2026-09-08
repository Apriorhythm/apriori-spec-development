<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r10 transport=codex-exec-wsl-proxy -->

核验结果：REQ-35、REQ-38、REQ-39、REQ-42 已闭合；REQ-37、REQ-40、REQ-41 仍有残口。v9 与 v8 哈希不同，标题、事故注记、账本及 flow-state 已一致，lineage 仍真实。

### Findings

**REQ-37 — `doc-fix × docs-P8=waive` 未进入唯一分级函数，并破坏半径正交性**  
风险：阻断  
依据：[req-v9.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:50) 声明 waive 时“一律 R3”，但 [req-v9.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:56) 至 [req-v9.md:60](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:60) 的分级函数不读取 `docs-P8`，命中 γ′ 的同一输入仍由次序 2 得到 R2；该规则只在耦合表 [req-v9.md:91](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:91) 再次外加。同时，[req-v9.md:83](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:83) 声称半径、profile、证据类型正交，而 retain/waive 却改变同一改动的半径。应选择一种一致语义：将其纳入分级函数；或保持 R2 半径、仅判 hotfix 不准入并指路正式流程。

**REQ-40 — prior art 的 v2 候选仍被静默扩义**  
风险：高  
依据：prior art [req-v13.md:14](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:14) 中 v2 只比 v1 多“本仓 ref 存在性校验”；v9 [req-v9.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:50) 却把 v2 扩为“commit 存在性与文档路径归属”。“文档路径”没有机械词表、配置来源或混合 commit 判法，Q-8 也没有提示 owner 这是新增的 v2′，而非原候选。联动已经显式，但引用真实性及 oracle 尚未闭合。

**REQ-41 — 类型表错误谱仍未覆盖完整配置输入域**  
风险：高  
依据：[req-v9.md:44](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:44) 已定义整表缺失、重复模块、未知类型、不可解析和被触模块未覆盖，却没有定义：

- 映射键为 store/truth 词表外的未知模块；
- 多个 `module-type-map` 配置行同值或冲突时的结果；
- 类型表值的机械语法，因而“行不可解析”的边界仍不可实现。

AC-I [req-v9.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:114) 也只有泛化的“config 解析与缺省”，不足以保证这些负例进入设计。

**REQ-43 — P8/γ′ 点检证据未绑定最终 bundle，可复用陈旧 verdict**  
风险：阻断  
依据：[req-v9.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:31) 把机械验收仅定义为 verdict 行与 raw 存档；[req-v9.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:50) 又让 P8 成为 doc-fix 的语义准入面，[req-v9.md:63](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:63) 允许 γ′ 点检替代 d。可是当前 C5 只检查 verdict 与 raw 文件是否存在（[lib/gate.js:136](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:136)），不校验其审阅内容摘要；clean-tree 又有意排除当前 bundle（[req-v9.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v9.md:73)）。因此作者可在评审后修改 delta/decisions，旧 raw 仍机械 PASS。d+d1 能防此事，但 `a/b/c + R2 点检` 和普通 docs-P8 retain 都是合法组合且没有等价绑定。

VERDICT: 4 issues open