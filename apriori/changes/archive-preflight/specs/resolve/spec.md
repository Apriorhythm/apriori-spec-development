<!-- apriori-base: sha256:fd4c32b53a3f7dbc618bd383f8102517bcd1f8e0229c4bcde350d8b661d6ab18 -->

## ADDED Requirements

### Requirement: the archive namespace is diagnosed by one shared predicate, and resolution keeps its active-first shortcut
`resolve` SHALL export a structured `archiveNamespaceDefect(changesDir, name)` that diagnoses the namespace `resolveChange(cwd, name)` will face AFTER the active entry has moved — not "everything today's resolution would refuse", which would wrongly imply resolution calls it: both trust roots (`<changesDir>` and `<changesDir>/archive`), the active entry `<changesDir>/<name>`, and every same-name archived candidate. Consumers that need this judgement — archive's readiness among them — SHALL call it rather than re-implement the rules, so the two can never drift. `resolveChange()` itself SHALL keep its existing ACTIVE-FIRST shortcut byte-for-byte: when a legal active entry exists it returns immediately and never inspects archived candidates. The composite predicate is therefore never evaluated ahead of that shortcut; the two share smaller private predicates instead.

#### Scenario: RS-06 the predicate names each namespace defect the resolver would trip on
- WHEN either trust root is a symlink pointing inside the changes tree, is not a directory, or escapes its root; or the active entry is itself a symlink to a real directory inside the changes root, or is not a directory; or a same-name archived candidate is a symlink whose basename carries a legal stamp shape, or is a stamp-shaped directory whose date is not a real calendar date
- THEN `archiveNamespaceDefect` returns a structured defect naming the object, its kind and its path; a clean namespace returns null

#### Scenario: RS-07 a legal active entry still short-circuits resolution
- WHEN a legal active `<changesDir>/<name>` directory exists AND a same-name archived candidate is defective (a legal-stamp symlink, or a stamp-shaped directory with an impossible date)
- THEN `resolveChange` still resolves to the active entry with the same result it produced before this change — the archived defect is reported only by the composite predicate, which resolution never consults on that path

#### Scenario: RS-08 the resolver's own answers are unchanged
- WHEN any input that resolution already handled is resolved after this change — in-flight found, archived found by lexicographically-last stamp, found nowhere, invalid name, escaping path
- THEN the returned shape, the chosen directory and the error text are identical to their pre-change values; the new export adds a diagnosis path, never a decision path
