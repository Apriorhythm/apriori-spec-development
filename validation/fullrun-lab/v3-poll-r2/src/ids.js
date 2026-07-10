'use strict';
// 标识符生成（PC-01/PC-08）：pollId 与 adminKey 各由 CSPRNG 生成、128-bit、URL-safe，
// 不含创建顺序/时间信息（不可枚举）。
const crypto = require('node:crypto');

function newToken() {
  // 16 bytes = 128 bit; base64url 无 +/=，可安全用作 URL 段与文件名
  return crypto.randomBytes(16).toString('base64url');
}

module.exports = {
  newPollId: newToken,
  newAdminKey: newToken,
};
