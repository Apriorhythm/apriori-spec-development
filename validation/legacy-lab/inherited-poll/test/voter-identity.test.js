'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  loadOrCreateSecret,
  issue,
  verify,
  digest,
  parseCookieHeader,
  buildSetCookie,
} = require('../lib/voter-identity');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'poll-vid-'));
}

test('loadOrCreateSecret：不存在时生成 32 字节并落盘；已存在时复用', () => {
  const dir = tmpDir();
  const s1 = loadOrCreateSecret(dir);
  assert.equal(s1.length, 32);
  assert.ok(fs.existsSync(path.join(dir, 'cookie-secret')));
  const s2 = loadOrCreateSecret(dir);
  assert.deepEqual(s1, s2);
});

test('loadOrCreateSecret：dataDir 不存在时自行创建（不依赖 store 先建目录）', () => {
  const dir = path.join(tmpDir(), 'nested', 'data');
  const s = loadOrCreateSecret(dir);
  assert.equal(s.length, 32);
});

test('VD-10 密钥文件损坏（非法长度）→ 构造即抛错，不静默重建', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'cookie-secret'), 'short');
  assert.throws(() => loadOrCreateSecret(dir), /cookie-secret/);
  // 未被静默重建：内容保持原样
  assert.equal(fs.readFileSync(path.join(dir, 'cookie-secret'), 'utf8'), 'short');
});

test('issue/verify 往返：签发的值可验证并还原 raw', () => {
  const secret = loadOrCreateSecret(tmpDir());
  const { value, raw } = issue(secret);
  assert.match(value, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(verify(value, secret), raw);
});

test('verify：篡改签名 / 篡改 raw / 换密钥 / 畸形输入 → null', () => {
  const dirA = tmpDir();
  const secret = loadOrCreateSecret(dirA);
  const other = loadOrCreateSecret(tmpDir());
  const { value, raw } = issue(secret);
  const [r, sig] = value.split('.');
  assert.equal(verify(`${r}.${sig.slice(0, -2)}xx`, secret), null);
  assert.equal(verify(`tampered.${sig}`, secret), null);
  assert.equal(verify(value, other), null);
  assert.equal(verify('', secret), null);
  assert.equal(verify('no-dot-at-all', secret), null);
  assert.equal(verify(null, secret), null);
  assert.equal(verify(`${r}.`, secret), null);
  assert.notEqual(raw, null);
});

test('digest：与 cookie 签名不同（前缀域分离），同 raw 同密钥下稳定', () => {
  const secret = loadOrCreateSecret(tmpDir());
  const { value, raw } = issue(secret);
  const sig = value.split('.')[1];
  const d = digest(raw, secret);
  assert.notEqual(d, sig);
  assert.equal(d, digest(raw, secret));
});

test('parseCookieHeader / buildSetCookie：解析与构造', () => {
  assert.deepEqual(parseCookieHeader('pv=abc.def; other=1'), { pv: 'abc.def', other: '1' });
  assert.deepEqual(parseCookieHeader(undefined), {});
  assert.deepEqual(parseCookieHeader(''), {});
  const sc = buildSetCookie('abc.def');
  assert.equal(sc, 'pv=abc.def; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000');
});
