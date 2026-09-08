# P1 requirement review — cas-enforcement (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/cas-enforcement-req-review-v2-raw.txt

# cas-enforcement requirement review v2

## Resolution review

### CE-1 — Verified

**Description:** v2 explicitly extends `merge()` so MODIFIED trim-equality reports `unchanged` instead of `modified`, and K4d covers the already-applied MODIFIED-only rerun case.

**Risk:** Resolved. The rerun repair signature now covers MODIFIED deltas instead of depending on an undeclared implementation inference.

**Suggested fix:** None.

### CE-2 — Verified

**Description:** v2 replaces `cas: optional` with the actual process-config table row form `| cas | optional |`, defines leading value-token parsing, declares absent/other as required, and states flag-over-config precedence.

**Risk:** Resolved. The waiver config is now compatible with the repository’s config format.

**Suggested fix:** None.

### CE-3 — Verified

**Description:** v2 states the warning applies to both high-level `archive --change` and single-file `archive --store --delta --change`.

**Risk:** Resolved. Single-file archive is no longer a silent unstamped-mutation loophole.

**Suggested fix:** None.

### CE-4 — Verified

**Description:** v2 defines `buildProjection.unstampedMutations` as `string[]` of store-suffix-relative paths, `[]` when none, and `json.projection.unstampedMutations` for `verify --change` runs only.

**Risk:** Resolved. The machine contract is precise enough to test.

**Suggested fix:** None.

### CE-5 — Verified

**Description:** v2 defines the per-file rerun matrix: matching stamps merge, mismatched all-unchanged files become notes, mismatched files with any real pending op fail preflight, and mixed partial-commit cases proceed only for the safe files while preserving distinct notes vs errors diagnostics.

**Risk:** Resolved. Multi-file partial-commit behavior is no longer ambiguous.

**Suggested fix:** None.

## New issue review

No new formal issues found.

## Advisories

CE-ADV-1 is resolved. The ADDED exemption is documented as clobber-focused, C7 remains its own gate check, and `--no-cas` is explicitly limited to gate C7 without changing verify/archive behavior.

One design-stage note: tests should include an explicit `| cas | OPTIONAL | ... |` case and an invalid value such as `| cas | optional-ish |` to pin the “leading token” rule.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CE-1 | Rerun repair’s all-ops-unchanged signature conflicted with MODIFIED behavior; v2 adds MODIFIED trim-equality as `unchanged`. | Already-applied MODIFIED deltas keep the dead-end. | STEP0 r1 | verified |
| CE-2 | `cas: optional` conflicted with markdown-table config; v2 uses `| cas | optional |` with flag-over-config precedence. | Waiver documented one way, parsed another. | STEP0 r1 | verified |
| CE-3 | Archive warning scope was ambiguous; v2 applies it to both high-level and single-file archive forms. | Single-file surgery keeps the silent opt-in. | STEP0 r1 | verified |
| CE-4 | `unstampedMutations` JSON location/shape was unspecified; v2 defines suffix-relative `string[]` under `json.projection`. | Machine-surface disagreement. | STEP0 r1 | verified |
| CE-5 | Mixed multi-file rerun repair after partial commit was underspecified; v2 defines the per-file notes/errors matrix. | Over-repair or confusing diagnostics. | STEP0 r1 | verified |
| CE-ADV-1 | Advisory batch: ADDED exemption scope, C7 home, and `--no-cas` gate-only boundary are now specified. | Low. | STEP0 r1 | verified |

VERDICT: no major issues, ready to proceed
tokens used
3,116,679
# cas-enforcement requirement review v2

## Resolution review

### CE-1 — Verified

**Description:** v2 explicitly extends `merge()` so MODIFIED trim-equality reports `unchanged` instead of `modified`, and K4d covers the already-applied MODIFIED-only rerun case.

**Risk:** Resolved. The rerun repair signature now covers MODIFIED deltas instead of depending on an undeclared implementation inference.

**Suggested fix:** None.

### CE-2 — Verified

**Description:** v2 replaces `cas: optional` with the actual process-config table row form `| cas | optional |`, defines leading value-token parsing, declares absent/other as required, and states flag-over-config precedence.

**Risk:** Resolved. The waiver config is now compatible with the repository’s config format.

**Suggested fix:** None.

### CE-3 — Verified

**Description:** v2 states the warning applies to both high-level `archive --change` and single-file `archive --store --delta --change`.

**Risk:** Resolved. Single-file archive is no longer a silent unstamped-mutation loophole.

**Suggested fix:** None.

### CE-4 — Verified

**Description:** v2 defines `buildProjection.unstampedMutations` as `string[]` of store-suffix-relative paths, `[]` when none, and `json.projection.unstampedMutations` for `verify --change` runs only.

**Risk:** Resolved. The machine contract is precise enough to test.

**Suggested fix:** None.

### CE-5 — Verified

**Description:** v2 defines the per-file rerun matrix: matching stamps merge, mismatched all-unchanged files become notes, mismatched files with any real pending op fail preflight, and mixed partial-commit cases proceed only for the safe files while preserving distinct notes vs errors diagnostics.

**Risk:** Resolved. Multi-file partial-commit behavior is no longer ambiguous.

**Suggested fix:** None.

## New issue review

No new formal issues found.

## Advisories

CE-ADV-1 is resolved. The ADDED exemption is documented as clobber-focused, C7 remains its own gate check, and `--no-cas` is explicitly limited to gate C7 without changing verify/archive behavior.

One design-stage note: tests should include an explicit `| cas | OPTIONAL | ... |` case and an invalid value such as `| cas | optional-ish |` to pin the “leading token” rule.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CE-1 | Rerun repair’s all-ops-unchanged signature conflicted with MODIFIED behavior; v2 adds MODIFIED trim-equality as `unchanged`. | Already-applied MODIFIED deltas keep the dead-end. | STEP0 r1 | verified |
| CE-2 | `cas: optional` conflicted with markdown-table config; v2 uses `| cas | optional |` with flag-over-config precedence. | Waiver documented one way, parsed another. | STEP0 r1 | verified |
| CE-3 | Archive warning scope was ambiguous; v2 applies it to both high-level and single-file archive forms. | Single-file surgery keeps the silent opt-in. | STEP0 r1 | verified |
| CE-4 | `unstampedMutations` JSON location/shape was unspecified; v2 defines suffix-relative `string[]` under `json.projection`. | Machine-surface disagreement. | STEP0 r1 | verified |
| CE-5 | Mixed multi-file rerun repair after partial commit was underspecified; v2 defines the per-file notes/errors matrix. | Over-repair or confusing diagnostics. | STEP0 r1 | verified |
| CE-ADV-1 | Advisory batch: ADDED exemption scope, C7 home, and `--no-cas` gate-only boundary are now specified. | Low. | STEP0 r1 | verified |

VERDICT: no major issues, ready to proceed
