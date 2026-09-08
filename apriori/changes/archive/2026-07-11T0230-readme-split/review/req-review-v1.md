**Dimension Verdicts**

1. Target state B clear and unambiguous: issues found.
2. Edge cases and exception paths covered: issues found.
3. Implied but undeclared side effects: no formal issue found.
4. Acceptance criteria testable as if/then: issues found.
5. Conflicts with current state A: issue found around what `checkLinks` can prove; other state-A claims verified.
6. Target lineage declared and matches repo reality: no formal issue found.

State-A checks: `README.md` and `README_cn.md` are both 920 lines. The claimed major section inventory is present. `lib/check.js` currently self-checks only root pairs `README/RUNBOOK/VISION`, and `checkLinks(root, name, text)` resolves `./...` links against the repo root via `path.join(root, f)`.

**Issues**

RREQ-1 — The README line-cap/first-screen target is not applied testably to the CN mirror.

Description: Target B says “README.md (EN+CN) becomes the first screen” and “Target ≤ 200 lines,” but R1 only says `README.md ≤ 200 lines`. It does not require `README_cn.md ≤ 200 lines` or the same Quickstart/link-map surface in the CN mirror.

Risk: The implementation can satisfy R1 while leaving the CN README as the 920-line monolith, violating the split’s mirror convention.

Suggested fix: Amend R1 to require both `README.md` and `README_cn.md` to be ≤ 200 lines and to contain the mirrored first-screen structure.

RREQ-2 — Quickstart executability is underspecified.

Description: Target B requires a copy-pasteable 10-minute Quickstart and says the future golden-path job will verify it verbatim, but the requirement does not define how the Quickstart block is delimited, what fixture/environment it assumes, or the exact file-write commands/content for “write one spec scenario + one failing test.”

Risk: The README can “contain the sequence” while still being impossible to machine-extract or execute later without interpretation.

Suggested fix: Define a marked Quickstart region, environment assumptions, exact command/file-write sequence, and expected exit codes/results for each step, or explicitly narrow this change to human-readable Quickstart only.

RREQ-3 — “No content invented / MOVED not rewritten” is not testable.

Description: R5 requires concepts/legacy/example/§8 material to be moved, with edits limited to transitions, de-duplication, and cross-links. There is no source-to-target section map or preservation rule that lets an implementer or reviewer distinguish an allowed light edit from an invented rewrite.

Risk: Large content drift can ship under the split while still claiming R5 compliance.

Suggested fix: Add a migration map from current README section headings/ranges to target files and define the allowed edit class, e.g. headings may change for navigation, links may update, duplicate paragraphs may be removed, but substantive paragraphs must be preserved unless listed.

RREQ-4 — Missing docs-pair behavior is ambiguous.

Description: The requirement says five docs EN/CN pairs must exist, but also says absent files are skipped “as today.” It does not define whether a one-sided pair, such as `docs/concepts.md` without `docs/concepts_cn.md`, should fail or be skipped.

Risk: `check --self` could silently pass with a missing translation, undermining the EN/CN pair contract.

Suggested fix: Specify that a pair is skipped only when both files are absent; if exactly one side exists, `check --self` fails naming the missing counterpart. Final acceptance should also assert all five pairs exist.

RREQ-5 — The “no dangling anchors” claim conflicts with current `checkLinks` capability.

Description: The requirement says moved sections leave no dangling anchors and “check --self proves it.” Current `checkLinks` checks internal `](#anchor)` anchors and existence of `](./file)` targets, but it does not validate fragments in cross-file links like `](./cli.md#usage)`.

Risk: Cross-doc anchor links introduced by the split can drift or break while `check --self` still passes.

Suggested fix: Declare cross-file fragments out of scope and forbid them, or extend CK-09/checkLinks to validate `./file#anchor` against headings in the target file using the per-file base directory.

**Advisories**

The background inventory omits current §3 Environment Setup from the “buried under” list, although the section exists and likely feeds the new Quickstart. Low risk, but naming its disposition would reduce migration ambiguity.

R2 says heading counts align, while current `checkHeadingAlignment` also checks heading levels and numeric prefixes. Consider wording R2 to match the actual checker behavior.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RREQ-1 | README split acceptance only caps/checks `README.md`, not `README_cn.md`. | CN mirror may remain a monolith. | STEP0·r1 | open |
| RREQ-2 | Quickstart executability lacks extractable block, fixture, file contents, and expected-result contract. | Future golden-path verification and implementation can diverge. | STEP0·r1 | open |
| RREQ-3 | “No content invented / MOVED not rewritten” lacks a testable migration map. | Substantive docs drift can pass review. | STEP0·r1 | open |
| RREQ-4 | One-sided missing docs-pair behavior is undefined. | `check --self` may silently skip missing translations. | STEP0·r1 | open |
| RREQ-5 | “No dangling anchors” is broader than current `checkLinks` proves for cross-file fragments. | Broken cross-doc anchor links can pass self-check. | STEP0·r1 | open |
| ADV-RREQ-1 | Advisory batch: clarify §3 disposition and align R2 wording with heading-level/numeric-prefix checks. | Low. | STEP0·r1 | advisory |

VERDICT: 5 issues open
