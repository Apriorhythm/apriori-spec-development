# Design — readme-split

check.js self-mode: PAIRS gains [['docs/concepts.md','docs/concepts_cn.md'], ...×5]; pair loading reports a FAIL row when exactly one side exists (new helper around the existing loop); checkLinks(root, name, text) → checkLinks(baseDir, name, text, {fragments: headingsOf(target)}) — signature extended with the linking file's dir; fragment validation loads the target file once, slugifies its fence-stripped headings with ghSlug, compares. Consumer mode untouched.

Docs writing order: cli.md (usage strings from the ten USAGE consts — copy verbatim) → ci.md (three snippets: check on PR, gate per change, verify post-merge) → troubleshooting.md (D1..D7 + zero-TAP/orphan/CAS/stale-runbook entries) → concepts.md/legacy.md (migration per map, preservation rule) → README rewrite (Quickstart per contract) → CN mirrors last (headings aligned 1:1). Hand-run the Quickstart in a scratch dir; record exit codes in tasks.md.

Tests: test/check.test.js gains CK-08 (fixture docs pairs: aligned pass / misaligned fail / one-sided fail / absent skip) and CK-09 (docs-relative link ok / missing file fail / bad fragment fail / root-file behavior unchanged).
