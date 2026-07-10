'use strict';
// per-poll 串行化写队列（PC-10）。单进程内对每个 pollId 维护一条 Promise 链，
// 同一投票的读改写永不交叠。多实例部署会破坏此保证（proposal/design 已声明 out of scope）。

const chains = new Map();

function runExclusive(key, fn) {
  const prev = chains.get(key) || Promise.resolve();
  // 不论前一个成功或失败，都继续执行本次（隔离失败，不阻塞后续）。
  const run = prev.then(() => fn(), () => fn());
  // 链尾吞掉 rejection，避免 unhandledRejection；调用方拿到的是 run 本身。
  chains.set(key, run.then(() => {}, () => {}));
  return run;
}

module.exports = { runExclusive };
