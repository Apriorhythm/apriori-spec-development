'use strict';
// ID-01..ID-04 — version identity, install-time links, the 6.2 migration record (6.2 batch A-9).
//
// Astra P9/P15, R8: the package said 5.0.0 while the branch spoke 6.2; the copied runbook linked
// files that are not beside it; the migration record was spread over slices. Pinned here on the
// PACKED artifact — what `npm i -g apriori-cli` would actually install — not on the checkout.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const majorMinor = (v) => { const m = /^(\d+)\.(\d+)/.exec(v); return `${m[1]}.${m[2]}`; };
const header = (text) => { const h2 = text.search(/^##\s/m); const m = /^>\s*`runbook-version:\s*([^`]*)`/m.exec(h2 >= 0 ? text.slice(0, h2) : text); return m ? m[1].trim() : null; };

// pack once, extract once, share across the tests of this file
let packed = null;
function packedDir() {
  if (packed) return packed;
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-pack-'));
  const p = spawnSync('npm', ['pack', '--silent', '--pack-destination', dest], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(p.status, 0, p.stdout + p.stderr);
  const tarball = fs.readdirSync(dest).find((f) => f.endsWith('.tgz'));
  assert.ok(tarball, 'npm pack produced a tarball');
  const x = spawnSync('tar', ['-xzf', path.join(dest, tarball), '-C', dest], { encoding: 'utf8' });
  assert.strictEqual(x.status, 0, x.stderr);
  packed = path.join(dest, 'package');
  return packed;
}
const runPacked = (args, cwd) => spawnSync('node', [path.join(packedDir(), 'bin', 'apriori.js'), ...args], { encoding: 'utf8', cwd });

test('ID-01 in the packed directory, --version, both runbook headers, the installed copy and update\'s target agree', () => {
  assert.strictEqual(pkg.version, '6.2.0-rc.0', 'batch B set the 6.x pre-release identity');
  const dir = packedDir();
  const v = runPacked(['--version'], dir);
  assert.strictEqual(v.stdout.trim(), pkg.version);
  const packedRunbook = fs.readFileSync(path.join(dir, 'RUNBOOK.md'), 'utf8');
  assert.strictEqual(header(packedRunbook), majorMinor(pkg.version), 'the packed runbook header is the CLI major.minor');
  assert.strictEqual(header(fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8')), majorMinor(pkg.version), 'the CN edition carries the same header');
  assert.strictEqual(packedRunbook, fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8'), 'the packed runbook is the source runbook');
  assert.ok(fs.existsSync(path.join(dir, 'MIGRATING.md')), 'the migration record ships');
  // a fresh project, initialised from the PACKED bin: the copied runbook is the packed one, byte for byte
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-packproj-'));
  const i = runPacked(['init', '--tools', 'claude', '--yes'], proj);
  assert.strictEqual(i.status, 0, i.stdout + i.stderr);
  assert.strictEqual(fs.readFileSync(path.join(proj, 'apriori', 'runbook.md'), 'utf8'), packedRunbook);
  // and `update` from the same bin has nothing to refresh — its target is that same file
  const u = runPacked(['update'], proj);
  assert.strictEqual(u.status, 0, u.stdout + u.stderr);
  assert.match(u.stdout, /apriori\/runbook\.md {2}\(up-to-date\)/);
  assert.match(u.stdout, new RegExp(`everything already matches apriori-cli ${pkg.version.replace(/\\./g, '\\\\.')}`));
  // CK-11 (major.minor) holds on the packed tree too
  const c = runPacked(['check', '--self'], dir);
  assert.doesNotMatch(c.stdout, /CK-11/, c.stdout);
});

test('ID-02 the INSTALLED runbook copy links nothing as if it were beside it', () => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-packlinks-'));
  assert.strictEqual(runPacked(['init', '--tools', 'claude', '--yes'], proj).status, 0);
  const installed = fs.readFileSync(path.join(proj, 'apriori', 'runbook.md'), 'utf8');
  assert.doesNotMatch(installed, /\]\(\.\.?\//, 'no relative markdown link — README.md and docs/ are not next to the copy');
  assert.doesNotMatch(installed, /\.\/README\.md|\.\/docs\/concepts\.md/);
  assert.match(installed, /`README\.md` and `docs\/concepts\.md` in the apriori-cli repository \(not necessarily beside this copy\)/);
  // the CN edition (not copied by init, but shipped in the repo) keeps the same discipline
  const cn = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');
  assert.doesNotMatch(cn, /\]\(\.\.?\//);
});

test('ID-03 MIGRATING.md carries ONE 6.2 section, and it lists every 6.2 change', () => {
  // fenced examples are not headings (the section's own `## Open` sample would end it early)
  const t = fs.readFileSync(path.join(ROOT, 'MIGRATING.md'), 'utf8').replace(/```[\s\S]*?```/g, '');
  const heads = t.match(/^## 6\.2\b.*$/gm) || [];
  assert.strictEqual(heads.length, 1, `one 6.2 section, got: ${heads.join(' | ')}`);
  const section = t.slice(t.indexOf(heads[0]), t.indexOf('\n## ', t.indexOf(heads[0]) + 1));
  for (const [what, re] of [
    ['Open + evidence-accept', /`## Open`[^\n]*`evidence-accept/],
    ['ledger retirement + migration gate', /issue ledger[^\n]*migration gate|migration gate[^\n]*ledger/i],
    ['escalation: retirement + migration', /`escalation:` is retired/],
    ['mode inert', /`mode:` is optional and inert/],
    ['review-ready items', /`--review-ready` has two items/],
    ['parser subset', /one Markdown subset/],
    ['init --test-cmd fix', /`init --test-cmd` persists the command byte-for-byte/],
    ['JSON envelopes', /`--json` envelopes are fixed/],
    ['docs-only sentence removed', /docs-only[^\n]*(removed|gone|deleted)/i],
    ['the index', /\*\*In this section:\*\*/],
  ]) assert.match(section, re, `6.2 section names: ${what}`);
});

test('ID-04 CHANGELOG "Unreleased — 6.2" records batch A, item by item', () => {
  const t = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const start = t.indexOf('## Unreleased — 6.2');
  assert.ok(start >= 0);
  const section = t.slice(start, t.indexOf('\n## ', start + 1));
  for (const id of ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9'])
    assert.match(section, new RegExp(`Batch ${id} —`), id);
});
