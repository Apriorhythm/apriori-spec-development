'use strict';
// RY-33 — the evidence status word is a spelling, not a rule.
//
// The refusal this file deletes was observed in the field: a producer wrote
// `- <risk>: fixed — <what was run>` under `## Evidence` and the gate blocked, because the
// vocabulary next door (the issue ledger) closes rows with `fixed`/`verified` while this list
// spelled the same state `done`. The round that followed changed a word and proved nothing about
// the product. Every completion synonym now MEANS `done`; an unknown word is still fail-closed.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rd = require('../lib/readiness');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const w = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const ADDED = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const TAP = 'node -e "console.log(\'TAP version 13\');console.log(\'1..2\');console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';

const EV = (rows) => `\n## Evidence\n${rows.map((r) => `- ${r}`).join('\n')}\n`;

// A standard bundle with no document family: flow-state + delta + one attributable review round.
function project(evidence) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-evsyn-'));
  w(path.join(root, 'apriori', 'specs', 'kv', 'spec.md'), STORE);
  const dir = path.join(root, 'apriori', 'changes', 'c');
  w(path.join(dir, 'specs', 'kv', 'spec.md'), ADDED);
  w(path.join(dir, 'flow-state.md'),
    `change: c\nmode: standard\nlineage: v6\nphase: review\n${EV(evidence)}`
    + '\ngates:\n  - 2026-08-23T00:00 note: scaffolded\n');
  w(path.join(dir, 'review', 'code-review-v1.md'), '# review r1\n\nVERDICT: no major issues\n');
  w(path.join(dir, 'review', 'code-review-v1-raw.txt'), 'raw\n');
  return { root, dir };
}
const gate = (root, extra = []) => run(['gate', '--change', 'c', '--test-cmd', TAP, '--no-cas', ...extra], root);
const line = (out, id) => (out.split('\n').find((l) => l.includes(` ${id} `)) || '').trim();
// the pair a standard change owes, spelled with whichever completion word the caller passes
const rowsWith = (word) => [`producer-diff: ${word} — read the whole diff, known P0/P1 zero`,
  `config-deploy: ${word} — booted the target environment from the real config`];

const SYNONYMS = ['done', 'fixed', 'resolved', 'closed', 'verified', 'pass', 'passed'];

test('RY-33 every completion synonym gates green and counts as done', () => {
  for (const word of SYNONYMS) {
    const { root } = project(rowsWith(word));
    const r = gate(root);
    assert.strictEqual(r.status, 0, `'${word}' must gate green:\n${r.stdout}${r.stderr}`);
    // not merely "not blocked": the row is reported in the SAME bucket `done` is reported in
    assert.match(line(r.stdout, 'C9'), /^✓ C9 .*2 evidence row\(s\): 2 done, 0 owner-accepted, 0 n\/a$/,
      `'${word}' must be counted as done`);
    // and the transient view agrees — the producer-diff row is settled, so review-ready is YES
    const rr = gate(root, ['--review-ready']);
    assert.strictEqual(rr.status, 0, `'${word}' must be review-ready:\n${rr.stdout}`);
    assert.match(rr.stdout, /REVIEW-READY: YES/);
  }
});

test('RY-33 the synonyms normalise to done for every reader, and archive accepts them', () => {
  // the predicate itself, not just its gate face: `settled` and `status` are what every consumer
  // (review-ready, the standard-mode demand, the archive declaration) reads
  for (const word of SYNONYMS) {
    const ev = rd.evidenceFindings(EV(rowsWith(word)));
    assert.deepStrictEqual(ev.blockers, [], `'${word}' must raise no blocker`);
    assert.deepStrictEqual(ev.rows.map((r) => [r.status, r.settled]), [['done', true], ['done', true]],
      `'${word}' must normalise to a settled 'done' row`);
    assert.strictEqual(rd.canonicalEvidenceStatus(word), 'done');
  }
  // end to end: a bundle whose only completion word is `fixed` archives and declares
  const { root } = project(rowsWith('fixed'));
  const a = run(['archive', '--change', 'c', '--no-cas', '--write'], root);
  assert.strictEqual(a.status, 0, `${a.stdout}${a.stderr}`);
  assert.match(a.stdout, /critical evidence: complete/);
});

test('RY-33 `done` behaviour is unchanged and an unknown word is still fail-closed', () => {
  // the three non-completion statuses keep their own meaning — a synonym table that swallowed
  // them would be a new rule, not a subtraction
  const blocked = rd.evidenceFindings(EV([...rowsWith('done'), 'data-schema: blocked — staging DB offline']));
  assert.match(blocked.blockers.join(';'), /critical evidence 'data-schema' is blocked/);
  const claimed = rd.evidenceFindings(EV([...rowsWith('fixed'), 'data-schema: owner-accepted — accepted']));
  assert.match(claimed.blockers.join(';'), /claims owner acceptance with no canonical gates: entry/);
  const na = rd.evidenceFindings(EV(['producer-diff: fixed — read it', 'data-schema: n/a — no schema touched']),
    { mode: 'standard' });
  assert.match(na.blockers.join(';'), /a standard change owes at least one substantive evidence row/,
    'n/a is still not settled, and a synonym on producer-diff does not pay the standard demand');

  // an unknown word blocks, and the refusal quotes what the producer actually wrote
  const { root } = project([...rowsWith('done'), 'data-schema: probably-fine — eh']);
  const r = gate(root);
  assert.strictEqual(r.status, 1);
  assert.match(line(r.stdout, 'C9'),
    /BLOCKED — evidence 'data-schema' carries status 'probably-fine', which is not one of \{done, blocked, owner-accepted, n\/a\}/);
});
