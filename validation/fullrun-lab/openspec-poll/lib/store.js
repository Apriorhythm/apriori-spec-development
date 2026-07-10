// 存储层：每投票一个 JSON 文件，原子写 + 每投票串行化写队列。
// 单进程假设（见 design.md D4）。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const ID_RE = /^[A-Za-z0-9_-]+$/;

export function randomToken(length) {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += URL_ALPHABET[bytes[i] & 63];
  return out;
}

export const newPollId = () => randomToken(8);
export const newAdminKey = () => randomToken(24);

export function isValidId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 64 && ID_RE.test(id);
}

export class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.writeChains = new Map(); // pollId -> tail promise（串行化写队列）
  }

  async init() {
    await mkdir(this.dataDir, { recursive: true });
    return this;
  }

  filePath(id) {
    if (!isValidId(id)) throw new Error('invalid poll id');
    return path.join(this.dataDir, `${id}.json`);
  }

  /** 读投票；不存在或 ID 非法返回 null。 */
  async readPoll(id) {
    if (!isValidId(id)) return null;
    try {
      return JSON.parse(await readFile(this.filePath(id), 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  /** 原子写：写临时文件后 rename（同目录内原子）。 */
  async #atomicWrite(id, poll) {
    const target = this.filePath(id);
    const tmp = path.join(this.dataDir, `.${id}.${randomToken(6)}.tmp`);
    await writeFile(tmp, JSON.stringify(poll, null, 2), 'utf8');
    await rename(tmp, target);
  }

  /** 创建投票文件（首次写入）。 */
  async createPoll(poll) {
    return this.#enqueue(poll.id, async () => {
      await this.#atomicWrite(poll.id, poll);
      return poll;
    });
  }

  /**
   * 串行化的读-改-写。mutator 收到当前 poll（可能为 null），
   * 返回新 poll 对象则落盘；返回 null/undefined 则不写。
   * 返回 { poll, result }，result 为 mutator 附带结果。
   */
  async updatePoll(id, mutator) {
    if (!isValidId(id)) throw new Error('invalid poll id');
    return this.#enqueue(id, async () => {
      const current = await this.readPoll(id);
      const outcome = await mutator(current);
      if (outcome && outcome.poll) {
        await this.#atomicWrite(id, outcome.poll);
      }
      return outcome;
    });
  }

  /** 把操作挂到该 pollId 的 promise 链尾，保证同一投票的写严格串行。 */
  #enqueue(id, op) {
    const tail = this.writeChains.get(id) ?? Promise.resolve();
    const next = tail.then(op, op); // 前序失败不阻塞后续
    // 链上保留一个吞掉错误的哨兵，防 unhandled rejection；调用方拿到的是 next 本身
    this.writeChains.set(id, next.catch(() => {}));
    return next;
  }
}

export async function openStore(dataDir) {
  return new Store(dataDir).init();
}
