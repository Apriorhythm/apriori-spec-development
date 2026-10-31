'use strict';
// preserve-source-outcomes — when a source is turned into an expected result, or a result is changed on a review's advice, the
// source's obligations are not reduced without authority (PR-79). Trigger: v6-dev@c6543e7 (2026-10-31) — on custom-properties@3
// both producers had observed the ruled-out shortcut and placed the example at the existing entry point, yet their Ground lines
// had already shrunk the source's "refuse, and expose nothing" to "expose nothing", and their tests accepted the wrong status
// outright; on the unseen worklog@2 the internal review's hardening advice was adopted over the source's stated output format
// and the spec rewritten to match. Claude × Astra consensus R1031B, human 2026-10-31 (开工).
const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const LINES = EN.split('\n');
const line = (start) => LINES.find((l) => l.startsWith(start));
const between = (from, to) => { const i = EN.indexOf(from); const j = EN.indexOf(to, i); assert.ok(i >= 0 && j > i, `${from} … ${to}`); return EN.slice(i, j); };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// P3 as it read at v6-dev@d5a5060 and c6543e7; P1 as it read at c6543e7 — actual comparisons, not word bans
const P3_SHA256 = '97a85ca560d41c70630d2ca1656c6b3af4dfc02eb3c8bf3a71dbd5875f0f414c';
const P1_SHA256 = '02f384ffc27dce967c5d8b044c34c708df31a33d2a9632abc47c0859f27b4c41';

test('PR-79 expected results return to the source and exclude the observed conflicting outcome; a review-advised change to a source-stated result needs the source and an authority', () => {
  // §4 Specify: the examples sentence (PR-78) now ends at "under that condition." and the source-return sentences follow
  const minimal = line('- **Minimal means minimal.**');
  assert.ok(minimal, 'the Specify rule exists');
  assert.match(minimal, /one representative may stand for several entry points only when an existing `observed:` entry establishes that the same path determines their result under that condition\. For these examples, return to the source itself: cite the applicable clause and state each required observable result separately, preserving its conditions and alternatives\. Equivalent wording is sufficient; a consequence that can also hold when a required result is absent is not\. The expected result must exclude the conflicting outcome observed in current behavior\./);
  assert.doesNotMatch(minimal, /retains every source obligation applicable to that example/, 'the sentence that did not bite is replaced, not kept beside');
  assert.match(minimal, /For every conflict Ground observed between a source and current behavior, the examples carry its triggering condition at the affected caller-visible entry points, including existing ones/, 'PR-78 entry-point coverage stays');
  assert.match(minimal, /the entry points through which the same rule can fail/, 'PR-75 text stays');
  assert.match(minimal, /states §4 Ground's safe default/, 'PR-77 text stays');
  // §4 Review & Deliver: the disposition rule compares a suggested fix with the source before accepting it
  const disp = line('- **Disposition of findings — scope is judged per finding, never by volume.**');
  assert.ok(disp, 'the disposition rule exists');
  assert.match(disp, /the disposition cites that basis and the evidence of the violation\. Before accepting a suggested fix that changes an observable result stated by a source, cite the applicable source clause and state the difference in the finding's disposition\. Current behavior, convention, or a review recommendation alone does not authorize that change; do not rewrite the contract to make it a fix\. If the difference is not already authorized by a source or a recorded owner decision, retain the source's result\. Where an independently supported applicable constraint prevents that, record both bases and leave the conflict pending the owner under the existing rules; it is not a non-blocking follow-up\./);
  assert.match(disp, /Changing a commitment is the owner's decision \(R1\); until it is recorded, the commitment and its blocking stand/, 'the owner-decision rule stays');
  assert.match(disp, /a finding fixed at one entry point is not closed for the rule/, 'PR-75 disposition text stays');
  // P2: the scenario bullet and the Build & Test paragraph carry both to the producer
  const p2 = line('* One scenario per user-visible output');
  assert.ok(p2, 'P2 scenario bullet exists');
  assert.match(p2, /sharing one only where observed evidence establishes the same deciding path under that condition\. For each such example, cite the applicable source clause and separately state all observable results it requires under that condition, preserving its alternatives; equivalent wording is sufficient, but a consequence that also permits the observed conflicting outcome is not\./);
  assert.doesNotMatch(p2, /retain every source obligation applicable to each example/);
  const p2build = line('[Build & Test] Derive a failing test');
  assert.ok(p2build, 'P2 Build & Test paragraph exists');
  assert.match(p2build, /\(or say there are none\)\. When responding to review, compare any proposed change to a source-stated result with the source itself and record the difference and its authority in the disposition \(§4 Review & Deliver\); do not rewrite the contract merely to accept the recommendation, and leave a genuine unresolved constraint conflict pending the owner\.$/);
  assert.match(p2build, /the adapter's conversion, a success status or a refresh alone is not that evidence/, 'PR-77 text stays');
  // P1 and P3 read exactly as before
  assert.strictEqual(sha(between('### P1 — Ground', '### P2 —')), P1_SHA256, 'P1 unchanged');
  assert.strictEqual(sha(between('### P3 — independent review', '### P4 —')), P3_SHA256, 'P3 unchanged');
  // no new mechanism, no task-specific text — judged on the sentences this change adds (the surrounding rules already name gate C9 etc.)
  const added = {
    minimal: minimal.slice(minimal.indexOf('For these examples, return to the source itself')),
    disposition: disp.slice(disp.indexOf('Before accepting a suggested fix'), disp.indexOf('A necessary fix is never moved out')),
    p2: p2.slice(p2.indexOf('For each such example, cite the applicable source clause')),
    p2build: p2build.slice(p2build.indexOf('When responding to review, compare')),
  };
  for (const [label, t] of Object.entries(added)) {
    assert.ok(t.length > 80, `${label}: the added sentences are present`);
    assert.doesNotMatch(t, /gate C\d|a new field|checklist|mapping column|diagram|architecture map|deep search|coverage ledger|a new document|data-flow map/i, `${label}: no new mechanism`);
    assert.doesNotMatch(t, /custom propert|Plane|creator|workspace admin|project (member|guest|admin)|OR\/NOT|saved view|CP\d\d|WL\d\d|CSV|403|404|formula|quoting|export/i, `${label}: no task-specific text`);
  }
});
