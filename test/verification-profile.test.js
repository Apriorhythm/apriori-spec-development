'use strict';
// hotfix-lane T1 — verification-profile is a human-owned project declaration (CF-13..CF-17).
// The reader lives in lib/config.js next to resolveIdPattern: same problem channel, same
// consumption-time surfacing, and an ABSENT row means undeclared — never a silent default.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveVerificationProfile, parseConfig } = require('../lib/config.js');

function repo(rows) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vprofile-'));
  fs.mkdirSync(path.join(dir, 'apriori'), { recursive: true });
  if (rows !== null) {
    const body = ['# process-config', '', '| Field | Value | Legal range | Default |', '|---|---|---|---|', ...rows, ''].join('\n');
    fs.writeFileSync(path.join(dir, 'apriori', 'process-config.md'), body);
  }
  return dir;
}

test('CF-13 absent, empty and `none` all mean nothing escalates', () => {
  // row absent from an otherwise healthy config
  const withRows = repo(['| cas | required | required/optional | required |']);
  const a = resolveVerificationProfile(withRows);
  assert.deepStrictEqual({ profile: a.profile, origin: a.origin, problem: a.problem }, { profile: null, origin: 'absent', problem: null });

  // no config file at all
  const bare = repo(null);
  const b = resolveVerificationProfile(bare);
  assert.deepStrictEqual({ profile: b.profile, origin: b.origin, problem: b.problem }, { profile: null, origin: 'absent', problem: null });

  // an empty value cell — the shared parser skips empty-valued rows for EVERY key, so it is
  // indistinguishable from absent (state A behavior, deliberately not special-cased here)
  const empty = repo(['| verification-profile |  | ui/backend/fullstack/docs/none | (absent) |']);
  const e = resolveVerificationProfile(empty);
  assert.deepStrictEqual({ profile: e.profile, origin: e.origin, problem: e.problem }, { profile: null, origin: 'absent', problem: null });

  // an explicit `none` declaration
  const none = repo(['| verification-profile | none | ui/backend/fullstack/docs/none | (absent) |']);
  const n = resolveVerificationProfile(none);
  assert.deepStrictEqual({ profile: n.profile, origin: n.origin, problem: n.problem }, { profile: null, origin: 'none', problem: null });
});

test('CF-14 the four declared values resolve with config origin', () => {
  for (const v of ['ui', 'backend', 'fullstack', 'docs']) {
    const dir = repo([`| verification-profile | ${v} | ui/backend/fullstack/docs | (absent) |`]);
    const r = resolveVerificationProfile(dir);
    assert.deepStrictEqual({ profile: r.profile, origin: r.origin, problem: r.problem }, { profile: v, origin: 'config', problem: null }, v);
  }
  // incidental surrounding whitespace in the cell is trimmed
  const spaced = repo(['| verification-profile |    ui    | ui/backend/fullstack/docs | (absent) |']);
  assert.strictEqual(resolveVerificationProfile(spaced).profile, 'ui');
});

test('CF-15 an unknown non-empty value is a consumption-time problem', () => {
  for (const bad of ['UI', 'mobile']) {
    const dir = repo([`| verification-profile | ${bad} | ui/backend/fullstack/docs | (absent) |`]);
    let r;
    assert.doesNotThrow(() => { r = resolveVerificationProfile(dir); }, `no throw for '${bad}'`);
    assert.strictEqual(r.profile, null, `no profile for '${bad}'`);
    assert.match(r.problem, /verification-profile/, `problem names the row for '${bad}'`);
    assert.match(r.problem, /ui, backend, fullstack, docs, none/, `problem names the legal set for '${bad}'`);
    assert.ok(r.problem.includes(bad), `problem quotes the offending value '${bad}'`);
  }
  // control characters are sanitized and the message stays bounded
  const nasty = repo([`| verification-profile | ${'x'.repeat(60)} | ui/backend/fullstack/docs | (absent) |`]);
  const r = resolveVerificationProfile(nasty);
  assert.strictEqual(r.profile, null);
  assert.ok(!/[\x00-\x1f\x7f]/.test(r.problem), 'no raw control chars in the problem');
  assert.ok(r.problem.length <= 200, `problem bounded, got ${r.problem.length}`);
});

test('CF-16 config-level failures surface through the same channel', () => {
  // unreadable config (a directory where the file belongs)
  const unreadable = repo(null);
  fs.mkdirSync(path.join(unreadable, 'apriori', 'process-config.md'));
  const u = resolveVerificationProfile(unreadable);
  assert.strictEqual(u.profile, null);
  assert.match(u.problem, /process-config/);

  // conflicting rows
  const conflict = repo([
    '| verification-profile | ui | ui/backend/fullstack/docs | (absent) |',
    '| verification-profile | backend | ui/backend/fullstack/docs | (absent) |',
  ]);
  const c = resolveVerificationProfile(conflict);
  assert.strictEqual(c.profile, null);
  assert.match(c.problem, /conflicting 'verification-profile' rows/);
});

test('CF-17 the template ships the row as `none`, never as an escalating value', () => {
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'templates', 'process-config.md'), 'utf8');
  const { values } = parseConfig(tpl);
  assert.ok(values.has('verification-profile'), 'template carries the row');

  assert.strictEqual(values.get('verification-profile'), 'none', 'template ships the inert value');

  const row = tpl.split('\n').find((l) => l.startsWith('| verification-profile |'));
  assert.ok(row, 'row present as a live table row');
  const cells = row.split('|').map((c) => c.trim());
  const [, , , legal, dflt] = cells;
  for (const v of ['ui', 'backend', 'fullstack', 'docs', 'none']) assert.ok(legal.includes(v), `legal range lists ${v}`);
  assert.match(dflt, /absent/, 'default cell states the absent case');
  assert.match(dflt, /nothing escalates/, 'default cell says nothing escalates');

  // a project copying the template verbatim escalates nothing
  const dir = repo([row]);
  const r = resolveVerificationProfile(dir);
  assert.deepStrictEqual({ profile: r.profile, problem: r.problem }, { profile: null, problem: null }, 'verbatim copy is inert');

  // the whole table still parses end to end (structure, not only a grep)
  for (const key of ['language', 'id-pattern', 'cas', 'verification-profile']) {
    assert.ok(values.has(key), `table parses end-to-end: ${key} still readable`);
  }
});
