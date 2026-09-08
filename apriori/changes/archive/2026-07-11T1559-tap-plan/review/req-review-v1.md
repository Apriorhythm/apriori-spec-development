# P1 requirement review — tap-plan (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/tap-plan-req-review-v1-raw.txt

**Requirement Review — tap-plan v1**

**Dimension Verdicts**

1. Target state B: Mostly clear, but multi-plan validation is too weak for the stated “plan as checked promise” goal.
2. Edge/exception coverage: Missing key TAP edge coverage for multi-plan masking and overly broad point-line recognition.
3. Side effects: No undeclared state changes; parser/infra-only change is declared.
4. Acceptance criteria: E1/E2 cover the reproduced defects, but E3/E4 leave risky behavior under-specified.
5. State-A conflicts: No direct conflict; the requirement correctly describes current `parseTap`, `zeroTapParsed`, and `infraErrors`.
6. Lineage: Declared as v3 next patch/minor and matches repo reality.

**Formal Issues**

**TP-1 — The multi-plan sum rule can still let truncated/garbled TAP verify GREEN**

Description: The requirement treats multiple top-level plans as concatenated streams, sums all plan totals, skips duplicate-number checks, and compares only aggregate `sum(plans) === points`. That does not actually validate each stream’s plan promise. A truncated first stream can be offset by an overlong second stream:

```tap
1..2
ok 1 - TP-01 a
1..1
ok 1 - TP-02 b
ok 2 - TP-03 c
```

Totals are `3 declared / 3 parsed`, duplicate checks are skipped because there are multiple plans, and all scenario IDs could bind green, even though neither stream’s own plan is trustworthy.

Risk: The change can miss the same class it is intended to fix whenever output is concatenated or garbled across multiple planned streams.

Suggested fix: Either fail closed on multiple top-level plans, or define segment-aware validation. If concatenated streams must remain legal, specify how segments are delimited for leading-plan and trailing-plan emitters, then compare each plan to its own segment and only skip duplicate-number checks across segment boundaries.

**TP-2 — The point-count regex is too broad for “legal TAP points”**

Description: The mechanics define `points` as top-level result lines matching `/^(ok|not ok)\b/`. That matches lines that start with `ok:` or `not ok:` because `:` is a word boundary, even though those are not TAP result lines. The requirement says this count is for legal TAP points that the binding regex skips, but the proposed regex also counts non-result diagnostic-like lines. TAP/YAML diagnostic content is especially sensitive here; indented YAML is safe only if implementation consistently enforces top-level matching and does not count diagnostic payload as results.

Risk: Valid or near-valid TAP with diagnostic text can produce false plan mismatches, while implementers may disagree about whether to count broad prefix matches or syntactic TAP result lines.

Suggested fix: Define the point line matcher as a TAP result token, not just a word boundary, e.g. top-level `/^(?:ok|not ok)(?:\s|$)/`. Add an acceptance case proving diagnostic/YAML-looking lines such as `ok: ...` do not count as points, while bare legal `ok` and `not ok` still do.

**Advisories**

- Add an explicit `1..0 # SKIP reason` case. TAP skip-all plans commonly carry a directive, and the requirement should make clear that N is still parsed as zero.
- Clarify whether duplicate test-point numbers are compared numerically or textually. `ok 01` versus `ok 1` is low-probability but easy to specify.
- `parseTap` is also used by `doctor`; the requirement intentionally scopes inherited failures to `verify`, `verify --change`, and `gate`. That is acceptable, but the exclusion should remain intentional during design.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| TP-1 | Multiple-plan validation uses only aggregate `sum(plans) === points` and skips duplicate-number checks, so one stream’s truncation can be masked by another stream’s extra points. | Truncated/garbled concatenated TAP can still verify GREEN. | P1·r1 | open |
| TP-2 | Point counting via `/^(ok|not ok)\b/` is broader than legal TAP result syntax and can count diagnostic-like lines such as `ok:`. | False plan mismatches or inconsistent implementations around diagnostic/YAML content. | P1·r1 | open |
| TP-ADV-1 | Add explicit skip-all directive, duplicate-number normalization, and doctor-scope notes. | Advisory precision and edge coverage. | P1·r1 | open |

VERDICT: 2 issues open
