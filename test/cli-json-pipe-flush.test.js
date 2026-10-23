'use strict';
// cli-json-pipe-flush — JP-1 (follow-up registered by status-last-recorded, 2026-09-27): `apriori <cmd> --json`
// through a pipe lost everything past 64 KiB because the entry point called process.exit() right after
// console.log(); on POSIX a pipe write is asynchronous and the kernel buffer is 64 KiB. The process must
// let stdout and stderr drain before it exits, on the success path and on the uncaught-error path alike.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');

// a project whose `status --json` is well over 64 KiB: many in-flight changes, written directly
function bigProject(n = 300) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-jp1-'));
  fs.mkdirSync(path.join(root, 'apriori', 'specs'), { recursive: true });
  for (let i = 0; i < n; i++) {
    const dir = path.join(root, 'apriori', 'changes', `c${String(i).padStart(3, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'flow-state.md'),
      `change: c${String(i).padStart(3, '0')}\nphase: build\n\n## Reality Check\n- observed: ${'x'.repeat(300)}\n\n## Open\n- O-1: ${'y'.repeat(300)}\n\n## Next\n- ${'z'.repeat(200)}\n\ngates:\n  - 2026-10-23T10:00 note: scaffolded\n`);
  }
  return root;
}
const run = (root, args) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 });

test('CL-19 status --json through a pipe arrives whole and parses (JP-1)', () => {
  const root = bigProject();
  const r = run(root, ['status', '--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(Buffer.byteLength(r.stdout) > 65536, `fixture too small: ${Buffer.byteLength(r.stdout)} bytes`);
  const parsed = JSON.parse(r.stdout);            // throws on a truncated envelope
  assert.strictEqual(parsed.changes.length, 300, 'the whole list arrived, not just valid JSON');
});

test('CL-20 the uncaught-error path drains its envelope too, and exit codes are unchanged (JP-1)', () => {
  // a readable project: the exit code and the text path are as before
  const root = bigProject(1);
  const ok = run(root, ['status']);
  assert.strictEqual(ok.status, 0, ok.stderr);
  const bad = run(root, ['no-such-command']);
  assert.strictEqual(bad.status, 2);
  // the uncaught-error path, made deterministic and large (review r1/r2, JP-R1): a preload makes the
  // read of one flow-state throw an Error whose message is far past what the pre-fix entry point got
  // through before exiting — the point depends on the reader (65,536 through `| cat`, ~146 KiB under a
  // concurrently reading spawnSync), so the marker is 1,000,000 bytes and the check is that the WHOLE
  // marker arrived, not a byte count — no file modes, no uid dependence
  const marker = 'JP1-' + 'e'.repeat(1000000);
  const preload = path.join(root, 'preload.js');
  fs.writeFileSync(preload, `const fs = require('fs'); const orig = fs.readFileSync;
fs.readFileSync = function (p, ...rest) { if (String(p).endsWith(${JSON.stringify(path.join('c000', 'flow-state.md'))})) throw new Error(${JSON.stringify(marker)}); return orig.call(fs, p, ...rest); };`);
  const env = { ...process.env, NODE_OPTIONS: `--require ${JSON.stringify(preload)}` };
  const j = spawnSync('node', [BIN, 'status', '--change', 'c000', '--json'], { encoding: 'utf8', cwd: root, env, maxBuffer: 64 * 1024 * 1024 });
  assert.strictEqual(j.status, 2, 'an uncaught error is exit 2');
  const env2 = JSON.parse(j.stdout);                                             // whole, so it parses
  assert.ok(JSON.stringify(env2.errors || env2).includes(marker), 'the envelope carries the whole injected error');
  // the text twin: stderr is complete and the exit code is still 2
  const t = spawnSync('node', [BIN, 'status', '--change', 'c000'], { encoding: 'utf8', cwd: root, env, maxBuffer: 64 * 1024 * 1024 });
  assert.strictEqual(t.status, 2);
  assert.ok(t.stderr.includes(marker), 'stderr arrived whole');
});

test('CL-21 a reader that closes early never changes the exit code (JP-1)', async () => {
  // review r1 A1 / r2 B2: the failure needs BOTH streams queued at exit — then an early-closed stdout
  // reader's EPIPE fires while the exit still waits on stderr, and without a listener Node turns it into
  // exit 1. A preload queues 300 KB on stderr at startup; the 300-change envelope queues stdout; the
  // parent reads one stdout chunk and closes the pipe, and drains stderr normally.
  const { spawn } = require('node:child_process');
  const root = bigProject(300);
  const preload = path.join(root, 'stderr-preload.js');
  fs.writeFileSync(preload, "process.stderr.write('s'.repeat(300000) + '\\n');");
  const env = { ...process.env, NODE_OPTIONS: `--require ${JSON.stringify(preload)}` };
  const code = await new Promise((resolve, reject) => {
    const child = spawn('node', [BIN, 'status', '--json'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    // stderr is NOT drained until stdout has been closed, so both streams are queued when the child
    // reaches its exit; the stdout EPIPE then fires while the exit still waits on stderr
    child.stdout.once('data', () => { child.stdout.destroy(); setTimeout(() => child.stderr.resume(), 300); });
    child.on('error', reject);
    child.on('close', (c) => resolve(c));
  });
  assert.strictEqual(code, 0, 'the exit code is the command\'s own, not an unhandled EPIPE');
});
