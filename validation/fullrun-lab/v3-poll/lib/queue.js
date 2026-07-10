// per-poll 串行化队列（design §2，SPEC-3 失败隔离版）：
// 入队顺序 = 生效顺序；前序任务失败被吞掉后再挂新任务 —— 一次失败绝不断链；
// 调用方拿到自己任务的 promise（自己的错误自己收）；finally 防 Map 泄漏且不误删新 tail。
export function createQueue() {
  const tails = new Map();
  return function enqueue(key, task) {
    const prev = tails.get(key) ?? Promise.resolve();
    const run = prev.catch(() => {}).then(task);
    tails.set(key, run);
    run
      .catch(() => {})
      .finally(() => {
        if (tails.get(key) === run) tails.delete(key);
      });
    return run;
  };
}
