<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r17 transport=codex-exec-wsl-proxy -->

核验结果：REQ-54、REQ-56 已闭合；REQ-53、REQ-55 仍有执行级残口。v15 为真实新字节，lineage 仍真实；未发现新增 prior-art 误用或越过 design-first 停点。

### Findings

**REQ-53 — R2 子型仍未进入唯一分级函数的输出契约**  
风险：阻断  
依据：正式准入表声称分级函数会随附 `{whitelist, behavior}`（[req-v15.md:98](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:98)），但唯一分级函数的判定表仍只输出 `R2`：次序 2 的白名单结果为 R2，次序 3 的行为修复结果也是 R2，没有定义结果元组或子型字段（[req-v15.md:57](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:57)、[req-v15.md:58](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:58)）。AC-D1 也只断言半径值域，未断言子型派生。下游不能依赖一个未进入上游输出契约的标记；应将输出明确为如 `(R2, whitelist)`／`(R2, behavior)`，并规定非 R2 的子型为 n/a、序列化位置和对应 AC。

**REQ-53a — B-C 总则仍与新的两层准入模型冲突**  
风险：高  
依据：[req-v15.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:31) 已正确声明 trivial 最终资格由“半径+子型机械否决 ∧ human tier 判定”决定；但 B-C 总则和正式表标题仍称“半径决定准入／半径决定 tier 准入下限”（[req-v15.md:83](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:83)、[req-v15.md:93](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:93)）。这不是措辞小差异：R2-whitelist 在 Q-5b 下只得到“交 human 判定”，并非仅由半径决定。gate③ packet 会产生两个不同的准入模型。

**REQ-57 — Q-5b 新增的 R2×trivial 没有验证下限**  
风险：阻断  
依据：Q-5b 可把 whitelist R2 交给 human 判定并最终进入 trivial（[req-v15.md:98](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:98)），但该行“验证档”只定义 medium/large 全量档；R0/R1 行的 trivial 增量档只复用 hotfix 的 R0/R1 对应行（[req-v15.md:97](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:97)）。因此新增的 R2-whitelist×trivial 无对应证据 oracle，尤其 docs 应跑 `check+P8`、code 应跑 scoped verify 的要求已从 Q-5 中删除。AC-D3 虽枚举该组合，却无法给出唯一预期。

**REQ-55 — raw 四项错误谱声称“入 AC-I”，但正式 AC 未落地，双 verdict 形态也未定义**  
风险：阻断  
依据：正文定义 raw 缺区、marker 重复、摘要不等、评审文档不一致四类拒绝，并声称入 AC-I（[req-v15.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:31)）；正式 AC-I 却仍只有泛化的“verdict 内容摘要绑定、评审后改动拒绝”，没有这四个 oracle（[req-v15.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v15.md:114)）。同时 R2×docs 双职责要求同轮产生两条 verdict，内容绑定算法却使用单数“verdict 行摘要／评审文档 verdict”，没有规定唯一尾区应含一条复合 verdict 还是两条 verdict、两条是否都携摘要、基数或顺序错误如何处理。实现者无法为合法双职责格写出唯一 parser 和验收 fixture。

VERDICT: 4 issues open