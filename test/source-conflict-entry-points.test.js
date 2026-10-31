'use strict';
// source-conflict-entry-points — a source constraint applies to the existing entry points too; an observed conflict between a
// source and current behavior reaches the examples at those entry points (PR-78). Trigger: v6-dev@d5a5060 on custom-properties@3
// (2026-10-31) — both producers' Ground had observed the existing permission shortcuts the task ruled out, one wrote "new endpoints
// need a strict check", and the spec examples covered only the new entry points; the existing read path kept its shortcut (CP72 twice),
// and one frontend reused an existing role helper the backend's new code did not (B1/B3). Claude × Astra consensus R1031, human 2026-10-31.
const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const LINES = EN.split('\n');
const line = (start) => LINES.find((l) => l.startsWith(start));
const index = (start) => LINES.findIndex((l) => l.startsWith(start));
const between = (from, to) => { const i = EN.indexOf(from); const j = EN.indexOf(to, i); assert.ok(i >= 0 && j > i, `${from} … ${to}`); return EN.slice(i, j); };

// the P3 section as it read at v6-dev@d5a5060 (2324 characters), so "P3 unchanged" is an actual comparison, not a word ban
const P3_SHA256 = '97a85ca560d41c70630d2ca1656c6b3af4dfc02eb3c8bf3a71dbd5875f0f414c';

test('PR-78 a source constraint applies to existing entry points too, and an observed conflict reaches the examples there', () => {
  // §4 Ground: the new rule sits right after the Ground "Do" bullet
  const doIdx = index('- **Do:** the **Ground action** with **P1**.');
  const ground = line('- **Source constraints apply to existing entry points too.**');
  assert.ok(doIdx >= 0 && ground, 'the Ground Do bullet and the new rule exist');
  assert.strictEqual(LINES.indexOf(ground), doIdx + 1, 'the rule follows the Do bullet');
  assert.match(ground, /Where a source explicitly rules out an exception, override or continuation of behavior under a stated condition \(for example, "does not override", "regardless of", or "no longer"\), check how existing or reused paths handle that condition/);
  assert.match(ground, /Within this change's requirement scope — the behavior being delivered, including caller-visible entry points named or implied by the sources and the code they reuse, not just files being changed — trace each affected entry point far enough to establish what determines its observable result under that condition/);
  assert.match(ground, /record the condition, entry point, deciding code and current result in the existing `observed:` entries/);
  assert.match(ground, /Apply the same trace to any conflict between a source and current behavior already observed in Ground/);
  assert.match(ground, /Follow only the paths needed to explain that result, not a repository sweep/);
  assert.match(ground, /Checking only new code does not settle the existing entry points governed by the same requirement\./);
  assert.match(LINES[doIdx], /rather than sweeping the repo/, 'the Do bullet keeps its targeted-reading rule');
  // §4 Specify: the examples sentence is appended to "Minimal means minimal"
  const minimal = line('- **Minimal means minimal.**');
  assert.match(minimal, /For every conflict Ground observed between a source and current behavior, the examples carry its triggering condition at the affected caller-visible entry points, including existing ones, with representatives for each distinct path that determines the result; one representative may stand for several entry points only when an existing `observed:` entry establishes that the same path determines their result under that condition, and each expected result retains every source obligation applicable to that example\./);
  assert.match(minimal, /the entry points through which the same rule can fail/, 'PR-75 text stays');
  assert.match(minimal, /states §4 Ground's safe default/, 'PR-77 text stays');
  // P1 and P2 carry it to the producer
  const p1 = line("Against this change's stated goal and success criteria, read the real code");
  assert.ok(p1, 'P1 Ground paragraph exists');
  assert.match(p1, /Where a source explicitly rules out an exception, override or continuation under a stated condition, or Ground has already observed a conflict with a source, trace the affected existing or reused entry points within the requirement scope defined in §4 Ground far enough to establish their observable result; record the condition, entry point, deciding code and current result\./);
  const p2 = line('* One scenario per user-visible output');
  assert.ok(p2, 'P2 scenario bullet exists');
  assert.match(p2, /For each conflict Ground observed between a source and current behavior, include its triggering condition at affected caller-visible entry points, existing ones included; use representatives for distinct deciding paths, sharing one only where observed evidence establishes the same deciding path under that condition, and retain every source obligation applicable to each example\./);
  assert.match(p2, /named as a caller reaches it \(route, page, command, input channel\), never as an internal handler/, 'PR-75 text stays');
  // P3 reads exactly as before (actual comparison with the v6-dev@d5a5060 section)
  const p3 = between('### P3 — independent review', '### P4 —');
  assert.strictEqual(crypto.createHash('sha256').update(p3).digest('hex'), P3_SHA256, 'P3 unchanged');
  // no new mechanism, no task-specific text
  for (const [label, t] of [['ground', ground], ['minimal', minimal], ['p1', p1], ['p2', p2]]) {
    assert.doesNotMatch(t, /gate C\d|a new field|checklist|diagram|architecture map|deep search|coverage ledger|a new document|data-flow map/i, `${label}: no new mechanism`);
    assert.doesNotMatch(t, /custom propert|Plane|creator|workspace admin|project (member|guest|admin)|OR\/NOT|saved view|CP\d\d|permission helper/i, `${label}: no task-specific text`);
  }
});
