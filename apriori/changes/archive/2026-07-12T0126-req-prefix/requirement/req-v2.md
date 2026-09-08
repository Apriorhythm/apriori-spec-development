# Requirement — req-prefix (v2)

change: req-prefix
target lineage: **v3 branch**. Protocol-doc patch PLUS one CLI scaffold-advisory-text edit (3.4.1): requirement-stage paths gain the `<change>-` prefix in the four live docs and in `lib/new.js`'s scaffolded `next-action` line; no CLI parsing or enforcement changes — no frozen surface moves. (This file dogfoods the convention.)

Revisions vs v1 (P1 r1): RP-1 docs/concepts EN/CN in scope; RP-2 the STEP6 copy clause is now exact (set/destination/timing); RP-3 the PR-19 negative matcher names the exact forbidden literals; RP-ADV-1 old archives explicitly grandfathered. Vs r2: RP-4 — the docs-only label corrected (the lib/new.js advisory-text edit is declared scope, with its own acceptance clause).

## Background — the problem (current state A, dogfooded twice)

The V3 runbook pins requirement-stage artifacts to GLOBAL fixed paths: `requirement/req-v{N}.md` → `requirement/req-final.md`, and the explore track's `requirement/intent-card.md`. Every change overwrites the previous change's files; parallel changes would interleave writes. Both GPT-5.6 reviews flagged the class; this session hit it twice (gate-command's req-v1 over change-projection's; tap-plan's over delta-consumption's). The hand-copy rescue at STEP6 is operator discipline, not protocol. Root fix (Change Bundle) stays at 4.0. V1.4 shipped this stopgap on 2026-07-12; V3 lacks it. docs/concepts (both languages) also publishes the old paths (RP-1) — including its mini-kv walkthrough and P5 examples.

## Goal (target state B)

Requirement-stage paths carry the change name everywhere the convention is written — RUNBOOK.md, RUNBOOK_cn.md, docs/concepts.md, docs/concepts_cn.md, and `lib/new.js`'s scaffolded `next-action` line (advisory text; new.js already has the name in scope — `requirement/${name}-req-v1.md`):
- `requirement/<change>-req-v{N}.md` → finalized `requirement/<change>-req-final.md`
- `requirement/<change>-intent-card.md` (explore track — same collision class)

**STEP6 preservation clause (exact, both editions):** after `apriori archive --change <name> --write --changes-dir apriori/changes` moves the change dir, and BEFORE the STEP6 closeout commit, copy every `requirement/<change>-req-*.md` and `requirement/<change>-intent-card.md` (if present) into `apriori/changes/archive/<stamp>-<change>/requirement/`, basenames preserved, all versions included — the requirement history travels with its change. (Protocol text only this patch; automation is Change Bundle territory, DD-3.)

**Binding (PR-19, both editions + concepts):** positive — the prefixed forms appear in the artifact table/STEP0/intent-card/STEP6 clause; negative — the exact old literals `requirement/req-v`, `requirement/req-final.md`, `requirement/intent-card.md` appear NOWHERE in the four live docs (this matcher cannot false-positive: generic prose like the artifact-root comment's `requirement/` or P13's "no requirement/spec files" contains none of the three literals).

**Grandfathering (explicit):** already-archived changes and historical raw evidence keep their old file names — no CLI or gate path parses requirement filenames (grep-verified), so old names are accepted drift; the binding scopes itself to the four live docs + lib/new.js.

## Acceptance criteria (testable)

- L1. Zero occurrences of the three forbidden literals in RUNBOOK.md / RUNBOOK_cn.md / docs/concepts.md / docs/concepts_cn.md / lib/; PR-19 asserts both directions (prefixed forms present, forbidden literals absent) over the four live docs.
- L2. PR-19 binds the STEP6 preservation clause in both runbook editions (destination path + before-the-closeout-commit timing).
- L3. EN and CN state the same convention in both doc pairs (translation parity, P8-checked).
- L4. `apriori new <name>` scaffolds `next-action: draft requirement/<name>-req-v1.md …` — the scaffold emits no forbidden literal (its existing test updated to bind the new text).
- L5. All existing tests pass; suite + check --self + gate PASS; post-archive gate PASS.

## Out of scope

- Change Bundle (4.0) — supersedes the prefix by relocation.
- CLI parsing/enforcement of requirement paths (none exists; none added).
- Renaming files inside already-archived changes (grandfathered).
- V1 (shipped as v1.4).

## Decisions proposed

- DD-1: prefix, not relocate — the compatible stopgap V1.4 validated; relocation is 4.0.
- DD-2: intent-card included — identical collision class.
- DD-3: preservation clause is protocol text; automation waits for Change Bundle.
- DD-4: negative binding via the three exact literals — precise enough to never false-positive on legitimate `requirement/` prose.
