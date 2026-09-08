# P1 requirement review — req-prefix (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/req-prefix-req-review-v2-raw.txt

# P1 Requirement Review — req-prefix v2

## Resolution Check

### RP-1 — verified

The v2 requirement now brings `docs/concepts.md` and `docs/concepts_cn.md` into scope alongside `RUNBOOK.md` and `RUNBOOK_cn.md`. It explicitly names the old concepts mini-kv walkthrough and P5 examples as part of state A, and L1/L3/PR-19 now cover both doc pairs. This resolves the split-brain scope gap.

### RP-2 — verified

The STEP6 preservation clause is now exact enough to implement: after `apriori archive --change <name> --write --changes-dir apriori/changes` moves the change dir, and before the STEP6 closeout commit, copy every `requirement/<change>-req-*.md` plus `requirement/<change>-intent-card.md` if present into `apriori/changes/archive/<stamp>-<change>/requirement/`, preserving basenames and all versions. That removes the destination/timing ambiguity.

### RP-3 — verified

The negative assertion is now well-defined: only the exact old literals `requirement/req-v`, `requirement/req-final.md`, and `requirement/intent-card.md` are forbidden, scoped to the four live docs. Generic `requirement/` prose and P13’s “no requirement/spec files” wording are not matched by those literals, so the test can be precise.

### RP-ADV-1 — verified

The requirement now explicitly grandfathers archived changes and historical raw evidence, and states that no CLI/gate path parses requirement filenames. That is the right compatibility boundary.

## New Issues

### RP-4 — “docs-only patch” conflicts with the required `lib/new.js` change

**Description:** The header says this is a “Docs-only patch,” but target state B and L1 require changing `lib/new.js`’s scaffolded `next-action` advisory text. That is a code file change, even if it is not a parser or behavior surface.

**Risk:** An implementer may treat the change as docs-only and skip the `lib/new.js` update or its verification. Conversely, a gate/reviewer may reject a legitimate `lib/new.js` diff as out of scope because the requirement says docs-only.

**Suggested fix:** Reword the lineage line to something like: “Protocol-doc patch plus CLI scaffold advisory text; no CLI parsing/enforcement change.” Add an acceptance clause that the `apriori new` scaffold text uses `requirement/<change>-req-v1.md` and does not emit the forbidden literals.

## Dimension Verdicts

1. **Target state B clear and unambiguous:** issue open due to the docs-only/code-text scope conflict.
2. **Edge cases and exception paths covered:** pass. Negative matcher and old-archive grandfathering are now bounded.
3. **Implied but undeclared side effects:** issue open. `lib/new.js` is an implied code edit under a “docs-only” label.
4. **Acceptance criteria testable:** pass with RP-4 fix; current criteria are otherwise grep/test expressible.
5. **Conflicts with current state A:** pass. Current stale runbook/concepts/lib surfaces are correctly named.
6. **Target lineage declared and matches repo reality:** pass. v3 branch is declared.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RP-1 | `docs/concepts.md` and `docs/concepts_cn.md` still document the old unprefixed requirement and intent-card paths, while the requirement says every written convention changes. | Protocol docs remain split-brained and can reproduce the overwrite collision. | STEP0 r1 | verified |
| RP-2 | STEP6 copy clause does not define exact copied set, destination inside the archived change dir, or timing relative to archive move and commits. | Producers can preserve artifacts inconsistently or at an impossible point in the flow. | STEP0 r1 | verified |
| RP-3 | PR-19 negative assertion does not define exact forbidden old path patterns and allowed generic `requirement/` prose. | The binding can false-positive on legitimate prose or miss stale global paths. | STEP0 r1 | verified |
| RP-ADV-1 | Advisory batch: intent-card inclusion is sound; protocol-only copy is acceptable if made precise; old archived artifacts should be explicitly grandfathered. | Low | STEP0 r1 | verified |
| RP-4 | Requirement calls the patch docs-only while also requiring a `lib/new.js` scaffold-text change. | Implementer or reviewer may skip or reject the required code-file update as out of scope. | STEP0 r2 | open |

VERDICT: 1 issues open
