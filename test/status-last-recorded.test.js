'use strict';
// status-last-recorded — ST-41 (the list shows each change's last recorded time: the latest date
// its own gates: log carries, whatever order the entries were written in; unknown says why; the
// source is named and nothing judges staleness), ST-42 (--change prints the same time on its own
// line; lastGate / `last decision:` keep their meaning), ST-43 (--json carries lastRecorded in
// every change view; the error view carries null; no age or staleness field).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const flow = require('../lib/flow');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const state = (name, gates, extra = '') => `change: ${name}
phase: build

## Reality Check
- observed: a fact read 2026-12-01T00:00 — a date outside gates: never counts

## Open

## Next
- by 2026-12-02 do the next thing
${extra}
gates:
${gates}`;

const CHANGES = {
  inorder: state('inorder', '  - 2026-09-01T10:00 note: scaffolded\n  - 2026-09-02T11:30 note: specify done\n'),
  // real logs are not always appended in order: the latest date wins, not the last line
  outoforder: state('outoforder', '  - 2026-09-15T10:00 note: collect r3 escalate\n  - 2026-09-11T20:40 note: r2\n  - 2026-09-09T11:35 owner: approved the plan\n'),
  dayonly: state('dayonly', '  - 2026-09-20T08:00 note: a\n  - 2026-09-22 owner: go ahead\n  - 2026-09-21T23:00 note: b\n'),
  sameday: state('sameday', '  - 2026-09-22 note: day only\n  - 2026-09-22T09:15 note: timed, same day\n'),
  badtime: state('badtime', '  - 2026-09-24T22:0x note: minute unreadable\n  - 2026-09-23T10:00 note: earlier\n'),
  compact: state('compact', '  - 2026-09-03T1100 note: compact form\n  - 2026-09-02T09:00 note: earlier\n'),
  outofrange: state('outofrange', '  - 9999-99-99T99:99 note: forged\n  - 2026-13-01T10:00 note: month 13\n  - 2026-09-10T10:00 note: real\n'),
  inert: state('inert', '  - 2026-09-05T10:00 note: real\n  <!-- - 2026-12-30T10:00 note: commented out -->\n  ```\n  - 2026-12-31T23:59 note: an example in a fence\n  ```\n'),
  nodated: state('nodated', '  - note: an undated line\n'),
  nogates: `change: nogates\nphase: ground\n\n## Open\n`,
};

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-slr-'));
  for (const [name, text] of Object.entries(CHANGES)) {
    const dir = path.join(root, 'apriori', 'changes', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'flow-state.md'), text);
  }
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'noflow'), { recursive: true });   // no flow-state at all
  return root;
}

const WANT = {
  inorder: '2026-09-02T11:30', outoforder: '2026-09-15T10:00', dayonly: '2026-09-22', sameday: '2026-09-22T09:15',
  badtime: '2026-09-24', compact: '2026-09-03T11:00', outofrange: '2026-09-10T10:00', inert: '2026-09-05T10:00',
};
const UNKNOWN = { nodated: 'no dated entry', nogates: 'no dated entry', noflow: 'no flow-state' };

