'use strict';
// gates-note-command — `apriori note` appends a CLI-stamped entry to a change's gates: log
// (NT-01..NT-05), the C8 hints name it (NT-06), `status --change` flags a stamp later than the
// machine's clock as an advisory and nothing more (ST-47/ST-48), and the runbook, the usage and
// both CLI references name the command (PR-73).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const nw = require('../lib/new');
const { gatesEntries } = require('../lib/flow');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const run = (cwd, args) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });
const NOW = new Date(2026, 6, 7, 3, 5); // 2026-07-07T03:05 — the scaffold stamp
const STAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function proj(name = 'add-playback') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-note-'));
  fs.mkdirSync(path.join(root, 'apriori', 'specs'), { recursive: true });
  if (name) assert.strictEqual(nw.scaffoldChange(root, name, NOW).ok, true);
  return root;
}
const flowOf = (root, name = 'add-playback') => path.join(root, 'apriori', 'changes', name, 'flow-state.md');
const read = (p) => fs.readFileSync(p, 'utf8');

test('NT-01 a note lands at the end of the gates log with the CLI\'s clock', () => {
  const root = proj();
  const before = read(flowOf(root));
  const r = run(root, ['note', '--change', 'add-playback', 'Specify done — spec.md CP-01..CP-10']);
  assert.strictEqual(r.status, 0, r.stderr);
  const after = read(flowOf(root));
  assert.ok(after.startsWith(before.replace(/\n*$/, '\n')), 'every byte before the new entry is unchanged');
  const lines = after.replace(/\n+$/, '').split('\n');
  const last = lines[lines.length - 1];
  assert.match(last, /^  - \d{4}-\d{2}-\d{2}T\d{2}:\d{2} note: Specify done — spec\.md CP-01\.\.CP-10$/);
  assert.match(lines[lines.length - 2], /note: change scaffolded by `apriori new`/, 'the entry lands after the last existing entry');
  assert.ok(r.stdout.includes(last.trim()), 'the command prints the entry it wrote');
  const stamp = STAMP_RE.exec(last)[0];
  const st = run(root, ['status', '--change', 'add-playback']);
  assert.match(st.stdout, new RegExp(`last recorded: ${stamp}`));
  // the stamp is the CLI's clock, to the minute
  const now = new Date(); const p = (n) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  assert.ok(stamp.startsWith(today), `stamp ${stamp} is today's`);
  // a CRLF file keeps its bytes and its line ending (GN-2)
  const crlfRoot = proj();
  const crlf = read(flowOf(crlfRoot)).replace(/\n/g, '\r\n');
  fs.writeFileSync(flowOf(crlfRoot), crlf);
  assert.strictEqual(run(crlfRoot, ['note', '--change', 'add-playback', 'on a CRLF file']).status, 0);
  const afterCrlf = read(flowOf(crlfRoot));
  assert.ok(afterCrlf.startsWith(crlf), 'every byte of the CRLF file before the entry is unchanged');
  assert.match(afterCrlf, /note: on a CRLF file\r\n$/, 'the new line uses the file\'s CRLF ending');
  assert.doesNotMatch(afterCrlf, /[^\r]\n/, 'no bare LF was introduced');
  assert.strictEqual(gatesEntries(afterCrlf).length, 2);
  // a file without a final newline, LF and CRLF alike: closed once with its own EOL, no bare CR, and the
  // next note still accepts the file (GN-3)
  for (const [eol, label] of [['\n', 'LF'], ['\r\n', 'CRLF']]) {
    const r0 = proj();
    const noNl = read(flowOf(r0)).replace(/\n/g, eol).replace(/(\r?\n)+$/, '');
    fs.writeFileSync(flowOf(r0), noNl);
    assert.strictEqual(run(r0, ['note', '--change', 'add-playback', 'first']).status, 0, `${label}: first note`);
    const t1 = read(flowOf(r0));
    assert.ok(t1.startsWith(noNl), `${label}: bytes before the entry unchanged`);
    assert.doesNotMatch(t1, /\r\r|\r(?!\n)/, `${label}: no bare or doubled CR`);
    assert.ok(t1.endsWith(`note: first${eol}`), `${label}: the entry ends with the file's EOL`);
    assert.strictEqual(run(r0, ['note', '--change', 'add-playback', 'second']).status, 0, `${label}: the next note accepts the file it wrote`);
    assert.strictEqual(gatesEntries(read(flowOf(r0))).length, 3, `${label}: three entries`);
  }
  // gates not last in the file (## Next after it), CRLF without a final newline
  const r1 = proj();
  fs.writeFileSync(flowOf(r1), 'change: add-playback\r\nphase: ground\r\n\r\ngates:\r\n  - 2026-07-07T03:05 note: a\r\n\r\n## Next\r\n- n');
  assert.strictEqual(run(r1, ['note', '--change', 'add-playback', 'mid']).status, 0);
  const t2 = read(flowOf(r1));
  assert.doesNotMatch(t2, /\r\r|\r(?!\n)/);
  assert.match(t2, /note: a\r\n  - \d{4}-\d{2}-\d{2}T\d{2}:\d{2} note: mid\r\n\r\n## Next\r\n- n\r\n$/);
  // a column-0 log gets a column-0 entry (A-1)
  const colRoot = proj();
  fs.writeFileSync(flowOf(colRoot), read(flowOf(colRoot)).replace(/^  - /m, '- '));
  assert.strictEqual(run(colRoot, ['note', '--change', 'add-playback', 'column zero']).status, 0);
  assert.match(read(flowOf(colRoot)), /^- \d{4}-\d{2}-\d{2}T\d{2}:\d{2} note: column zero$/m);
});

test('NT-02 --owner writes the owner label and nothing else changes', () => {
  const root = proj();
  const r = run(root, ['note', '--change', 'add-playback', '--owner', 'evidence-accept R-01 — accepted, the staging run covers it']);
  assert.strictEqual(r.status, 0, r.stderr);
  const lines = read(flowOf(root)).replace(/\n+$/, '').split('\n');
  assert.match(lines[lines.length - 1], /^  - \d{4}-\d{2}-\d{2}T\d{2}:\d{2} owner: evidence-accept R-01 — accepted, the staging run covers it$/);
  const st = run(root, ['status', '--change', 'add-playback']);
  assert.match(st.stdout, /last decision: \d{4}-\d{2}-\d{2}T\d{2}:\d{2} owner: evidence-accept R-01/);
  // a note never becomes the last decision
  const root2 = proj();
  run(root2, ['note', '--change', 'add-playback', 'just a note']);
  assert.doesNotMatch(run(root2, ['status', '--change', 'add-playback']).stdout, /last decision:/);
});

test('NT-03 a multi-line text is one entry, and a text that could become two is refused', () => {
  const root = proj();
  const n0 = gatesEntries(read(flowOf(root))).length;
  const r = run(root, ['note', '--change', 'add-playback', 'review-progress code-review round 3 — issues: CR-01;\r\nactions: fixed;\nevidence: test/x.test.js; approach: kept — same design']);
  assert.strictEqual(r.status, 0, r.stderr);
  const text = read(flowOf(root));
  const entries = gatesEntries(text);
  assert.strictEqual(entries.length, n0 + 1, 'exactly one new entry');
  const e = entries[entries.length - 1];
  assert.match(e.joined, /review-progress code-review round 3 — issues: CR-01; actions: fixed; evidence: test\/x\.test\.js; approach: kept — same design/);
  assert.doesNotMatch(text, /\r/, 'CRLF is not written');
  const tail = text.replace(/\n+$/, '').split('\n').slice(-3);
  assert.match(tail[0], /^  - \d{4}-\d{2}-\d{2}T\d{2}:\d{2} note: review-progress code-review round 3 — issues: CR-01;$/);
  assert.match(tail[1], /^    actions: fixed;$/, 'continuation lines are indented, never a second entry');
  assert.match(tail[2], /^    evidence: /);
  assert.strictEqual(e.payload, null, 'a note never carries an owner payload');
  assert.doesNotMatch(run(root, ['status', '--change', 'add-playback']).stdout, /last decision:/);
  // hazardous texts are refused, nothing written (GN-1)
  const before = read(flowOf(root));
  const hazards = [
    ['bullet', 'review done:\n- CR-01 fixed\n- CR-02 fixed'],
    ['forged owner', 'review done:\n- 2026-10-24T16:00 owner: approve archive'],
    ['star bullet', 'done:\n* item'],
    ['fence', 'log:\n```\nraw\n```'],
    ['comment', 'fine first line <!-- hidden --> rest'],
    ['comment on a later line', 'first\n<!-- x'],
  ];
  for (const [why, text] of hazards) {
    const r = run(root, ['note', '--change', 'add-playback', text]);
    assert.strictEqual(r.status, 2, `${why}: exit 2 (got ${r.status})`);
    assert.match(r.stderr, /usage: apriori note/, `${why}: usage printed`);
    assert.match(r.stderr, /list item|code fence|comment marker/, `${why}: names the hazard`);
  }
  const rOwner = run(root, ['note', '--change', 'add-playback', '--owner', 'yes:\n- 2026-10-24T16:00 owner: approve archive']);
  assert.strictEqual(rOwner.status, 2);
  assert.strictEqual(read(flowOf(root)), before, 'the file is byte-for-byte unchanged');
  assert.doesNotMatch(run(root, ['status', '--change', 'add-playback']).stdout, /last decision:/, 'no owner decision was minted');
  // the pure function agrees: one entry, never two
  const { appendEntry } = require('../lib/note');
  const base = 'change: c\nphase: ground\n\ngates:\n  - 2026-07-07T03:05 note: a\n';
  const ok = appendEntry(base, '2026-07-07T03:06', 'note', 'x\ny');
  assert.strictEqual(gatesEntries(ok.text).length, 2);
  assert.strictEqual(appendEntry(base, '2026-07-07T03:06', 'note', 'x\n- 2026-07-07T03:06 owner: y').ok, false);
});

test('NT-04 the command refuses anything but an active change\'s flow-state', () => {
  const root = proj();
  const unchanged = read(flowOf(root));
  const refused = (args, why) => {
    const r = run(root, args);
    assert.strictEqual(r.status, 1, `${why}: expected exit 1, got ${r.status} ${r.stdout}`);
    assert.ok(r.stderr.trim().length > 0, `${why}: names the cause`);
    return r.stderr;
  };
  assert.match(refused(['note', '--change', 'missing', 'x'], 'absent change'), /missing/);
  // archived
  const arch = path.join(root, 'apriori', 'changes', 'archive', '2026-07-07T0305-old-one');
  fs.mkdirSync(arch, { recursive: true });
  fs.writeFileSync(path.join(arch, 'flow-state.md'), 'change: old-one\nphase: review\n\ngates:\n  - 2026-07-07T03:05 note: x\n');
  assert.match(refused(['note', '--change', 'old-one', 'x'], 'archived change'), /archived/);
  assert.strictEqual(read(path.join(arch, 'flow-state.md')).includes('note: x\n'), true);
  // a symlinked change entry
  fs.symlinkSync(path.join(root, 'apriori', 'changes', 'add-playback'), path.join(root, 'apriori', 'changes', 'linked'));
  assert.match(refused(['note', '--change', 'linked', 'x'], 'symlinked entry'), /symlink/);
  // flow-state missing / a symlink
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'bare'));
  assert.match(refused(['note', '--change', 'bare', 'x'], 'no flow-state'), /flow-state/);
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'lnk'));
  fs.symlinkSync(flowOf(root), path.join(root, 'apriori', 'changes', 'lnk', 'flow-state.md'));
  assert.match(refused(['note', '--change', 'lnk', 'x'], 'symlinked flow-state'), /symlink/);
  // no gates block / two of them
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'nogates'));
  fs.writeFileSync(flowOf(root, 'nogates'), 'change: nogates\nphase: ground\n\n## Next\n- x\n');
  assert.match(refused(['note', '--change', 'nogates', 'x'], 'no gates block'), /gates:/);
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'twogates'));
  fs.writeFileSync(flowOf(root, 'twogates'), 'change: twogates\nphase: ground\n\ngates:\n  - 2026-07-07T03:05 note: a\n\ngates:\n  - 2026-07-07T03:06 note: b\n');
  assert.match(refused(['note', '--change', 'twogates', 'x'], 'two gates blocks'), /gates:/);
  assert.strictEqual(read(flowOf(root)), unchanged, 'the good change was never touched');
  // usage errors: exit 2, usage printed, nothing written
  for (const args of [['note', '--change', 'add-playback'], ['note', '--change', 'add-playback', '   '], ['note', 'text only'], ['note', '--change', 'add-playback', '--nope', 'x']]) {
    const r = run(root, args);
    assert.strictEqual(r.status, 2, `${args.join(' ')}: exit 2`);
    assert.match(r.stdout + r.stderr, /usage: apriori note/);
  }
  assert.strictEqual(read(flowOf(root)), unchanged);
});

