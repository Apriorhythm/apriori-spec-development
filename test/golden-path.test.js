'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const README = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
async function gp() { return import(path.join(ROOT, 'scripts', 'golden-path.mjs').replace(/\\/g, '/')); }

test('GP-01 the extractor is a pure text seam', async () => {
  const { extractBlocks } = await gp();
  const blocks = extractBlocks(README);
  assert.strictEqual(blocks.length, 4);
  assert.match(blocks[0], /npm i -g apriori-cli/);
  assert.match(blocks[1], /apriori verify --change hello/);
  assert.match(blocks[3], /apriori check/);
  // pure: works on arbitrary text, throws without a Quickstart section
  assert.throws(() => extractBlocks('# nothing here'), /Quickstart/);
});

test('GP-04 drift between README and contract fails loudly', async () => {
  const { extractBlocks, buildPlan } = await gp();
  // block-count drift: a doctored text with a block removed
  const doctored = README.replace(/```shell\n[\s\S]*?```/, '');
  assert.throws(() => buildPlan(extractBlocks(doctored), 'local', { binDir: '/x' }), /README drift: 3 shell block/);
  // exit-code drift: a stub apriori that always exits 0 makes block 2's documented red vanish —
  // the runner must fail naming block 2 (GPIMPL-1)
  const stubBin = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-stub-'));
  fs.writeFileSync(path.join(stubBin, 'apriori'), '#!/bin/sh\nexit 0\n');
  fs.chmodSync(path.join(stubBin, 'apriori'), 0o755);
  const { script } = buildPlan(extractBlocks(README), 'local', { binDir: stubBin });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-gp4-'));
  const sp = path.join(work, 'walk.sh');
  fs.writeFileSync(sp, script);
  const env = { ...process.env, PATH: stubBin + path.delimiter + process.env.PATH };
  delete env.NODE_TEST_CONTEXT; delete env.NODE_OPTIONS;
  const r = spawnSync('bash', [sp], { cwd: work, env, encoding: 'utf8' });
  // the RUNNER's own comparison must fail naming block 2 with expected/actual (GPIMPL-1)
  const { assertSentinels, EXPECTS } = await gp();
  assert.throws(() => assertSentinels(r.stdout, EXPECTS), /block 2: exit 0, contract expects 1/);
});

test('GP-05 packed-mode plan carries prefix install, PATH preflight (plan construction)', async () => {
  const { extractBlocks, buildPlan } = await gp();
  const { script } = buildPlan(extractBlocks(README), 'packed', { binDir: '/p/bin', tgz: '/t/x.tgz', prefix: '/p' });
  assert.match(script, /npm i -g "\/t\/x\.tgz" --prefix "\/p"/);
  assert.match(script, /command -v apriori/);
  assert.match(script, /exit 90/);
  assert.doesNotMatch(script, /npm i -g apriori-cli/);   // registry line substituted
});

// one shared --local walk feeds GP-02 and GP-03 (running it twice would double suite time)
let walk = null;
function runWalkOnce() {
  if (walk) return walk;
  // hijack guard (GPSPEC-3): a bogus global `apriori` earlier on the ORIGINAL PATH must never win
  const bogus = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-bogus-'));
  fs.writeFileSync(path.join(bogus, 'apriori'), '#!/bin/sh\necho BOGUS; exit 99\n');
  fs.chmodSync(path.join(bogus, 'apriori'), 0o755);
  walk = spawnSync('node', [path.join(ROOT, 'scripts', 'golden-path.mjs'), '--local'], {
    encoding: 'utf8', env: { ...process.env, PATH: bogus + path.delimiter + process.env.PATH },
  });
  return walk;
}

test('GP-02 a --local run walks the whole Quickstart with the documented exits', () => {
  const r = runWalkOnce();
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  for (const [i, code] of [[1, 0], [2, 1], [3, 0], [4, 0]])
    assert.match(r.stdout, new RegExp(`__BLOCK_${i}_EXIT=${code}`));
  assert.doesNotMatch(r.stdout, /BOGUS/);   // the walk's resolver beat the hijacker
});

test('GP-03 final state is asserted, not assumed', () => {
  const r = runWalkOnce();
  // the runner only prints the OK line AFTER re-asserting verify/check/doctor and the archive dir
  assert.match(r.stdout, /golden-path: OK \(local\) — 4 blocks, exits \[0, 1, 0, 0\], final state green/);
  // and the assertion code path is real: the script names the assertion when one fails
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'golden-path.mjs'), 'utf8');
  for (const label of ['store verify', 'check', 'doctor', 'archived demo change'])
    assert.ok(src.includes(label), `final-state assertion '${label}' present in the runner`);
});
