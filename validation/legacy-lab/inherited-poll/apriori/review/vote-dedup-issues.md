# Issue ledger — vote-dedup

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-001 | 文档仍保留开放问题，目标态未封版 | 状态码、cookie 下发入口和领域层接口可能被不同实现者选择成不同结果 | STEP0·r1 | fixed (v2) |
| REQ-002 | `voted` 字段的公开视图契约不完整 | 前端、API 响应和测试可能对字段存在性/真假值产生分歧 | STEP0·r1 | fixed (v2) |
| REQ-003 | 同一 cookie 并发投票的结果未定义 | 并发重复提交可能双计票，破坏服务端防重复目标 | STEP0·r1 | fixed (v2) |
| REQ-004 | 持久化失败时的回滚/一致性未定义 | 可能出现返回失败但内存已计票，或计票与去重标记不一致 | STEP0·r1 | fixed (v2) |
| REQ-005 | 新旧投票数据模型兼容规则未声明 | 可能破坏旧 `votes` 数据、`counts`/`total` 语义或隐私边界 | STEP0·r1 | fixed (v2) |
| REQ-006 | Cookie 与签名密钥生命周期不够精确 | cookie 有效期、密钥复用和损坏处理不可预测，重启后行为可能不一致 | STEP0·r1 | fixed (v2) |
| REQ-007 | AC7 的无 cookie 直连 POST 用户可见文案不可按字面端到端测试 | 测试作者无法确定应断言 API JSON 还是浏览器页面错误状态 | STEP0·r1 | fixed (v2) |
| REQ-ADV-r1 | advisory batch acknowledged (3 items: ADV-001 零依赖约束显式化 / ADV-002 固定错误文案 / ADV-003 AC3 落成 N=3) — 见 review-v1 | — | STEP0·r1 | advisory-acked |
| DES-001 | Legacy poll records without `voters` can 500 on public GET/vote despite B8 compatibility | Existing polls created before this change may break immediately after deploy because design/tasks read `poll.voters` directly instead of normalizing missing fields to `[]` | STEP2·r1 | fixed (design.md rev) |
| DES-002 | VD-09 HTTP failure scenario lacks a server-level injection seam | The required visible `POST` 500 plus follow-up API `GET` can be untestable or only tested at the wrong layer, allowing spec/API mismatch and execution rework | STEP2·r1 | fixed (design.md rev) |
| DES-ADV-r1 | advisory batch acknowledged (3 items: ADV-DES-001 cookie-secret timing wording / ADV-DES-002 GET reissue-vs-no-reissue coverage / ADV-DES-003 scope `store.put` rollback wording) — 见 vote-dedup-review-v1.md | — | STEP2·r1 | advisory-acked |
| EXEC-001 | `GET /api/polls/:id` can grant a new `pv` cookie on a 404 because cookie issuance happens before poll lookup succeeds | Failed/invalid poll-view requests are rewarded with an identity despite B1's no-cookie-on-failure boundary; current 404 test misses the header | STEP5·r1 | fixed (server.js + 404-header regression test) |
| EXEC-ADV-r1 | advisory batch acknowledged (2 items: VD-02/03/05 bound at domain layer while phrased as HTTP, covered indirectly by VD-06/VD-08 / VD-04 test-strength: counts assertion + tampered-branch Set-Cookie absence) — 见 step5-review-v1 | — | STEP5·r1 | advisory-acked |

> Rows REQ-001..REQ-007 recorded on behalf of the reviewer (codex, session 019f4127-1cdf-7e32-a569-e568fe86ff58); reviewer's raw delta in vote-dedup-req-review-v1-raw.txt. "Round found" normalized from the reviewer's "req-v1" to the ledger's step-labeled form STEP0·r1.
> All seven fixed in req-v2 (producer P2, 2026-07-09): see requirement/req-v2.md §5 for accept+reason per item — every issue accepted, none rejected.
> STEP0·r2 (codex resume, same session, req-v2.md): reviewer confirmed all seven fixes adequate on re-check, no new/reopened formal rows, 2 advisories (ADV-r2-001/002, batch-noted, not landed as ledger rows per P0 — reviewer supplied no batch line so none added here). VERDICT: no major issues. Raw: vote-dedup-req-review-v2-raw.txt.
> STEP2·r1 (codex exec, new session 019f44ec-b8cb-7ca1-a7c7-e64826b62233, read-only sandbox): reviewed proposal.md/specs/design.md/tasks.md against req-final.md + KB + current code. DES-001/DES-002 recorded on behalf of the reviewer; reviewer's raw delta in vote-dedup-step2-review-v1-raw.txt. VERDICT: 2 issues open.
> Both fixed in design.md/tasks.md revision (producer P6, 2026-07-09): see design.md's "STEP2 review v1 handling" table — both accepted, none rejected.
> STEP2·r2 (codex resume, same session 019f44ec-b8cb-7ca1-a7c7-e64826b62233, revised design package): reviewer confirmed both fixes adequate, no new/reopened formal rows, 3 advisories (ADV-DES-r2-001/002/003, addressed inline — see vote-dedup-review-v2.md). VERDICT: no major issues, ready to proceed to execution. Raw: vote-dedup-step2-review-v2-raw.txt. STEP2 CLOSED.
> STEP5·r1 (P8, codex exec, new session 019f4501-a346-77c3-917e-74c11995c3d2, read-only sandbox): consistency review of implementation vs specs. EXEC-001 recorded on behalf of the reviewer; raw delta in vote-dedup-step5-review-v1-raw.txt. VERDICT: 1 issues open.
> EXEC-001 fixed (producer, 2026-07-09): server.js defers Set-Cookie until getView succeeds; 404-header regression test added; both r1 advisories also taken (VD-04 counts + tampered-branch Set-Cookie assertions). npm test 41/41, e2e 3/3, apriori verify GREEN re-confirmed.
> STEP5·r2 (P8, codex resume, same session): reviewer confirmed EXEC-001 closed on re-read, five dimensions re-checked, no new/reopened rows (reviewer's "fixed in r2" delta normalized onto the existing EXEC-001 row's Status). VERDICT: no spec-vs-code gaps. Raw: vote-dedup-step5-review-v2-raw.txt. STEP5 CLOSED.