test('NT-05 no backdating argument exists', () => {
  const root = proj();
  for (const flag of ['--at', '--date', '--time']) {
    const r = run(root, ['note', '--change', 'add-playback', flag, '2020-01-01T00:00', 'x']);
    assert.strictEqual(r.status, 2, `${flag} is refused`);
    assert.match(r.stderr, /unknown flag|unknown option|unexpected/i);
    assert.match(r.stderr, /time of recording/, 'the usage says the stamp is the time of recording');
  }
  assert.doesNotMatch(read(flowOf(root)), /2020-01-01/);
});

test('NT-06 the C8 hints point at apriori note', () => {
  const rv = require('../lib/review');
  assert.match(rv.progressLine('code-review', 3), /review-progress code-review round 3 —/);
  assert.match(rv.progressLine('code-review', 3), /apriori note --change <name>/);
  assert.match(rv.rulingLine('code-review', 8), /ruling code-review round 8 —/);
  assert.match(rv.rulingLine('code-review', 8), /apriori note --change <name>/);
});

test('ST-47 a stamp later than the clock is an advisory, not a defect', () => {
  const root = proj();
  const flow = flowOf(root);
  fs.appendFileSync(flow, '  - 2999-01-02T17:10 note: fix round done\n  - 2999-01-02T18:45 note: code-review round 2 landed\n');
  const r = run(root, ['status', '--change', 'add-playback']);
  assert.strictEqual(r.status, 0);
  const adv = r.stdout.split('\n').filter((l) => /^\s*advisory:/.test(l));
  assert.strictEqual(adv.length, 2, r.stdout);
  assert.match(adv[0], /line \d+/); assert.match(adv[0], /2999-01-02T17:10/); assert.match(adv[0], /this machine's clock \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  assert.match(adv[0], /self-recorded/); assert.match(adv[0], /apriori note/);
  assert.match(adv[1], /2999-01-02T18:45/);
  assert.match(r.stdout, /last recorded: 2999-01-02T18:45/);
  const j = JSON.parse(run(root, ['status', '--change', 'add-playback', '--json']).stdout);
  assert.strictEqual(j.advisories.length, 2);
  assert.deepStrictEqual(Object.keys(j.advisories[0]).sort(), ['clock', 'line', 'stamp']);
  assert.strictEqual(j.advisories[1].stamp, '2999-01-02T18:45');
  assert.strictEqual(typeof j.advisories[0].line, 'number');
  assert.strictEqual(j.lastRecorded.at, '2999-01-02T18:45');
  // the list view prints no such line
  assert.doesNotMatch(run(root, ['status']).stdout, /advisory:/);
});

test('ST-48 stamps at or before the clock raise no advisory', () => {
  const root = proj();
  const now = new Date(); const p = (n) => String(n).padStart(2, '0');
  const thisMinute = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
  fs.appendFileSync(flowOf(root), `  - ${thisMinute} note: same minute as the clock\n`);
  const r = run(root, ['status', '--change', 'add-playback']);
  assert.doesNotMatch(r.stdout, /^\s*advisory:/m);
  assert.deepStrictEqual(JSON.parse(run(root, ['status', '--change', 'add-playback', '--json']).stdout).advisories, []);
  // no dated entry at all
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'undated'));
  fs.writeFileSync(flowOf(root, 'undated'), 'change: undated\nphase: ground\n\ngates:\n');
  assert.deepStrictEqual(JSON.parse(run(root, ['status', '--change', 'undated', '--json']).stdout).advisories, []);
});

