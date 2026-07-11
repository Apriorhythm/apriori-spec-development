'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const c = require('../lib/check');

test('CK-01 anchor and file-link checks catch broken links', () => {
  const text = '# Title\n\nSee [x](#missing-anchor) and [y](./nope.md).\n';
  const fails = c.checkLinks('/tmp/does-not-exist', 'doc.md', text);
  assert.ok(fails.some((f) => /broken anchor #missing-anchor/.test(f)));
  assert.ok(fails.some((f) => /broken file link \.\/nope\.md/.test(f)));
  // a resolving anchor passes
  const ok = c.checkLinks('/tmp', 'doc.md', '# Real Heading\n\n[a](#real-heading)\n');
  assert.strictEqual(ok.length, 0);
});

test('CK-02 EN/CN heading alignment catches count and level drift', () => {
  const en = '# A\n## B\n## C\n';
  const cnBad = '# A\n## B\n'; // one fewer
  assert.ok(c.checkHeadingAlignment('EN', en, 'CN', cnBad).some((f) => /count mismatch/.test(f)));
  const cnLvl = '# A\n### B\n## C\n'; // level drift at #2
  assert.ok(c.checkHeadingAlignment('EN', en, 'CN', cnLvl).some((f) => /misaligned @#2/.test(f)));
  assert.strictEqual(c.checkHeadingAlignment('EN', en, 'CN', en).length, 0);
});

test('CK-03 verdict-phrase and codex-command checks catch drift', () => {
  const drift = c.checkVerdictPhrases({ 'README.md': 'output "ready to execute" here' });
  assert.ok(drift.some((f) => /ready to execute/.test(f)));
  const notInTable = c.checkVerdictPhrases({ 'README.md': 'VERDICT: made up phrase' });
  assert.ok(notInTable.some((f) => /not in table/.test(f)));
  // codex command EN/CN parity: differing flag value is caught, prompt payload ignored
  const en = 'codex exec resume -c sandbox_mode="read-only" <id> "review this"';
  const cnOk = 'codex exec resume -c sandbox_mode="read-only" <id> "评审这个"';
  assert.strictEqual(c.checkCodexCommands(en, cnOk).length, 0);
  const cnBad = 'codex exec resume -c sandbox_mode="danger" <id> "评审这个"';
  assert.ok(c.checkCodexCommands(en, cnBad).some((f) => /token mismatch/.test(f)));
  // checker 8 (ported): resume must carry -c sandbox_mode="read-only"; RUNBOOKs need `< /dev/null`
  const good = { 'RUNBOOK.md': 'codex exec resume -c sandbox_mode="read-only" <id> "x"\nrun `< /dev/null`', 'RUNBOOK_cn.md': 'codex exec resume -c sandbox_mode="read-only" <id> "x"\n用 `< /dev/null`' };
  assert.strictEqual(c.checkCodexKnownForms(good).length, 0);
  assert.ok(c.checkCodexKnownForms({ 'RUNBOOK.md': 'codex exec resume -s read-only <id> "x"\n< /dev/null' }).some((f) => /uses -s/.test(f)));
  assert.ok(c.checkCodexKnownForms({ 'RUNBOOK.md': 'codex exec resume -c sandbox_mode="read-only" <id> "x"' }).some((f) => /dev\/null/.test(f)));
});

test('CK-04 every spec scenario must carry a bindable ID', () => {
  const good = '#### Scenario: PB-01 plays\n#### Scenario: PB-02 pauses\n';
  assert.strictEqual(c.checkScenarioIds(good, 'spec.md').length, 0);
  const bad = '#### Scenario: PB-01 plays\n#### Scenario: no id here\n';
  const fails = c.checkScenarioIds(bad, 'spec.md');
  assert.strictEqual(fails.length, 1);
  assert.match(fails[0], /scenario without a bindable ID: no id here/);
  // fenced scenarios are documentation — same rule as the spec-runner (SR-13)
  const fenced = c.checkScenarioIds('```\n#### Scenario: no id fenced example\n```\n#### Scenario: PB-02 real\n', 'spec.md');
  assert.strictEqual(fenced.length, 0);
});

test('CK-05 no residual OpenSpec adapter references remain', () => {
  assert.ok(c.checkNoOpenspec('RUNBOOK.md', 'run /opsx:archive now').some((f) => /residual OpenSpec/.test(f)));
  assert.ok(c.checkNoOpenspec('RUNBOOK.md', 'paths in openspec/specs/ …').length > 0);
  assert.ok(c.checkNoOpenspec('RUNBOOK.md', 'doc/specs/ (adapter: openspec/specs/)').length > 0);
  assert.strictEqual(c.checkNoOpenspec('RUNBOOK.md', 'plain-files at apriori/specs/ only').length, 0);
});

test('CK-06 stale scaffolded runbook warns via check, never fails', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ck6-'));
  // no apriori/runbook.md → no warning
  assert.strictEqual(c.checkRunbookFreshness(root).length, 0);
  // identical runbook → no warning (specs store present so consumer checks can run)
  fs.mkdirSync(path.join(root, 'apriori', 'specs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori', 'specs', 's.md'), '#### Scenario: CK-99 x\n- THEN y\n');
  fs.copyFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), path.join(root, 'apriori', 'runbook.md'));
  assert.strictEqual(c.checkRunbookFreshness(root).length, 0);
  // diverged runbook → warning names apriori update
  fs.writeFileSync(path.join(root, 'apriori', 'runbook.md'), '# old runbook\n');
  const warns = c.checkRunbookFreshness(root);
  assert.strictEqual(warns.length, 1);
  assert.match(warns[0], /apriori update/);
  // through the CLI: warning is printed but RESULT stays PASS (nothing else fails in a bare dir)
  const r = spawnSync('node', [path.join(__dirname, '..', 'bin', 'apriori.js'), 'check'],
    { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /! .*apriori update/);
  assert.match(r.stdout, /RESULT: PASS/);
});

test('CK-07 consumer mode never runs self-checks; missing spec store is an error', () => {
  const fs2 = require('node:fs'), os2 = require('node:os'), path2 = require('node:path');
  const { spawnSync } = require('node:child_process');
  const BIN = path2.join(__dirname, '..', 'bin', 'apriori.js');
  // consumer legitimately using OpenSpec + its own README → PASS (no self-checks by default)
  const root = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'apriori-ck7-'));
  fs2.mkdirSync(path2.join(root, 'apriori', 'specs'), { recursive: true });
  fs2.writeFileSync(path2.join(root, 'apriori', 'specs', 's.md'), '#### Scenario: ZZ-01 x\n- THEN y\n');
  fs2.writeFileSync(path2.join(root, 'README.md'), '# mine\nWe use openspec/ and /opsx: every day.\n');
  const ok = spawnSync('node', [BIN, 'check'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(ok.status, 0);
  assert.match(ok.stdout, /RESULT: PASS/);
  // --self in that same dir would apply the no-openspec rule → FAIL (self mode is for the apriori repo)
  const self = spawnSync('node', [BIN, 'check', '--self'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(self.status, 1);
  assert.match(self.stdout, /residual OpenSpec/);
  // missing spec store path → ERROR exit 2, never a silent PASS
  const bare = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'apriori-ck7b-'));
  const miss = spawnSync('node', [BIN, 'check'], { cwd: bare, encoding: 'utf8' });
  assert.strictEqual(miss.status, 2);
  assert.match(miss.stderr, /does not exist/);
  assert.match(miss.stderr, /apriori init/);
});

test('CK-08 self-mode guards docs pairs; one-sided pairs fail; absent pairs skip', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  // aligned pair → PASS contribution (no docs failures)
  const mk = (files) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ck8-'));
    fs.mkdirSync(path.join(root, 'apriori/specs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apriori/specs/s.md'), '#### Scenario: XX-01 a\n- t\n');
    for (const [rel, c] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), c);
    }
    return root;
  };
  const run = (root) => require('node:child_process').spawnSync('node', [path.join(__dirname, '..', 'bin', 'apriori.js'), 'check', '--self'], { encoding: 'utf8', cwd: root });
  // both sides absent → skipped (pass)
  assert.strictEqual(run(mk({})).status, 0);
  // aligned pair → pass
  assert.strictEqual(run(mk({ 'docs/concepts.md': '## A\n', 'docs/concepts_cn.md': '## 甲\n' })).status, 0);
  // misaligned pair → fail naming it
  const mis = run(mk({ 'docs/concepts.md': '## A\n## B\n', 'docs/concepts_cn.md': '## 甲\n' }));
  assert.strictEqual(mis.status, 1);
  assert.match(mis.stdout, /concepts/);
  // one-sided pair → fail naming the missing mirror
  const one = run(mk({ 'docs/concepts.md': '## A\n' }));
  assert.strictEqual(one.status, 1);
  assert.match(one.stdout, /concepts_cn\.md/);
});

