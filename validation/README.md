# validation/ — the raw experimental record

The primary materials behind V3's claims, published as-is so every claim in the release notes is traceable to its evidence. Read the evidence-grade box first.

> **Evidence grade (honest):** every experiment below was designed, operated and evaluated by a SINGLE operator (the project author's agent), with Claude Sonnet-tier subagents playing the user personas and executing the compared workflows, and the author's session evaluating results. Comparisons against OpenSpec and Superpowers used those tools' then-current public versions, driven by the same persona scripts. This is strong enough to steer development priorities; it is NOT independent replication. External, non-author validation (the planned pilot: 3 developers × 3 stacks × ~30 real changes) has not happened yet — its absence is the roadmap's top open item.

## The experiments

| dir | what happened | headline result |
|---|---|---|
| `brainstorm-lab/` | Brainstorm-phase 3-way comparison (V3 vs OpenSpec vs Superpowers), scenario: a music website; fixed persona card, scripted scope-creep/fatigue injections | drove the P13 Brainstorm redesign; V3 re-scored 18/18 after iteration |
| `brainstorm-lab2/` | Same design, deliberately different scenario (a download-folder organizer) to test transfer | V3 22/22 vs 18 and 17; zero optimization rounds needed |
| `fullrun-lab/` | Full-process 3-way build of the same app (quick-poll, UI + backend), including code and archive; 12-item black-box gauntlet (G1–G12) + heterogeneous static audits; V3 then loop-optimized (r2, r3) | V3: 3 audited defects, 0 high, 0 DoS — vs Superpowers 5 and OpenSpec 7 incl. a critical DoS; V3's adversarial review caught a data-loss bug both others shipped |
| `legacy-lab/` | Legacy-project onboarding: an inherited codebase (poll app), KB reverse-capture, one medium + one trivial change, three kinds of session death incl. a full kill resumed purely from on-disk flow-state | protocol survived all three resumes; 11 frictions logged, all folded back into 3.0.x |

Each lab dir contains: the persona/gauntlet scripts, the per-variant working trees (as built by the agents — `node_modules`/`.git` stripped), the evaluation documents, and (fullrun) the static-audit transcripts. Nothing has been retouched beyond that stripping and one secret-pattern hygiene scan.

## Provenance

- Operated 2026-07-08 → 2026-07-10 during the 3.0.0-alpha series; the findings→fix→re-verify loop for each lab is recorded in this repo's commit messages (search `(Change: ...)` trailers) and the alpha tags.
- The labs originally lived under the operator's `~/terra/` workspace; this directory is a curated copy (VCS noise and dependency trees excluded, listed above).
- Evaluations reference the workflow versions they tested: brainstorm-lab ≈ alpha.8, fullrun-lab ≈ alphas 10–12, brainstorm-lab2 ≈ alpha.13, legacy-lab ≈ alpha.15.

## What this does NOT show

- No inter-operator variance (one operator).
- No long-horizon maintenance data (largest run ≈ one working day per variant).
- Competitor workflows were driven by their public docs, not by their authors — a skilled OpenSpec/Superpowers operator might do better.
