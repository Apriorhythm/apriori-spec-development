# Spec delta — vote-dedup

> Merges into `apriori/specs/polls.md` (new file — this is the project's first spec) as `## ADDED`
> blocks. Source: `requirement/req-final.md` B1–B8 / AC1–AC11.

## ADDED Requirements

### Requirement: VOTER-IDENTITY — anonymous signed cookie issuance

Server issues an HMAC-signed anonymous voter-identity cookie (`pv`) from the API layer only, never
from page routes; the cookie is unforgeable and its signing key survives a restart.

#### Scenario: VD-01 — first API call issues the identity cookie, then a vote succeeds
- Given a client with no `pv` cookie
- When it sends `GET /api/polls/:id`
- Then the response includes `Set-Cookie: pv=...` with `HttpOnly` set
- And when it then sends `POST /api/polls/:id/vote` with that cookie and a legal choice
- Then the response is `200` and `total` increases by 1 and the body includes `voted: true`

#### Scenario: VD-04 — no cookie or a forged/tampered cookie is rejected on vote, uncounted, no cookie granted
- Given a client with no `pv` cookie, or a `pv` cookie whose signature does not verify
- When it sends `POST /api/polls/:id/vote` with a legal choice
- Then the response is `403` with `{error:"未获得投票标识"}`
- And the poll's `total`/`counts` are unchanged
- And the response does not include `Set-Cookie`

#### Scenario: VD-10 — a corrupted signing-key file fails the server at startup, not silently
- Given `<dataDir>/cookie-secret` exists but its content is not the expected key length
- When the server (or store/cookie module) is constructed against that `dataDir`
- Then construction throws / the process fails to start (no silent regeneration, no silently-accepted
  corrupt key)

### Requirement: VOTE-DEDUP — server-enforced one-vote-per-identity-per-poll

Same signed identity voting twice on the same poll is rejected; this holds under concurrent requests,
under a persistence failure, across process restart, and never cross-contaminates between polls.

#### Scenario: VD-02 — repeat vote from the same identity is rejected
- Given a `pv` cookie that has already voted once on poll `P`
- When it sends `POST /api/polls/:id/vote` again on `P` with a legal choice
- Then the response is `409` with `{error:"你已经投过这个投票了"}`
- And `total` is unchanged

#### Scenario: VD-03 — replaying the identical request N=3 times only counts once
- Given a `pv` cookie and a legal vote request body
- When the identical `POST /api/polls/:id/vote` is sent 3 times in sequence
- Then only the first response is `200`; the other two are `409`
- And `total` increased by exactly 1

#### Scenario: VD-05 — the same identity can vote on a different poll
- Given a `pv` cookie that has already voted on poll `P1`
- When it sends `POST /api/polls/:id/vote` on a different poll `P2` with a legal choice
- Then the response is `200` and `P2.total` increases by 1 (independent of `P1`)

#### Scenario: VD-06 — dedup survives a real process restart, verified through the app's own read path
- Given a `pv` cookie has successfully voted on poll `P`, and the server process is then restarted
  against the same `dataDir` (a fresh `server`/`store` instance, not a file peek)
- When the same cookie sends `POST /api/polls/:id/vote` on `P` again
- Then the response is `409`, and `total` read back via `GET /api/polls/:id` on the new instance
  matches the pre-restart value exactly

#### Scenario: VD-08 — two concurrent votes from the same identity on the same poll only count once
- Given a `pv` cookie that has not yet voted on poll `P`
- When two `POST /api/polls/:id/vote` requests from that same cookie are issued concurrently
  (e.g. `Promise.all`)
- Then exactly one response is `200` and the other is `409`
- And `P.total` increased by exactly 1

#### Scenario: VD-09 — a persistence failure leaves in-memory vote/dedup state unchanged
- Given a store whose write step is made to fail (a real, injected write failure — see design.md for
  the injection seam) for the next write
- When a `POST /api/polls/:id/vote` with a legal choice and a fresh identity is sent
- Then the response is `500`
- And a subsequent (non-restart) `GET /api/polls/:id` shows `total`/`counts`/`voted` exactly as before
  the failed request — no phantom vote, no phantom dedup mark

### Requirement: PUBLIC-VIEW-CONTRACT — `voted` field and privacy boundaries

The public view exposes a `voted` boolean derived from the request's identity; the admin view never
exposes `voted`, `voters`, raw `votes`, or `adminToken`; the frontend surfaces server-side rejections
visibly and no longer trusts `localStorage` alone.

#### Scenario: VD-07a — server-side `voted` survives clearing localStorage
- Given a browser has successfully voted on poll `P` (server-side `voted` now true for its cookie)
- When it clears `localStorage` and reloads `/poll/:id`
- Then the page still shows the "already voted" state (proving the判定 comes from the server's `voted`
  field, not from localStorage)

#### Scenario: VD-07b — deleting the voter cookie mid-session surfaces the rejection visibly
- Given a loaded `/poll/:id` page (form visible, not yet voted) whose browser context then has its
  `pv` cookie deleted
- When the user clicks the vote button
- Then the page's visible error area displays the rejection text (not a silent failure, not a
  vanishing form)

#### Scenario: VD-11 — admin view and public view keep their existing privacy boundary, extended to the new fields
- Given a poll with at least one vote from at least one identity
- When its admin view (`GET /api/admin/:token`) and public view (`GET /api/polls/:id`) are fetched
- Then neither response includes `adminToken`, raw `votes`, or `voters`
- And the admin view does not include a `voted` field at all (not even `false`)
