'use strict';
// ground-writeback-trace — a persisted structure whose meaning this change extends (a stored JSON field, a settings
// record, a saved document) is external shared state in the sense of Specify's three moments; Ground traces it
// read → intermediate form → edit → write-back and records what happens to the parts of the stored value the new
// code cannot represent (PR-76). Trigger: the candidate v6-dev@e8f9342 still failed custom-properties B4 twice
// (2026-10-28) — Ground had found the stored field and the editor's adapter, but never asked what the write-back
// does to the conditions the editor cannot show; the saved conditions were overwritten.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const EN = read('RUNBOOK.md');
const line = (text, start) => text.split('\n').find((l) => l.startsWith(start));
const count = (text, re) => (text.match(re) || []).length;

test('PR-76 an extended persisted structure is shared state and Ground traces it to the write-back', () => {
  // §4 Ground: the rule sits among the Ground bullets, after the no-facts-from-memory rule
  const ground = line(EN, '- **A persisted structure whose meaning this change extends is shared state.**');
  assert.ok(ground, 'the Ground bullet exists');
  const groundIdx = EN.indexOf(ground); const memoryIdx = EN.indexOf('- **Product facts may never be written from memory.**'); const kbIdx = EN.indexOf('### KB pre-check');
  assert.ok(memoryIdx < groundIdx && groundIdx < kbIdx, 'the bullet is in §4 Ground, after the no-facts-from-memory rule');
  assert.match(ground, /[Aa] stored JSON field, a settings record, a saved document/);
  assert.match(ground, /external shared state in the sense of Specify's three moments/);
  assert.match(ground, /how it is read, what intermediate form it takes, where it is edited and how it is written back/);
  assert.match(ground, /records as an `observed:` line what the existing read → edit → write-back path does to the parts of the stored value the changed representation cannot hold \(what the page or API cannot show or edit\): kept, merged, dropped or refused, for example/);
  assert.match(ground, /until that write-back has been read, that fate is an `assumption`, with the lifecycle above — verified, or carried to `## Open`/);
  assert.match(ground, /Where this change builds or replaces the write-back, that fate is a behavior of the contract, not an assumption: Specify's runtime-update moment states it — a `decision` when a source or the owner settles it, otherwise an `## Open` item for the owner/);
  assert.doesNotMatch(ground, /the new code cannot represent/, 'Ground does not ask for an observed line about code that does not exist yet (GW-1)');
  // P1 carries it to the producer
  const p1 = line(EN, 'A persisted structure whose meaning this change extends (a stored JSON field, a settings record, a saved document) is shared state:');
  assert.ok(p1, 'P1 carries the instruction');
  const p1Idx = EN.indexOf(p1); assert.ok(p1Idx > EN.indexOf('### P1 — Ground') && p1Idx < EN.indexOf('### P2 — producer'), 'inside P1');
  assert.match(p1, /trace how it is read, what intermediate form it takes, where it is edited and how it is written back/);
  assert.match(p1, /record as observed: what the existing write-back does to the parts of the stored value the changed representation cannot hold \(kept, merged, dropped, refused, for example\)/);
  assert.match(p1, /until that write-back is read, that fate is an assumption/);
  assert.match(p1, /Where this change builds or replaces the write-back, that fate is contract behavior for Specify's runtime-update moment \(a decision when a source or the owner settles it, otherwise an ## Open item\), not an assumption/);
  // P2 and §4 Specify name the structure among the shared state and pin the runtime-update moment
  const p2 = line(EN, '* Any external shared state');
  assert.match(p2, /\(Redis \/ DB field \/ global singleton \/ in-memory cache — a stored structure whose meaning you extend included\)/);
  assert.match(p2, /three moments: init \/ runtime update \/ cleanup-invalidation/, 'the existing rule stays');
  assert.match(p2, /for a structure you extend, runtime update states what happens to the parts of the stored value the new code cannot represent \(what the changed page or API cannot show or edit\)/);
  const minimal = line(EN, '- **Minimal means minimal.**');
  assert.match(minimal, /\(Redis \/ DB field \/ global singleton \/ in-memory cache — a stored structure whose meaning this change extends included\)/);
  assert.match(minimal, /for a structure this change extends, runtime update states what happens to the parts of the stored value the new code cannot represent \(what the changed page or API cannot show or edit\)/);
  assert.match(minimal, /tell a correct implementation from a likely wrong one/, 'PR-75 text stays');
  // handbook and CLI reference echo it, both editions
  const concepts = read('docs/concepts.md'); const cn = read('docs/concepts_cn.md');
  assert.match(concepts, /Ground traces its read → intermediate form → edit → write-back and records the fate of the parts the new code cannot represent/, 'EN walkthrough carries the Ground trace');
  assert.match(concepts, /a stored structure whose meaning the change extends included; its runtime-update moment states what happens to the parts the new code cannot represent/, 'EN P2 note carries the runtime-update clause');
  assert.match(cn, /Ground 追踪它的 读取 → 中间表示 → 编辑 → 写回，并记录新代码表示不了的部分的命运/, 'CN walkthrough carries the Ground trace');
  assert.match(cn, /本次改动扩展了语义的已存结构也算；其「运行中更新」要说明新代码表示不了的部分会怎样/, 'CN P2 note carries the runtime-update clause');
  const cli = read('docs/cli.md'); const cliCn = read('docs/cli_cn.md');
  assert.match(cli, /"external shared state" \(Redis, DB fields, global singletons, etc\. — a stored structure whose meaning the change extends included\)/);
  assert.match(cli, /2\. Update at runtime \(for a structure the change extends: what happens to the parts of the stored value the new code cannot represent\)/);
  assert.match(cliCn, /外部共享状态"（Redis、DB 字段、全局单例等——本次改动扩展了语义的已存结构也算）/);
  assert.match(cliCn, /2\. 运行中更新（对本次改动扩展了语义的结构：存储值里新代码表示不了的部分会怎样）/);
  // no new mechanism
  const added = (t, from) => { const i = t.indexOf(from); assert.ok(i >= 0, `fragment "${from}" present`); const end = t.indexOf('\n', i); return t.slice(i, end < 0 ? undefined : end); }; // the added sentence only, to its line end (A-6)
  for (const [label, t] of [['ground', ground], ['p1', p1], ['p2', added(p2, 'a stored structure')], ['minimal', added(minimal, 'a stored structure')],
    ['concepts', added(concepts, 'a stored structure whose meaning the change extends counts')], ['cli', added(cli, 'a stored structure whose meaning the change extends included')]]) {
    assert.doesNotMatch(t, /gate C\d|a new field|diagram|architecture map|deep search|coverage ledger|a new document|data-flow map/i, `${label}: no new mechanism`);
    assert.doesNotMatch(t, /rich_filters|IssueView|custom propert|Plane/i, `${label}: no task-specific text`);
  }
});
