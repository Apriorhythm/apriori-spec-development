# Proposal — golden-path

**WHY.** Nothing verifies the PUBLISHED package works as installed (the 3.0.1 Windows incident class); the Quickstart contract from readme-split will rot without a consumer. Roadmap item 10.

**WHAT.** scripts/golden-path.mjs (pure extractor seam + runner, --local for tests / --packed for CI), GP-01..05, a CI job npm pack → packed run on ubuntu+windows/node 20. Existing jobs untouched.

**OUT OF SCOPE.** README edits, other examples, npm publish in CI, wider matrix.

Requirement: requirement/req-final.md (2 P1 rounds → no major issues; ledger 2 verified / 0 open).
