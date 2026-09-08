**Dimension Verdicts**

1. Target state B clear and unambiguous: issues found.
2. Edge cases and exception paths covered: issues found.
3. Implied but undeclared side effects: no formal issue found.
4. Acceptance criteria testable as if/then: issue found.
5. Conflicts with current state A: no formal conflict found.
6. Target lineage declared and matches repo reality: no issue found.

State-A checks: README Quickstart currently has four `shell` blocks. The last command in each block is `apriori doctor --no-run`, `apriori verify --change hello`, `apriori verify --change hello`, and `apriori check`, matching expected exits `[0, 1, 0, 0]`. Current CI has one `test` job over ubuntu/windows and Node 18/20/22. `package.json` currently publishes `bin/`, `lib/`, `templates/`, and `RUNBOOK.md`, which is sufficient for the Quickstart’s installed CLI path.

**Issues**

GPREQ-1 — Packed-mode PATH isolation is underspecified for Windows bash.

Description: The requirement says `--packed` installs the tarball with an isolated npm prefix and the CI job runs on `windows-latest` with bash, but it does not specify how the runner resolves the installed `apriori` binary on Windows versus Ubuntu, or how it proves the checkout/global binary is not being used. npm global bin layout differs by platform.

Risk: The golden-path job can pass on Ubuntu and fail on Windows, or worse, accidentally run the checkout `bin/apriori.js` or a preexisting global install instead of the packed tarball.

Suggested fix: Require the script to construct an isolated PATH from the npm prefix in a platform-aware way, or invoke the installed bin by absolute path. Add an assertion such as `apriori --version` or `command -v apriori` proving resolution under the temp prefix, and fail if resolution escapes it.

GPREQ-2 — The doctored README fixture test needs an explicit seam.

Description: G3 requires a doctored README fixture where block 2 exits 0 to fail the runner, but the target script is otherwise specified as extracting from `README.md`. The requirement does not declare a test-only `--readme <path>` option or exported extractor/runner functions that accept fixture text.

Risk: Implementers can satisfy the full run but leave G3 untestable or test it by mutating the real README.

Suggested fix: Declare the seam: either export `extractQuickstart(readmeText)` and a runner function accepting blocks/expected exits, or add a `--readme <path>` test-only flag. G3 should name that interface.

**Advisories**

The phrase “globally installed tarball” is slightly misleading because the goal is an isolated-prefix install, not the runner’s real global environment. Consider consistently saying “installed into an isolated npm prefix.”

G7 covers runner assertion failures, but the workflow-level `npm pack` failure mode is outside the script. Consider requiring the CI step to capture the exact `.tgz` filename from `npm pack --json` to avoid shell-glob ambiguity.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPREQ-1 | Packed-mode PATH/bin resolution is underspecified for Windows bash and isolation. | CI may run the wrong `apriori` binary or fail only on Windows. | STEP0·r1 | open |
| GPREQ-2 | G3’s doctored README fixture lacks a declared script/API seam. | Acceptance test can be skipped or require mutating real README. | STEP0·r1 | open |
| ADV-GPREQ-1 | Advisory batch: clarify “isolated prefix” wording and capture `npm pack` output unambiguously. | Low. | STEP0·r1 | advisory |

VERDICT: 2 issues open
