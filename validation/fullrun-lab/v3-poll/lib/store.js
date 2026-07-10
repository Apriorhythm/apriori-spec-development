// 存储层：data/<pollId>.json 的读与原子写（design §2）。
// - writeNew：tmp + link —— 目标已存在则 EEXIST，绝不覆盖（创建路径）
// - writeExisting：tmp + rename —— 原子替换（更新路径）
// fs 可注入（测试记录器 / 故障注入）。
import fsDefault from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { CorruptError, ExistsError, NotFoundError } from './errors.js';

export function createStore({ dataDir, fs = fsDefault }) {
  const root = path.resolve(dataDir);

  function pollPath(id) {
    const p = path.resolve(root, id + '.json');
    if (path.dirname(p) !== root) throw new NotFoundError(id); // 纵深防御；router 已做 regex 校验
    return p;
  }

  async function init() {
    await fs.mkdir(root, { recursive: true });
    for (const f of await fs.readdir(root))
      if (f.startsWith('.tmp-')) await fs.unlink(path.join(root, f)).catch(() => {}); // 清理崩溃残留
  }

  async function read(id) {
    let text;
    try {
      text = await fs.readFile(pollPath(id), 'utf8');
    } catch (e) {
      if (e && e.code === 'ENOENT') throw new NotFoundError('投票不存在');
      throw e;
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new CorruptError('数据损坏');
    }
  }

  async function writeTmp(poll) {
    const tmp = path.join(root, `.tmp-${poll.id}-${crypto.randomBytes(4).toString('hex')}`);
    await fs.writeFile(tmp, JSON.stringify(poll, null, 2));
    return tmp;
  }

  async function writeNew(poll) {
    const tmp = await writeTmp(poll);
    try {
      await fs.link(tmp, pollPath(poll.id));
    } catch (e) {
      await fs.unlink(tmp).catch(() => {});
      if (e && e.code === 'EEXIST') throw new ExistsError(poll.id);
      throw e;
    }
    await fs.unlink(tmp).catch(() => {});
  }

  async function writeExisting(poll) {
    const tmp = await writeTmp(poll);
    try {
      await fs.rename(tmp, pollPath(poll.id));
    } catch (e) {
      await fs.unlink(tmp).catch(() => {});
      throw e;
    }
  }

  return { init, read, writeNew, writeExisting };
}
