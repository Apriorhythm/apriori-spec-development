'use strict';
// batch-c-r5 — the §6 Human Operator Appendix moves OUT of both runbooks into
// docs/operator{,_cn}.md, verbatim (only the heading level adapts and one
// migration pointer is added). These tests are the rollback criterion:
// RED before the move, green after; any regression that puts §6 back into the
// shipped runbook, breaks the pointer, or edits the frozen recipe text fails here.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---- the frozen recipe sentences (matrix row: Fix Packet / budgets / escalation
// policy / command order are byte-frozen — the move may not edit them) ----------
// launch: the Build & Test /goal opening line, 25-turn bound included (was RUNBOOK.md:406)
const LAUNCH_LINE = '/goal "Goal — ALL must hold: `npm test` exits 0 (naming a test with its scenario ID is a suggestion, never mandatory); lint/static analysis green (where configured); (UI projects only) the Playwright E2E suite passes and screenshot diffs are within threshold; every ## Open item in the flow-state carries a stable id (`- <ID>: <text>`) and says what is still unverified; AND `apriori gate --change <change> --review-ready --test-cmd \\"npm test\\"` exits 0. Safety bound: 25 turns.';
// revise path: the Specify loop's revise step (was RUNBOOK.md:398)
const REVISE_LINE = "1. Revise the delta specs per the latest review — never touch source code — and update the state's ## Open section.";
// recovery path: what happens when the bound is reached (was RUNBOOK.md:408)
const RECOVERY_LINE = 'Stop when every condition holds. If turn 25 ends with any condition still unmet, STOP anyway and report the failing evidence — which conditions failed, plus the last test output. Reaching the bound is a stopped loop for the human to judge, NEVER a pass.';
// escalation policy sentence (owner decision 1)
const ESCALATION_LINE = 'Escalate the bar, never quietly lower it.';

const EN_HEADING = '## 6. Human Operator Appendix';
const CN_HEADING = '## 6. 人类操作员附录';

test('OPM-01 install view: npm pack ships the runbook without the appendix body AND the EN operator doc that carries it', () => {
  // P3 acceptance reversal: the old success condition ("docs/ is not packaged") certified the
  // installed user's LOSS of the launch / revise-reentry / bound-recovery recipes. The package
  // must ship the appendix it points at. Owner ruling: the published package is English-only;
  // the CN edition stays in-repo.
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' });
  const files = JSON.parse(out)[0].files.map((f) => f.path);
  assert.ok(files.includes('RUNBOOK.md'), 'RUNBOOK.md must be packaged');
  assert.ok(files.includes('docs/operator.md'),
    'docs/operator.md must ship with the package — a repository pointer alone strands the installed user');
  assert.ok(!files.includes('docs/operator_cn.md'),
    'owner ruling: the published package is English-only; docs/operator_cn.md stays in-repo');
  assert.deepStrictEqual(files.filter((f) => f.startsWith('docs/')), ['docs/operator.md'],
    'only the operator appendix ships from docs/ — not the whole docs tree');
  const rb = read('RUNBOOK.md');
  assert.ok(!rb.includes(EN_HEADING), 'packaged RUNBOOK.md still carries the moved appendix heading');
  assert.ok(!rb.includes('Safety bound: 25 turns'), 'packaged RUNBOOK.md still carries the recipe body');
  assert.ok(rb.includes('docs/operator.md'), 'packaged RUNBOOK.md lacks the docs/operator.md pointer');
  assert.ok(rb.includes('node_modules/apriori-cli/docs/operator.md'),
    'the runbook pointer gives no executable local read path for an installed user');
});

