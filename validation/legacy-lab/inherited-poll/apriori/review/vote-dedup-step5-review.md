# vote-dedup STEP5 consistency review (P8) — record

## Round 1 (STEP5·r1)

- Reviewer: codex gpt-5.5, session 019f4501-a346-77c3-917e-74c11995c3d2, read-only sandbox.
- Raw output: `vote-dedup-step5-review-v1-raw.txt`.
- Formal finding: EXEC-001 — `GET /api/polls/:id` issued `Set-Cookie` before the poll lookup could
  404, violating B1's no-cookie-on-failure boundary; the existing 404 test checked status/body only.
- Advisories (2, batch-acked as EXEC-ADV-r1): VD-02/03/05 bound at domain layer while phrased as
  HTTP (covered indirectly by VD-06/VD-08 HTTP tests); VD-04 test-strength (counts assertion,
  tampered-branch Set-Cookie absence).
- Verdict (verbatim): VERDICT: 1 issues open

## Producer fix (between rounds)

- `server.js`: the GET handler now calls `polls.getView()` before setting `Set-Cookie` — a 404 exits
  through the `PollError` handler without granting an identity.
- `test/server.test.js`: 404 error-path test asserts `set-cookie` absent (EXEC-001 regression); VD-04
  strengthened per both advisories (accepted despite advisory status — one-line additions).
- Re-verified: `npm test` 41/41, e2e 3/3, `apriori verify` GREEN.

## Round 2 (STEP5·r2)

- Reviewer: same session, resumed (`codex exec resume`).
- Raw output: `vote-dedup-step5-review-v2-raw.txt`.
- EXEC-001 confirmed closed by re-reading the code and tests; all five dimensions re-checked; no
  remaining gaps. One repeat advisory (VD-02/03/05 domain-layer binding), explicitly not counted.
- Verdict (verbatim): VERDICT: no spec-vs-code gaps

> Recorded on behalf of the reviewer (R2); the raw transcripts above are the diffable source.
