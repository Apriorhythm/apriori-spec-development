'use strict';
// writeback-fate-default — what an edit path cannot represent is kept or refused by default, never dropped silently;
// the rule triggers on any change to how stored content enters an edit path (an extended adapter included); the
// walk read → edit → save or refusal → re-read is evidence (PR-77). Trigger: v6-dev@0cdebfc (ground-writeback-trace)
// still failed custom-properties B4 twice (2026-10-30) — Ground traced the write-back and saw the drop, but one
// producer kept "the previous behavior" by its own decision (it had only extended the adapter, so "builds or
// replaces" did not bind), and the other routed the fate to the owner only after review, as an ## Open item that
// no owner answered. Claude × Astra consensus R1030 §二, human 2026-10-31.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const EN = read('RUNBOOK.md');
const line = (text, start) => text.split('\n').find((l) => l.startsWith(start));
const between = (text, from, to) => { const i = text.indexOf(from); const j = text.indexOf(to, i); assert.ok(i >= 0 && j > i, `${from} … ${to}`); return text.slice(i, j); };

test('PR-77 the fate of unrepresentable stored content defaults to keep-or-refuse, on any change to the edit path, and the walk is evidence', () => {
  // §4 Ground: trigger widened, default stated, ## Open no longer the route for "may data be lost"
  const ground = line(EN, '- **A persisted structure whose meaning this change extends is shared state.**');
  assert.ok(ground, 'the Ground bullet exists');
  assert.match(ground, /Where this change changes how the stored content enters an edit path, how it is represented, edited or written back — an existing adapter or representation it extends included, whether or not the write-back function itself is touched — that fate is a behavior of the contract, not an assumption/);
  assert.match(ground, /a `decision` when a source or the owner settles it, otherwise the safe default below, recorded as a decision that cites this rule, never an `## Open` item that asks the owner whether stored data may be lost/);
  assert.match(ground, /\*\*The safe default: nothing is dropped silently\.\*\* Without a source that authorizes the loss, no part of a stored value is dropped because the changed page or API cannot represent it — that the existing path already drops it states the current behavior and authorizes nothing/);
  assert.match(ground, /keeps the parts the edit did not touch and applies the edit \(a mechanical splice that changes what the stored value means is not keeping it\)/);
  assert.match(ground, /the edit is refused, or that region is read-only, before anything destructive happens, with the reason shown, and the stored value re-reads unchanged/);
  assert.match(ground, /A source that requires the object to be editable is not satisfied by read-only/);
  assert.match(ground, /what the owner may want beyond the safe default is a follow-up, never a blocker/);
  assert.doesNotMatch(ground, /builds or replaces the write-back/, 'the narrow trigger is gone');
  assert.match(ground, /records as an `observed:` line what the existing read → edit → write-back path does/, 'PR-76 trace stays');
  // P1
  const p1 = line(EN, 'A persisted structure whose meaning this change extends (a stored JSON field, a settings record, a saved document) is shared state:');
  assert.ok(p1, 'P1 carries the instruction');
  assert.match(p1, /Where this change changes how the stored content enters an edit path, is represented, edited or written back \(an existing adapter or representation it extends included, whether or not the write-back itself is touched\), that fate is contract behavior for Specify's runtime-update moment: a decision when a source or the owner settles it, otherwise the runbook's safe default/);
  assert.match(p1, /without a source authorizing the loss, keep what the edit did not touch and apply the edit, or refuse the edit \/ make the region read-only before anything is destroyed, with the reason shown — never drop silently; "the existing path already drops it" authorizes nothing/);
  assert.match(p1, /recorded as a decision citing the rule — not an assumption, and not an ## Open item asking the owner whether data may be lost/);
  assert.doesNotMatch(p1, /builds or replaces the write-back/);
  // §4 Specify and P2: the runtime-update moment states the default where no source settles it
  const minimal = line(EN, '- **Minimal means minimal.**');
  assert.match(minimal, /for a structure this change extends, runtime update states what happens to the parts of the stored value the new code cannot represent \(what the changed page or API cannot show or edit\) — and, where no source settles that, states §4 Ground's safe default \(kept, or the edit refused \/ the region read-only; never dropped silently\) as a decision citing it/);
  const p2 = line(EN, '* Any external shared state');
  assert.match(p2, /for a structure you extend, runtime update states what happens to the parts of the stored value the new code cannot represent \(what the changed page or API cannot show or edit\) — and, where no source settles that, states §4 Ground's safe default \(kept, or the edit refused \/ the region read-only; never dropped silently\) as a decision citing it/);
  // §4 Build & Test and P2's Build & Test part: the walk is evidence
  const risks = line(EN, '- **Run the tests the risks call for, not a matrix.**');
  assert.match(risks, /For a stored structure this change extends \(§4 Ground\), the risks always include one full walk with stored content the changed page or API cannot represent: read the stored object → attempt the edit → save, or the refusal → re-read it independently; the evidence \(a test, or an `observed:` line with expected \/ actual \/ where it lives\) shows the untouched parts still there with their meaning — for the refusal, the message and the stored value unchanged\. The adapter's conversion alone, a success status from the API alone, or a page refresh alone is not that evidence\./);
  assert.match(risks, /Review reads; it does not run\./, 'PR-74 text stays');
  const p2build = line(EN, '[Build & Test] Derive a failing test');
  assert.match(p2build, /For a stored structure you extend, walk the full path once with stored content the changed page or API cannot represent — read → attempt the edit → save or the refusal → re-read independently — and let the evidence show the untouched parts still there with their meaning \(for a refusal: the message, and the stored value unchanged\); the adapter's conversion, a success status or a refresh alone is not that evidence\./);
  // handbook and CLI reference echo the default, both editions
  const concepts = read('docs/concepts.md'); const cn = read('docs/concepts_cn.md');
  assert.match(concepts, /records the fate of the parts the new code cannot represent — and, with no source authorizing their loss, that fate defaults to keeping them or refusing the edit, never dropping them silently\)/);
  assert.match(cn, /并记录新代码表示不了的部分的命运——没有来源授权丢弃时，默认保留它们或拒绝编辑，绝不静默丢掉）/);
  const cli = read('docs/cli.md'); const cliCn = read('docs/cli_cn.md');
  assert.match(cli, /2\. Update at runtime \(for a structure the change extends: what happens to the parts of the stored value the new code cannot represent — kept, or the edit refused \/ the region read-only, unless a source authorizes their loss; never dropped silently\)/);
  assert.match(cliCn, /2\. 运行中更新（对本次改动扩展了语义的结构：存储值里新代码表示不了的部分会怎样——除非有来源授权丢弃，否则保留，或拒绝编辑 \/ 该区域只读；绝不静默丢掉）/);
  // P3 unchanged; no new mechanism, no task-specific text
  const p3 = between(EN, '### P3 — independent review', '### P4 —');
  assert.doesNotMatch(p3, /write-back|stored value|safe default/);
  for (const [label, t] of [['ground', ground], ['p1', p1], ['minimal', minimal], ['p2', p2], ['risks', risks], ['p2build', p2build]]) {
    assert.doesNotMatch(t, /gate C\d|a new field|diagram|architecture map|deep search|coverage ledger|a new document|data-flow map/i, `${label}: no new mechanism`);
    assert.doesNotMatch(t, /rich_filters|IssueView|custom propert|Plane|OR\/NOT|saved view/i, `${label}: no task-specific text`);
  }
});