test('OPM-07 delivery proof: pack → unpack → install → init — all three recipes readable from the installed copy', () => {
  // The predicate the P3 audit ran by hand, frozen as a test: a REAL tarball (no dry-run), the
  // package unpacked as a local install, a project initialized from the INSTALLED bin, and the
  // launch / revise-reentry / bound-recovery paths read IN FULL from the installed copy at the
  // path the delivered runbook names.
  const tmpd = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-opm7-'));
  try {
    const out = execFileSync('npm', ['pack', '--json', '--pack-destination', tmpd],
      { cwd: ROOT, encoding: 'utf8' });
    const tarball = path.join(tmpd, JSON.parse(out)[0].filename);
    execFileSync('tar', ['-xzf', tarball, '-C', tmpd]);
    const pkg = path.join(tmpd, 'package');
    // the packaged operator doc is the repo's, byte for byte
    assert.strictEqual(fs.readFileSync(path.join(pkg, 'docs', 'operator.md'), 'utf8'),
      read('docs/operator.md'), 'the packaged operator.md drifted from the repository copy');
    // simulate the local install and run init FROM the installed copy
    const proj = path.join(tmpd, 'proj');
    const installed = path.join(proj, 'node_modules', 'apriori-cli');
    fs.mkdirSync(path.dirname(installed), { recursive: true });
    fs.cpSync(pkg, installed, { recursive: true });
    execFileSync('node', [path.join(installed, 'bin', 'apriori.js'), 'init', '--tools', 'claude', '--yes'],
      { cwd: proj, encoding: 'utf8' });
    const rb = fs.readFileSync(path.join(proj, 'apriori', 'runbook.md'), 'utf8');
    assert.ok(rb.includes('node_modules/apriori-cli/docs/operator.md'),
      'the delivered project runbook names no executable local path to the operator doc');
    // follow the named path: the three recipes must be there in full
    const op = fs.readFileSync(path.join(proj, 'node_modules', 'apriori-cli', 'docs', 'operator.md'), 'utf8');
    for (const [name, line] of [['launch', LAUNCH_LINE], ['revise re-entry', REVISE_LINE],
      ['bound recovery', RECOVERY_LINE], ['escalation policy', ESCALATION_LINE]])
      assert.ok(op.includes(line), `the ${name} recipe is not readable from the installed copy`);
    assert.strictEqual(op, read('docs/operator.md'), 'the installed operator.md drifted from the repository copy');
  } finally {
    fs.rmSync(tmpd, { recursive: true, force: true });
  }
});

