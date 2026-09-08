<!-- apriori-base: sha256:7e32641325f21aaabadfee89a08229681d06132ad08734efe555ac85c43ce3b9 -->

## ADDED Requirements

### Requirement: a scoped verdict judges a named scenario set, nothing else
`lib/spec-runner.js` SHALL expose `scopedEvaluate(byId, results, scope)`: given the store projection, one TAP snapshot and an explicit set of scenario IDs, it classifies ONLY the scope — each scoped ID lands in bound-green, bound-red or unbound by the same rules the whole-store verdict uses (a scenario whose only results are skips is UNBOUND), and the verdict is clean exactly when the scope carries no red and no unbound member. Store-wide classes are NOT scope classes: results outside the scope are never orphans of a scoped run, and store-wide unidentified scenarios never dirty it — the whole-store verdict keeps its own meaning, unchanged. A scope naming an ID absent from the projection is a caller error surfaced as `missing`, never a silent pass. An empty scope is clean by construction and says so.

#### Scenario: SR-69 the scope is judged and the rest of the store is not
- WHEN the store carries five scenarios of which two are red and one unbound, and the scope names one green scenario
- THEN the scoped verdict is clean with that one scenario bound-green — the store's red and unbound members are outside the scope and outside the verdict

#### Scenario: SR-70 red and unbound inside the scope dirty the scoped verdict
- WHEN the scope names a scenario whose TAP result fails, and separately one with no result at all, and separately one whose only results are skips
- THEN each scoped verdict is unclean, classifying the member as bound-red, unbound and unbound respectively

#### Scenario: SR-71 out-of-scope results are not orphans and an empty scope is clean
- WHEN the TAP snapshot carries results for IDs the scope does not name (some absent from the store entirely), and separately the scope is empty
- THEN the first verdict reports no orphans and stays clean; the second is clean by construction with every class empty

#### Scenario: SR-72 a scope member absent from the projection is a caller error
- WHEN the scope names an ID that the store projection does not carry
- THEN the scoped verdict reports it under `missing` and is unclean — an unknown target is never silently satisfied
