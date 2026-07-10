# Proposal — vote-dedup

## WHY

The server currently has zero defense against duplicate votes: `lib/polls.js`'s `vote()` records every
POST unconditionally, so replaying the exact same request (curl, or any script) increments the count
every time (verified: 3 identical POSTs → `total` 1→2→3). The only "anti-repeat" mechanism today is a
client-side `localStorage` flag in `poll.html`, which is a UX nicety, not a defense — clearing storage,
using another browser, or calling the API directly bypasses it entirely. This change adds a real,
server-enforced (though intentionally cookie-level, not account-level) barrier.

## WHAT

- An anonymous, HMAC-signed voter-identity cookie (`pv`), issued only from `GET /api/polls/:id` and
  never from page routes; HttpOnly, `SameSite=Lax`, 1-year `Max-Age`.
- Server-side rejection (403) of `POST .../vote` with no/invalid identity, and rejection (409) of a
  second vote from the same identity on the same poll — enforced atomically (concurrency-safe, and
  all-or-nothing under a persistence failure), and durable across a restart.
- A `voted` boolean added to the public view contract (`GET`/successful `POST`), so `poll.html` can
  stop trusting `localStorage` alone.
- A new `voters` field (HMAC digests only, never raw identity) alongside the untouched `votes` array —
  existing `counts`/`total` semantics, existing tests' Chinese error strings, and admin-view privacy
  (`adminToken`, raw `votes`, and now `voters`/`voted` never leak) are all preserved unchanged.

Full behavioral contract: `requirement/req-final.md` (B1–B8, AC1–AC11). Full scenario list with stable
IDs: `apriori/changes/vote-dedup/specs/vote-dedup.md`. Design rationale for the two hardest guarantees
(concurrency, persistence-failure rollback): `apriori/changes/vote-dedup/design.md`.

## OUT OF SCOPE

- Login/accounts/CAPTCHA/device-fingerprint/IP-based limiting of any kind.
- Admin ability to see "who voted what" (aggregate-only, unchanged).
- Historical data migration — pre-existing votes in `data/polls.json` have no identity, stay as-is,
  are not backfilled or scrubbed.
- Any change to `store.js`'s crash-durability guarantee level (still "atomic rename, no fsync" — this
  change adds an in-memory rollback-on-write-failure guarantee, which is a distinct, narrower claim
  from crash/power-loss durability and must not be conflated with it in any doc).
- `/api/admin/*` hardening.
- Cookie `Secure` attribute / HTTPS enforcement (no HTTPS deployment evidence in this repo).