test('OPM-02 update-copied runbook syncs: the refreshed apriori/runbook.md carries pointer, not §6', () => {
  const init = require('../lib/init');
  const update = require('../lib/update');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-opm-'));
  try {
    init.scaffold(root, ['claude']);
    // age the runbook the way a previous CLI would have left it, manifest recording the aged bytes
    const rbPath = path.join(root, 'apriori', 'runbook.md');
    fs.writeFileSync(rbPath, '# old runbook\n\n## 6. Human Operator Appendix\nold body\n');
    const crypto = require('node:crypto');
    const sha = 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(rbPath)).digest('hex');
    fs.writeFileSync(path.join(root, 'apriori', 'managed.json'),
      JSON.stringify({ version: 1, files: { 'apriori/runbook.md': sha } }, null, 2) + '\n');
    update.run(root);
    const copied = fs.readFileSync(rbPath, 'utf8');
    assert.strictEqual(copied, read('RUNBOOK.md'), 'update must copy the package RUNBOOK.md byte-identically');
    assert.ok(!copied.includes(EN_HEADING), 'refreshed project runbook still carries §6');
    assert.ok(copied.includes('docs/operator.md'), 'refreshed project runbook lacks the pointer');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('OPM-03 docs/operator.md keeps the launch / revise / recovery sentences byte-for-byte', () => {
  const op = read('docs/operator.md');
  assert.ok(op.includes(LAUNCH_LINE), 'launch recipe line (25-turn bound) not verbatim in docs/operator.md');
  assert.ok(op.includes(REVISE_LINE), 'revise-path line not verbatim in docs/operator.md');
  assert.ok(op.includes(RECOVERY_LINE), 'recovery-path line not verbatim in docs/operator.md');
  assert.ok(op.includes(ESCALATION_LINE), 'escalation policy sentence not verbatim in docs/operator.md');
  // full-text strength (P3): not just sentences — the doc carries exactly the three complete
  // fenced recipe blocks (Specify / Build & Test / Review & Deliver), each with its /goal body
  const blocks = op.match(/```text\n[\s\S]*?```/g) || [];
  assert.strictEqual(blocks.length, 3, `docs/operator.md must carry exactly the three recipe blocks, found ${blocks.length}`);
  for (const b of blocks) assert.ok(b.includes('/goal "Goal'), 'a recipe block lost its /goal body');
  assert.ok(blocks[1].includes(LAUNCH_LINE) && blocks[1].includes(RECOVERY_LINE),
    'the Build & Test block no longer carries launch + recovery in one recipe');
});

test('OPM-04 docs/operator_cn.md keeps the same frozen recipe text (recipes stay English verbatim)', () => {
  const op = read('docs/operator_cn.md');
  assert.ok(op.includes(LAUNCH_LINE), 'launch recipe line not verbatim in docs/operator_cn.md');
  assert.ok(op.includes(REVISE_LINE), 'revise-path line not verbatim in docs/operator_cn.md');
  assert.ok(op.includes(RECOVERY_LINE), 'recovery-path line not verbatim in docs/operator_cn.md');
  assert.ok(op.includes('人类操作员附录'), 'CN operator doc lost its CN title');
  // two-edition full-text oracle (P3): every complete EN recipe block appears byte-identically
  // in the CN edition — the editions cannot drift a recipe apart
  const en = read('docs/operator.md');
  const blocks = en.match(/```text\n[\s\S]*?```/g) || [];
  assert.strictEqual(blocks.length, 3);
  for (const b of blocks)
    assert.ok(op.includes(b), `a full EN recipe block is not verbatim in the CN edition: ${b.slice(0, 60)}…`);
});

test('OPM-05 both runbooks: §6 body gone, pointer present, §0-§5 untouched anchors stay', () => {
  const en = read('RUNBOOK.md');
  const cn = read('RUNBOOK_cn.md');
  for (const [name, text, heading] of [['RUNBOOK.md', en, EN_HEADING], ['RUNBOOK_cn.md', cn, CN_HEADING]]) {
    assert.ok(!text.includes(heading), `${name} still carries the §6 heading`);
    assert.ok(!text.includes('Safety bound: 25 turns'), `${name} still carries the recipe body`);
    assert.ok(!/§6/.test(text), `${name} still references §6 — internal refs must re-point to docs/operator`);
    // what must NOT move: §0's Fix Packet rule and §1 R2's non-interactive codex guidance
    assert.ok(text.includes('Fix Packet'), `${name} lost the §0 Fix Packet rule`);
    assert.ok(text.includes('< /dev/null'), `${name} lost the < /dev/null guidance`);
  }
  assert.ok(en.includes('docs/operator.md'), 'RUNBOOK.md lacks the operator pointer');
  assert.ok(cn.includes('docs/operator_cn.md'), 'RUNBOOK_cn.md lacks the operator pointer');
  // both editions name an executable install-side read path, not just a repository location
  assert.ok(en.includes('node_modules/apriori-cli/docs/operator.md'),
    'RUNBOOK.md gives no executable local read path for the shipped operator doc');
  assert.ok(cn.includes('node_modules/apriori-cli/docs/operator.md'),
    'RUNBOOK_cn.md gives no executable local read path for the shipped operator doc');
});

test('OPM-06 outside references re-point: concepts EN/CN name operator.md, not runbook §6', () => {
  const en = read('docs/concepts.md');
  const cn = read('docs/concepts_cn.md');
  assert.ok(!/RUNBOOK(_cn)?\.md\)?\s*§6/.test(en), 'docs/concepts.md still points recipes at RUNBOOK §6');
  assert.ok(!/RUNBOOK(_cn)?\.md\)?\s*§6/.test(cn), 'docs/concepts_cn.md still points recipes at RUNBOOK §6');
  assert.ok(en.includes('./operator.md'), 'docs/concepts.md does not link ./operator.md');
  assert.ok(cn.includes('./operator_cn.md'), 'docs/concepts_cn.md does not link ./operator_cn.md');
});
