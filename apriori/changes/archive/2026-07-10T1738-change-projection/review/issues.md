# Issue ledger — change-projection

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c, read-only sandbox; raws: change-projection-req-review-v{1,2}-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | CAS base-stamp syntax, fingerprint algorithm, absent-store sentinel, and stamp CLI are unspecified. | CAS behavior is unimplementable/test-incompatible across implementations. | STEP0·r1 | verified |
| REQ-2 | REMOVED projection conflicts with current merge output and scenario scanning. | Projected verify can prove a different scenario set than archive/plain verify will enforce. | STEP0·r1 | verified |
| REQ-3 | Multi-module "all or none" archive lacks transaction and rollback semantics. | Partial store writes or moved change dirs can occur on I/O failure. | STEP0·r1 | verified |
| REQ-4 | Already-archived rerun behavior conflicts with discovery path and existing idempotency rules. | Implementations may silently no-op, search archives, or widen current idempotency. | STEP0·r1 | verified |
| REQ-5 | Path validation still lacks symlink/realpath containment semantics (reopened r2). | New `--change` surfaces can read or fingerprint outside intended roots through symlinks. | STEP0·r1 | verified |
| REQ-6 | CLI grammar and option interactions for new surfaces are incomplete. | Backward compatibility and tests depend on unspecified parser behavior. | STEP0·r1 | verified |
| REQ-7 | Multi-module malformed/empty/duplicate delta handling is unspecified. | Bad deltas can be silently ignored or collapsed. | STEP0·r1 | verified |
| REQ-8 | Transaction staging uses fixed temp paths without defining ownership or pre-existing-temp behavior. | Archive can overwrite/delete stale or user-owned temp files and undermine manual recovery. | STEP0·r2 | verified |
| REQ-9 | `verify --change --json` failure output shape is underspecified. | Machine consumers and tests cannot rely on a stable projection-error contract. | STEP0·r2 | verified |
| ADV-1 | advisory batch acknowledged (4 items: archive item terminology; V1 duplicate-ID scope wording; exact archive path; 3.1.0 version-bump reminder) | low | STEP0·r1 | advisory-acked |
| ADV-2 | advisory batch acknowledged (3 items: stamp path edge behavior; V7 wording; deprecated marker regex) — all three also addressed in v3 | low | STEP0·r2 | advisory-acked |
| SPEC-1 | AM-12 retained single-file move-failure semantics but now conflicts with high-level AM-18 move-failure semantics. | Tests and implementation can require opposite store states for `--write --changes-dir` move failure. | STEP2·r1 | verified |
| SPEC-2 | Archive CAS scenarios do not explicitly require coverage for both single-file and high-level archive forms. | CAS can be implemented or tested on only one archive surface, leaving the other unsafe. | STEP2·r1 | verified |
| SPEC-3 | Change-dir move destination containment does not cover a symlinked `<changes-dir>/archive/` path. | Archive can move a change outside the intended changes root via symlink traversal. | STEP2·r1 | verified |
| ADV-3 | advisory batch acknowledged (3 items: ID ranges clean; T7 stamping reordered before final dogfood verify — done; AM-27 subtests — noted in T1) | low | STEP2·r1 | advisory-acked |
| IMPL-1 | Symlinked delta paths can be silently ignored or accepted outside the change tree. | AM-22 path-containment security can be bypassed or made invisible for delta inputs. | STEP5·r1 | verified |
| IMPL-2 | Structurally malformed `apriori-base` comments can be treated as absent stamps. | CAS can silently opt out when the author intended divergence protection. | STEP5·r1 | verified |
| ADV-4 | advisory batch acknowledged (3 items: move-destination symlink test — added; README failure-atomic wording scoped "(up to the commit point)" EN+CN — done; stamp flag-like args now rejected (exactly one argv) — done) | low | STEP5·r1 | advisory-acked |