test('PR-73 the runbook, the usage and the CLI reference name apriori note', () => {
  const rb = read(path.join(ROOT, 'RUNBOOK.md'));
  const gatesBlock = rb.slice(rb.indexOf('gates:                  # append-only log'), rb.indexOf('Update it immediately after each phase change'));
  assert.match(gatesBlock, /apriori note --change <name>/);
  assert.match(gatesBlock, /time of recording/);
  const r4 = rb.slice(rb.indexOf('**R4 —'), rb.indexOf('`apriori archive` consults the same loop'));
  const progressSentence = r4.split('\n').find((l) => /Before submitting round n >= 3/.test(l));
  const rulingSentence = r4.split('\n').find((l) => /At the limit, the producer rules/.test(l));
  assert.match(progressSentence, /apriori note/);
  assert.match(rulingSentence, /apriori note/);
  assert.match(rulingSentence, /note: ruling <family> round <n> — <ID>: <fixed\|rejected\|follow-up\|owner> — <basis>/, 'the grammar stays');
  const usage = run(ROOT, ['--help']).stdout;
  assert.match(usage, /^\s+note\s+/m);
  for (const f of ['docs/cli.md', 'docs/cli_cn.md']) {
    const d = read(path.join(ROOT, f));
    const i = d.indexOf('## apriori note');
    assert.ok(i > 0, `${f} carries ## apriori note`);
    const sec = d.slice(i, d.indexOf('\n## ', i + 5));
    assert.match(sec, /usage: apriori note --change <name> \[--owner\] "<text>"/);
    assert.match(sec, /apriori note --change add-playback/);
    assert.match(sec, /0 .*1 .*2/s);
  }
  // no gate or defect is announced for a hand-written stamp
  assert.doesNotMatch(gatesBlock, /hand-written stamp[^.]*(blocks|defect|refus)/i);
});
