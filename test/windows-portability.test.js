'use strict';
// WN-01 — the suite is portable to the Windows CI matrix (windows-ci-portability).
// Once the CL-21 hang that stopped the 6 line's first Windows CI run (PR #1, 2026-10-23) was skipped, a
// Windows host failed the suite in four ways that had nothing to do with the code under test: npm spawned by its bare name (ENOENT: it is npm.cmd there), recorded
// verdict text compared with backslash paths, a separator-bound filter that found no spec at all,
// and symlink fixtures on a host without the privilege. This test pins the seams that keep those
// from coming back: one npm seam, a separator-neutral <ROOT> normalizer, and the canSymlink() guards
// on the two tests that lacked a probe.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TEST_DIR = __dirname;

test('WN-01 the suite is portable to the Windows CI matrix: npm goes through one seam, recorded paths read with /, symlink fixtures are guarded', () => {
  // (a) no test spawns npm by its bare name — only the helper does
  const offenders = [];
  for (const f of fs.readdirSync(TEST_DIR)) {
    if (!f.endsWith('.test.js')) continue;
    const src = fs.readFileSync(path.join(TEST_DIR, f), 'utf8');
    if (/(spawnSync|execFileSync|spawn|execSync|exec)\(\s*['"`]npm(\.cmd)?['"`]/.test(src)) offenders.push(f);
  }
  assert.deepStrictEqual(offenders, [], 'spawn npm through test/helpers/npm.js');
  const helper = fs.readFileSync(path.join(TEST_DIR, 'helpers', 'npm.js'), 'utf8');
  assert.match(helper, /process\.platform === 'win32'/);
  assert.match(helper, /npm\.cmd/);
  assert.match(helper, /shell: WIN/);
  // (b) the corpus normalizer renders the path under <ROOT> with '/' whatever the host printed
  const { makeNorm } = require('./helpers/verdict-corpus');
  const root = path.resolve(ROOT);
  const norm = makeNorm(root);
  const winStyle = root + '\\apriori\\specs\\x\\spec.md';
  assert.strictEqual(norm('verify: base mismatch for ' + winStyle + ': delta expects new'), 'verify: base mismatch for <ROOT>/apriori/specs/x/spec.md: delta expects new');
  assert.strictEqual(norm('at ' + root + '/apriori/specs/x/spec.md line 12'), 'at <ROOT>/apriori/specs/x/spec.md line N');
  // (c) the two tests this change guarded consult the shared probe (older files probe inline with try/catch;
  // the Windows run itself is the proof for those)
  for (const f of ['archive-unreviewed.test.js', 'review-round-limit.test.js'])
    assert.match(fs.readFileSync(path.join(TEST_DIR, f), 'utf8'), /canSymlink\(\)/, `${f} consults canSymlink()`);
});
