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

const crypto = require('node:crypto');
const sha = (buf) => 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
const shaFile = (p) => sha(fs.readFileSync(p));
function writeManifest(root, files) {
  fs.writeFileSync(path.join(root, 'apriori', 'managed.json'),
    JSON.stringify({ version: 1, files }, null, 2) + '\n');
}

// scaffold a claude-configured project, then age some tool-owned files.
// The manifest records the AGED bytes — exactly what an older CLI would have
// written and recorded — so update sees tool-owned-and-unmodified files.
function agedProject() {
  const root = tmp();
  init.scaffold(root, ['claude']);
  fs.writeFileSync(path.join(root, 'apriori', 'runbook.md'), '# old runbook from a previous CLI version\n');
  fs.writeFileSync(path.join(root, '.claude', 'commands', 'apriori.md'), 'old command body\n');
  writeManifest(root, {
    'apriori/runbook.md': shaFile(path.join(root, 'apriori', 'runbook.md')),
    '.claude/commands/apriori.md': shaFile(path.join(root, '.claude', 'commands', 'apriori.md')),
  });
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
    'apriori/changes/add-x/review/issues.md': '| I1 | open |\n',
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

test('UP-05 protocol-required scaffolding is re-established', () => {
  // a project initialized before the gitignored scratch dir existed
  const root = agedProject();
  fs.rmSync(path.join(root, 'apriori', '.gitignore'), { force: true });
  fs.rmSync(path.join(root, 'apriori', 'tmp'), { recursive: true, force: true });
  const { actions } = update.run(root);
  assert.ok(actions.some((a) => a.file === 'apriori/.gitignore' && a.action === 'created'));
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', '.gitignore'), 'utf8'), 'tmp/\n');
  assert.ok(fs.statSync(path.join(root, 'apriori', 'tmp')).isDirectory());
  // an existing (customized) .gitignore is never modified
  fs.writeFileSync(path.join(root, 'apriori', '.gitignore'), 'tmp/\ncustom/\n');
  const again = update.run(root);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', '.gitignore'), 'utf8'), 'tmp/\ncustom/\n');
  assert.ok(!again.actions.some((a) => a.file === 'apriori/.gitignore'));
});

// ---- update-manifest (UP-06..11): update refreshes only manifest-proven files ----

test('UP-06 a foreign file at a tool path survives update', () => {
  const root = agedProject();
  const foreign = path.join(root, '.codex', 'prompts', 'apriori.md');
  fs.mkdirSync(path.dirname(foreign), { recursive: true });
  fs.writeFileSync(foreign, 'my own prompt, hands off\n');
  const { actions } = update.run(root);
  const row = actions.find((a) => a.file === '.codex/prompts/apriori.md');
  assert.ok(row && /unmanaged/.test(row.action), JSON.stringify(actions));
  assert.strictEqual(fs.readFileSync(foreign, 'utf8'), 'my own prompt, hands off\n');
});

test('UP-07 an unmodified managed file refreshes and re-hashes', () => {
  const root = agedProject();
  const { actions } = update.run(root);
  const byFile = Object.fromEntries(actions.map((a) => [a.file, a.action]));
  assert.strictEqual(byFile['.claude/commands/apriori.md'], 'updated');
  assert.strictEqual(fs.readFileSync(path.join(root, '.claude', 'commands', 'apriori.md'), 'utf8'), PKG_COMMAND);
  const m = JSON.parse(fs.readFileSync(path.join(root, 'apriori', 'managed.json'), 'utf8'));
  assert.strictEqual(m.files['.claude/commands/apriori.md'],
    shaFile(path.join(__dirname, '..', 'templates', 'command.md')));
  assert.strictEqual(m.files['apriori/runbook.md'], shaFile(path.join(__dirname, '..', 'RUNBOOK.md')));
});

test('UP-08 a locally modified managed file is protected', () => {
  const root = agedProject();
  // the user edited both managed files AFTER the manifest recorded them
  fs.appendFileSync(path.join(root, '.claude', 'commands', 'apriori.md'), '\nteam-specific extras\n');
  fs.appendFileSync(path.join(root, 'apriori', 'runbook.md'), '\nlocal notes\n');
  const cmdBefore = fs.readFileSync(path.join(root, '.claude', 'commands', 'apriori.md'), 'utf8');
  const rbBefore = fs.readFileSync(path.join(root, 'apriori', 'runbook.md'), 'utf8');
  const manifestBefore = fs.readFileSync(path.join(root, 'apriori', 'managed.json'), 'utf8');
  const { actions } = update.run(root);
  for (const rel of ['.claude/commands/apriori.md', 'apriori/runbook.md']) {
    const row = actions.find((a) => a.file === rel);
    assert.ok(row && /modified/.test(row.action), JSON.stringify(actions));
  }
  assert.strictEqual(fs.readFileSync(path.join(root, '.claude', 'commands', 'apriori.md'), 'utf8'), cmdBefore);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', 'runbook.md'), 'utf8'), rbBefore);
  // --dry-run through the CLI: identical classification, nothing written at all
  const { spawnSync } = require('node:child_process');
  const r = spawnSync('node', [path.join(__dirname, '..', 'bin', 'apriori.js'), 'update', '--dry-run'],
    { cwd: root, encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /modified/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', 'managed.json'), 'utf8'), manifestBefore);
});

test('UP-09 pre-manifest projects are adopted only on proof', () => {
  const root = tmp();
  init.scaffold(root, ['claude', 'codex']);
  fs.rmSync(path.join(root, 'apriori', 'managed.json'), { force: true });   // pre-manifest CLI wrote none
  // claude command = pristine current template (identity proof);
  // codex command = a previous shipped generation (proved via the injectable generation list);
  // opencode command = arbitrary user content (no proof)
  fs.writeFileSync(path.join(root, '.codex', 'prompts', 'apriori.md'), 'generation zero body\n');
  const oc = path.join(root, '.opencode', 'command', 'apriori.md');
  fs.mkdirSync(path.dirname(oc), { recursive: true });
  fs.writeFileSync(oc, 'user-owned free text\n');
  const gens = [shaFile(path.join(__dirname, '..', 'templates', 'command.md')), sha('generation zero body\n')];
  const { actions } = update.run(root, { generations: gens });
  const byFile = Object.fromEntries(actions.map((a) => [a.file, a.action]));
  assert.strictEqual(byFile['.claude/commands/apriori.md'], 'up-to-date');
  assert.strictEqual(byFile['.codex/prompts/apriori.md'], 'updated');
  assert.ok(/unmanaged/.test(byFile['.opencode/command/apriori.md']), JSON.stringify(byFile));
  assert.strictEqual(fs.readFileSync(oc, 'utf8'), 'user-owned free text\n');
  assert.strictEqual(fs.readFileSync(path.join(root, '.codex', 'prompts', 'apriori.md'), 'utf8'), PKG_COMMAND);
  // the adoption pass materialized the manifest, covering exactly the proven files + runbook
  const m = JSON.parse(fs.readFileSync(path.join(root, 'apriori', 'managed.json'), 'utf8'));
  assert.deepStrictEqual(Object.keys(m.files).sort(),
    ['.claude/commands/apriori.md', '.codex/prompts/apriori.md', 'apriori/runbook.md']);
  // dry-run pre-manifest: no manifest materializes
  const root2 = tmp();
  init.scaffold(root2, ['claude']);
  fs.rmSync(path.join(root2, 'apriori', 'managed.json'), { force: true });
  update.run(root2, { dryRun: true });
  assert.ok(!fs.existsSync(path.join(root2, 'apriori', 'managed.json')));
});

test('UP-10 manifest hygiene fails closed', () => {
  const bads = [
    'not json at all',
    JSON.stringify({ version: 2, files: {} }),
    JSON.stringify({ version: 1 }),
    JSON.stringify({ version: 1, files: { 'apriori/runbook.md': 'md5:abc' } }),
    JSON.stringify({ version: 1, files: { '../outside.md': 'sha256:' + 'a'.repeat(64) } }),
    JSON.stringify({ version: 1, files: { 'apriori/process-config.md': 'sha256:' + 'a'.repeat(64) } }),  // not a refresh target
    JSON.stringify({ version: 1, files: { '.claude\\commands\\apriori.md': 'sha256:' + 'a'.repeat(64) } }),  // non-canonical key
  ];
  for (const bad of bads) {
    const root = agedProject();
    fs.writeFileSync(path.join(root, 'apriori', 'managed.json'), bad);
    const rbBefore = fs.readFileSync(path.join(root, 'apriori', 'runbook.md'), 'utf8');
    assert.throws(() => update.run(root), /managed\.json/, bad.slice(0, 40));
    assert.throws(() => update.run(root, { dryRun: true }), /managed\.json/, bad.slice(0, 40));
    assert.strictEqual(fs.readFileSync(path.join(root, 'apriori', 'runbook.md'), 'utf8'), rbBefore);
    // CLI surfaces it as a nonzero exit, not a stack trace
    const { spawnSync } = require('node:child_process');
    const r = spawnSync('node', [path.join(__dirname, '..', 'bin', 'apriori.js'), 'update'],
      { cwd: root, encoding: 'utf8' });
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /managed\.json/);
  }
});

test('UP-10b a manifest-listed file that vanished is reported missing; escaping symlinks fail before hashing', (t) => {
  // missing: delete a managed file → `missing` row, no write (UMIMPL-1 refutation made durable)
  const root = agedProject();
  fs.rmSync(path.join(root, '.claude', 'commands', 'apriori.md'));
  const { actions } = update.run(root);
  const row = actions.find((a) => a.file === '.claude/commands/apriori.md');
  assert.ok(row && /missing/.test(row.action), JSON.stringify(actions));
  // symlink escape: a listed path pointing outside the project is a hygiene error, never hashed/classified
  if (process.platform === 'win32') return;                // symlink creation needs privileges there
  const root2 = agedProject();
  const outside = path.join(tmp(), 'outside.md');
  fs.writeFileSync(outside, 'outside content\n');
  fs.rmSync(path.join(root2, '.claude', 'commands', 'apriori.md'));
  fs.symlinkSync(outside, path.join(root2, '.claude', 'commands', 'apriori.md'));
  assert.throws(() => update.run(root2), /escapes the project root/);
  assert.strictEqual(fs.readFileSync(outside, 'utf8'), 'outside content\n');
});

test('UP-11 the shipped-generation list stays honest', () => {
  const managed = require('../lib/managed');
  assert.ok(Array.isArray(managed.TEMPLATE_GENERATIONS) && managed.TEMPLATE_GENERATIONS.length >= 2);
  for (const g of managed.TEMPLATE_GENERATIONS) assert.match(g, /^sha256:[0-9a-f]{64}$/);
  assert.ok(managed.TEMPLATE_GENERATIONS.includes(shaFile(path.join(__dirname, '..', 'templates', 'command.md'))),
    'templates/command.md changed without appending its hash to TEMPLATE_GENERATIONS');
});
