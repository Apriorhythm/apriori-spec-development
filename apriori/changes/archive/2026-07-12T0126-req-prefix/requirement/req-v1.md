# Requirement — req-prefix (v1)

change: req-prefix
target lineage: **v3 branch**. Docs-only patch (3.4.1): the runbook's requirement-stage paths gain the `<change>-` prefix; the CLI never reads these paths, so no frozen surface moves. (This file itself is the first dogfood of the new convention.)

## Background — the problem (current state A, dogfooded twice)

The V3 runbook pins requirement-stage artifacts to GLOBAL fixed paths: `requirement/req-v{N}.md` → `requirement/req-final.md`, and the explore track's `requirement/intent-card.md`. Every change overwrites the previous change's files; parallel changes would interleave writes. Both GPT-5.6 external reviews flagged the global-path class; this session hit it twice for real (gate-command's req-v1 overwrote change-projection's; tap-plan's overwrote delta-consumption's, recovered only from conversation context). The standing workaround — hand-copying `requirement/req-*.md` into the archived change dir at STEP6 — is operator discipline, not protocol. The root fix (Change Bundle: relocate into `changes/<name>/`) moves the frozen layout and stays scheduled for 4.0. V1.4 shipped the stopgap (prefix) on 2026-07-12; V3 lacks it.

## Goal (target state B)

Requirement-stage paths carry the change name, in both runbook editions and everywhere else the convention is written:
- `requirement/<change>-req-v{N}.md` → finalized `requirement/<change>-req-final.md`
- `requirement/<change>-intent-card.md` (explore track — same collision class, same fix)
- Every mention updated: the §3 artifact table, STEP0/EXPLORE text, prompts (P1/P2/P3/P5/P11/P12 — wherever the paths appear), the §goal recipes, and `lib/new.js`'s scaffolded `next-action` line (CLI advisory text only — no parsing anywhere reads these paths, verified by grep over lib/).
- A protocol scenario (PR-19) binds the convention in both editions so it cannot silently regress.
- STEP6's archive guidance gains one clause: the change's requirement docs (and intent card, if any) are copied into the archived change dir before commit — turning the session's hand-rescue into protocol. (Interim measure until 4.0's Change Bundle makes it automatic.)

## Acceptance criteria (testable)

- L1. Zero unprefixed `requirement/req-*` or `requirement/intent-card` references remain in RUNBOOK.md / RUNBOOK_cn.md / lib/ (grep-proven; PR-19 asserts the prefixed forms and the absence of unprefixed forms in both editions).
- L2. PR-19 also binds the STEP6 copy-into-archive clause in both editions.
- L3. EN and CN state the same convention (translation parity, P8-checked).
- L4. All existing tests pass; suite + check --self + gate PASS on this change; post-archive gate PASS.

## Out of scope

- Change Bundle (4.0) — the relocation into `changes/<name>/` supersedes this prefix at that point.
- Any CLI parsing of requirement/ paths (none exists; none added).
- V1 (already shipped as v1.4).

## Decisions proposed

- DD-1: prefix rather than relocate — relocation is the 4.0 Change Bundle; the prefix is the compatible stopgap V1.4 already validated.
- DD-2: intent-card.md included — identical collision class; excluding it would leave the explore track broken in parallel repos.
- DD-3: the STEP6 copy clause is protocol text only (no CLI enforcement this patch) — archive's manifest of process artifacts is Change Bundle territory.
