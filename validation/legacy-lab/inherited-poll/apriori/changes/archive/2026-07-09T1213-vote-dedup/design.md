# Design — vote-dedup

Resolves gap-report risks (`apriori/explore/vote-dedup-gap-report.md`) #1 (store atomicity) and #2
(synchronous vote path) explicitly, since those two gate whether VD-08/VD-09 are satisfiable at all.

## STEP2 review v1 handling (P6)

| ID | Handled | Where |
|---|---|---|
| DES-001 | accept | §3 `vote`/`publicView` now normalize `poll.voters` to `[]` when the field is absent (legacy records) |
| DES-002 | accept | §2/§4: `createServer(dataDir, { storeIo })` passthrough added; VD-09's binding test moves to `server.test.js` (HTTP-level), `polls.test.js` version becomes optional extra coverage — tasks.md updated |
| ADV-DES-001 | accept | §1 "three moments" wording changed from "first use" to "during construction", matching VD-10 |
| ADV-DES-002 | batch-acknowledged, not added as a new scenario | existing VD-01 already covers reissue-on-missing/invalid vs. no-reissue-on-valid is implied by "already has a valid cookie" branch of B1 — judged adequately covered, no rework needed |
| ADV-DES-003 | batch-acknowledged | scope note taken; `store.put`'s guarantee is already described narrowly (§2, tied to non-mutating callers) and `close()` is explicitly out of scope (proposal.md) |

## 1. New module: `lib/voter-identity.js`

Owns cookie parsing/building and signing. Zero new dependencies — `node:crypto` only.

- `loadOrCreateSecret(dataDir)`: reads `<dataDir>/cookie-secret`. Missing → `fs.mkdirSync(dataDir,
  {recursive:true})` then generate 32 random bytes via `crypto.randomBytes(32)` and
  `fs.writeFileSync` (sync — this module does its **own** `mkdirSync`, does not assume `store.js` has
  already created `dataDir`, closing gap-report risk #3). Present but wrong length → `throw` (server
  construction fails loudly; no silent regeneration — VD-10).
- `issue(secret)` → `{value, raw}`: `raw = crypto.randomBytes(16).toString('base64url')`;
  `sig = crypto.createHmac('sha256', secret).update(raw).digest('base64url')`; cookie value =
  `raw + '.' + sig`.
- `verify(cookieValue, secret)` → `raw string | null`: splits on `.`, recomputes HMAC over the `raw`
  part, `crypto.timingSafeEqual`s against the provided signature; malformed input or mismatch → `null`
  (never throws — HTTP layer treats `null` as "no valid identity").
- `digest(raw, secret)` → `crypto.createHmac('sha256', secret).update('voters:'+raw).digest('base64url')`:
  a **different** HMAC input prefix than the cookie signature, so the persisted `voters[]` digest can
  never be replayed as a valid cookie signature or vice versa. This is what gets stored in
  `poll.voters` — never the raw identity, never the cookie value (B7 privacy).
- `parseCookieHeader(header)` → tiny hand-rolled `Cookie:` header parser (no library) returning
  `{pv: '...'}`-shaped object; `buildSetCookie(value)` → the literal
  `pv=<value>; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000` string.

**Three moments** (external shared state — the cookie-secret file):
- *init*: `loadOrCreateSecret` runs during `createServer(dataDir)`'s **construction** (not lazily on
  first request) — this is what makes VD-10's "corrupt key fails startup" observable: the throw
  happens before the server ever calls `.listen()`. Called once per process, cached in a closure — not
  re-read per request. (ADV-DES-001, STEP2 review v1: wording aligned with VD-10/tasks.md, which both
  already required construction-time failure.)
- *runtime update*: never rewritten after creation for the life of a dataDir (no rotation in scope).
- *cleanup/invalidation*: none — matches KB's existing `data/` lifecycle (no TTL/pruning anywhere in
  this app); out of scope per proposal.md.

## 2. `lib/store.js` — restructured for write-then-commit atomicity (gap-report risk #1)

Current bug-in-waiting: `put(poll)` does `data[poll.id] = poll; save();` — since callers normally pass
the *same object reference* already living in `data`, the live map is corrupted the instant the caller
mutates that object, independent of whether `save()` (the disk write) succeeds. Two changes:

```js
// module-level: `let data = load();` (was `const`)
function save(snapshot) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
  fs.renameSync(tmp, file);
}
put(poll) {
  const snapshot = { ...data, [poll.id]: poll };
  save(snapshot);       // throws → `data` untouched, caller sees the throw
  data = snapshot;       // only reached on success
}
```

This alone is not suffient — it only helps if `polls.vote()` also stops mutating the *live* poll
object in place before calling `put`. See §3.

