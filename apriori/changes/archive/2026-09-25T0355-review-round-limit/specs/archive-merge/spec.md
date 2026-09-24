<!-- apriori-base: sha256:1c61c0a2d07bb6c05ba43fe98c030497b6cca9e3a929aa3ba14706c5c3bcb865 -->
# Delta — archive-merge (review-round-limit)

## MODIFIED Requirements

### Requirement: --force overrides progress only, on pre-recorded human authority
`--force` SHALL belong to the high-level form alone and SHALL override ONLY progress blockers, which since 6.2 is exactly one thing: a review family's escalation the owner already answered. Everything else is non-forceable: every R1 outcome (`abandoned` above all), every structural defect (`io-error`, `symlink`, `not-file`, `not-dir`, `escape`, `bad-ancestor`), a review family stopped at its round limit (or by an `escalate` verdict) with no owner decision on record (readiness reports it `forceable: false` while still naming the reframe cure; it turns forceable only once the decision is recorded), an invalid `review-round-limit` configuration, a `review-progress` record that is missing or fails its structural check, an unmet review floor, and every R5 refusal — an open item nobody accepted is not progress, and owner acceptance for it is spent in the state, not at the command line. There is no `tasks` force class and no live `ledger` class: the `archive-force ledger` grammar is still PARSED — the SAME entry, and the same parser, the item acceptance and the `reframe` decision use — but a grant is reported as `note: archive-force has nothing left to force in 6.2` and overrides nothing. Revocation is by APPENDING `archive-force-revoke ledger <reason>` and the last decision wins, for that note alone. The limit-stop DOUBLE action is preserved: the recorded `reframe` alone is not a `--force`, and `--force` alone is not a decision.

#### Scenario: AM-89 an archive-force record is inert: nothing is forced, and the note says so
- WHEN a bundle records the canonical `archive-force ledger — <reason>` beside an open ledger row, with and without `--force`, and then a revoked grant, an `archive-force tasks` record, a `note:` near miss and no record at all
- THEN the first archives either way with `note: archive-force has nothing left to force in 6.2` and no `forced:` line, the unread row never reaches the report, and the other four print nothing about `archive-force`

#### Scenario: AM-87 nothing but the answered limit escalation is forceable
- WHEN the blocker is any R1 outcome, a structural flow-state defect, or a pending open item — each beside a standing `archive-force ledger` record
- THEN `--force` does not change the refusal, no force advice is printed for the item, and readiness reports it `forceable: false` with nothing forced

#### Scenario: AM-110 the kept parser is anchored: only the canonical entry is a grant
- WHEN the entry reads `archive-force ledger — cleanup deferred`, or `archive-force ledger2 …`, or `archive-force-2 ledger …`, or `do not archive-force ledger — 还没做完`, or the canonical payload under a `note:` / `producer:` / `agent:` / `gate⑤ (owner):` actor, or with no timestamp, or with no em dash, or with no reason
- THEN `forceGrant` answers a grant for the first only — the class word inside a reason never authorizes, a keyword preceded by free text never authorizes, and the entry's PREFIX is as binding as its payload; a Chinese reason is a reason

#### Scenario: AM-111 revocation appends and the last decision wins — in the parser and in the note
- WHEN `archive-force ledger <reason>` is followed by `archive-force-revoke ledger <reason>` and later by another `archive-force ledger <reason>`, each carrying a reason
- THEN the parser answers granted, then not, then granted again, in the order the entries appear, and the archive prints the nothing-left-to-force note exactly when the parser answers granted; a revoke with no grant before it grants nothing, and a revoke carrying no reason is ignored exactly as a reasonless grant is

#### Scenario: AM-91 the single-file form does not take --force
- WHEN `--force` accompanies `--store`/`--delta`
- THEN archive exits 2 with usage

#### Scenario: AM-116 one canonical owner entry supplies the payload for every decision verb
- WHEN `ownerPayload` is applied to the canonical entry for each of the three verbs, and then to the same payloads under a `note:` / `producer:` / `agent:` / `gate⑤ (owner):` / `ownership:` actor, with no timestamp, and with a timestamp-shaped non-timestamp (a 13th month, a 24th hour, a 60th minute)
- THEN the canonical forms yield their payload and every other form yields `null`, so the verb patterns below never see a non-owner entry; a NEGATED verb still yields a payload, because refusing it is the verb pattern's job — the keyword has to open the payload

#### Scenario: AM-117 the usage lines say which flags belong to which form
- WHEN `apriori archive` is run with no arguments
- THEN the single-file line carries neither `--changes-dir` nor `--force`, and the high-level line carries both — the two forms are no longer symmetric and the usage must not pretend otherwise
