'use strict';
// ci-pytest-tap-compat — the Python example's CI job and its README install a pytest that pytest-tap supports (WN-02).
// Trigger: the 6.1.0 release CI (PR #2, 2026-11-01) — pytest 9.2.0 broke pytest-tap 3.5 at plugin load ("option dest
// 'tap_stream' already used by ['--tap']"), so `python run_tap.py` exited 3 with no TAP and verify refused the run;
// with pytest 8.4.2 the same example is GREEN. An external release, not a change in apriori.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('WN-02 the Python example installs a pytest that pytest-tap supports, in CI and in its README', () => {
  const ci = read('.github/workflows/ci.yml');
  const job = ci.slice(ci.indexOf('python-example:'));
  assert.ok(job.length > 0, 'the python-example job exists');
  const pip = job.match(/^\s*- run: pip install .*$/m);
  assert.ok(pip, 'the job installs its Python dependencies');
  assert.match(pip[0], /"pytest<9"/, 'CI pins pytest below 9 (pytest 9.2 breaks pytest-tap 3.5)');
  assert.match(pip[0], /\bpytest-tap\b/);
  const readme = read('examples/python-pytest/README.md');
  assert.match(readme, /^pip install "pytest<9" pytest-tap$/m, 'the README install line matches CI');
  assert.match(readme, /pytest 9/, 'the README says why the pin is there');
});
