# vote-dedup STEP2 design review — v1

**Formal Issues**

### DES-001 — Legacy poll records without `voters` can 500 on public GET/vote despite B8 compatibility

**Description:** Requirement B8 says old polls without `voters` are treated as `[]`, but the design
pseudo-code uses `poll.voters.includes(...)` and `[...poll.voters, voterId]` directly in `publicView`
and `vote` (design.md §3). Since `GET /api/polls/:id` always passes a voter digest after issuing a
cookie, an old poll with no `voters` field can throw before rendering.

**Risk:** Existing production/dev poll data created before this change can break immediately after
deploy.

**Suggested fix:** Normalize reads through `const voters = Array.isArray(poll.voters) ? poll.voters :
[]` in `publicView` and `vote`, persist `voters` on the next successful write, and add a
scenario/test using a pre-change `polls.json` record with no `voters`.

### DES-002 — VD-09 is specified as an HTTP behavior, but the designed test seam is not plumbed through `createServer`

**Description:** The spec requires a failing write during `POST /api/polls/:id/vote` and a subsequent
API `GET` check (specs/vote-dedup.md, VD-09). The design only adds `createStore(dataDir, io)`, while
current `createServer(dataDir)` constructs the store internally, and tasks place VD-09 in
`polls.test.js` rather than `server.test.js`.

**Risk:** Implementation can pass a domain rollback test while the visible API behavior remains
unverified or impossible to inject without reworking the server factory.

**Suggested fix:** Add a server-level seam, e.g. `createServer(dataDir, { storeIo })` or injectable
store construction, and add a `server.test.js` VD-09 test that arms write failure after poll creation,
posts with a valid cookie, asserts 500, then GETs through the API with the same cookie and verifies
unchanged `total`/`counts`/`voted`.

## Advisories

- ADV-DES-001: align cookie-secret timing language — design says "first use", while VD-10/tasks
  require construction/startup failure for a corrupt secret; prefer saying `createServer(dataDir)`
  loads it during construction.
- ADV-DES-002: add optional coverage for GET with invalid cookie reissue and valid cookie no-reissue —
  design declares this visible behavior, but no scenario names it directly.
- ADV-DES-003: avoid describing `store.put` as a general rollback guarantee — it only protects callers
  that do not mutate live store objects before `put`; `close()` still does (outside this requirement's
  scope, but the wording should stay scoped).

## LEDGER DELTA

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DES-001 | Legacy poll records without `voters` can 500 on public GET/vote despite B8 compatibility | Existing polls created before this change may break immediately after deploy because design/tasks read `poll.voters` directly instead of normalizing missing fields to `[]` | STEP2·r1 | open |
| DES-002 | VD-09 HTTP failure scenario lacks a server-level injection seam | The required visible `POST` 500 plus follow-up API `GET` can be untestable or only tested at the wrong layer, allowing spec/API mismatch and execution rework | STEP2·r1 | open |

VERDICT: 2 issues open

> (recorded on behalf of the reviewer — codex gpt-5.5, session 019f44ec-b8cb-7ca1-a7c7-e64826b62233,
> read-only sandbox; raw output: vote-dedup-step2-review-v1-raw.txt)
