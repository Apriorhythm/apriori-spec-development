# P8 consistency review — req-prefix (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: req-prefix-impl-review-v1-raw.txt

# P8 Consistency Review — req-prefix v1

## Issues

### RPIMPL-1 — RUNBOOK still teaches unprefixed requirement basenames in STEP0/Brainstorm text

**Description:** The exact forbidden `requirement/...` literals are gone, but the landed RUNBOOK still uses bare old requirement filenames as protocol guidance:

- `RUNBOOK.md`: “becomes STEP0's `req-v1` starting material”
- `RUNBOOK.md`: “revise per it → `req-v{N+1}.md`”
- `RUNBOOK.md` P13: “as the `req-v1` starting material”
- CN mirrors the same `req-v1` / `req-v{N+1}.md` wording.

These do not match PR-19’s three exact forbidden literals, so the green test misses them. But semantically they are still requirement-stage filename conventions without the `<change>-` prefix, contradicting the target rule that requirement-stage paths/names carry the change name everywhere the convention is written.

**Risk:** A user following STEP0 can still create or refer to an unprefixed `req-v{N+1}.md`, preserving the collision class this change is meant to remove. The current protocol tests also anchor some of the bare `req-v1` wording, so a correct follow-up fix may require updating those older assertions.

**Suggested fix:** Replace bare requirement-doc shorthands with prefixed forms where they refer to files:
- `req-v1` → `<change>-req-v1`
- `req-v{N+1}.md` → `<change>-req-v{N+1}.md`

Leave purely generic prose like “draft req-v1” only if it is explicitly not a filename; otherwise prefer the prefixed basename. Update PR-07/PR-09/PR-16 assertions that currently require bare `req-v1`, and extend PR-19 or a companion assertion to catch bare backticked requirement basenames.

## Checks Passed

- The four live docs now use `requirement/<change>-req-*`, `requirement/<change>-req-final.md`, and `requirement/<change>-intent-card.md` in the artifact tables, prompts, concepts walkthrough, and goal recipes.
- The STEP6 preservation sentence is semantically aligned EN/CN: after archive move / before closeout commit; copies every prefixed req file plus intent card if present; destination is `apriori/changes/archive/<stamp>-<change>/requirement/`; basenames and all versions are preserved.
- `lib/new.js` uses a backtick template literal and interpolates `${name}` into `next-action: draft requirement/${name}-req-v1.md ...`.
- NW-05 asserts the generated flow-state text and the absence of all three exact forbidden literals.
- Grandfathering is not contradicted: old archives are not parsed by code, and PR-19 scopes the mechanical negative check to live docs plus `lib/new.js`.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RPIMPL-1 | RUNBOOK EN/CN still use bare `req-v1` / `req-v{N+1}.md` as requirement-stage filename guidance, and existing protocol assertions anchor some of that wording. | The old collision-prone naming convention can still be followed despite the exact `requirement/...` literals being removed. | STEP5 r1 | open |

VERDICT: 1 issues open