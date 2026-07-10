'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../lib/store');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'poll-store-'));
}

test('put 后可 get；新建 store 实例（模拟重启）后数据仍在', () => {
  const dir = tmpDir();
  const store = createStore(dir);
  store.put({ id: 'abc123', question: 'q', votes: [] });
  assert.equal(store.get('abc123').question, 'q');

  const reopened = createStore(dir);
  assert.equal(reopened.get('abc123').question, 'q');
});

test('数据文件不存在时从空数据开始', () => {
  const store = createStore(tmpDir());
  assert.equal(store.get('nope'), undefined);
  assert.deepEqual(store.all(), {});
});

test('数据文件损坏时备份为 polls.json.bak-* 并从空数据开始', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'polls.json'), '{broken json');
  const store = createStore(dir);
  assert.deepEqual(store.all(), {});
  const baks = fs.readdirSync(dir).filter((f) => f.startsWith('polls.json.bak-'));
  assert.equal(baks.length, 1);
});

test('写入是原子的：目录里不残留 .tmp 文件', () => {
  const dir = tmpDir();
  const store = createStore(dir);
  store.put({ id: 'x1', votes: [] });
  assert.ok(!fs.readdirSync(dir).some((f) => f.endsWith('.tmp')));
});

test('写后提交：save 抛错时 put 向上抛，内存状态与磁盘均保持写入前原样', () => {
  const dir = tmpDir();
  let fail = false;
  const store = createStore(dir, {
    writeFileSync: (...args) => {
      if (fail) throw new Error('injected write failure');
      return fs.writeFileSync(...args);
    },
  });
  store.put({ id: 'ok1', question: 'q', votes: [] });
  fail = true;
  assert.throws(() => store.put({ id: 'ok1', question: 'q', votes: [[0]] }), /injected write failure/);
  // 内存回读：仍是写入前的对象（无幻影投票）
  assert.deepEqual(store.get('ok1').votes, []);
  // 磁盘回读（模拟重启）：同样是写入前状态
  fail = false;
  const reopened = createStore(dir);
  assert.deepEqual(reopened.get('ok1').votes, []);
});
