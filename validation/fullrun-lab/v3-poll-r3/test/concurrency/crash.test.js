import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = join(here, '..', '..', 'src', 'index.js');

function waitReady(child) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (d) => {
      buf += d.toString();
      const m = buf.match(/READY (\d+)/);
      if (m) { child.stdout.off('data', onData); resolve(Number(m[1])); }
    };
    child.stdout.on('data', onData);
    child.on('exit', (c) => reject(new Error('server exited early: ' + c)));
    setTimeout(() => reject(new Error('server did not become ready')), 8000);
  });
}

test('CC-02 崩溃持久化:ack 后进程被杀数据仍在', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'qp-crash-'));
  const dataDir = join(dir, 'polls');
  const child = spawn(process.execPath, [indexPath], {
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  try {
    const port = await waitReady(child);
    const base = `http://127.0.0.1:${port}`;
    // create
    const cr = await fetch(base + '/api/polls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'crash', options: ['a', 'b'], mode: 'single' }),
    });
    const cj = await cr.json();
    const id = cj.shareUrl.split('/').pop();
    const pub = await (await fetch(`${base}/api/polls/${id}`)).json();
    const opt = pub.options[0].id;
    // vote and wait for the ACK (2xx == persisted)
    const vr = await fetch(`${base}/api/polls/${id}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIds: [opt] }),
    });
    assert.equal(vr.status, 200, 'vote acked');
    // hard-kill immediately after the ack
    child.kill('SIGKILL');
    await new Promise((r) => child.on('exit', r));
    // read the on-disk file directly — the acked vote must have survived
    const files = await readdir(dataDir);
    const pollFile = files.find((f) => f.startsWith(id) && f.endsWith('.json'));
    assert.ok(pollFile, 'poll file exists on disk after crash');
    const disk = JSON.parse(await readFile(join(dataDir, pollFile), 'utf8'));
    assert.equal(disk.totalVoters, 1, 'acked vote persisted across crash');
    assert.equal(disk.options.reduce((a, o) => a + o.votes, 0), 1);
  } finally {
    if (!child.killed) child.kill('SIGKILL');
    await rm(dir, { recursive: true, force: true });
  }
});
