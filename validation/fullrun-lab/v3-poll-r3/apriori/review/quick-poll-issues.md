# quick-poll — issue ledger (P0)

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | deadline semantics are ambiguous: format, timezone, past deadline handling, and exact-boundary closure rule are undeclared | medium | 1 | verified |
| REQ-2 | admin token security requirements are undeclared, including entropy, generation, validation, and leakage constraints | high | 1 | verified |
| REQ-3 | persistence failure and rollback behavior are undefined for failed atomic writes | high | 1 | verified |
| REQ-4 | concurrency timeout, queue limit, client disconnect, overload behavior, and definition of successful request are undefined | medium | 1 | verified |
| REQ-5 | local voted-state side effect is underspecified: write timing, poll scoping, and failure behavior are unclear | medium | 1 | verified |
| REQ-6 | percentage display is not fully testable because rounding and zero-total behavior are unspecified | low | 1 | verified |
| REQ-7 | recognizable error behavior is not testable because stable status codes or error codes are not specified | medium | 1 | verified |
| REQ-ADV-1 | advisory batch acknowledged (5 items) | low | 1 | advisory-acked |
| REQ-8 | untrusted title/option text rendered without HTML escaping is an XSS surface (upgraded from advisory by producer — security cannot be advisory, P0) | high | 1 | verified |
| REQ-9 | API payload schema and parse failure behavior are incomplete for malformed JSON, null/wrong-type fields, invalid mode/deadline, missing optionIds, and exact body size limit | medium | 2 | verified |
| REQ-10 | duplicate optionIds within one vote request have undefined counting semantics | medium | 2 | verified |
| REQ-11 | concurrent close and vote operations are not explicitly serialized with a defined ordering rule | high | 2 | verified |
| REQ-ADV-2 | advisory batch acknowledged (3 items) | low | 2 | advisory-acked |
| SPEC-1 | POST Content-Type requirement has no scenario, error code, or design enforcement path | medium | STEP2·1 | verified |
| SPEC-2 | close admin token transport is underspecified, making CL-01/CL-03/CL-04 hard to bind to tests and frontend/API integration | medium | STEP2·1 | verified |
| SPEC-3 | closed/expired share-page behavior is not scenario-bound, so HTML may still show a voting form despite closed state | medium | STEP2·1 | verified |
| SPEC-4 | deadline lazy-close on read is not explicitly serialized through the per-poll queue, allowing queued writes and read-triggered writes to race | high | STEP2·1 | verified |
| SPEC-5 | per-poll Promise queue rejection and cleanup semantics are insufficient; a persist failure can poison or break serialization | high | STEP2·1 | verified |
| SPEC-6 | XSS design covers SSR escaping but not client-side result rendering after vote fetch | high | STEP2·1 | verified |
| SPEC-ADV-1 | advisory batch acknowledged (2 items) | low | STEP2·1 | advisory-acked |
| GAP-1 | PC-12 accepts parseable non-ISO deadline strings because validation uses Date.parse without enforcing ISO 8601 | medium | STEP5·1 | verified |
| GAP-2 | close token body priority is violated when body adminToken is empty and a valid X-Admin-Token header is present | high | STEP5·1 | verified |
| GAP-3 | admin token comparison returns early on type/length mismatch, so CL-04 constant-time comparison is not fully implemented | high | STEP5·1 | verified |
| GAP-4 | expired poll is not persisted as closed when the first post-expiry access is a vote request that returns POLL_CLOSED | medium | STEP5·1 | verified |
| GAP-5 | commit-point rewrite fixes visible-change-on-500, but 200-on-dir-fsync-failure contradicted CC-02 / req-final crash-durability wording | high | STEP5·1 | verified (P8·3: guarantee wording scoped per §4.8; req-final §8 + spec CC-02/CC-05 coherent with store.js; req-final wording change to be ratified at gate ④) |
| GAP-ADV-1 | advisory batch acknowledged (5 items: weak-but-nonblocking bindings) | low | STEP5·1 | advisory-acked |

<!-- Rows REQ-1..REQ-7 + REQ-ADV-1 recorded on behalf of the reviewer (codex session 019f3f4b-f0b0-7681-a376-986dd14c55d8); raw at apriori/review/quick-poll-req-review-v1-raw.txt. -->
