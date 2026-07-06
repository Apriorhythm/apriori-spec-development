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
});

test('CK-04 every spec scenario must carry a bindable ID', () => {
  const good = '#### Scenario: PB-01 plays\n#### Scenario: PB-02 pauses\n';
  assert.strictEqual(c.checkScenarioIds(good, 'spec.md').length, 0);
  const bad = '#### Scenario: PB-01 plays\n#### Scenario: no id here\n';
  const fails = c.checkScenarioIds(bad, 'spec.md');
  assert.strictEqual(fails.length, 1);
  assert.match(fails[0], /scenario without a bindable ID: no id here/);
});

test('CK-05 no residual OpenSpec adapter references remain', () => {
  assert.ok(c.checkNoOpenspec('RUNBOOK.md', 'run /opsx:archive now').some((f) => /residual OpenSpec/.test(f)));
  assert.ok(c.checkNoOpenspec('RUNBOOK.md', 'paths in openspec/specs/ …').length > 0);
  assert.ok(c.checkNoOpenspec('RUNBOOK.md', 'doc/specs/ (adapter: openspec/specs/)').length > 0);
  assert.strictEqual(c.checkNoOpenspec('RUNBOOK.md', 'plain-files at apriori/specs/ only').length, 0);
});
