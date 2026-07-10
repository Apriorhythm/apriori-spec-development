// 客户端纯逻辑（design §4）：浏览器与 node:test 双用 —— 无 DOM/window 顶层引用，依赖全部注入。

// PG-04：3 秒轮询；单次失败不更新（保留上次结果），下一轮继续。
export function createPoller({ fetchResults, onUpdate, setIntervalFn, intervalMs = 3000 }) {
  async function tick() {
    try {
      onUpdate(await fetchResults());
    } catch {
      /* 保留上次显示的结果，等下一轮 */
    }
  }
  return {
    start() {
      tick();
      return setIntervalFn(tick, intervalMs);
    },
  };
}

// PG-05：已投判定。storage 异常（隐私模式等）退化为允许投票。
export function votedState({ storage, pollId }) {
  try {
    return storage.getItem('quick-poll-voted:' + pollId) ? 'voted' : 'can-vote';
  } catch {
    return 'can-vote';
  }
}

export function markVoted({ storage, pollId }) {
  try {
    storage.setItem('quick-poll-voted:' + pollId, '1');
  } catch {
    /* 标记失败可接受（req-final §4.6 的退化） */
  }
}

// 渲染用的纯计算：每个选项的百分比（结果条宽度）。
export function percentages(options) {
  const total = options.reduce((n, o) => n + o.votes, 0);
  return options.map((o) => (total === 0 ? 0 : Math.round((o.votes / total) * 100)));
}
