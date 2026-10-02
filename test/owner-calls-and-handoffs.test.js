'use strict';
// owner-calls-and-handoffs — PR-64 (an item marked as the owner's call is not decided by a broad
// instruction; words recorded for the owner are disclosed; R1 names the families --force carries),
// PR-65 (a delivery dependency handed outside the workflow keeps its id as a pending item; a document
// is not the work done), PR-66 (every /goal recipe carries the human stop as a second terminal outcome).
// Sources: the 2026-10-02 analysis of requirement 5.9 and the Claude × Astra consensus (R59 batch 1).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const EN = read('RUNBOOK.md');
const flat = (s) => s.replace(/\s+/g, ' ');

test('PR-64 a broad instruction does not decide an owner item, and recording for the owner is disclosed', () => {
  const r1 = EN.slice(EN.indexOf('**R1 —'), EN.indexOf('### External side effects'));
  const para = flat(r1.slice(r1.indexOf('> An owner decision is recorded')));
  assert.match(para, /an escalated review family — an `escalate` verdict, a round past its one automatic re-review that no owner release opened or that still revises, or a `revise` after the owner answered the limit round itself with a `reframe` \(§1 R4\) — needs both the recorded decision AND an explicit `--force`/);
  // §4's archive sentence names the same escalated family (OC-02: archive keys --force on the derived escalation, not on a round's position)
  assert.match(flat(EN), /`--force` overrides \*\*progress only\*\*, and only where the owner's decision is already in `gates:`: an escalated review family — an `escalate` verdict, a round past its one automatic re-review that no owner release opened or that still revises, or a `revise` after the owner answered the limit round itself with a `reframe` \(§1 R4\) — that the owner answered with `reframe`/);
  assert.doesNotMatch(r1, /stopped at its limit/, 'the stale "stopped at its limit" survives in R1');
  assert.match(para, /\*\*What is marked as the owner's stays the owner's\.\*\*/);
  assert.match(para, /marks an item as the owner's call — a scope, a caliber, a risk to accept — and no valid owner decision covers it yet, a broad instruction such as "fix everything else" does not decide it: it stays a pending `## Open` item until the owner answers it/);
  assert.match(para, /One answer may settle several such items, as long as it names them/);
  assert.match(para, /add a `note:` saying you recorded it on their behalf and where the words came from/);
  assert.match(para, /The note discloses; it does not make theirs anything they did not say — a reframe kind they did not name, your reading of an ambiguous answer — so the note says which parts are yours\./);
});

test('PR-65 a dependency handed outside the workflow stays pending, and a document does not discharge it', () => {
  const split = flat(EN.match(/^- \*\*Split first\.\*\*.*$/m)[0]);
  assert.match(split, /The same holds when the delivery depends on something handed outside this workflow — a manual release step, another repository, a person: it keeps its id as a pending `## Open` item naming who or what carries it \(`- <ID>: <text> — carried by <step, repository or person>`\) and what is still unverified, and only their evidence or the owner's acceptance closes it\./);
  assert.match(split, /A document describing what they must do is not the work done, and a `decision` line never stands in for it\./);
  const p2 = EN.match(/^\* Split first:.*$/m)[0];
  assert.match(p2, /So does one handed outside this workflow \(a manual release step, another repository\): a document describing it is not the work done\./);
  // no new grammar: to C9 the carried line is an ordinary pending item, closed only by the owner's acceptance
  const rd = require('../lib/readiness');
  const flow = (gates) => `change: c1\nphase: review\n\n## Reality Check\n\n## Open\n- TS-1: the scheduled-trigger code in task-scheduler — carried by the release step\n\ngates:\n  - 2026-10-02T00:00 note: fixture\n${gates}`;
  assert.strictEqual(rd.checkEvidenceStatus(flow('')).status, 'blocked', 'a dependency handed outside the workflow must block');
  assert.strictEqual(rd.checkEvidenceStatus(flow('  - 2026-10-02T01:00 owner: evidence-accept TS-1 — ships with the release; I will verify it there\n')).status, 'pass',
    'the owner\'s acceptance naming it closes it');
});

test('PR-66 each recipe\'s goal condition carries the human-stop outcome, and the handbook says why', () => {
  for (const f of ['docs/operator.md', 'docs/operator_cn.md']) {
    const blocks = [...read(f).matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1]);
    const goals = blocks.filter((b) => b.startsWith('/goal "'));
    assert.strictEqual(goals.length, 4, `${f}: four /goal recipes`);
    for (const g of goals) {
      const sentence = g.split('\n')[0];                       // the goal condition is the recipe's first line
      assert.match(sentence, /— OR you stopped at (a human stop|the 25-turn bound or at a human stop|one of the human stops listed below) \(§1 R1[^)]*\)(?: or at the Build & Test stage's 25-turn bound,)? and your last message names it/, `${f}: ${sentence.slice(0, 60)}…`);
      assert.match(sentence, /the decision the owner must make; that outcome hands the change back and is never a (pass|delivery|pass or a delivery)\./, `${f}: ${sentence.slice(0, 60)}…`);
    }
    // OC-01: a recipe that runs Build & Test carries its 25-turn bound in the condition too
    for (const g of goals.filter((x) => /Safety bound(?: for this stage)?: 25 turns/.test(x)))
      assert.match(g.split('\n')[0], /25-turn bound/, `${f}: a recipe bounded at 25 turns does not end at that bound in its condition`);
  }
  // the Chinese operator guide carries the identical recipe text
  const recipes = (f) => [...read(f).matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1]).filter((b) => b.startsWith('/goal "'));
  assert.deepStrictEqual(recipes('docs/operator_cn.md'), recipes('docs/operator.md'));
  assert.match(flat(read('docs/concepts.md')), /\*\*A goal ends at a human stop too\.\*\* The evaluator judges only the condition you gave it: a stop listed in the goal's body does not end the loop/);
  assert.match(flat(read('docs/concepts_cn.md')), /\*\*goal 也要在人类停点结束。\*\* 评估器只判你给它的那个条件:写在 goal 正文里的停点结束不了循环/);
});
