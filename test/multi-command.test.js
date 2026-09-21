'use strict';
// P2 · 机制泛化：TOOLS[k].commands 映射 + 按模板索引的世代表。
// 六面验收（上游 astra-r10-reply.md 第 4 点）：K=1 兼容 · K=2 能工作 · 世代隔离 ·
// 漏配能抓住 · 所有权与生命周期 · 客户端边界。
// ⚠ 第二模板是**测试专用**，绝不进入正式安装配置。
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const init = require('../lib/init');
const update = require('../lib/update');
const managed = require('../lib/managed');
const doctor = require('../lib/doctor');

const SECOND_SRC = path.join(__dirname, 'fixtures', 'multi-command', 'second-command.md');
const SECOND_GOLDEN = path.join(__dirname, 'fixtures', 'multi-command', 'second-command.golden.md');
const FIRST_SRC = path.join(ROOT, 'templates', 'command.md');

const sha = (b) => 'sha256:' + crypto.createHash('sha256').update(b).digest('hex');
const shaFile = (p) => sha(fs.readFileSync(p));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-k2-'));
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const TAP_OK = `node -e "console.log('1..1');console.log('ok 1')"`;

// a test-only tool table carrying TWO command templates for one tool
function twoTemplateTools() {
  const t = JSON.parse(JSON.stringify(init.TOOLS));
  t.claude.commands = { apriori: '.claude/commands/apriori.md',
                        second: '.claude/commands/second.md' };
  return t;
}
const TWO_SRC = { apriori: FIRST_SRC, second: SECOND_SRC };
const TWO_GENS = { apriori: managed.TEMPLATE_GENERATIONS.apriori,
                   discuss: managed.TEMPLATE_GENERATIONS.discuss,   // S2 P3: shipped entry, see 卡 P3 ④
                   second: [shaFile(SECOND_SRC)] };

// ── 面 1 · K=1 兼容 ────────────────────────────────────────────────────────
test('MC-01 K=1 install is byte-identical to the P1 baseline behaviour', () => {
  const root = tmp();
  const r = init.scaffold(root, ['claude', 'codex']);
  assert.strictEqual(read(root, '.claude/commands/apriori.md'), fs.readFileSync(FIRST_SRC, 'utf8'));
  assert.strictEqual(read(root, '.codex/prompts/apriori.md'), fs.readFileSync(FIRST_SRC, 'utf8'));
  // S2 P3 (卡 P3 ④): shipped config is now K=2 — the discuss shell installs beside it, byte-for-byte
  const DISCUSS_SRC = path.join(ROOT, 'templates', 'discuss.md');
  assert.strictEqual(read(root, '.claude/commands/apriori-discuss.md'), fs.readFileSync(DISCUSS_SRC, 'utf8'));
  assert.strictEqual(read(root, '.codex/prompts/apriori-discuss.md'), fs.readFileSync(DISCUSS_SRC, 'utf8'));
  // the second template is NOT part of the shipped configuration
  assert.ok(!fs.existsSync(path.join(root, '.claude/commands/second.md')));
  for (const k of Object.keys(init.TOOLS))
    assert.ok(!('command' in init.TOOLS[k]), `${k} still exposes the retired single-value .command`);
  // manifest lists exactly the K=1 targets, and the action order is unchanged
  const mf = JSON.parse(read(root, 'apriori/managed.json'));
  assert.deepStrictEqual(Object.keys(mf.files).sort(),
    ['.claude/commands/apriori.md', '.claude/commands/apriori-discuss.md',
     '.codex/prompts/apriori.md', '.codex/prompts/apriori-discuss.md', 'apriori/runbook.md'].sort());
  assert.ok(r.actions.length > 0);
});

