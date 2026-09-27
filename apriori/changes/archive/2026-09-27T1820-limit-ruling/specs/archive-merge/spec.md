<!-- apriori-base: sha256:da60c2b874a4d10f0b69b33ddd1118f04ef826a7ec008c2737cc3fdad8b0cdf6 -->
# Delta — archive-merge (limit-ruling)

## MODIFIED Requirements

### Requirement: --force overrides progress only, on pre-recorded human authority
`--force` SHALL belong to the high-level form alone and SHALL override ONLY progress blockers, which are exactly two things: a review family's escalation the owner already answered (its `reframe` record), and — since archive-drop-guard — the dropping of store scenarios the owner already named through a fingerprint-bound `archive-drop` record. Everything else is non-forceable: an ambiguous MODIFIED replacement, a drop with no decision or with a decision whose fingerprint no longer matches the input, every R1 outcome (`abandoned` above all), every structural defect (`io-error`, `symlink`, `not-file`, `not-dir`, `escape`, `bad-ancestor`), a review family stopped by an `escalate` verdict (or by a round past its one automatic re-review) with no owner decision on record (readiness reports it `forceable: false` while still naming the reframe cure; it turns forceable only once the decision is recorded), an invalid `review-round-limit` configuration, a `review-progress` record that is missing or fails its structural check, rulings at the limit that are missing or fail their checks, a re-review still owed, an unmet review floor, and every R5 refusal — an open item nobody accepted is not progress, and owner acceptance for it is spent in the state, not at the command line. There is no `tasks` force class and no live `ledger` class: the `archive-force ledger` grammar is still PARSED — the SAME entry, and the same parser, the item acceptance and the `reframe` decision use — but a grant is reported as `note: archive-force has nothing left to force in 6.2` and overrides nothing. Revocation is by APPENDING `archive-force-revoke ledger <reason>` and the last decision wins, for that note alone. The escalation-stop DOUBLE action is preserved: the recorded `reframe` alone is not a `--force`, and `--force` alone is not a decision. A family closed by its rulings and its one re-review needs neither: nothing about it is forced, and its residuals are pending items R5 holds for the owner.

#### Scenario: AM-89 an archive-force record is inert: nothing is forced, and the note says so
- WHEN a bundle records the canonical `archive-force ledger — <reason>` beside a closed ledger row, with and without `--force`, and then a revoked grant, an `archive-force tasks` record, a `note:` near miss and no record at all
- THEN the first archives either way with `note: archive-force has nothing left to force in 6.2` and no `forced:` line, the unread row never reaches the report, and the other four print nothing about `archive-force`

#### Scenario: AM-87 nothing but the answered escalation and the named drop is forceable
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

## ADDED Requirements

### Requirement: an archive after rulings at the limit needs no --force, and the declaration lists every ruling
When a family was closed by its rulings at the limit and its one re-review, `apriori archive --change` SHALL archive it without `--force` once R5 passes, and the archive declaration SHALL keep exactly its three states and list, after them, one `note: ruling …` line per ruling of the bundle — the family, the round, the id, the kind and the re-review's conclusion for that id (`ADDRESSED`, `NOT ADDRESSED`, or `no conclusion`) — so every decision the producer took at the limit reaches the human with the frozen record.

#### Scenario: AM-136 rulings at the limit archive without --force and are listed after the three states
- WHEN the limit is 3, round 3 is ruled (R-01 `fixed`, R-02 `rejected`) and the round-4 re-review in the same session marks both ADDRESSED, and `apriori archive --change c` runs without `--force`
- THEN it archives; the first four lines under `ARCHIVE DECLARES` are the header and the three states; after them come `note: ruling spec-review round 3 — R-01: fixed (re-review: ADDRESSED)` and the same for R-02; and no `forced:` line is printed

## Notes

Why: at the limit the loop is no longer a stop the owner answers with reframe + `--force`; rulings and one re-review close it (DA-CONSENSUS §三, human-approved 2026-09-27). The declaration keeps its three states (AM-118) and lists the rulings as notes after them.