test('CK-09 links resolve from the linking file; cross-file fragments validated (self-mode)', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const mk = (files) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ck9-'));
    fs.mkdirSync(path.join(root, 'apriori/specs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apriori/specs/s.md'), '#### Scenario: XX-01 a\n- t\n');
    for (const [rel, c] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), c);
    }
    return root;
  };
  const run = (root) => require('node:child_process').spawnSync('node', [path.join(__dirname, '..', 'bin', 'apriori.js'), 'check', '--self'], { encoding: 'utf8', cwd: root });
  // docs-relative link to an existing sibling → pass
  assert.strictEqual(run(mk({
    'docs/concepts.md': 'see [x](./legacy.md)\n', 'docs/concepts_cn.md': '见 [x](./legacy.md)\n',
    'docs/legacy.md': '## L\n', 'docs/legacy_cn.md': '## 甲\n',
  })).status, 0);
  // missing sibling → fail naming the linking file
  const miss = run(mk({ 'docs/concepts.md': 'see [x](./nope.md)\n', 'docs/concepts_cn.md': '见 [x](./nope.md)\n' }));
  assert.strictEqual(miss.status, 1);
  assert.match(miss.stdout, /concepts\.md/);
  // valid cross-file fragment → pass; bad fragment → fail naming both
  assert.strictEqual(run(mk({
    'docs/concepts.md': 'see [x](./legacy.md#the-loop)\n', 'docs/concepts_cn.md': '见 [x](./legacy.md#the-loop)\n',
    'docs/legacy.md': '## The Loop\n', 'docs/legacy_cn.md': '## 环\n',
  })).status, 0);
  const badfrag = run(mk({
    'docs/concepts.md': 'see [x](./legacy.md#nope)\n', 'docs/concepts_cn.md': '见 [x](./legacy.md#nope)\n',
    'docs/legacy.md': '## The Loop\n', 'docs/legacy_cn.md': '## 环\n',
  }));
  assert.strictEqual(badfrag.status, 1);
  assert.match(badfrag.stdout, /concepts\.md/);
  assert.match(badfrag.stdout, /nope/);
});