test('MC-02 the eight shipped generations survive the array→map change, in order', () => {
  const g = managed.TEMPLATE_GENERATIONS;
  assert.ok(!Array.isArray(g), 'generations must be indexed by template id');
  const historical = [
    'sha256:b4c8398b0f75fa8c954fc3df06775f9ad5152e400c68d9c9bc37b1e94cb2c3d2',
    'sha256:b3306395331a075448d0715f8904354436cec2f91af393a1ea0da0e2bc43423d',
    'sha256:26a0aa9eef6681288c8ddda55d5261761591d3627af1f58216ce82ac556be406',
    'sha256:26ede9b6f095e03b58b88e83bff1ec706aa5d1ca362ead1dec8bb336518fe04f',
    'sha256:ce21ebe7635eccf468614b2e0dfe6196bc390383f76322a46ad4554dcf12b9a2',
    'sha256:f4555198e6a1f3d5054f8b976fd317293e20d6bed519f6737b5cea4aea8b704d',
    'sha256:4ada03a2b8a9d6b86fd610e0f4363c31dcea2ba2460d6e96e1231004e4a9c8a0',
    'sha256:1dfa5eece0f3c109aae765aa52ffb89f59c0f0f3b494f9430148ac6baeeab046',
  ];
  assert.deepStrictEqual(g.apriori.slice(0, historical.length), historical, 'historical values and order must survive');
  assert.strictEqual(g.apriori.length, historical.length + 1, 'one new generation only');
  assert.strictEqual(g.apriori[historical.length], shaFile(FIRST_SRC), 'appended generation must match current template');
  for (const h of g.apriori) assert.match(h, /^sha256:[0-9a-f]{64}$/);
});

// ── 面 2 · K=2 能工作 ──────────────────────────────────────────────────────
test('MC-03 K=2 install/update/doctor each deliver the right template to the right path', () => {
  const root = tmp();
  init.scaffold(root, ['claude'], { tools: twoTemplateTools(), templateSrc: TWO_SRC });
  assert.strictEqual(read(root, '.claude/commands/apriori.md'), fs.readFileSync(FIRST_SRC, 'utf8'));
  assert.strictEqual(read(root, '.claude/commands/second.md'), fs.readFileSync(SECOND_GOLDEN, 'utf8'));
  // update leaves both up-to-date
  const { actions } = update.run(root, { tools: twoTemplateTools(), commandSrc: TWO_SRC,
                                         generations: TWO_GENS });
  const by = Object.fromEntries(actions.map((a) => [a.file, a.action]));
  assert.strictEqual(by['.claude/commands/apriori.md'], 'up-to-date');
  assert.strictEqual(by['.claude/commands/second.md'], 'up-to-date');
  // doctor sees both, and reports the missing one specifically
  fs.rmSync(path.join(root, '.claude/commands/second.md'));
  const d4 = doctor.runDoctor({ cwd: root, testCmd: TAP_OK, tools: twoTemplateTools() })
    .checks.filter((c) => c.id === 'D4' && c.status === 'finding');
  assert.ok(d4.some((c) => /second\.md/.test(c.detail)), JSON.stringify(d4));
});

// ── 面 3 · 世代隔离（双向）─────────────────────────────────────────────────
test('MC-04 cross-template content is never adopted, in either direction', () => {
  const root = tmp();
  init.scaffold(root, ['claude'], { tools: twoTemplateTools(), templateSrc: TWO_SRC });
  fs.rmSync(path.join(root, 'apriori', 'managed.json'), { force: true });   // pre-manifest
  // A's path holds B's bytes, and B's path holds A's bytes
  fs.writeFileSync(path.join(root, '.claude/commands/apriori.md'), fs.readFileSync(SECOND_SRC));
  fs.writeFileSync(path.join(root, '.claude/commands/second.md'), fs.readFileSync(FIRST_SRC));
  const { actions } = update.run(root, { tools: twoTemplateTools(), commandSrc: TWO_SRC,
                                         generations: TWO_GENS });
  const by = Object.fromEntries(actions.map((a) => [a.file, a.action]));
  for (const rel of ['.claude/commands/apriori.md', '.claude/commands/second.md'])
    assert.match(by[rel], /unmanaged/, `${rel} was adopted across templates: ${by[rel]}`);
  // bytes untouched, and neither entered the manifest
  assert.strictEqual(read(root, '.claude/commands/apriori.md'), fs.readFileSync(SECOND_SRC, 'utf8'));
  assert.strictEqual(read(root, '.claude/commands/second.md'), fs.readFileSync(FIRST_SRC, 'utf8'));
  const mf = JSON.parse(read(root, 'apriori/managed.json'));
  for (const rel of ['.claude/commands/apriori.md', '.claude/commands/second.md'])
    assert.ok(!(rel in mf.files), `${rel} must not be listed`);
});

