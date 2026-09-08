# Gap report — readme-split (STEP1 / P3)

Inputs: requirement/req-final.md (map verified against the fence-stripped inventory by r2/r3 review) · truth/check.md fresh at 20bee2b.

## Current state A
README/README_cn 920 lines each, 11 H2 sections; check --self PAIRS = README/RUNBOOK/VISION only; checkLinks resolves against root only, ignores cross-file fragments.

## Gaps
G1 New README×2 (≤200 lines, Quickstart contract). G2 Five docs/ pairs ×2 (concepts/legacy/ci/cli/troubleshooting; concepts/legacy/cli = migration per map; ci/troubleshooting = new content). G3 check.js self-mode: docs PAIRS incl. one-sided-pair failure; checkLinks per-file base + cross-file fragment validation (self-mode). G4 CK-08/CK-09 scenarios + tests. G5 Hand-run of the Quickstart sequence recorded in tasks.

## Risks
R1 The CN mirror is the volume driver — heading alignment across 7 pairs must survive translation (self-mode is the guard). R2 Cross-file fragment slugs must use ghSlug (same slugifier as anchors) or CN headings break. R3 Quickstart must not depend on interactive init (use --tools --yes). R4 The old README's intra-doc anchors (#41-mapping...) referenced from RUNBOOK? grep needed — RUNBOOK is untouchable this change; if it links README sections, those anchors must survive in README or the link targets update... RUNBOOK links README.md without fragments (checked pattern ./README.md) — safe; verify during implementation.

No blockers. → STEP2.
