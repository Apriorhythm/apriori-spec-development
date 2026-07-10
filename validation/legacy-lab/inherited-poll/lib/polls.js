'use strict';
const crypto = require('node:crypto');

class PollError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const ID_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomId(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ID_CHARS[bytes[i] % ID_CHARS.length];
  return out;
}

function createPolls(store, now = () => new Date()) {
  function create(input) {
    const question = String(input.question ?? '').trim();
    if (!question) throw new PollError(400, '问题不能为空');
    if (question.length > 200) throw new PollError(400, '问题不能超过 200 字');

    const raw = Array.isArray(input.options) ? input.options : [];
    const options = raw.map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 2) throw new PollError(400, '至少需要 2 个选项');
    if (options.length > 20) throw new PollError(400, '选项不能超过 20 个');
    if (options.some((o) => o.length > 100)) throw new PollError(400, '单个选项不能超过 100 字');

    let deadline = null;
    if (input.deadline) {
      const d = new Date(input.deadline);
      if (Number.isNaN(d.getTime())) throw new PollError(400, '截止时间格式不正确');
      if (d <= now()) throw new PollError(400, '截止时间必须晚于当前时间');
      deadline = d.toISOString();
    }

    const poll = {
      id: randomId(6),
      adminToken: randomId(16),
      question,
      options,
      multiple: Boolean(input.multiple),
      deadline,
      closed: false,
      votes: [],
      voters: [], // 已投过的标识摘要（HMAC），不存标识明文；旧数据无此字段，读取时归一化
      createdAt: now().toISOString(),
    };
    store.put(poll);
    return poll;
  }

  function isOpen(poll) {
    if (poll.closed) return false;
    if (poll.deadline && now() >= new Date(poll.deadline)) return false;
    return true;
  }

  // 基础投影：字段与历史版本完全一致，永不携带 voted —— admin 视图专用（VD-11）。
  function view(poll) {
    const counts = poll.options.map(
      (_, i) => poll.votes.filter((v) => v.includes(i)).length
    );
    return {
      id: poll.id,
      question: poll.question,
      options: poll.options,
      multiple: poll.multiple,
      deadline: poll.deadline,
      closed: poll.closed,
      open: isOpen(poll),
      counts,
      total: poll.votes.length,
    };
  }

  // 旧数据兼容（DES-001）：本次改动前的存量记录没有 voters 字段，读取时一律归一化为 []。
  function votersOf(poll) {
    return Array.isArray(poll.voters) ? poll.voters : [];
  }

  // 公开投影：基础字段 + 派生布尔 voted（携带有效标识且已投过 → true）。
  function publicView(poll, voterId) {
    return { ...view(poll), voted: Boolean(voterId) && votersOf(poll).includes(voterId) };
  }

  function getPoll(id) {
    const poll = store.get(id);
    if (!poll) throw new PollError(404, '投票不存在');
    return poll;
  }

  function getView(id, voterId) {
    return publicView(getPoll(id), voterId);
  }

  // voterId 为 HTTP 层校验 cookie 后算出的标识摘要；cookie 的签发/校验不进领域层。
  // 整个函数保持同步（无 await/回调）：检查→计票→标记→落盘之间没有事件循环让出点，
  // 这是 VD-08 并发保证的成立前提（design.md §3）——改动此函数时不得引入异步步骤。
  function vote(id, choices, voterId) {
    const poll = getPoll(id);
    if (poll.closed) throw new PollError(409, '投票已关闭');
    if (!isOpen(poll)) throw new PollError(409, '投票已过截止时间');
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new PollError(400, '请至少选择一个选项');
    }
    const validIndex = (c) => Number.isInteger(c) && c >= 0 && c < poll.options.length;
    if (!choices.every(validIndex) || new Set(choices).size !== choices.length) {
      throw new PollError(400, '选项不合法');
    }
    if (!poll.multiple && choices.length > 1) {
      throw new PollError(400, '该投票为单选，只能选择一个选项');
    }
    const voters = votersOf(poll);
    if (voters.includes(voterId)) throw new PollError(409, '你已经投过这个投票了');
    // 在新对象上应用变更，绝不原地改 poll：store.put 落盘失败抛错时，
    // 内存中的原对象未被碰过，回滚即“什么都不用做”（VD-09 的 all-or-nothing）。
    const candidate = { ...poll, votes: [...poll.votes, choices], voters: [...voters, voterId] };
    store.put(candidate);
    return publicView(candidate, voterId);
  }

  function findByToken(token) {
    const all = store.all();
    for (const id of Object.keys(all)) {
      if (all[id].adminToken === token) return all[id];
    }
    throw new PollError(404, '管理链接不存在');
  }

  function adminView(token) {
    return view(findByToken(token));
  }

  function close(token) {
    const poll = findByToken(token);
    poll.closed = true;
    store.put(poll);
    return view(poll);
  }

  return { create, getView, vote, adminView, close };
}

module.exports = { createPolls, PollError };