test('CK-10 committed secrets in review evidence fail the check', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const mk = (files) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ck10-'));
    fs.mkdirSync(path.join(root, 'apriori/specs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'apriori/specs/s.md'), '#### Scenario: XX-01 a\n- t\n');
    for (const [rel, c] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), c);
    }
    return root;
  };
  const run = (root) => require('node:child_process').spawnSync('node', [path.join(__dirname, '..', 'bin', 'apriori.js'), 'check'], { encoding: 'utf8', cwd: root });
  // absent review dir → skip (pass)
  assert.strictEqual(run(mk({})).status, 0);
  // clean review dir → pass
  assert.strictEqual(run(mk({ 'apriori/changes/x/review/x-raw.txt': 'clean transcript\nsha256:abcdef' })).status, 0);
  // each class fails naming file/line/class WITHOUT echoing the value (one nested)
  const cases = [
    ['apriori/changes/a/review/a-raw.txt', 'line one\nkey=AKIA' + 'ABCDEFGHIJKLMNOP\n', /AWS/i, 'AKIA' + 'ABCDEFGHIJKLMNOP'],
    ['apriori/changes/archive/2026-01-01T0000-b/review/deep/b-raw.md', 'ghp_' + 'a'.repeat(36) + ' embedded in output\n', /GitHub/i, 'ghp_' + 'a'.repeat(36)],
    ['apriori/changes/c/review/c.txt', '-----BEGIN RSA ' + 'PRIVATE KEY-----\nMII...\n', /private.key/i, 'MII'],   // assembled at runtime — the source (and raws quoting it) never carries the full literal
  ];
  for (const [rel, content, classRe, secret] of cases) {
    const root = mk({ [rel]: content });
    const r = run(root);
    assert.strictEqual(r.status, 1, rel + r.stdout);
    assert.match(r.stdout, classRe);
    assert.match(r.stdout, new RegExp(rel.split('/').pop().replace('.', '\\.')));
    assert.match(r.stdout, /:\d+:/);                       // line number
    assert.ok(!r.stdout.includes(secret), 'secret value must never be echoed');
    assert.match(r.stdout, /sanitize|SECURITY/i);           // remedy pointer
  }
  // symlinked entry skipped with a warn (capability-guarded)
  const root = mk({ 'outside.txt': 'ghp_' + 'b'.repeat(36) });
  fs.mkdirSync(path.join(root, 'apriori/changes/s/review'), { recursive: true });
  let can = true;
  try { fs.symlinkSync(path.join(root, 'outside.txt'), path.join(root, 'apriori/changes/s/review/link-raw.txt')); } catch { can = false; }
  if (can) {
    const r = run(root);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /link-raw/);
  }
});