**Test seam for VD-09 (persistence-failure injection):** this sandbox runs as **root**, and an
empirical check during design confirmed root bypasses directory permission bits (`chmod 500` on a
scratch dir did not block `fs.writeFileSync` as root) — so a permission-based fault injection is not a
reliable, portable mechanism here. Instead, `createStore(dataDir, io = {})` accepts an optional
override object defaulting to the real `fs` functions:
```js
function createStore(dataDir, io = {}) {
  const writeFileSync = io.writeFileSync || fs.writeFileSync;
  const renameSync = io.renameSync || fs.renameSync;
  ...
}
```
Production code path is unchanged (default args = real `fs`). The VD-09 test constructs a store with
`io.writeFileSync` that throws once, exercising `polls.vote()`'s real rollback logic against a real
thrown error from the real call site — this is dependency injection of the I/O primitive, not a mock
of the assertion; the code under test (`polls.js`'s catch/rollback path) runs unmodified and for real.

**(fixes DES-002, STEP2 review v1):** the same `io` seam must be reachable from the **HTTP** layer, not
just the domain layer, because VD-09 is specified as a `POST`-then-`GET` HTTP scenario (the visible
behavior a real client observes), not a `polls.vote()` unit call. `createServer(dataDir, { storeIo }
= {})` (see §4) forwards `storeIo` straight into `createStore(dataDir, storeIo)` — production callers
(`server.js`'s `require.main === module` block) pass nothing, so the default (real `fs`) path is
unaffected. `test/server.test.js`'s VD-09 test constructs its server with a `storeIo.writeFileSync`
that throws on its next call, issues a real `GET` (to get a cookie) then a real `POST` over HTTP,
asserts `500`, then issues a further real `GET` over HTTP and asserts `total`/`counts`/`voted`
unchanged — this is the actual API-level guarantee the spec makes, exercised end-to-end. The
`polls.test.js` domain-layer version of the same idea (§6 in the original design) is now optional
extra coverage, not the scenario's binding test — `tasks.md` is updated accordingly.

## 3. `lib/polls.js` — signature changes and the atomic vote path

- `vote(id, choices, voterId)` — `voterId` is the HMAC digest (see §1), always a non-empty string;
  supplying it is the HTTP layer's responsibility (cookie validated in `server.js` **before** `vote()`
  is ever called — REQ-001's Q3 resolution: cookie validation is HTTP-layer, not domain-layer).
  ```js
  function vote(id, choices, voterId) {
    const poll = getPoll(id);
    // ...existing closed/deadline/choices/multiple checks, unchanged...
    const voters = Array.isArray(poll.voters) ? poll.voters : []; // legacy (pre-change) polls have no
                                                                    // `voters` field at all — B8
    if (voters.includes(voterId)) throw new PollError(409, '你已经投过这个投票了');
    const candidate = { ...poll, votes: [...poll.votes, choices], voters: [...voters, voterId] };
    store.put(candidate);   // throws → `poll` (the caller's object) was never mutated — rollback is
                             // "do nothing", by construction, not a try/catch undo
    return publicView(candidate, voterId);
  }
  ```
  **(fixes DES-001, STEP2 review v1):** `publicView(poll, voterId)` (§3 below) applies the same
  `Array.isArray(poll.voters) ? poll.voters : []` normalization — a poll record written before this
  change (no `voters` key at all) must never throw on a public `GET`/`POST`; it is read as "nobody has
  voted on it under the new scheme yet", consistent with B8's "no retroactive migration, no crash."
  The normalized (possibly-just-created) `voters: []` is persisted the next time that poll is
  successfully written (i.e. on its first post-change vote, via `candidate` above) — no separate
  migration step, no read triggers a write.
  Building `candidate` as a **new** object (never `poll.votes.push(...)`) is what makes rollback free:
  on `store.put` throwing, nothing about the live `poll` object or `data` map changed, so a following
  `GET` naturally reflects pre-failure state (VD-09) with no separate rollback code path to get wrong.
- **Synchronous end-to-end, by design constraint** (gap-report risk #2): every step from the
  normalized `voters.includes(voterId)` check through `store.put(candidate)` is synchronous — no
  `await`, no callback-based I/O — so Node's single-threaded event loop cannot interleave a second
  concurrent `POST .../vote` between the dedup check and the commit. This is why VD-08 needs no
  explicit lock: it needs the *absence* of any yield point in this function, which is why
  `voter-identity.js`'s `issue`/`verify`/`digest` are all synchronous crypto calls, not
  `crypto.randomBytes`'s async callback form.
- `hasVoted` is inlined (the normalized `voters.includes(voterId)`, §3 above) — no separate exported
  helper needed. (ADV-DES-r2-003, STEP2 review v2: wording aligned to the post-normalization variable.)
- Split the view projection to make the admin/public boundary structurally impossible to blur
  (addresses reviewer advisory ADV-r2-001 from `vote-dedup-req-review-v2.md`, turning a "be careful"
  advisory into a type-level separation):
  ```js
  function view(poll) { /* existing fields only — id, question, options, multiple, deadline,
                            closed, open, counts, total — UNCHANGED, never gains a voted field */ }
  function publicView(poll, voterId) {
    const voters = Array.isArray(poll.voters) ? poll.voters : []; // DES-001 fix — legacy polls
    return { ...view(poll), voted: Boolean(voterId) && voters.includes(voterId) };
  }
  ```
  `getView(id, voterId)` → `publicView(getPoll(id), voterId)`. `adminView(token)` and `close(token)`
  keep calling the base `view(poll)` — **unchanged**, so admin responses structurally cannot carry
  `voted` (VD-11).
- `create(input)` gains `voters: []` on the initial poll record, alongside the existing `votes: []`
  (old polls loaded from disk without a `voters` field are treated as `voters: []` at read time via
  the `Array.isArray(poll.voters) ? poll.voters : []` normalization above — DES-001 — so pre-existing
  `data/polls.json` entries need no migration, confirming req-final.md B8).

## 4. `server.js` — HTTP-layer cookie wiring

- `createServer(dataDir, { storeIo } = {})` **(fixes DES-002, STEP2 review v1)**: adds an optional
  second parameter, forwarded verbatim as `createStore(dataDir, storeIo)`'s `io` argument — this is
  the only signature change to `createServer`. Every production call site (`require.main === module`
  at the bottom of `server.js`) passes nothing, so `storeIo` defaults to `undefined` → `createStore`'s
  own default (`io = {}`) → real `fs` functions; behavior for real deployments is byte-for-byte
  unchanged. Tests that need VD-09's fault injection construct `createServer(tmpDataDir, { storeIo:
  { writeFileSync: throwsOnce } })` and drive it exactly like a normal server (`http` requests), so the
  test exercises the real request→response path, not a domain-layer shortcut.
- `GET /api/polls/:id`: parse `Cookie` header; `verify()` the `pv` value against the secret.
  - Valid → `voterId = digest(raw, secret)`, no `Set-Cookie` in the response.
  - Missing/invalid → `issue(secret)` a new identity, respond with `Set-Cookie: buildSetCookie(...)`,
    and use `digest(raw, secret)` of the **newly issued** raw as `voterId` for this same response's
    `getView` call (so a first-ever visitor's first response already carries an accurate `voted:false`,
    consistent — trivially, since a brand-new identity has never voted).
- `POST /api/polls/:id/vote`: parse+verify the same way; **no verified identity → respond 403
  immediately, never call `polls.vote()`, never `Set-Cookie`** (VD-04). Verified → call
  `polls.vote(id, choices, digest(raw, secret))`.
- `GET /poll/:id`, `GET /admin/:token`, `GET /`, `GET /style.css`: **unchanged** — no cookie read, no
  cookie write (B1's "API-layer-only" issuance boundary).
- `GET /api/admin/:token`, `POST /api/admin/:token/close`: **unchanged** call sites (`adminView`,
  `close`) — no voter identity involved, confirming VD-11's admin-side guarantee structurally (§3).

## 5. `public/poll.html` — minimal frontend change

- `updateState(view)`: branch on `view.voted` (server truth) instead of (or in addition to, as a
  cosmetic pre-paint hint) the `localStorage` read — server value wins on any conflict (VD-07a).
  `localStorage.setItem` after a successful vote can stay as a harmless legacy write, but must not be
  the deciding read.
- The `#error` box already exists and is already shown on a non-ok vote response (`server.test.js`'s
  existing coverage) — VD-07b needs no new UI element, just a Playwright scenario that deletes the
  `pv` cookie via `context.clearCookies()` (or `page.context().clearCookies()`) before clicking submit,
  and asserts `#error` becomes visible with the 403 text. Note (carried from gap-report risk #6): the
  page's `setInterval(load, 3000)` could silently re-`GET` and re-issue a cookie between "delete
  cookie" and "click vote" if the test is slow — the Playwright test must delete the cookie and click
  within one 3s window, or stub/clear the interval for that test.

## 6. Existing test call-site inventory (gap-report risk #4/#5 — enumerated so STEP5's tasks.md is exhaustive)

Grep-confirmed call sites needing a third argument or a `voters` field addition:
- `test/polls.test.js`: every `polls.vote(id, choices)` call → add a fixed test voter digest (e.g. a
  literal string, since these tests exercise the domain layer directly, not through cookies/HTTP).
  Every `polls.create(...)`-derived poll fixture implicitly gets `voters: []` from `create()`'s new
  default — no test change needed there.
  Every `polls.getView(id)` that asserts on the exact returned object shape now also receives `voted`.
- `test/server.test.js`: HTTP-level tests that currently POST directly without a cookie will now hit
  the new 403 path — each existing "vote succeeds" test needs to first `GET /api/polls/:id`, capture
  `Set-Cookie`, and forward it on the `POST`.
- `test/store.test.js`: `put`'s new write-then-commit contract needs at least one test asserting a
  failed `save()` leaves the prior `all()`/`get()` state exactly unchanged (this can reuse the same
  `io.writeFileSync`-throws seam from §2 rather than inventing a second one).

## 7. Explicitly NOT changing

- `findByToken`, `close`, `create`'s validation rules, `isOpen`, deadline/closed 409 ordering, the
  `store.js` load-on-corrupt-JSON `.bak` rename behavior — all untouched, per proposal.md's
  out-of-scope list and AC11/VD-11's non-regression requirement.
