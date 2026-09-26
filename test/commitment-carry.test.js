'use strict';
// commitment-carry — PR-57 (a commitment the split hands to another change keeps its id: pending and
// carried if this delivery depends on it, a follow-up if not, never both) and PR-58 (the receiving
// change carries it as a pending item and closes it only on its own exit evidence; picking it up,
// archiving the source or renaming never closes it). Both editions; text-level like the other PR scenarios.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const EN = read('RUNBOOK.md');
const CN = read('RUNBOOK_cn.md');

test('PR-57 a commitment handed across a split keeps its id in Split first and P2 (both editions)', () => {
  const splitEn = EN.match(/^- \*\*Split first\.\*\*.*$/m)[0];
  assert.match(splitEn, /When the split hands a commitment to another change — part of what the sources ask for, now to be delivered there — it keeps its id and cannot disappear/);
  assert.match(splitEn, /if THIS delivery depends on it, it stays a pending `## Open` item naming the change that carries it \(`- <ID>: <text> — carried by <change>`\), blocking until that change's exit evidence lands or the owner accepts it/);
  assert.match(splitEn, /if this delivery does not depend on it, it is a follow-up \(§4 Review & Deliver\) — never both for the same id/);
  assert.match(splitEn, /The carried line never keeps the follow-up prefix: turning a registered follow-up into a dependency means rewriting the line without `follow-up →` — a carry pointer appended to a follow-up line leaves it a non-blocking follow-up\./);
  const splitCn = CN.match(/^- \*\*先拆。\*\*.*$/m)[0];
  assert.match(splitCn, /拆分把一项承诺交给另一个 change 时——来源要求的一部分,改由那里交付——它保留原 ID、不能凭空消失/);
  assert.match(splitCn, /本次交付依赖它,就留作一条 pending 的 `## Open` 条目并写明承接的 change\(`- <ID>: <内容> — carried by <change>`\),在那个 change 的退出证据落地或所有者接受之前一直阻断/);
  assert.match(splitCn, /本次交付不依赖它,就登记为 follow-up\(§4 Review & Deliver\)——同一个 id 绝不两样都记/);
  assert.match(splitCn, /承接行绝不保留 follow-up 前缀:把已登记的 follow-up 改为依赖项,就要去掉 `follow-up →` 重写这一行——只在 follow-up 行后面追加承接指针,它仍是不阻断的 follow-up。/);
  assert.match(EN, /A commitment the split hands to another change keeps its id: a pending item carried by that change if this delivery depends on it, a follow-up if not\./);
  assert.match(CN, /拆分交给另一个 change 的承诺保留原 id:本次交付依赖它就是由那个 change 承接的 pending 条目,不依赖就是 follow-up。/);
  // the carried form is an ordinary pending item to the machine: C9 blocks on it, while the same id
  // registered as a follow-up is a note — the two forms are told apart, never both for one id
  const rd = require('../lib/readiness');
  const flow = (open) => `change: c1\nphase: review\n\n## Reality Check\n\n## Open\n${open}\n\ngates:\n  - 2026-09-27T00:00 note: fixture\n`;
  const carried = rd.checkEvidenceStatus(flow('- C8-E2E: e2e covers every prototype page — carried by ops-notify-e2e-acceptance'));
  assert.strictEqual(carried.status, 'blocked', `a carried commitment must block: ${JSON.stringify(carried)}`);
  const fu = rd.checkEvidenceStatus(flow('- C8-E2E: follow-up → ops-notify-e2e-acceptance — e2e covers every prototype page'));
  assert.strictEqual(fu.status, 'pass', `a follow-up is a note: ${JSON.stringify(fu)}`);
  // CC-01 (review round 1): a carry pointer appended to a follow-up line does NOT make it blocking —
  // the follow-up grammar still matches. That is why the runbook requires rewriting the line without
  // the prefix; this pins the machine fact the rule leans on.
  const mixed = rd.checkEvidenceStatus(flow('- C8-E2E: follow-up → ops-notify-e2e-acceptance — e2e covers every page — carried by ops-notify-e2e-acceptance'));
  assert.strictEqual(mixed.status, 'pass', `a follow-up line with a carry pointer appended is still a follow-up: ${JSON.stringify(mixed)}`);
});

test('PR-58 the receiving change carries the commitment as pending and only its own exit evidence closes it (both editions)', () => {
  assert.match(EN, /when that change is later opened under its own authorization, it carries the original id and text as a pending `## Open` item \(with an `observed:` line in its Reality Check naming the bundle it came from\) and closes it only on its own exit evidence, so the ask is traceable from the archived bundle to where it is picked up and is never closed by being picked up\./);
  assert.match(CN, /日后在其自身授权下开启那个 change 时,它以原 ID 与原文记一条 pending 的 `## Open` 条目\(其 Reality Check 以一行 `observed:` 注明它来自哪个 bundle\),只凭自己的退出证据关闭,使这条诉求可从归档 bundle 追到接手处,且不因被接手而关闭。/);
  assert.match(EN, /A commitment carried into another change keeps its original id there as a pending item until that change's own exit evidence closes it — picking it up, archiving the change it came from, or renaming either change never closes it\./);
  assert.match(CN, /被带进另一个 change 的承诺在那里保留原 id,作为 pending 条目,直到那个 change 自己的退出证据把它关闭——被接手、来源 change 归档、任一方改名,都不会关闭它。/);
  // the old landing form (an observed line only) is gone from both editions
  assert.doesNotMatch(EN, /its Reality Check carries the original id and text as an `observed:` line/);
  assert.doesNotMatch(CN, /其 Reality Check 以一行 `observed:` 带上原 ID 与原文/);
});
