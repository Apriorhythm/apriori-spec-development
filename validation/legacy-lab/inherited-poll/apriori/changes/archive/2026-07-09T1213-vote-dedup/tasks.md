# Tasks — vote-dedup

Ordered for STEP5 (P7). Each task names the scenario ID(s) it must make pass. Tests-first per P7: a
failing test per scenario is written before its implementation task.

## 0. Test scaffolding (write failing tests first, named with scenario IDs)

- [x] `test/voter-identity.test.js` (new): unit tests for `lib/voter-identity.js` — issue/verify
      round-trip, tampered signature rejected, missing/corrupt secret file (VD-10).
- [x] `test/store.test.js`: add write-then-commit rollback test using the `io.writeFileSync`-throws
      seam (design.md §2) — failing state must equal pre-write state after a thrown save.
- [x] `test/polls.test.js`: add/extend tests for VD-02, VD-03, VD-05, VD-08, VD-11 at the domain layer
      (voter digest passed directly, no HTTP/cookie involved), plus a DES-001 regression test named
      without any VD-* scenario ID (ADV-DES-r2-001 — it's a regression test, not a new scenario;
      keeping it unlabeled avoids a spurious ORPHAN in `apriori verify`'s scenario binding): a poll
      object with no `voters` key at all must not throw from `publicView`/`vote`.
- [x] `test/server.test.js`: add/extend tests for VD-01, VD-04, VD-06 (restart via a fresh server/store
      instance against the same tmp dataDir), VD-09 (fixes DES-002 — the `storeIo`-injected write
      failure exercised over real HTTP: `POST` → 500, then a real `GET` confirming unchanged
      `total`/`counts`/`voted`; this is VD-09's binding test, not the polls.test.js version — arm the
      injected failure *after* the poll fixture is created, so it hits the vote write, not poll
      creation, per ADV-DES-r2-002), VD-11 (admin view shape).
- [x] `test/e2e.test.js`: add Playwright tests for VD-07a, VD-07b.
- [x] Run `npm test` — confirm the new tests fail for the right reason (no cookie support yet), show
      the failing run.

## 1. `lib/voter-identity.js` (new module)

- [x] Implement `loadOrCreateSecret`, `issue`, `verify`, `digest`, `parseCookieHeader`,
      `buildSetCookie` per design.md §1.
- [x] `node --test test/voter-identity.test.js` green.

## 2. `lib/store.js` — write-then-commit `put`

- [x] Change `data` from `const` to `let`; restructure `put` to build a snapshot, `save(snapshot)`
      first, commit `data = snapshot` only after success (design.md §2).
- [x] Add the optional `io` override parameter to `createStore` for fault injection (production call
      sites unaffected — no argument passed).
- [x] `node --test test/store.test.js` green (including the new rollback test).

## 2b. `server.js` — fault-injection passthrough (fixes DES-002)

- [x] `createServer(dataDir, { storeIo } = {})` forwards `storeIo` to `createStore(dataDir, storeIo)`;
      no other behavior change; production call site passes nothing (design.md §4).

## 3. `lib/polls.js` — domain-layer changes

- [x] `create(input)`: add `voters: []` to the new poll record.
- [x] Split `view(poll)` (base, unchanged fields) from `publicView(poll, voterId)` (adds `voted`) per
      design.md §3.
- [x] `getView(id, voterId)` → `publicView(getPoll(id), voterId)`.
- [x] `vote(id, choices, voterId)`: normalize `poll.voters` to `[]` when absent (DES-001), add the
      `voters.includes(voterId)` 409 check, build the `candidate` object (new arrays, never mutate
      `poll` in place), call `store.put(candidate)`, return `publicView(candidate, voterId)`. Keep
      every existing validation check (closed, deadline, choices shape, single-vs-multiple) in its
      current order, unchanged.
- [x] `adminView`/`close`: keep calling base `view(poll)` — no signature change, no `voted` field.
- [x] `node --test test/polls.test.js` green.

## 4. `server.js` — HTTP wiring

- [x] Construct/cache the cookie secret at server startup (`loadOrCreateSecret(dataDir)`) — startup
      must fail loudly if the secret file is corrupt (VD-10).
- [x] `GET /api/polls/:id`: parse+verify cookie; issue+`Set-Cookie` on missing/invalid; pass the
      resulting voter digest into `getView`.
- [x] `POST /api/polls/:id/vote`: parse+verify cookie; no valid identity → `403
      {error:"未获得投票标识"}` before calling `polls.vote`; valid → call `polls.vote(id, choices,
      voterDigest)`.
- [x] Confirm `GET /poll/:id`, `GET /admin/:token`, `GET /`, `GET /style.css`, `GET
      /api/admin/:token`, `POST /api/admin/:token/close` are untouched (no cookie logic added there).
- [x] `node --test test/server.test.js` green.

## 5. `public/poll.html` — frontend

- [x] `updateState(view)`: branch on `view.voted` as the source of truth; keep the existing
      `localStorage` write as a non-authoritative legacy no-op.
- [x] Confirm the existing `#error` display path already surfaces the new 403/409 text (no new UI
      element expected — verify by reading the vote button's fetch error handler).

## 6. Full verification

- [x] `npm test` green (all of `store.test.js`, `polls.test.js`, `server.test.js`).
- [x] `npm run test:e2e` green (VD-07a, VD-07b, plus existing e2e coverage still passing).
- [x] `apriori verify --specs apriori/changes/vote-dedup/specs --test-cmd "npm test"` — every VD-*
      scenario BOUND-GREEN, no ORPHAN/UNBOUND/UNIDENTIFIED.
- [x] Manually run the app (`run` skill / `npm start`), drive AC1/AC2/AC7 by hand with a real browser,
      per P7's "don't fly blind" rule; record one-line observations.
- [x] Heterogeneous consistency review (P8, codex) — 2 rounds, final verdict: VERDICT: no spec-vs-code gaps.
