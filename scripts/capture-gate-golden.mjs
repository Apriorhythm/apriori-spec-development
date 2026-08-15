// Capture the STATE-A gate golden (design §D6a / STEP2·r1 SPEC-4).
//
// MUST be run BEFORE gate.js is changed to delegate to lib/readiness.js, and MUST NOT be
// re-run afterwards — regenerating it would legalise whatever the move broke, which is
// exactly the self-comparison this golden exists to prevent.
//
//   node scripts/capture-gate-golden.mjs
//
// Output: test/fixtures/gate-state-a.golden.json
// Corpus paths are replaced by <CORPUS> so the file is portable (STEP2·r2 A-5).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const corpus = require('../test/helpers/gate-corpus.js');
const gate = require('../lib/gate.js');

const OUT = path.join(process.cwd(), 'test', 'fixtures', 'gate-state-a.golden.json');

// Absolute corpus paths leak into diagnostics ("tasks.md missing at <abs>"). Replace the
// temp root — and its realpath, which differs on macOS — with a stable placeholder.
function scrub(value, roots) {
  if (typeof value === 'string') {
    let s = value;
    for (const r of roots) s = s.split(r).join('<CORPUS>');
    return s;
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, roots));
  if (value && typeof value === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = scrub(v, roots);
    return o;
  }
  return value;
}

const entries = {};
for (const c of corpus.CASES) {
  const { root, change } = corpus.build(c);
  const roots = [root];
  try { const rp = fs.realpathSync(root); if (rp !== root) roots.push(rp); } catch { /* keep root only */ }

  let record;
  try {
    const res = gate.runGate({ cwd: root, change, testCmd: corpus.TAP_OK });
    record = { threw: false, result: scrub(res, roots) };
  } catch (e) {
    // No stack: moving a function necessarily changes its file and line (STEP0·r3 REQ-1).
    record = { threw: true, error: scrub({ name: e.constructor.name, code: e.code ?? null, message: e.message }, roots) };
  }
  entries[c.id] = record;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  note: 'STATE-A oracle for the readiness extraction. Captured before lib/readiness.js existed. Do not regenerate.',
  capturedFrom: 'lib/gate.js runGate() over test/helpers/gate-corpus.js',
  cases: entries,
}, null, 2) + '\n');

const blocked = Object.values(entries).filter((e) => !e.threw && e.result.result === 'BLOCKED').length;
console.log(`captured ${Object.keys(entries).length} cases → ${path.relative(process.cwd(), OUT)}`);
console.log(`  BLOCKED: ${blocked} · threw: ${Object.values(entries).filter((e) => e.threw).length}`);
