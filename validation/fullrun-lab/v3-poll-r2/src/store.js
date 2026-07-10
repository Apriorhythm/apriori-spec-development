'use strict';
// 文件存储层（PC-10/11/13）。每投票一个 <pollId>.json。
// 写盘用「临时文件 + fsync + 原子 rename」，durable 之后调用方才返回成功。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function pollPath(dir, id) { return path.join(dir, id + '.json'); }

// 原子写：tmp(唯一后缀，非 .json) → fsync → rename。
// hooks.afterTmpWrite(tmp)：tmp 写完、rename 前调用（测试注入崩溃 PC-11）。
// hooks.failRename：rename 前抛错（测试注入写失败 PC-13）。
// 任一失败：目标文件保持原样，清理 tmp。
function writeAtomic(file, str, hooks = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp.' + crypto.randomBytes(6).toString('hex');
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, str);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    if (hooks.afterTmpWrite) hooks.afterTmpWrite(tmp);
    if (hooks.failRename) throw new Error('injected rename failure');
    fs.renameSync(tmp, file);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* tmp 已被 hook 处理则忽略 */ }
    throw e;
  }
}

function exists(dir, id) { return fs.existsSync(pollPath(dir, id)); }

function read(dir, id) {
  try {
    return JSON.parse(fs.readFileSync(pollPath(dir, id), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function save(dir, poll, hooks) {
  writeAtomic(pollPath(dir, poll.pollId), JSON.stringify(poll), hooks);
  return poll;
}

module.exports = { pollPath, writeAtomic, read, save, exists };
