'use strict';
// status-last-gate-order — LG-1 (follow-up registered by status-last-recorded, 2026-09-27): `last decision:` /
// `lastGate` took the TEXTUALLY last dated gates entry and called a `note:` a decision. It is now the latest
// OWNER entry by its stamp (the same normalization lastRecorded uses; a tie goes to the later line), and null
// when the log holds no owner entry — a note is never shown as a decision.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const flow = require('../lib/flow');
const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const state = (name, gates) => `change: ${name}\nphase: build\n\n## Open\n\n## Next\n- next\n\ngates:\n${gates}`;
const CHANGES = {
  // the owner's decision is written mid-log; a later-dated note and an earlier-dated note follow it textually
  latestowner: state('latestowner', '  - 2026-09-09T11:35 note: r1\n  - 2026-09-12T09:00 owner: approved the plan\n  - 2026-09-15T10:00 note: collect r3 escalate\n  - 2026-09-10T08:00 note: late-written r2\n'),
  // two owner entries out of order: the later STAMP wins, not the later line
  twoowners: state('twoowners', '  - 2026-09-20T10:00 owner: reframe code-review round 2 redo — redo it\n  - 2026-09-18T10:00 owner: evidence-accept R-1 — fine\n'),
  // two owner entries in the same minute: the later line wins
  tie: state('tie', '  - 2026-09-22T09:15 owner: first\n  - 2026-09-22T09:15 owner: second, same minute\n'),
  // compact `THHMM` and colon `THH:MM` stamps compare after normalization: 09:30 compact beats 09:15 colon written later
  compact: state('compact', '  - 2026-09-23T0930 owner: compact, later in time\n  - 2026-09-23T09:15 owner: colon, later in text\n'),
  // notes only: there is no decision to show
  notesonly: state('notesonly', '  - 2026-09-01T10:00 note: scaffolded\n  - 2026-09-02T11:30 note: specify done\n'),
  // a forged or out-of-range stamp never becomes the decision; a fenced owner line is inert
  inert: state('inert', '  - 2026-09-05T10:00 owner: real\n  - 9999-99-99T99:99 owner: forged\n  ```\n  - 2026-12-31T23:59 owner: an example in a fence\n  ```\n'),
};
function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-lgo-'));
  for (const [name, text] of Object.entries(CHANGES)) {
    const dir = path.join(root, 'apriori', 'changes', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'flow-state.md'), text);
  }
  return root;
}

test('ST-45 last decision is the latest owner entry by stamp, never a note, null without one', () => {
  const lg = (g) => flow.parseFlowState(state('x', g)).lastGate;
  assert.strictEqual(lg(CHANGES.latestowner.split('gates:\n')[1]), '2026-09-12T09:00 owner: approved the plan');
  assert.strictEqual(lg(CHANGES.twoowners.split('gates:\n')[1]), '2026-09-20T10:00 owner: reframe code-review round 2 redo — redo it');
  assert.strictEqual(lg(CHANGES.tie.split('gates:\n')[1]), '2026-09-22T09:15 owner: second, same minute');
  assert.strictEqual(lg(CHANGES.compact.split('gates:\n')[1]), '2026-09-23T0930 owner: compact, later in time');
  assert.strictEqual(lg(CHANGES.notesonly.split('gates:\n')[1]), null);
  assert.strictEqual(lg(CHANGES.inert.split('gates:\n')[1]), '2026-09-05T10:00 owner: real');
  // a dated line outside the gates block is never a decision
  assert.strictEqual(flow.parseFlowState('## Open\n- 2026-01-01T00:00 owner: not a gate\n\ngates:\n  - 2026-08-23T00:00 note: scaffolded\n').lastGate, null);
});

test('ST-46 status shows it the same way: text line, --json field, absent when there is none', () => {
  const root = project();
  const r = run(['status', '--change', 'latestowner'], root);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /^last decision: 2026-09-12T09:00 owner: approved the plan$/m);
  assert.doesNotMatch(r.stdout, /last decision: .*note:/);
  const n = run(['status', '--change', 'notesonly'], root);
  assert.strictEqual(n.status, 0, n.stderr);
  assert.doesNotMatch(n.stdout, /^last decision:/m);
  assert.match(n.stdout, /^last recorded: 2026-09-02T11:30/m);       // lastRecorded is untouched
  const j = JSON.parse(run(['status', '--change', 'twoowners', '--json'], root).stdout);
  assert.strictEqual(j.lastGate, '2026-09-20T10:00 owner: reframe code-review round 2 redo — redo it');
  assert.strictEqual(JSON.parse(run(['status', '--change', 'notesonly', '--json'], root).stdout).lastGate, null);
  const list = JSON.parse(run(['status', '--json'], root).stdout);
  const by = Object.fromEntries(list.changes.map((c) => [c.change, c.lastGate]));
  assert.strictEqual(by.latestowner, '2026-09-12T09:00 owner: approved the plan');
  assert.strictEqual(by.notesonly, null);
});