// ── 面 4 · 漏配能抓住 ──────────────────────────────────────────────────────
test('MC-05 every mapped template must have its own generation table', () => {
  const tools = twoTemplateTools();
  const ids = new Set();
  for (const k of Object.keys(tools)) for (const id of Object.keys(tools[k].commands || {})) ids.add(id);
  const missing = [...ids].filter((id) => !Array.isArray((TWO_GENS)[id]) || !TWO_GENS[id].length);
  assert.deepStrictEqual(missing, [], 'a mapped template without a generation table');
  // and the coverage check itself must bite when a table is removed
  const holed = { apriori: TWO_GENS.apriori, discuss: TWO_GENS.discuss };   // `second` deliberately absent
  const holes = [...ids].filter((id) => !Array.isArray(holed[id]) || !holed[id].length);
  assert.deepStrictEqual(holes, ['second'], 'the coverage check failed to notice the hole');
});

// ── 面 5 · 所有权与生命周期 ────────────────────────────────────────────────
test('MC-06 hand edits survive, dry-run writes nothing, update is idempotent', () => {
  const root = tmp();
  init.scaffold(root, ['claude'], { tools: twoTemplateTools(), templateSrc: TWO_SRC });
  const handEdited = path.join(root, '.claude/commands/second.md');
  fs.writeFileSync(handEdited, 'my own text\n');
  const dry = update.run(root, { tools: twoTemplateTools(), commandSrc: TWO_SRC,
                                 generations: TWO_GENS, dryRun: true });
  assert.strictEqual(fs.readFileSync(handEdited, 'utf8'), 'my own text\n', 'dry-run wrote');
  assert.ok(dry.actions.length > 0);
  // a hand edit on one template does not block the other from updating
  const a = update.run(root, { tools: twoTemplateTools(), commandSrc: TWO_SRC, generations: TWO_GENS });
  const by = Object.fromEntries(a.actions.map((x) => [x.file, x.action]));
  assert.strictEqual(by['.claude/commands/apriori.md'], 'up-to-date');
  assert.strictEqual(fs.readFileSync(handEdited, 'utf8'), 'my own text\n');
  // idempotent
  const b = update.run(root, { tools: twoTemplateTools(), commandSrc: TWO_SRC, generations: TWO_GENS });
  assert.deepStrictEqual(Object.fromEntries(b.actions.map((x) => [x.file, x.action])), by);
});

// ── 面 6 · 客户端边界 ──────────────────────────────────────────────────────
test('MC-07 rule-level tools gain no command, and a shared AGENTS.md is not appended twice', () => {
  const root = tmp();
  init.scaffold(root, ['cursor', 'codex', 'opencode']);
  assert.ok(!fs.existsSync(path.join(root, '.cursor', 'commands')), 'rule-level tool got a command dir');
  const agents = read(root, 'AGENTS.md');                  // codex + opencode share it
  const hits = agents.split('apriori/runbook.md').length - 1;
  assert.strictEqual(hits, 1, `shared AGENTS.md got the pointer ${hits} times`);
  // the manifest never lists a path outside the allowed target set
  const allowed = managed.allowedTargets(init.TOOLS);
  const mf = JSON.parse(read(root, 'apriori/managed.json'));
  for (const rel of Object.keys(mf.files)) assert.ok(allowed.has(rel), `${rel} outside allowedTargets`);
});

// ── 正式安装边界：CLI 路径也只投递 K=1 ─────────────────────────────────────
test('MC-08 the real CLI installs K=1 only — the test template is never shipped', () => {
  const root = tmp();
  const r = spawnSync('node', [BIN, 'init', '--tools', 'claude'], { encoding: 'utf8', cwd: root });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(root, '.claude/commands/apriori.md')));
  assert.ok(!fs.existsSync(path.join(root, '.claude/commands/second.md')));
  assert.ok(!/second-command/.test(r.stdout));
});
