# KB — polls (whole app: HTTP layer + domain logic + persistence + frontend)

> Reverse-captured (P10) — the inherited project had no `apriori/truth/` docs; human-acked 2026-07-08
> (KB pre-check gate, see the vote-dedup flow-state `gates:` log).
> Updated by change **vote-dedup** (STEP6 writeback, 2026-07-09): server-side duplicate-vote
> prevention via a signed anonymous voter cookie. Living specs: `apriori/specs/polls.md` (VD-01..VD-11).
> Code scope: `server.js`, `lib/polls.js`, `lib/store.js`, `lib/voter-identity.js`, `public/*.html`,
> `test/*.js`.

## Contract (code-is-truth)

`source-commit: 8699ca84e2e829934c08a38640db5e94e3e35a15`

### Public interfaces (HTTP API — `server.js`)

Zero external dependencies (Node builtins only); JSON in/out, `charset=utf-8`; errors are
`{ error: <Chinese message> }` with the `PollError.status` code, or 500 + generic message + `console.error`
for unexpected throws. Request-body validation (change json-body-400, RB-01): a POST body that does
not parse to a plain JSON object — unparsable input, the literal `null`, arrays, bare strings/numbers
— is rejected at `readJsonBody` with `400 {error:"请求格式不正确"}` before any domain code runs; an
empty body is treated as `{}` (downstream field validation answers with its specific 400 message). A
malformed body can no longer produce a 500.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/` | — | `public/index.html` (create-poll page) |
| GET | `/style.css` | — | stylesheet |
| GET | `/poll/:id` | — | `public/poll.html` (id not validated against store — page loads, then fetches JSON and shows the error) |
| GET | `/admin/:token` | — | `public/admin.html` (same: token validity checked only by the JSON call the page makes) |
| POST | `/api/polls` | `{question, options[], multiple?, deadline?}` | 201 `{id, adminToken}` |
| GET | `/api/polls/:id` | — | 200 public view (incl. `voted`, see below) or 404. **Sole cookie-issuance point**: request without a valid `pv` cookie → response carries `Set-Cookie: pv=...` — but only on 200 (a 404 never grants a cookie); request with a valid `pv` → no re-issue |
| POST | `/api/polls/:id/vote` | `{choices:[int,...]}` + valid `pv` cookie | 200 public view (`voted:true`), or 400/404/409; **no/invalid cookie → 403 `{error:"未获得投票标识"}`, not counted**. No failure response (400/403/404/409/500) ever sets a cookie |
| GET | `/api/admin/:token` | — | 200 admin view (never contains `voted`) or 404 |
| POST | `/api/admin/:token/close` | — | 200 admin view (`closed:true`) or 404 |

Route matching: `id` and `token` path segments are matched by `^[a-z0-9]+$` at the router level (`server.js`);
actual existence is checked inside `lib/polls.js`. No auth/session of any kind — `adminToken` is a bearer
capability string embedded in the admin URL, nothing else gates `/api/admin/*`.

### Voter identity (`lib/voter-identity.js` — added by vote-dedup)

- Cookie `pv` = `<raw>.<sig>`: `raw` = 16 random bytes base64url; `sig` = HMAC-SHA256(raw, secret),
  base64url. Attributes: `HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000` (1 year, no `Secure` —
  no HTTPS deployment evidence). One identity site-wide, not per poll.
- Signing secret: 32 random bytes at `<dataDir>/cookie-secret`. Missing → generated at
  `createServer()` construction (module creates `dataDir` itself, does not rely on the store having
  done so). Present but wrong length → **`createServer` throws, startup fails** — never silently
  regenerated (VD-10). Never rotated/rewritten during a dataDir's life.
- `verify(value, secret)` → `raw | null` (timing-safe compare; never throws). Invalid/missing cookie:
  GET path treats as a new visitor (issues a fresh identity on success); POST vote path → 403.
- What persists in a poll record is `digest(raw, secret)` — an HMAC with a **different input prefix**
  (`voters:` + raw) than the cookie signature, so stored digests and cookie signatures are not
  interchangeable; neither the raw identity nor the cookie value is ever written to disk.
- Page/static routes (`/`, `/style.css`, `/poll/:id`, `/admin/:token`) and `/api/admin/*` neither
  read nor set this cookie.

### Domain logic (`lib/polls.js`)

- `create(input)` — validates `question` (non-empty, trimmed, ≤200 chars) and `options` (trim+drop-empty,
  2..20 items, each ≤100 chars); optional `deadline` must parse and be strictly in the future (`now()` is
  injectable for tests). Generates `id` (6 chars) and `adminToken` (16 chars) from a shared 31-char alphabet
  (`abcdefghjkmnpqrstuvwxyz23456789` — visually-ambiguous chars `i l o 0 1` excluded) via `crypto.randomBytes`.
  Stores the full poll object (**including `adminToken`**) via `store.put`.
- Two projections (split by vote-dedup to keep the admin/public boundary structural):
  - `view(poll)` — base projection, admin-facing: strips `adminToken`, raw `votes`, and `voters`;
    returns `{id, question, options, multiple, deadline, closed, open, counts, total}` — **never
    contains `voted`**. `counts[i]` = number of votes whose `choices` array includes index `i`;
    `total` = `votes.length` (vote *events* — a multi-select vote counts once toward `total` but
    toward multiple `counts[i]`).
  - `publicView(poll, voterId)` — `view(poll)` + derived boolean `voted` (`true` iff `voterId` is a
    non-empty string present in the poll's normalized `voters`). Used by `getView(id, voterId)` and
    by `vote()`'s success response.
- `isOpen(poll)` = `!closed && (!deadline || now() < deadline)`.
- `vote(id, choices, voterId)` — server-enforced one-vote-per-identity-per-poll. `voterId` is the
  HMAC digest computed by the HTTP layer (cookie parsing/verification never enters the domain layer).
  Checks (in order): poll exists (404) → not closed (409 `投票已关闭`) → not past deadline (409
  `投票已过截止时间`) → `choices` non-empty array (400) → each choice an integer in
  `[0, options.length)`, no duplicates (400 `选项不合法`) → single-select has exactly one choice
  (400) → **`voterId` not already in `voters` (409 `你已经投过这个投票了`)**. On success it builds a
  **new** candidate object (`votes` + this ballot, `voters` + this digest — never mutates the live
  poll in place), persists it via `store.put(candidate)`, and returns `publicView(candidate,
  voterId)`. A thrown `store.put` therefore leaves memory exactly as before (all-or-nothing; VD-09).
  **Invariant: this function is synchronous end-to-end** — no `await`/callback between the dedup
  check and the commit; that absence of yield points is what makes two concurrent votes safe
  (VD-08). Do not introduce async steps into this path.
- Legacy compatibility: polls written before vote-dedup have no `voters` key; every read normalizes
  via `Array.isArray(poll.voters) ? poll.voters : []` — old records never throw and their historical
  ballots stay counted as-is (never retro-attributed to any identity).
- `findByToken(token)` — **linear scan** over every stored poll (`store.all()`) comparing `adminToken`;
  fine at current scale, would need an index if poll count grows large.
- `adminView` / `close` both resolve the poll via `findByToken` — no separate rate limiting or attempt
  cap on token guessing (16 random chars from a 31-char alphabet is the only defense).

### Data model / persistence (`lib/store.js`)

- One JSON file: `<dataDir>/polls.json` — a flat object keyed by poll `id`, values are full poll records
  (including `adminToken` and raw `votes`). Loaded once into memory at `createStore()` time; every `put`
  rewrites the **entire file** (no per-poll files, no append log).
- **Three moments:**
  - *init*: `load()` reads the whole file synchronously at store construction; missing file → start
    from `{}`; JSON parse failure → the corrupt file is renamed to `<file>.bak-<timestamp>Z` and a fresh
    `{}` is used (logged via `console.error`, not surfaced to any HTTP caller).
  - *runtime update*: `put(poll)` is **write-then-commit** (restructured by vote-dedup): build a
    snapshot map, `save(snapshot)` to disk (write `<file>.tmp`, `fs.renameSync` over the real file),
    and only on success swap the in-memory reference to the snapshot. A thrown `save` leaves the
    in-memory map untouched and propagates to the caller (HTTP layer answers 500). Atomic rename,
    no leftover `.tmp` on success (asserted by `store.test.js`), but **`save()` still does not call
    `fsync`** on the temp file or directory — no crash-durability guarantee across power loss /
    kill -9 is claimed (only "no partial/corrupt file under normal process exit"); unchanged by
    vote-dedup, deliberately out of its scope. `createStore(dataDir, io = {})` accepts optional
    `writeFileSync`/`renameSync` overrides — a test-only fault-injection seam (production callers
    pass nothing); `createServer(dataDir, { storeIo })` forwards it.
  - *cleanup/invalidation*: none — there is no TTL, no poll deletion, no vote retraction. `data/` is
    gitignored; nothing in the app itself prunes it.
- Poll record shape: `{id, adminToken, question, options[], multiple, deadline (ISO string|null),
  closed, votes: [ [choiceIndex,...], ... ], voters: [<hmac digest>, ...], createdAt}`. `votes`
  entries carry **no voter identity, no timestamp**; the identity→ballot link is never stored —
  `voters` records only *that* a digest voted on this poll, not *what* it chose. Pre-vote-dedup
  records lack `voters` entirely (normalized to `[]` on read, materialized on their next successful
  write).
- Caveat (known, accepted): `close()` still mutates the live poll object before `put` (pre-existing
  style) — the write-then-commit rollback guarantee is only airtight for callers that build a new
  object first, which `vote()` does. A failed disk write during `close` can leave `closed:true` in
  memory. Out of vote-dedup's scope; noted in its STEP2 review (ADV-DES-003).

### Frontend (`public/*.html`)

- Zero build step, inline `<script>` per page, no framework. `poll.html`'s "already voted" state is
  driven by the **server's `voted` field** (vote-dedup): `updateState` branches on `view.voted`;
  the old `localStorage.setItem('voted:'+pollId, '1')` write is retained as a non-authoritative
  legacy side effect only — clearing localStorage no longer re-enables the form (the server still
  says `voted:true`). Server 4xx/409 rejections surface in the visible `#error` box; the form is not
  silently hidden on rejection. The vote `fetch` relies on same-origin default credentials to carry
  the `pv` cookie — no `document.cookie` access anywhere (cookie is HttpOnly anyway).
  Polling for live results: both `poll.html` and `admin.html` re-`fetch` their view every 3s
  (`setInterval(load, 3000)`), no websockets/SSE — note for E2E tests: the 3s poll can re-issue a
  deleted cookie via its own GET, so "delete cookie then click vote" tests must act within one window.
- `index.html` (create) and `admin.html` (manage) have no relevant state beyond what's described above.

### Dependencies / tooling

- Runtime: zero npm dependencies (`package.json` has none listed); Node ≥18 required (`engines`),
  actually exercised on Node 24 in this sandbox.
- Tests: `node --test` (builtin runner) over `test/store.test.js`, `test/polls.test.js`,
  `test/voter-identity.test.js`, `test/server.test.js` (41 tests, all green as of `source-commit`).
  `test/e2e.test.js` is a separate `npm run test:e2e` target (3 Playwright tests) requiring a
  **globally** installed `playwright` (`NODE_PATH` trick — not a project dependency) with chromium
  cached; not part of the default `npm test`. Spec binding: `apriori verify --specs apriori/specs`
  with the full suite under `node --test --test-reporter tap` (the e2e file runs under node:test, so
  it emits TAP too) — VD-01..VD-11 all BOUND-GREEN as of `source-commit`.
- No linter/formatter config found in the repo (no `.eslintrc*`, no `package.json` lint script).

### Known pitfalls for anyone touching this module

1. **The `vote()` path must stay synchronous** — the concurrency guarantee (VD-08) rests on the
   absence of yield points between the dedup check and `store.put`, not on any lock. An innocent
   `await` inside `vote()` (or async crypto/fs in its call chain) silently reopens the double-vote
   race. (Replaces the old pitfall #1 "no server-side dedup", resolved by vote-dedup.)
2. `store.save()` rewrites the whole file on every single vote — fine at poll-tool scale, would not
   scale to high write volume.
3. `adminToken` is stored in the same plain record as everything else and is returned verbatim from
   `view()`'s caller (`create`) but never leaked by `view()` itself — any change to the projections
   must keep stripping `adminToken`, `votes`, **and `voters`**; admin views must never gain `voted`.
4. `findByToken` is O(n) over all polls — a hot path if this ever needs to scale.
5. Chinese user-facing error strings are asserted verbatim in tests (`server.test.js`, `polls.test.js`)
   — changing message text is a breaking test change, not just a UX tweak. New fixed strings from
   vote-dedup: `未获得投票标识` (403), `你已经投过这个投票了` (409).
6. `data/` (and hence `data/polls.json`) is gitignored — the file present in the working tree is
   sample/dev data, not a fixture the tests depend on (tests use `fs.mkdtempSync` scratch dirs).
7. Deleting `<dataDir>/cookie-secret` invalidates every outstanding voter cookie (holders become new
   visitors and can vote again); a *corrupt* (wrong-length) file instead fails startup by design —
   fix or remove it deliberately, don't "fix" the throw by regenerating silently (that's VD-10's
   invariant).
8. `close()` still mutates the live poll before `put` — see the store-section caveat; don't copy that
   pattern into new write paths (build a candidate object like `vote()` does).

## Decisions (doc-is-truth)

No `apriori/` decision records existed before this reverse-capture. Two design/plan documents did
exist earlier in this project's history but were deleted before this KB was written (git history only):
`docs/superpowers/specs/2026-07-07-quick-poll-design.md` (commit `4874ec1`) and
`docs/superpowers/plans/2026-07-08-quick-poll.md` (commit `1ce4b47`), removed in `3f1d309 chore: strip
tooling remnants`. Their content is recoverable via `git show <commit>:<path>` if needed, but nothing
in them has been re-confirmed as active intent here — **treat as historical, not authoritative**, and
mark the absence of any surviving decision record explicitly:

- `DEC-0` — status: **needs human confirmation** (standing caveat: the requirement owner confirmed at
  the KB pre-check that nobody reachable can confirm pre-vote-dedup intent). No pre-existing design
  decision is on record for this module. Anything that looks like a deliberate choice in the Contract
  section predating vote-dedup (e.g. "file-backed store, no DB") is inferred from code shape only —
  do not treat code shape as proof of intent.

Decisions added by change **vote-dedup** (2026-07-09, req-final.md is the intent source; these are
confirmed human intent, unlike DEC-0's inferred shapes):

- `DEC-1` — status: **active**. Duplicate-vote prevention is **cookie-level by explicit choice**, not
  account-level: clearing cookies / another browser / incognito can vote again, and a script may
  GET-then-POST per vote. Accepted by the requirement owner ("cookie 级别就行"). The precise claim:
  same browser identity cannot double-vote, and bare API replay (same or no identity) cannot stuff
  ballots; "one person one vote" is **not** promised. Do not "fix" the GET-then-POST bypass without a
  new requirement — login/CAPTCHA/IP-limiting were each explicitly rejected.
- `DEC-2` — status: **active**. Anonymity invariant: the voter identity is a random value carrying no
  personal information; no IP recording or IP-based decisions; the identity→choices link exists
  nowhere (storage or API) — `voters` holds digests proving *participation* only. Any feature wanting
  "who voted what" contradicts this decision and needs an explicit new decision superseding it.
- `DEC-3` — status: **active**. A corrupt `cookie-secret` file **fails startup loudly** rather than
  silently regenerating: silent regeneration would invalidate every outstanding cookie with no
  operational trace. (Deliberate trade against convenience; chosen at STEP0, REQ-006 resolution.)
- `DEC-4` — status: **active**. The store's durability level stays "atomic rename, no fsync" — the
  vote-dedup change added *in-process* all-or-nothing semantics (rollback on failed write) but
  deliberately did **not** add crash/power-loss durability, and no doc or spec may claim otherwise
  without a change that actually adds fsync + a crash-injection test (guarantee-claim discipline).
- `DEC-5` — status: **active**. The vote path (dedup check → count → mark → persist) must remain a
  single synchronous chain (no lock is used; Node's event loop is the mutex). Any change introducing
  asynchrony there must add an explicit alternative concurrency-control and re-prove VD-08.
