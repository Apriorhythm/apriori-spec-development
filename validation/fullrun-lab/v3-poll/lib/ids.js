// pollId / adminKey 生成：CSPRNG（req-final §4.2）。随机源可注入。
import crypto from 'node:crypto';

export const POLL_ID_RE = /^[A-Za-z0-9_-]{16}$/;
export const ADMIN_KEY_RE = /^[A-Za-z0-9_-]{22,64}$/;

export function makeIds(randomBytes = crypto.randomBytes) {
  return {
    pollId: () => randomBytes(12).toString('base64url'), // 12 bytes -> 16 个 base64url 字符
    adminKey: () => randomBytes(16).toString('base64url'), // 16 bytes（128 bit）-> 22 字符
  };
}
