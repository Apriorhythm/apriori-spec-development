'use strict';
// review-round-scope — PR-59 (§4 Review & Deliver: from round 2 on, a round judges the previous
// round's open findings ADDRESSED / NOT ADDRESSED and reviews the fix diff with what it affects; a
// new finding outside that diff still counts when it violates the current contract or a safety
// constraint, anything else is advisory and does not extend the loop; wording is judged by effect,
// not by location) and PR-60 (R2's resume clause points at that scope; P3 stays frozen), in the one English runbook.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const EN = read('RUNBOOK.md');

test('PR-59 a later review round is scoped to what changed', () => {
  const en = EN.match(/^- \*\*A later round is scoped to what changed\.\*\*.*$/m);
  assert.ok(en, 'EN bullet present');
  assert.match(en[0], /From round 2 on, the producer's resume message \(R2\) asks the reviewer to judge each finding still open from the previous round as ADDRESSED or NOT ADDRESSED/);
  assert.match(en[0], /review the fix diff together with what it affects — its callers, shared state and tests, never trimmed to the edited lines/);
  assert.match(en[0], /A new finding outside that diff still counts when it violates the current contract or a safety constraint; anything else is advisory and does not extend the loop/);
  assert.match(en[0], /A finding is wording only when fixing it changes neither the contract nor how anyone would execute it — where it sits in a document does not make it advisory/);
  assert.match(en[0], /This scope rides on a resumed reviewer session, which already holds the previous round\. A later round run in a fresh reviewer session instead — R2's non-Codex path when that session is not resumed, or the fresh `claude` session that finishes a round after transport recovery failed — gets only the default input above and reviews the whole change as round 1 does; the previous round's conclusions are not repackaged into it\./);
});

// RRS-02 (review round 1): placement is pinned per edition — inside that edition's Review & Deliver
// section, the scope bullet is the very next bullet after the one-independent-review bullet and the
// very bullet before the disposition bullet.
function reviewDeliverBullets(doc, heading) {
  const start = doc.search(new RegExp('^### ' + heading, 'm'));
  assert.ok(start >= 0, `Review & Deliver heading found: ${heading}`);
  const rest = doc.slice(start + 4);
  const end = rest.search(/^### /m);
  const section = end >= 0 ? rest.slice(0, end) : rest;
  return section.split('\n').filter((l) => l.startsWith('- **'));
}
for (const [label, doc, heading, before, self, after] of [
  ['EN', EN, 'Review & Deliver — ', '- **Then one independent review**', '- **A later round is scoped to what changed.**', '- **Disposition of findings'],
]) {
  test(`PR-59 ${label}: the scope bullet sits between the independent-review and disposition bullets of Review & Deliver`, () => {
    const bullets = reviewDeliverBullets(doc, heading);
    const i = bullets.findIndex((l) => l.startsWith(self));
    assert.ok(i > 0, `${label}: scope bullet inside Review & Deliver`);
    assert.ok(bullets[i - 1].startsWith(before), `${label}: immediately after the independent-review bullet, got ${bullets[i - 1].slice(0, 40)}`);
    assert.ok(bullets[i + 1] && bullets[i + 1].startsWith(after), `${label}: immediately before the disposition bullet`);
    assert.strictEqual(doc.split('\n').filter((l) => l.startsWith(self)).length, 1, `${label}: exactly one scope bullet in the edition`);
  });
}

test('PR-60 R2 points the resume message at that scope; P3 stays frozen', () => {
  assert.match(EN, /\(rounds 2\+: `codex exec resume -c sandbox_mode="read-only" <session-id> "\.\.\."`, the message scoped as §4 Review & Deliver says;/);
  const FROZEN = { 'RUNBOOK.md': '97a85ca560d41c70' };
  for (const [file, want] of Object.entries(FROZEN)) {
    const m = read(file).match(/### P3 [\s\S]*?(?=### P4 )/);
    assert.strictEqual(crypto.createHash('sha256').update(m[0]).digest('hex').slice(0, 16), want, `${file}: P3 changed`);
  }
});
