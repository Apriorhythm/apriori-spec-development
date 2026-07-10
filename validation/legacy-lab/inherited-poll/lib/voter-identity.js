'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SECRET_BYTES = 32;
const COOKIE_NAME = 'pv';
// 一年；属性按需求 B1 固定
const COOKIE_ATTRS = 'HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000';

// 读取或生成签名密钥。文件存在但长度非法 → 抛错（启动失败，绝不静默重建）。
function loadOrCreateSecret(dataDir) {
  const file = path.join(dataDir, 'cookie-secret');
  if (fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    if (buf.length !== SECRET_BYTES) {
      throw new Error(`cookie-secret 文件损坏（期望 ${SECRET_BYTES} 字节，实际 ${buf.length}），拒绝启动`);
    }
    return buf;
  }
  fs.mkdirSync(dataDir, { recursive: true });
  const secret = crypto.randomBytes(SECRET_BYTES);
  fs.writeFileSync(file, secret);
  return secret;
}

function sign(raw, secret) {
  return crypto.createHmac('sha256', secret).update(raw).digest('base64url');
}

// 签发新标识：cookie 值 = <raw>.<hmac>
function issue(secret) {
  const raw = crypto.randomBytes(16).toString('base64url');
  return { value: `${raw}.${sign(raw, secret)}`, raw };
}

// 校验 cookie 值；合法返回 raw，任何畸形/签名不符返回 null（绝不抛错）。
function verify(cookieValue, secret) {
  if (typeof cookieValue !== 'string') return null;
  const dot = cookieValue.indexOf('.');
  if (dot <= 0 || dot === cookieValue.length - 1) return null;
  const raw = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = Buffer.from(sign(raw, secret));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(actual, expected)) return null;
  return raw;
}

// 持久化到 poll.voters 的摘要：与 cookie 签名用不同的 HMAC 输入前缀（域分离），
// 摘要既不能反推 raw，也不能被当作合法 cookie 签名重放。
function digest(raw, secret) {
  return crypto.createHmac('sha256', secret).update(`voters:${raw}`).digest('base64url');
}

function parseCookieHeader(header) {
  const out = {};
  if (typeof header !== 'string' || header === '') return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

function buildSetCookie(value) {
  return `${COOKIE_NAME}=${value}; ${COOKIE_ATTRS}`;
}

module.exports = {
  COOKIE_NAME,
  loadOrCreateSecret,
  issue,
  verify,
  digest,
  parseCookieHeader,
  buildSetCookie,
};
