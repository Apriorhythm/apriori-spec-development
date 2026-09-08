# Issue ledger — runbook-version-sync

Rows recorded on behalf of the reviewer (codex session 019f5578-794b-7733-81ed-26fedd775250; raws beside their docs in this dir).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RV-1 | CN 版 CK-11 规则歧义(可能只校验 EN/CN 彼此一致而非各自==pkg major)。 | CN 副本 major 漂移不被守。 | STEP0·r1 | verified |
| RV-2 | CK-11 parse target/失败条件未完全可测。 | 误抓正文示例或漏测畸形头。 | STEP0·r1 | verified |
| RV-3 | 回归钉子写死 pkg 4.0.3,当前 4.0.2,诱导比 full version。 | 测试描述误导实现。 | STEP0·r1 | verified |
| RVSPEC-1 | CK-11 "naming file and two values" 过度断言(缺失/多头/格式错无两值)。 | 契约过宽,失败报告不自然。 | STEP2·r1 | verified |
| RVSPEC-2 | 单场景漏 malformed value 与 body/fence never-matched。 | 实现可漏这两类仍过测。 | STEP2·r1 | verified |
| RVIMPL-1 | RUNBOOK.md canonical 必检,但缺失时 checkRunbookVersion 放过。 | canonical 契约未落实。 | STEP5·r1 | verified |
| RVIMPL-2 | 正则匹配全文 blockquote 非头部区,正文后部 entry 误判 PASS。 | body occurrence 违约被当合法。 | STEP5·r1 | verified |