test('ST-41 the list shows each change\'s last recorded time — latest wins, unknown says why, the source is named', () => {
  const root = project();
  const r = run(['status'], root);
  assert.strictEqual(r.status, 0, r.stderr);
  const out = r.stdout;
  for (const [name, at] of Object.entries(WANT)) {
    const esc = at.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(out, new RegExp(`^  ${name}  —  .*, last recorded in gates: ${esc}$`, 'm'), `${name}: want ${at}`);
  }
  for (const [name, why] of Object.entries(UNKNOWN))
    assert.match(out, new RegExp(`^  ${name}  —  .*, last recorded in gates: unknown \\(${why}\\)$`, 'm'), `${name}: unknown (${why})`);
  // the existing columns stay where they were
  assert.match(out, /^ {2}inorder {2}— {2}build, 0 open, /m);
  // one line says where the time comes from, and what it is not
  assert.match(out, /"last recorded" is the latest date in each change's own gates: log — written by whoever works on the change, not proof of activity\./);
  // nothing judges staleness or computes an age
  assert.doesNotMatch(out, /stale|idle|inactive|\bdays?\b|\bago\b|\bage\b/i);
});

test('ST-42 --change prints the same time on its own line; last decision keeps its meaning', () => {
  const root = project();
  const r = run(['status', '--change', 'outoforder'], root);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /^last recorded: 2026-09-15T10:00 {3}\(the latest date in this change's gates: log — self-recorded, not proof of activity\)$/m);
  // lastGate is still the textually last dated entry — unchanged by this change
  assert.match(r.stdout, /^last decision: 2026-09-09T11:35 owner: approved the plan$/m);
  const u = run(['status', '--change', 'nodated'], root);
  assert.match(u.stdout, /^last recorded: unknown \(no dated entry\) {3}\(the latest date in this change's gates: log — self-recorded, not proof of activity\)$/m);
  assert.doesNotMatch(r.stdout + u.stdout, /stale|idle|inactive|\bdays?\b|\bago\b/i);
});

test('ST-43 --json carries lastRecorded in every change view; the error view carries null; no age field', () => {
  const root = project();
  const single = JSON.parse(run(['status', '--change', 'outoforder', '--json'], root).stdout);
  assert.deepStrictEqual(single.lastRecorded, { at: '2026-09-15T10:00', source: 'gates', reason: null });
  assert.match(single.lastGate, /^2026-09-09T11:35 owner: approved the plan$/, 'lastGate unchanged');
  const list = JSON.parse(run(['status', '--json'], root).stdout);
  const by = Object.fromEntries(list.changes.map((c) => [c.change, c.lastRecorded]));
  for (const [name, at] of Object.entries(WANT)) assert.deepStrictEqual(by[name], { at, source: 'gates', reason: null }, name);
  for (const [name, why] of Object.entries(UNKNOWN)) assert.deepStrictEqual(by[name], { at: null, source: 'gates', reason: why }, name);
  for (const c of list.changes)
    for (const k of Object.keys(c)) {
      assert.doesNotMatch(k, /stale|idle|since|days/i, `${c.change}: no staleness field (${k})`);
      assert.doesNotMatch(k, /^age|[a-z]Age/, `${c.change}: no age field (${k})`);     // camelCase ...Age, never lineage
    }
  const err = run(['status', '--change', 'missing-one', '--json'], root);
  assert.strictEqual(err.status, 2);
  const ev = JSON.parse(err.stdout);
  assert.ok(ev.errors.length > 0);
  assert.strictEqual(ev.lastRecorded, null, 'the error view carries the key, null');
});

test('ST-41 the reader itself: dates from gates: only, range-checked, normalized, fences and comments inert', () => {
  for (const [name, at] of Object.entries(WANT)) assert.strictEqual(flow.lastRecorded(CHANGES[name]), at, name);
  assert.strictEqual(flow.lastRecorded(CHANGES.nodated), null);
  assert.strictEqual(flow.lastRecorded(CHANGES.nogates), null);
  assert.strictEqual(flow.lastRecorded(''), null);
  // an undated gates line and a date later in the entry text do not count; only the first token does
  assert.strictEqual(flow.lastRecorded(state('x', '  - note: shipped on 2026-12-01\n  - 2026-09-01T00:00 note: a\n')), '2026-09-01T00:00');
  // hour 24 / minute 60 are not readable times: the day still counts
  assert.strictEqual(flow.lastRecorded(state('x', '  - 2026-09-01T24:00 note: a\n')), '2026-09-01');
  assert.strictEqual(flow.lastRecorded(state('x', '  - 2026-09-01T10:60 note: a\n')), '2026-09-01');
  // day 00 / 32 is not a date: nothing counts
  assert.strictEqual(flow.lastRecorded(state('x', '  - 2026-09-32T10:00 note: a\n  - 2026-09-00 note: b\n')), null);
  // review round 1, finding 1: an entry whose payload sits on its continuation line is still an
  // entry of that time — the same entry the owner-decision reader joins and recognizes
  const cont = state('x', '  - 2026-09-01T09:00 note: older\n  - 2026-09-27T11:00\n    owner: evidence-accept X — reason\n');
  assert.strictEqual(flow.gatesEntries(cont)[1].payload, 'evidence-accept X — reason', 'the owner reader joins it');
  assert.strictEqual(flow.lastRecorded(cont), '2026-09-27T11:00');
  assert.strictEqual(flow.lastRecorded(state('x', '  - 2026-09-28\n')), '2026-09-28', 'a bare stamp is still a dated entry');
});

// review round 1, finding 2: the leftover-lane bundle's detail views (in flight and archived) are
// successful views, so they carry the line too — unknown (no flow-state) — beside their own messages
test('ST-42 a leftover lane bundle\'s detail view carries last recorded: unknown (no flow-state)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-slr-lane-'));
  const lane = (dir, name) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'hotfix-state.md'), `hotfix: ${name}\ndate: 2026-08-01\nkinds: doc-fix\n`); };
  lane(path.join(root, 'apriori', 'changes', 'leftover'), 'leftover');
  lane(path.join(root, 'apriori', 'changes', 'archive', '2026-08-01T0000-oldlane'), 'oldlane');
  const LINE = /^last recorded: unknown \(no flow-state\) {3}\(the latest date in this change's gates: log — self-recorded, not proof of activity\)$/m;
  const one = run(['status', '--change', 'leftover'], root);
  assert.strictEqual(one.status, 0, one.stderr);
  assert.match(one.stdout, /leftover hotfix-state\.md, no flow-state/, 'its own migration message stays');
  assert.match(one.stdout, LINE);
  const arch = run(['status', '--change', 'oldlane'], root);
  assert.strictEqual(arch.status, 0, arch.stderr);
  assert.match(arch.stdout, /archived hotfix-lane record/, 'its own history message stays');
  assert.match(arch.stdout, LINE);
  const j = JSON.parse(run(['status', '--change', 'leftover', '--json'], root).stdout);
  assert.deepStrictEqual(j.lastRecorded, { at: null, source: 'gates', reason: 'no flow-state' });
});
