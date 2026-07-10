import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openStore, isValidId, newPollId, newAdminKey } from '../lib/store.js';
import { buildPoll, castVote } from '../lib/poll.js';

async function tempStore() {
  const dir = await mkdtemp(path.join(tmpdir(), 'poll-store-'));
  return { store: await openStore(dir), dir };
}

const sampleInput = { title: '午饭吃什么', options: ['面', '饭', '饺子'], multi: false };

test('创建投票即落盘，字段完整（specs/poll-storage）', async () => {
  const { store, dir } = await tempStore();
  const { poll } = buildPoll(sampleInput);
  await store.createPoll(poll);

  const raw = JSON.parse(await readFile(path.join(dir, `${poll.id}.json`), 'utf8'));
  for (const key of ['id', 'title', 'options', 'multi', 'maxChoices', 'deadline', 'adminKey', 'closed', 'counts', 'totalVoters', 'createdAt']) {
    assert.ok(key in raw, `缺少字段 ${key}`);
  }
  assert.equal(raw.title, '午饭吃什么');
  assert.deepEqual(raw.counts, [0, 0, 0]);
});

test('重开 store（模拟重启）后数据仍在', async () => {
  const { store, dir } = await tempStore();
  const { poll } = buildPoll(sampleInput);
  await store.createPoll(poll);

  const store2 = await openStore(dir); // 模拟进程重启
  const loaded = await store2.readPoll(poll.id);
  assert.equal(loaded.title, poll.title);
  assert.deepEqual(loaded.options, poll.options);
});

test('并发写不丢票、文件始终为合法 JSON（specs/poll-voting + poll-storage）', async () => {
  const { store, dir } = await tempStore();
  const { poll } = buildPoll(sampleInput);
  await store.createPoll(poll);

  const N = 25;
  await Promise.all(
    Array.from({ length: N }, (_, i) =>
      store.updatePoll(poll.id, (cur) => {
        const r = castVote(cur, [i % 3]);
        assert.ok(r.ok);
        return { poll: r.poll };
      })
    )
  );

  const final = JSON.parse(await readFile(path.join(dir, `${poll.id}.json`), 'utf8'));
  assert.equal(final.totalVoters, N, '总提交数必须恰好为 N');
  assert.equal(final.counts.reduce((a, b) => a + b, 0), N);
  // 无残留临时文件
  const leftovers = (await readdir(dir)).filter((f) => f.endsWith('.tmp'));
  assert.deepEqual(leftovers, []);
});

test('非法 ID 被拒绝，绝不触碰文件系统（specs/poll-storage）', async () => {
  const { store } = await tempStore();
  for (const bad of ['../etc/passwd', 'a/b', 'a.b', '', 'x'.repeat(65), '哈哈']) {
    assert.equal(isValidId(bad), false, `应拒绝: ${bad}`);
    assert.equal(await store.readPoll(bad), null);
    await assert.rejects(() => store.updatePoll(bad, () => ({})), /invalid poll id/);
  }
});

test('ID 与密钥为 URL 安全字符且长度达标（specs/poll-creation）', () => {
  for (let i = 0; i < 20; i++) {
    assert.match(newPollId(), /^[A-Za-z0-9_-]{8}$/);
    assert.match(newAdminKey(), /^[A-Za-z0-9_-]{24}$/);
  }
});
