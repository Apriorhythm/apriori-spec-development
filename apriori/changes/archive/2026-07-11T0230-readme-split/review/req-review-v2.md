**Dimension Verdicts**

1. Target state B clear and unambiguous: one reopened issue.
2. Edge cases and exception paths covered: no new formal issue.
3. Implied but undeclared side effects: no formal issue.
4. Acceptance criteria testable as if/then: one reopened issue.
5. Conflicts with current state A: one reopened issue in the migration map.
6. Target lineage declared and matches repo reality: no issue.

State-A checks: `README.md` and `README_cn.md` are both 920 lines. The major section inventory is real. `check --self` currently covers only root EN/CN pairs, and `checkLinks` currently resolves `./...` links against the repo root.

**Resolution Check**

RREQ-1 is verified. R1 now binds both `README.md` and `README_cn.md` to the ≤200-line cap, aligned headings, Quickstart section, and docs links.

RREQ-2 is verified. The Quickstart contract now defines the section title, extractable shell blocks, execution order, environment, heredoc requirement, and hand-verification before item 10 automates it.

RREQ-3 is reopened. The new migration map improves the contract, but it still does not faithfully match the actual README heading inventory.

RREQ-4 is verified. R3 now distinguishes both-absent pairs from one-sided pairs; exactly one side existing must fail self-mode.

RREQ-5 is verified. CK-09 now explicitly covers per-file base resolution and cross-file fragment validation.

**Issues**

RREQ-3 — Migration map still conflicts with the actual README inventory.

Description: The map says it is “H2-level; child headings travel with their H2,” but it includes `Directory / Module Structure + Module Dependencies` as a separate old section. In the actual README, those strings are inside a fenced markdown template under §8.2, not real document H2/H3 headings after the same fence-stripping model used by `check.js`. The map also sends §8 Configuration Reference to `docs/cli.md` while separately sending those fenced template subsections to `docs/concepts.md`, which creates an undeclared split inside §8.2. The §3 row is also split between README Quickstart and `docs/concepts.md` without naming which child headings 3.1–3.4 are preserved, condensed, or exempted.

Risk: Implementers and P8 reviewers cannot apply the preservation rule deterministically. They may either preserve/check headings that are not actual document headings, or split fenced template content inconsistently.

Suggested fix: Make the migration map match the non-fenced H2/H3 inventory exactly. Either remove the `Directory / Module Structure + Module Dependencies` row and keep that fenced template with §8.2, or declare it as an explicit content-excerpt exception with exact source lines and destination. Also spell out the §3 child-heading disposition.

**Advisories**

R2 says heading counts align, while current `checkHeadingAlignment` also checks heading levels and numeric prefixes. The acceptance text would be clearer if it named all three.

R7 names only `docs/cli.md` for verbatim `--help` usage strings. Since the docs are EN/CN pairs and CLI usage is language-neutral, consider requiring the same verbatim usage strings in `docs/cli_cn.md`.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RREQ-1 | README line-cap/first-screen target not applied testably to the CN mirror. | CN mirror could stay a monolith while R1 passes. | STEP0·r1 | verified |
| RREQ-2 | Quickstart executability underspecified. | Item 10 has no stable extraction contract. | STEP0·r1 | verified |
| RREQ-3 | “MOVED not rewritten” migration map still does not match the actual README inventory. | Preservation rule remains ambiguous and hard to review deterministically. | STEP0·r1 | open |
| RREQ-4 | Missing docs-pair behavior ambiguous. | A missing CN mirror could skip silently. | STEP0·r1 | verified |
| RREQ-5 | “No dangling anchors” conflicted with checkLinks capability. | Cross-doc anchor drift could pass self-check. | STEP0·r1 | verified |
| ADV-RREQ-2 | Advisory batch: align R2 wording with heading-level/numeric-prefix checks; consider requiring verbatim CLI usages in `docs/cli_cn.md`. | Low. | STEP0·r2 | advisory |

VERDICT: 1 issues open
