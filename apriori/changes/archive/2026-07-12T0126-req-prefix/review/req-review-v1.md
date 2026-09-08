# P1 requirement review — req-prefix (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/req-prefix-req-review-v1-raw.txt

# P1 Requirement Review — req-prefix v1

## Dimension Verdicts

1. **Target state B clear and unambiguous:** issues open. The main prefix convention is clear, but docs/concepts scope and STEP6 copy semantics are not.
2. **Edge cases and exception paths covered:** issues open. PR-19 negative matching and archived historical artifacts need sharper scope.
3. **Implied but undeclared side effects:** issue open. The STEP6 copy clause adds a manual artifact-copy action but does not define exact destination/timing.
4. **Acceptance criteria testable:** issue open. L1/PR-19 needs an exact negative matcher to avoid false positives and false negatives.
5. **Conflicts with current state A:** issue open. `docs/concepts.md` and `docs/concepts_cn.md` still carry the old global paths.
6. **Target lineage declared and matches repo reality:** pass. The requirement declares the v3 branch and the file itself dogfoods the proposed naming convention.

## Issues

### RP-1 — docs/concepts still documents the old global requirement paths

**Description:** The requirement says the convention changes “everywhere else the convention is written,” but the acceptance scope L1 only names `RUNBOOK.md`, `RUNBOOK_cn.md`, and `lib/`. Current state shows `docs/concepts.md` and `docs/concepts_cn.md` still publish the old paths, including:
- `requirement/req-v{N}.md` → `requirement/req-final.md`
- `requirement/intent-card.md`
- mini-kv walkthrough references to `requirement/req-v1.md` and `requirement/req-final.md`
- P5 examples comparing specs against `requirement/req-final.md`

README does not appear to carry these paths directly, but it links concepts as the explanatory handbook.

**Risk:** Users reading concepts get the old collision-prone convention immediately after the runbook is fixed. That leaves the protocol split-brained and can reproduce the exact overwrite class this change is meant to stop.

**Suggested fix:** Either include `docs/concepts.md` and `docs/concepts_cn.md` in L1/L3/PR-19 scope, or explicitly declare concepts out of scope and schedule a follow-up. Given README points users there, inclusion is the safer contract.

### RP-2 — STEP6 copy clause lacks exact destination and timing

**Description:** The requirement says requirement docs and the intent card are “copied into the archived change dir before commit,” but it does not specify:
- the destination path inside the archived change dir;
- whether the copied files preserve the `requirement/` subdirectory;
- whether all versions are copied or only final plus intent card;
- which “commit” this means, given current STEP6 already requires an implementation commit before P9, while the archive dir only exists after `apriori archive --change ... --changes-dir`.

**Risk:** Producers can implement incompatible archive layouts or place the copy step at the wrong time. PR-19 can pass wording while the actual preserved artifacts are inconsistent or missing.

**Suggested fix:** Define the exact protocol sentence, for example: after `apriori archive --change <name> --write --changes-dir apriori/changes` moves the change dir, and before the STEP6 closeout/PR commit, copy `requirement/<change>-req-*` and `requirement/<change>-intent-card.md` if present into `apriori/changes/archive/<stamp>-<change>/requirement/` preserving basenames. If only final files should be copied, say so.

### RP-3 — PR-19’s negative assertion is not precise enough

**Description:** L1 says PR-19 asserts absence of unprefixed forms, but does not define the exact forbidden patterns. A broad `requirement/` negative would false-positive on legitimate text such as the artifact-root comment and P13’s “no requirement/spec files.” A loose `req-*` matcher can also become ambiguous around the new prefixed filenames.

**Risk:** The binding test may be either too broad and brittle, or too narrow and miss stale references. Either case causes rework in STEP2/STEP5.

**Suggested fix:** Specify the negative matcher as exact old forms only, scoped to live protocol docs: forbid `requirement/req-v`, `requirement/req-final.md`, and `requirement/intent-card.md`; allow `requirement/<change>-req-...`, `requirement/<change>-intent-card.md`, and generic prose such as “requirement/spec files.”

## Advisories

- DD-2 is sound: intent-card belongs in the prefix stopgap because it has the same global-path collision class.
- DD-3 is acceptable as protocol text only for this patch, provided RP-2 defines the manual copy precisely.
- Old archived changes and historical raw review evidence should be grandfathered explicitly. No current CLI/gate path appears to parse requirement filenames, so old archive names are acceptable drift if the tests scope themselves to live docs and `lib/new.js`.
- The current `lib/new.js` scaffold has enough information to print `requirement/${name}-req-v1.md`; no parser changes are needed.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RP-1 | `docs/concepts.md` and `docs/concepts_cn.md` still document the old unprefixed requirement and intent-card paths, while the requirement says every written convention changes. | Protocol docs remain split-brained and can reproduce the overwrite collision. | STEP0 r1 | open |
| RP-2 | STEP6 copy clause does not define exact copied set, destination inside the archived change dir, or timing relative to archive move and commits. | Producers can preserve artifacts inconsistently or at an impossible point in the flow. | STEP0 r1 | open |
| RP-3 | PR-19 negative assertion does not define exact forbidden old path patterns and allowed generic `requirement/` prose. | The binding can false-positive on legitimate prose or miss stale global paths. | STEP0 r1 | open |
| RP-ADV-1 | Advisory batch: intent-card inclusion is sound; protocol-only copy is acceptable if made precise; old archived artifacts should be explicitly grandfathered. | Low | STEP0 r1 | open |

VERDICT: 3 issues open
