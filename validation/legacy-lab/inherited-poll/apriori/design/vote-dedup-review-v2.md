# vote-dedup STEP2 design review — v2

**Formal Issues**

None.

DES-001 is adequately closed: `vote()` and `publicView()` now normalize missing legacy `poll.voters`
to `[]`, persist `voters` on the next successful vote, and tasks add regression coverage.

DES-002 is adequately closed: `createServer(dataDir, { storeIo } = {})` now forwards the store I/O
seam, and VD-09's binding test is moved to `server.test.js` over real HTTP with `POST` 500 followed by
API `GET`.

## Advisories

- ADV-DES-r2-001: the DES-001 regression test should not create an `apriori verify` orphan — either
  bind it to a real spec scenario if the CLI expects every scenario-like ID in test names, or keep the
  test name free of unlisted scenario IDs.
- ADV-DES-r2-002: the VD-09 HTTP test should arm the injected write failure after poll fixture setup,
  or preseed `polls.json`, so the injected failure hits the vote write rather than poll creation.
- ADV-DES-r2-003: one sentence still said the synchronous span starts at
  `poll.voters.includes(voterId)`; wording updated to the normalized `voters.includes(voterId)`.

## LEDGER DELTA

No new or reopened formal issues. No ledger row changes required.

VERDICT: no major issues, ready to proceed to execution

> (recorded on behalf of the reviewer — codex gpt-5.5, session 019f44ec-b8cb-7ca1-a7c7-e64826b62233
> resumed, read-only sandbox; raw output: vote-dedup-step2-review-v2-raw.txt)
