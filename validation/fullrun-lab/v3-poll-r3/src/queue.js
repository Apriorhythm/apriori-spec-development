// Per-poll serial mutation queue (design SPEC-5).
// Guarantees: same-id fns run in enqueue order; a rejected fn does NOT poison
// the chain; cleanup only deletes a tail that is still current.
export function createQueue() {
  const map = new Map();

  function runExclusive(id, fn) {
    const prev = map.get(id) ?? Promise.resolve();
    // chain onto prev regardless of prev's outcome, so a prior failure never
    // skips this task.
    const run = prev.then(() => fn(), () => fn());
    // tail never rejects, so followers are never chained onto a rejected promise.
    const tail = run.then(() => {}, () => {});
    map.set(id, tail);
    tail.finally(() => {
      if (map.get(id) === tail) map.delete(id);
    });
    // caller gets the real result/error.
    return run;
  }

  return { runExclusive, _size: () => map.size };
}
