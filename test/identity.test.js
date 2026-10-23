'use strict';
// ID-01..ID-06 — version identity (6.0.0, release-6-0-0), install-time links, the 6.2-stage migration record (6.2 batch A-9).
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

test('ID-01 in the packed directory, --version, the runbook header, the installed copy and update\'s target agree', () => {
  assert.strictEqual(pkg.version, '6.0.0', 'release-6-0-0: the 6 line\'s release identity');
  const dir = packedDir();
  const v = runPacked(['--version'], dir);
  assert.strictEqual(v.stdout.trim(), pkg.version);
  const packedRunbook = fs.readFileSync(path.join(dir, 'RUNBOOK.md'), 'utf8');
  assert.strictEqual(header(packedRunbook), majorMinor(pkg.version), 'the packed runbook header is the CLI major.minor');
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
});

test('ID-03 MIGRATING.md carries ONE 6.2-stage section, and it lists every 6.2 change', () => {
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

test('ID-04 CHANGELOG "6.2 code layer" (a subsection of 6.0.0) records batch A, item by item', () => {
  const t = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const start = t.indexOf('### 6.2 code layer');
  assert.ok(start >= 0);
  const section = t.slice(start, t.indexOf('\n### ', start + 1));
  for (const id of ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9'])
    assert.match(section, new RegExp(`Batch ${id} —`), id);
});

test('ID-05 the runbook finer-behavior pointer names files that actually carry the keywords (SUB-18)', () => {
  // the header claimed verdict parsing / the CAS algorithm / verify's diagnostic classes live in
  // docs/concepts.md — none of those keywords exist there ("CAS" has zero hits). The real home
  // is the CLI reference. Pin the pointer on files that carry what they are pointed at for.
  const en = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
  const enHead = en.slice(0, en.search(/^## /m));
  assert.match(enHead, /the tool's finer behavior \(verdict parsing, the CAS algorithm, verify's diagnostic classes\) is in that repository's `docs\/cli\.md` \(the CLI reference\) and `docs\/troubleshooting\.md`/);
  assert.doesNotMatch(enHead, /is in that `docs\/concepts\.md`/);
  // the two body pointers of the same class follow the same fix
  assert.match(en, /The merge report, the single-file `--store\/--delta` form and conflict details are in the CLI reference \(`docs\/cli\.md`, archive\)\./);
  assert.match(en, /The diagnostic classes are detailed in the CLI reference \(`docs\/cli\.md`, verify\)\./);
  // and the pointed-at files really carry the keywords the pointer promises
  const cli = fs.readFileSync(path.join(ROOT, 'docs', 'cli.md'), 'utf8');
  for (const kw of [/CAS/, /verdict/i, /UNBOUND/, /ORPHAN/]) assert.match(cli, kw);
  const concepts = fs.readFileSync(path.join(ROOT, 'docs', 'concepts.md'), 'utf8');
  assert.doesNotMatch(concepts, /\bCAS\b/, 'concepts still has no CAS content — the old pointer must not return');
});

test('ID-06 6.0.0 is the release identity everywhere a reader meets it (release-6-0-0)', () => {
  assert.strictEqual(pkg.version, '6.0.0');
  assert.strictEqual(header(fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8')), '6.0');
  // CHANGELOG: the release is the first h2, 5.0.0 the next; every entry of the line is a subsection
  const cl = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const h2 = cl.match(/^## .*$/gm);
  assert.match(h2[0], /^## 6\.0\.0 — 2026-10-23/, h2[0]);
  assert.match(h2[1], /^## 5\.0\.0 — /, `the h2 after 6.0.0 must be 5.0.0, got: ${h2[1]}`);
  assert.doesNotMatch(cl.slice(0, cl.indexOf(h2[1])), /^## Unreleased/m);
  // MIGRATING: the opening names the release; no section is labelled (Unreleased)
  const mig = fs.readFileSync(path.join(ROOT, 'MIGRATING.md'), 'utf8');
  assert.match(mig.slice(0, mig.search(/^## /m)), /6\.0\.0 is the first release of the 6 line/);
  assert.doesNotMatch(mig, /\(Unreleased\)/);
  // no runtime message names the retired working stage: scan lib/ and bin/ with comments stripped
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/[^'"`\n]*$/gm, '');
  const offenders = [];
  for (const dir of ['lib', 'bin']) for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (!f.endsWith('.js')) continue;
    const src = strip(fs.readFileSync(path.join(ROOT, dir, f), 'utf8'));
    const m = src.match(/^.*\b6\.2\b.*$/gm);
    if (m) offenders.push(`${dir}/${f}: ${m[0].trim().slice(0, 100)}`);
  }
  assert.deepStrictEqual(offenders, [], 'a runtime string still names 6.2');
  const gateSrc = fs.readFileSync(path.join(ROOT, 'lib', 'gate.js'), 'utf8');
  assert.ok(gateSrc.includes("'retired in 6.0 — nothing is read'"));
  assert.ok(gateSrc.includes("'ledger retired in 6.0 — open items live in ## Open'"));
});

test('ID-07 every install line a reader meets installs the published package (release-tag-6-0-0)', () => {
  const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
  const readme = read('README.md'), readmeCn = read('README_cn.md'), rb = read('RUNBOOK.md'), ci = read('docs', 'ci.md'), ciCn = read('docs', 'ci_cn.md');
  assert.match(readme, /^npm i -g apriori-cli$/m, 'README Quickstart block');
  assert.match(readme, /Install once \(`npm i -g apriori-cli`\)/, 'README install line');
  assert.match(readmeCn, /^npm i -g apriori-cli$/m); assert.match(readmeCn, /`npm i -g apriori-cli`/);
  assert.match(rb.slice(0, rb.search(/^## 1\b/m)), /^npm i -g apriori-cli\b/m, 'RUNBOOK §0');
  for (const [label, text] of [['ci', ci], ['ci_cn', ciCn]]) assert.match(text, /npm i -g apriori-cli@6\b/, `${label} pins the major`);
  const files = ['README.md', 'README_cn.md', 'RUNBOOK.md', 'MIGRATING.md'];
  for (const dir of ['docs', 'guides', 'templates']) for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.md')) files.push(path.join(dir, f));
  for (const f of files) {
    const text = read(f);
    assert.doesNotMatch(text, /github:Apriorhythm\/apriori-spec-development/, `${f}: repository install form`);
    assert.doesNotMatch(text, /#v6-dev\b/, `${f}: branch pin`);
  }
});
