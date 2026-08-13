// Captures --specs byte goldens (SR-64 / SPEC-4). Run ONCE against state A, commit the
// outputs; the byte-golden test replays the same fixtures and compares byte-identically.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const BIN = new URL('../../../bin/apriori.js', import.meta.url).pathname;
const OUT = new URL('.', import.meta.url).pathname;

// deterministic fixture project (fixed tmp-free paths inside the capture dir)
const root = path.join(OUT, 'proj');
fs.rmSync(root, { recursive: true, force: true });
const w = (rel, c) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), c); };
w('apriori/specs/m/spec.md', ['### Requirement: R-A', '', '#### Scenario: XA-01 a', '- t', '', '#### Scenario: XA-01 dup', '- t', '', '#### Scenario: XB-01 b', '- t', '', '#### Scenario: no id here', '- t', ''].join('\n'));
w('apriori/process-config.md', '| id-pattern | [A-Z]+-\\d+ |\n');
const CASES = {
  'green':  { spec: '#### Scenario: XG-01 g\n', tap: `node -e "console.log('ok 1 - XG-01 g')"` },
  'gaps':   { spec: null, tap: `node -e "console.log('ok 1 - XA-01 a');console.log('not ok 2 - XB-01 b');console.log('ok 3 - XZ-99 orphan');console.log('not ok 4 - naked');console.error('diag line')"` },
  'error':  { spec: null, tap: `node -e "process.exit(7)"` },
};
const manifest = {};
for (const [name, c] of Object.entries(CASES)) {
  const dir = c.spec ? (() => { const d = path.join(root, 'solo'); fs.rmSync(d, {recursive:true, force:true}); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'spec.md'), c.spec); return 'solo'; })() : 'apriori/specs';
  for (const json of [false, true]) {
    const args = ['verify', '--specs', dir, '--test-cmd', c.tap, ...(json ? ['--json'] : [])];
    const r = spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: root });
    const key = `${name}${json ? '-json' : ''}`;
    fs.writeFileSync(path.join(OUT, `${key}.stdout`), r.stdout);
    fs.writeFileSync(path.join(OUT, `${key}.stderr`), r.stderr);
    manifest[key] = { args, status: r.status };
  }
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('captured', Object.keys(manifest).join(', '));
