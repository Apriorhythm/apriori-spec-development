<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r11 transport=codex-exec-wsl-proxy -->

磁盘上的 `req-v10.md` 仍是 v9 的字节副本：两者 SHA-256 均为 `ff0f11…e69af1`，`cmp` 返回相同，标题仍为 `req-v9`。因此四条修复均未实际落盘。

### Findings

**REQ-37 — waive 仍被表述为改变半径，三层语义未落盘**  
风险：阻断  
依据：[req-v10.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:50) 仍写 `docs-P8=waive` 时 doc-fix“一律 R3”，但分级函数 [req-v10.md:56](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:56) 至 [req-v10.md:60](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:60) 不读取该轴；耦合表 [req-v10.md:91](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:91) 也仍写“waive 下 R3”。“半径保持 R2、仅 hotfix 准入拒绝”的三层分离未出现。

**REQ-40 — v2 仍被扩义为文档路径归属检查**  
风险：高  
依据：[req-v10.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:50) 仍要求 v2 校验“commit 存在性与文档路径归属”；prior art v2 只增加本仓 ref 存在性校验。声称删除的路径归属扩义仍在正文。

**REQ-41 — 类型表完整机械语法与负例仍未落盘**  
风险：高  
依据：[req-v10.md:44](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:44) 仍未定义机械行语法、词表外映射键，也未说明多个配置行同值/冲突如何继承 state A 语义；[req-v10.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:114) 仍没有这些明确负例。

**REQ-43 — verdict 内容摘要绑定未落盘**  
风险：阻断  
依据：[req-v10.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:31) 的机械验收仍仅为 verdict 行与 raw 存档，没有摘要域、摘要字段、算法或 preflight 重算拒绝规则。当前 bundle 继续被 clean-tree 排除（[req-v10.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:73)），故评审后修改内容仍可复用旧 verdict。

**REQ-42 — 版本工件与账本漂移再次发生（reopened）**  
风险：阻断  
依据：`req-v10.md` 与 `req-v9.md` 大小同为 30099 字节、SHA-256 相同、`cmp_status=0`，且 [req-v10.md:1](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:1) 仍标 `req-v9`，文末止于 r8 裁定及上次事故注记；但 [issues.md:43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/issues.md:43) 至 [issues.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/issues.md:49) 已先行标记 `fixed(v10)`。这是 REQ-42 所述同类事故复发，应 reopen 原 ID，而非新建重复 ID。

VERDICT: 5 issues open