# P1 requirement review — cas-enforcement (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/cas-enforcement-req-review-v1-raw.txt

# cas-enforcement requirement review v1

## Formal issues

### CE-1 — Rerun repair signature conflicts with current MODIFIED semantics

**Description:** J4 says a stamped delta already applied to the current store should pass rerun repair when “every op reports `unchanged`.” In current `merge()`, ADDED, RENAMED, and REMOVED have rerun no-op signatures, but MODIFIED never reports `unchanged`; it always records `modified` when the target exists, even if the block is already byte/trim-identical to the delta block.

**Risk:** The dogfooded dead-end can remain for any already-applied MODIFIED delta, or implementers will have to infer an undeclared semantic change to `merge()`.

**Suggested fix:** Explicitly define MODIFIED rerun behavior. For example: when a MODIFIED block’s current store block is equal to the delta block under the same comparison rule used for ADDED no-op, it reports `unchanged` and counts toward rerun repair. Add a J4 subcase for an already-applied MODIFIED delta.

### CE-2 — `cas: optional` conflicts with the real process-config format

**Description:** DD-4 names config spelling `cas: optional`, but the existing `process-config.md` format is a markdown table with rows like `| test-cmd | ... |`. Existing config readers also parse table rows, not `key: value` lines.

**Risk:** Implementers can choose incompatible parsers or docs, and a human may add a config row that gate never recognizes.

**Suggested fix:** Specify the exact table row form, e.g. `| cas | optional | optional / required | required |`, and define behavior for missing, `optional`, and invalid values. If a colon form is intentional, declare it as a new supported process-config syntax and specify precedence with the table.

### CE-3 — Archive warning scope is ambiguous across high-level and single-file archive forms

**Description:** The requirement says `archive` warns in its report, but archive has two public forms: high-level `archive --change` and single-file `archive --store --delta --change`. The proposed data path centers on `buildProjection`, which only covers the high-level change projection. The single-file form currently also accepts unstamped mutation deltas.

**Risk:** One public archive path may keep silently accepting unstamped MODIFIED/REMOVED/RENAMED deltas, preserving the CAS opt-in pitfall for “one-module surgery.”

**Suggested fix:** State whether WARN applies to both archive forms. If yes, add acceptance coverage for single-file unstamped MODIFIED. If no, explicitly declare single-file archive out of scope for graded CAS enforcement.

### CE-4 — Verify JSON contract for `unstampedMutations` is underspecified

**Description:** J1 says verify `--json` carries `unstampedMutations`, but not where or in what shape. Current verify JSON puts change-specific data under `projection`, whose shape is `{ change, modules, conflicts }`.

**Risk:** Tests and consumers can disagree on whether the field is top-level, under `projection`, path strings vs objects, absolute vs suffix paths, and whether it appears on non-change runs.

**Suggested fix:** Define the machine contract exactly, e.g. `json.projection.unstampedMutations: [{ file, suffix, ops }]` for `--change` runs only, absent or `[]` otherwise. Also define whether paths are absolute, cwd-relative, or store-suffix-relative.

### CE-5 — Rerun repair does not specify mixed multi-file outcomes precisely

**Description:** DD-2 says all-ops-unchanged is robust to interruption points, and J4 says a mismatch with any real pending op still fails. In a multi-file archive after a mid-commit failure, some stamped files may be already applied while others still match their stamp and have real pending ops. The requirement does not state the exact report/exit behavior for that mixed case, or whether the already-applied mismatched files are downgraded to notes while the pending file causes failure.

**Risk:** Implementations can either over-repair a partial commit or fail with confusing CAS diagnostics that do not distinguish already-applied files from genuinely pending files.

**Suggested fix:** Add a mixed multi-file acceptance case: one delta file mismatched but unchanged, another still matching with real pending ops, and/or another mismatched with real pending ops. Specify exit 1, no writes/move, and the exact class of notes/errors expected.

## Dimension verdicts

1. **Target state B clarity:** Mostly clear, but rerun repair, config spelling, archive-form scope, and JSON shape need precision.
2. **Edge cases and exception paths:** Missing MODIFIED rerun behavior and mixed multi-file partial-commit handling.
3. **Undeclared side effects:** C7 and archive warnings are declared; config parsing side effect needs exact syntax.
4. **Acceptance testability:** J1/J4 are not fully testable until JSON shape, archive-form scope, and MODIFIED no-op semantics are specified.
5. **Conflicts with state A:** CE-1 and CE-2 conflict with current code/config reality.
6. **Lineage:** Declared and consistent.

## Advisories

- ADDED-only exemption is reasonable for clobber prevention, but the docs should say it is not a general semantic-concurrency guarantee. ADDED can still collide semantically with concurrent renames even if it does not silently overwrite content.
- C7 as a new gate check is preferable to folding this into C6; CAS freshness is about delta/store trust, not KB freshness.
- `--no-cas` being gate-only is a sound boundary as long as docs state it never waives stamped mismatch failures in verify/archive.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CE-1 | Rerun repair’s all-ops-unchanged signature conflicts with current MODIFIED behavior, which never reports identical MODIFIED as `unchanged`. | Already-applied MODIFIED deltas can still hit the CAS rerun dead-end. | STEP0 r1 | open |
| CE-2 | `cas: optional` conflicts with the real markdown-table process-config format. | Config waiver may be documented one way and parsed another. | STEP0 r1 | open |
| CE-3 | Archive warning scope is ambiguous across high-level and single-file archive forms. | A public archive path may keep silently merging unstamped mutation deltas. | STEP0 r1 | open |
| CE-4 | Verify JSON contract for `unstampedMutations` lacks exact field location and shape. | Implementations/tests/consumers can disagree on the machine surface. | STEP0 r1 | open |
| CE-5 | Mixed multi-file rerun repair after partial commit is underspecified. | Partial commits can be over-repaired or diagnosed unclearly. | STEP0 r1 | open |
| CE-ADV-1 | Advisory batch: ADDED-only exemption is acceptable but should be described as clobber-focused; C7 is the right gate home; `--no-cas` gate-only scope is sound if documented. | Low. | STEP0 r1 | open |

VERDICT: 5 issues open
