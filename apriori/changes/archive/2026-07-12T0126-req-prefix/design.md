# Design — req-prefix

Doc edits + one template-string edit + two binding tests.

**Path replacements (script with per-site count asserts, the V1.4 method; current counts req-v/req-final/intent-card — RUNBOOK.md 6/8/4, RUNBOOK_cn.md 6/8/4, concepts.md 2/5/1, concepts_cn.md 2/5/1):** in RUNBOOK.md / RUNBOOK_cn.md / docs/concepts.md / docs/concepts_cn.md: `requirement/req-v` → `requirement/<change>-req-v`; `requirement/req-final.md` → `requirement/<change>-req-final.md`; `requirement/intent-card.md` → `requirement/<change>-intent-card.md`. (In concepts' mini-kv walkthrough the literal `<change>` placeholder matches the existing example style, same as V1.4.) Generic prose (`requirement/` in the artifact-root comment, P13's "no requirement/spec files") contains none of the literals — untouched by construction.

**STEP6 preservation clause:** one sentence appended to the runbook STEP6 "Do" bullet (both editions), verbatim from req-final: after the archive move, before the closeout commit, copy every `requirement/<change>-req-*.md` + intent card into `apriori/changes/archive/<stamp>-<change>/requirement/`, basenames preserved, all versions.

**lib/new.js:** the template line becomes `` next-action: draft requirement/${name}-req-v1.md (or the intent card on the explore track) `` (name is already in scope).

**Tests:**
- PR-19 in test/protocol.test.js: positive anchors per doc (prefixed table row both runbooks; prefixed intent card; the STEP6 clause's destination + timing anchors in both runbooks; one prefixed anchor in each concepts edition), negative: `for (const doc of [EN, CN, CONCEPTS, CONCEPTS_CN]) for (const lit of ['requirement/req-v', 'requirement/req-final.md', 'requirement/intent-card.md']) assert.ok(!doc.includes(lit))`.
- NW-05 in test/new.test.js: scaffold a change in a tmpdir, read flow-state, assert the next-action line text + absence of ALL THREE forbidden literals (RPSPEC-1); PR-19's negative loop additionally reads lib/new.js source and applies the same three-literal check (L1 names lib/).

Grandfathering needs no code: nothing parses requirement filenames (grep-verified at STEP0); archived dirs keep old names.
Tasks: T1 red PR-19+NW-05; T2 the four docs + new.js; T3 gates + P8; T4 archive with the NEW preservation clause dogfooded + post-archive gate.
