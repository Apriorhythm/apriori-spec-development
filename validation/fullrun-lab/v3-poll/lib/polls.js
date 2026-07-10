// 业务层：输入校验（req-final §4.1/§4.5）+ create/vote/close/getResults 状态机（§4.3）。
import { timingSafeEqual } from 'node:crypto';
import { BadKeyError, ClosedError, ExistsError, NotFoundError, ValidationError } from './errors.js';

const TITLE_MAX = 120;
const OPTION_MAX = 80;
const OPTIONS_MIN = 2;
const OPTIONS_MAX = 20;
const CREATE_ID_RETRIES = 5;

export function validateCreate(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ValidationError('请求体必须是 JSON 对象');
  const { title, options } = body;
  if (typeof title !== 'string') throw new ValidationError('标题必须是字符串');
  const t = title.trim();
  if (t.length < 1) throw new ValidationError('标题不能为空');
  if (t.length > TITLE_MAX) throw new ValidationError(`标题最长 ${TITLE_MAX} 字符`);
  if (!Array.isArray(options)) throw new ValidationError('选项必须是数组');
  const opts = [];
  for (const o of options) {
    if (typeof o !== 'string') throw new ValidationError('每个选项必须是字符串');
    const s = o.trim();
    if (s) opts.push(s); // trim 后为空的输入项忽略
  }
  if (opts.length < OPTIONS_MIN) throw new ValidationError(`有效选项至少 ${OPTIONS_MIN} 个`);
  if (opts.length > OPTIONS_MAX) throw new ValidationError(`选项最多 ${OPTIONS_MAX} 个`);
  for (const s of opts) if (s.length > OPTION_MAX) throw new ValidationError(`单个选项最长 ${OPTION_MAX} 字符`);
  if (new Set(opts).size !== opts.length) throw new ValidationError('存在重复选项');
  return { title: t, options: opts };
}

export function publicView(poll) {
  return {
    title: poll.title,
    options: poll.options.map((o) => ({ text: o.text, votes: o.votes })), // 顺序 = 创建顺序
    status: poll.status,
    total: poll.options.reduce((n, o) => n + o.votes, 0),
  };
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function createPolls({ store, queue, ids, now = () => new Date() }) {
  async function create(body) {
    const { title, options } = validateCreate(body);
    for (let attempt = 0; attempt < CREATE_ID_RETRIES; attempt++) {
      const poll = {
        schemaVersion: 1,
        id: ids.pollId(),
        title,
        options: options.map((text) => ({ text, votes: 0 })),
        status: 'open',
        adminKey: ids.adminKey(),
        createdAt: now().toISOString(),
        multiChoice: false, // 预留：多选（本次不实现）
        deadline: null, // 预留：截止时间（本次不实现）
      };
      try {
        await store.writeNew(poll); // link 路径：目标已存在 -> ExistsError，绝不覆盖
        return poll;
      } catch (e) {
        if (e instanceof ExistsError) continue; // 撞 id：重新生成
        throw e;
      }
    }
    throw new Error('pollId 生成重试超限');
  }

  function vote(id, body) {
    if (typeof body !== 'object' || body === null) throw new ValidationError('请求体必须是 JSON 对象');
    const { optionIndex } = body;
    if (!Number.isInteger(optionIndex)) throw new ValidationError('optionIndex 必须是整数');
    return queue(id, async () => {
      const poll = await store.read(id);
      if (poll.status !== 'open') throw new ClosedError('投票已关闭');
      if (optionIndex < 0 || optionIndex >= poll.options.length) throw new ValidationError('选项不存在');
      poll.options[optionIndex].votes += 1;
      await store.writeExisting(poll); // 成功响应 ⇔ 已落盘
      return publicView(poll);
    });
  }

  function close(id, body) {
    if (typeof body !== 'object' || body === null) throw new ValidationError('请求体必须是 JSON 对象');
    const { key } = body;
    if (typeof key !== 'string') throw new ValidationError('key 必须是字符串');
    return queue(id, async () => {
      const poll = await store.read(id);
      if (!safeEqual(key, poll.adminKey)) throw new BadKeyError('管理密钥不正确');
      if (poll.status === 'closed') return publicView(poll); // 幂等
      poll.status = 'closed';
      await store.writeExisting(poll);
      return publicView(poll);
    });
  }

  async function getResults(id) {
    return publicView(await store.read(id));
  }

  async function readAuthorized(id, key) {
    // 管理页：key 错与 poll 不存在统一 NotFound（不泄露存在性）
    const poll = await store.read(id).catch((e) => {
      if (e instanceof NotFoundError) throw new NotFoundError('页面不存在');
      throw e;
    });
    if (!safeEqual(key, poll.adminKey)) throw new NotFoundError('页面不存在');
    return poll;
  }

  return { create, vote, close, getResults, readAuthorized };
}
