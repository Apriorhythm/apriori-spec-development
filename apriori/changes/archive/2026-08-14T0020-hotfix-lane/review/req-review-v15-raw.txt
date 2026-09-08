<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r15 transport=codex-exec-wsl-proxy -->

核验结果：REQ-49、REQ-50、REQ-52 已闭合；REQ-51 仍有一个组合残口。v13 为真实新字节，lineage 仍与 Git 历史一致；未发现新增 prior-art 误用或越过 design-first 停点。

### Findings

**REQ-51 — `all-code × retain × R2-docs` 仍未定义**  
风险：高  
依据：[req-v13.md:29](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v13.md:29) 将 `all-code` 定义为独立合法轴值；但所谓 R2×docs“三案”只规定 `scope=R2 ∧ retain`、`scope=none ∧ retain` 和所有 `waive`，遗漏 `scope=all-code ∧ retain`（[req-v13.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v13.md:31)）。虽然可推测 all-code 应像 R2 一样承担点检+P8，但机械规范不能靠推测；应写成 `scope∈{R2,all-code} ∧ retain` 或单列该格。

**REQ-53 — Q-5b 没有进入正式准入表，且破坏“半径唯一决定准入”**  
风险：阻断  
依据：Q-5b 允许“白名单命中的 R2”进入 trivial（[req-v13.md:122](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v13.md:122)），但正式流程表仍无条件规定所有 R2 都是 medium 起或 hotfix（[req-v13.md:98](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v13.md:98)）。此外，白名单 delta 与 `code-behavior` 都输出同一个 R2，Q-5b 却只允许前者进入 trivial；因此仅凭 `{R0..R3}` 已无法决定准入，与“半径决定准入”及 AC-D3 的唯一预期声明（[req-v13.md:83](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v13.md:83)、[req-v13.md:110](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v13.md:110)）冲突。Q-5 两案需要参数化写进正式表，并给白名单来源增加明确判别输入。

**REQ-54 — Q-5b 未诚实披露其放宽的是 tier 资格，而不只是加强验证**  
风险：高  
依据：state A 的 Trivial 同时要求单文件、无新用户可见行为、无 shared-state change（[RUNBOOK.md:93](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:93)）。Q-5b 却允许所有白名单 R2 进入 trivial，包括 γ′ 预授权的整块替换和 Q-12 的 ADDED-only 新行为；现有白名单条件不判文件数、新用户行为或 shared state。正文只强调 scoped verify“比现行更强、无套利”（[req-v13.md:122](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v13.md:122)），但验证更强不能证明 tier 资格仍符合 state A。若这是给 owner 的真实候选，必须显式披露其扩大 Trivial 定义；若要保持 state A，则需再与其三项资格条件取交集。

**REQ-55 — verdict 摘要仍是可自行改写的自报值，不能机械证明内容经过评审**  
风险：阻断  
依据：[req-v13.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v13.md:31) 要求 preflight 仅重算 bundle 摘要并与 verdict 行比较，同时把评审工件排除在摘要之外；却没有要求 verdict 摘要必须与 raw 中 reviewer 实际输出的摘要逐字一致，也没有不可伪造的签名。state A 的 C5 实现确实只检查 verdict 存在及同名 raw 文件存在（[lib/gate.js:151](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:151)）。因此业务内容变更后，只需同步改写 verdict 行摘要，旧 raw 无须复审即可继续通过，直接违反“评审后有改动必须拒绝”的 AC。当前机制只是摘要自洽检查，不是所声明的内容绑定证明。

VERDICT: 4 issues open