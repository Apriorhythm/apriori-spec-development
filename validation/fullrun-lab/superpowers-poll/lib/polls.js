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

  function getPoll(id) {
    const poll = store.get(id);
    if (!poll) throw new PollError(404, '投票不存在');
    return poll;
  }

  function getView(id) {
    return view(getPoll(id));
  }

  function vote(id, choices) {
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
    poll.votes.push(choices);
    store.put(poll);
    return view(poll);
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
