'use strict';
// 输入校验（PC-02/03/04/12/14）。纯函数，便于单测。
// 返回 { ok:true, value } 或 { ok:false, code, error }。

const TITLE_MAX = 200;
const OPT_MAX = 200;
const OPT_MIN_COUNT = 2;
const OPT_MAX_COUNT = 20;

function fail(error, code = 400) { return { ok: false, code, error }; }

function parseDeadline(d) {
  if (typeof d === 'number' && Number.isFinite(d)) return Math.trunc(d);
  if (typeof d === 'string') {
    const ms = Date.parse(d);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

// 创建请求：类型契约 + 边界（REQ-4/REQ-10）。
function validateCreate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body must be an object');
  const { title, options, mode, deadline } = body;

  if (typeof title !== 'string') return fail('title must be a string');
  const t = title.trim();
  if (t.length < 1 || t.length > TITLE_MAX) return fail(`title length must be 1..${TITLE_MAX}`);

  if (!Array.isArray(options) || !options.every((o) => typeof o === 'string')) {
    return fail('options must be an array of string');
  }
  const opts = options.map((o) => o.trim());
  if (opts.some((o) => o.length < 1)) return fail('options must not be blank');
  if (opts.some((o) => o.length > OPT_MAX)) return fail(`option length must be <= ${OPT_MAX}`);
  if (opts.length < OPT_MIN_COUNT || opts.length > OPT_MAX_COUNT) {
    return fail(`option count must be ${OPT_MIN_COUNT}..${OPT_MAX_COUNT}`);
  }

  if (mode !== 'single' && mode !== 'multiple') return fail('mode must be "single" or "multiple"');

  let deadlineMs = null;
  if (deadline !== undefined && deadline !== null) {
    deadlineMs = parseDeadline(deadline);
    if (deadlineMs === null) return fail('deadline is malformed');
    if (deadlineMs <= Date.now()) return fail('deadline must be in the future');
  }

  return { ok: true, value: { title: t, options: opts, mode, deadlineMs } };
}

// 投票 payload 校验（REQ-5/PC-12/14/04）。poll 为已读到的最新记录。
// 不在此判定 closed/deadline —— 那由 server 在临界区内判定。
function validateVote(poll, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body must be an object');
  const ids = body.optionIds;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) {
    return fail('optionIds must be an array of string');
  }
  const known = new Set(poll.options.map((o) => o.id));
  if (ids.some((id) => !known.has(id))) return fail('unknown option id');
  if (new Set(ids).size !== ids.length) return fail('duplicate option id');
  if (poll.mode === 'single') {
    if (ids.length !== 1) return fail('single-choice poll requires exactly one option');
  } else {
    if (ids.length < 1) return fail('multiple-choice poll requires at least one option');
  }
  return { ok: true, value: { optionIds: ids } };
}

module.exports = { validateCreate, validateVote, parseDeadline, TITLE_MAX, OPT_MAX, OPT_MIN_COUNT, OPT_MAX_COUNT };
