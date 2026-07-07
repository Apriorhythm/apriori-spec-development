'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const init = require('../lib/init');
const update = require('../lib/update');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-up-')); }
const PKG_RUNBOOK = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), 'utf8');
const PKG_COMMAND = fs.readFileSync(path.join(__dirname, '..', 'templates', 'command.md'), 'utf8');

// scaffold a claude-configured project, then age some tool-owned files
function agedProject() {
  const root = tmp();
  init.scaffold(root, ['claude']);
  fs.writeFileSync(path.join(root, 'apriori', 'runbook.md'), '# old runbook from a previous CLI version\n');
  fs.writeFileSync(path.join(root, '.claude', 'commands', 'apriori.md'), 'old command body\n');
  return root;
}

test('UP-01 refreshes the runbook copy and existing command files', () => {
  const root = agedProject();
  const { actions } = update.run(root);
  const byFile = Object.fromEntries(actions.map((a) => [a.file, a.action]));
  assert.strictEqual(byFile['apriori/runbook.md'], 'updated');
  assert.strictEqual(byFile['.claude/commands/apriori.md'], 'updated');
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', 'runbook.md'), 'utf8'), PKG_RUNBOOK);
  assert.strictEqual(fs.readFileSync(path.join(root, '.claude', 'commands', 'apriori.md'), 'utf8'), PKG_COMMAND);
  // second run: everything up-to-date
  for (const a of update.run(root).actions) assert.strictEqual(a.action, 'up-to-date');
});

test('UP-02 user-owned files are never touched, nothing new is created', () => {
  const root = agedProject();
  const cfgPath = path.join(root, 'apriori', 'process-config.md');
  fs.writeFileSync(cfgPath, '| language | 中文 |  # human-held, hands off\n');
  const rulesPath = path.join(root, 'CLAUDE.md');
  const rulesBefore = fs.readFileSync(rulesPath, 'utf8');
  // one user-owned file in every protected surface the scenario names
  const owned = {
    'apriori/specs/kv.md': '#### Scenario: KV-01 x\n',
    'apriori/changes/add-x/flow-state.md': '| step | STEP2 |\n',
    'apriori/review/add-x-issues.md': '| I1 | open |\n',
    'apriori/truth/kv.md': 'KB fact\n',
  };
  for (const [rel, body] of Object.entries(owned)) {
    const p = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  const { actions } = update.run(root);
  assert.strictEqual(fs.readFileSync(cfgPath, 'utf8'), '| language | 中文 |  # human-held, hands off\n');
  assert.strictEqual(fs.readFileSync(rulesPath, 'utf8'), rulesBefore);
  for (const [rel, body] of Object.entries(owned))
    assert.strictEqual(fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8'), body);
  // only the runbook copy + the one existing command file appear; no other tool's command was created
  assert.deepStrictEqual(actions.map((a) => a.file).sort(), ['.claude/commands/apriori.md', 'apriori/runbook.md']);
  assert.ok(!fs.existsSync(path.join(root, '.codex')));
});

test('UP-03 uninitialized project errors naming apriori init', () => {
  const root = tmp();
  assert.throws(() => update.run(root), /apriori init/);
});

test('UP-04 --dry-run previews without writing', () => {
  const root = agedProject();
  // through the CLI, as the scenario states: reports what would be refreshed, writes nothing
  const { spawnSync } = require('node:child_process');
  const r = spawnSync('node', [path.join(__dirname, '..', 'bin', 'apriori.js'), 'update', '--dry-run'],
    { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /apriori\/runbook\.md\s+\(updated\)/);
  assert.match(r.stdout, /would be refreshed/);
  // both stale tool-owned files are untouched
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', 'runbook.md'), 'utf8'),
    '# old runbook from a previous CLI version\n');
  assert.strictEqual(fs.readFileSync(path.join(root, '.claude', 'commands', 'apriori.md'), 'utf8'),
    'old command body\n');
});
