// 领域逻辑：创建校验、开放状态判定、投票提交校验与计票。纯函数，无 IO。
import { newPollId, newAdminKey } from './store.js';

export const LIMITS = {
  titleMax: 200,
  optionMax: 100,
  optionsMin: 2,
  optionsMax: 20,
};

/**
 * 校验创建输入并构造 poll 对象。
 * input: { title, options: string[], multi?: bool, maxChoices?: number|null, deadline?: string|null }
 * 返回 { ok: true, poll } 或 { ok: false, error }
 */
export function buildPoll(input, now = new Date()) {
  const title = (input.title ?? '').trim();
  if (!title) return fail('标题不能为空');
  if (title.length > LIMITS.titleMax) return fail(`标题不能超过 ${LIMITS.titleMax} 字符`);

  const options = (input.options ?? []).map((o) => String(o).trim()).filter(Boolean);
  if (options.length < LIMITS.optionsMin) return fail(`至少需要 ${LIMITS.optionsMin} 个选项`);
  if (options.length > LIMITS.optionsMax) return fail(`选项不能超过 ${LIMITS.optionsMax} 个`);
  for (const o of options) {
    if (o.length > LIMITS.optionMax) return fail(`选项不能超过 ${LIMITS.optionMax} 字符`);
  }

  const multi = Boolean(input.multi);
  let maxChoices = null;
  if (multi && input.maxChoices != null && String(input.maxChoices).trim() !== '') {
    maxChoices = Number(input.maxChoices);
    if (!Number.isInteger(maxChoices) || maxChoices < 2 || maxChoices > options.length) {
      return fail(`多选上限必须是 2~${options.length} 的整数`);
    }
  }

  let deadline = null;
  if (input.deadline != null && String(input.deadline).trim() !== '') {
    const d = new Date(input.deadline);
    if (Number.isNaN(d.getTime())) return fail('截止时间格式无效');
    if (d.getTime() <= now.getTime()) return fail('截止时间必须晚于当前时间');
    deadline = d.toISOString();
  }

  return {
    ok: true,
    poll: {
      id: newPollId(),
      title,
      options,
      multi,
      maxChoices,
      deadline,
      adminKey: newAdminKey(),
      closed: false,
      counts: options.map(() => 0),
      totalVoters: 0,
      createdAt: now.toISOString(),
    },
  };
}

/** 开放判定：未手动关闭，且（无截止时间或未到截止时间）。每次请求被动计算。 */
export function isOpen(poll, now = new Date()) {
  if (poll.closed) return false;
  if (poll.deadline && now.getTime() >= new Date(poll.deadline).getTime()) return false;
  return true;
}

/**
 * 校验一次投票提交并返回计票后的新 poll。
 * choices: number[]（选项索引）
 * 返回 { ok: true, poll } 或 { ok: false, error }
 */
export function castVote(poll, choices, now = new Date()) {
  if (!isOpen(poll, now)) return fail('投票已结束');

  if (!Array.isArray(choices) || choices.length === 0) return fail('请至少选择一项');
  const uniq = [...new Set(choices)];
  if (uniq.length !== choices.length) return fail('选项重复');
  for (const c of uniq) {
    if (!Number.isInteger(c) || c < 0 || c >= poll.options.length) return fail('存在无效选项');
  }

  if (!poll.multi) {
    if (uniq.length !== 1) return fail('单选投票只能选择一项');
  } else if (poll.maxChoices != null && uniq.length > poll.maxChoices) {
    return fail(`最多可选 ${poll.maxChoices} 项`);
  }

  const counts = [...poll.counts];
  for (const c of uniq) counts[c] += 1;
  return { ok: true, poll: { ...poll, counts, totalVoters: poll.totalVoters + 1 } };
}

/** 关闭投票（幂等）。 */
export function closePoll(poll) {
  return poll.closed ? poll : { ...poll, closed: true };
}

/** 结果视图：各选项票数与占比（分母 totalVoters；0 票时占比 0）。 */
export function resultsView(poll, now = new Date()) {
  const total = poll.totalVoters;
  return {
    title: poll.title,
    multi: poll.multi,
    total,
    open: isOpen(poll, now),
    deadline: poll.deadline,
    rows: poll.options.map((label, i) => ({
      label,
      count: poll.counts[i],
      pct: total === 0 ? 0 : Math.round((poll.counts[i] / total) * 100),
    })),
  };
}

function fail(error) {
  return { ok: false, error };
}
