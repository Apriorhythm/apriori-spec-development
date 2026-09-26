'use strict';
// protocol-text-consistency — PR-50/51/52 (descriptions match the code and the rulings; the two editions
// carry the same obligations) and CK-18 (the v2 doc checker is retired). Text-level assertions, like
// the other PR scenarios: each pins the exact sentence that had drifted, so removing the correction
// turns the corresponding assertion red.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const EN = read('RUNBOOK.md');
const CN = read('RUNBOOK_cn.md');
const CONCEPTS = read('docs/concepts.md');
const CONCEPTS_CN = read('docs/concepts_cn.md');
const VISION = read('VISION.md');
const VISION_CN = read('VISION_cn.md');

// the §4 bullet that starts with the delta grammar and ends the archive sentence
function archiveBullet(doc, startRe) {
  const m = doc.match(startRe);
  assert.ok(m, `archive bullet found: ${startRe}`);
  const rest = doc.slice(m.index);
  const end = rest.slice(1).search(/^- \*\*/m);
  return end < 0 ? rest : rest.slice(0, end + 1);
}

test('PR-50 the archive sentence names the predicates the code runs, in both editions', () => {
  const en = archiveBullet(EN, /^- \*\*Delta grammar and archive:\*\*/m);
  const cn = archiveBullet(CN, /^- \*\*增量语法与归档:\*\*/m);
  for (const [label, b] of [['EN', en], ['CN', cn]]) {
    assert.match(b, /C3\/C5\/C8\/C9/, `${label}: the predicates are gate's C3/C5/C8/C9`);
    assert.doesNotMatch(b, /C3\/C4\/C8\/C9/, `${label}: the retired C4 is not a predicate`);
    assert.doesNotMatch(b, /kept ledger|保留的台账/, `${label}: no "kept ledger" predicate`);
    assert.doesNotMatch(b, /still `blocked`|仍是 `blocked`/, `${label}: no blocked-evidence-row predicate`);
    assert.match(b, /archive-drop/, `${label}: --force covers the named archive-drop`);
    assert.match(b, /reframe/, `${label}: --force covers the answered reframe`);
  }
  assert.match(en, /no legacy `review\/issues\.md` still carrying `open` rows — the one-shot migration/);
  assert.match(en, /An `archive-force ledger` record forces nothing \(6\.2\); it is reported as a note\./);
  assert.match(en, /no `## Open` item still pending — unaccepted and not a registered follow-up — and no standing assumption/);
  assert.match(cn, /没有仍带 `open` 行的遗留 `review\/issues\.md`——一次性迁移/);
  assert.match(cn, /`archive-force ledger` 记录不强制任何东西\(6\.2\),只作为 note 报告。/);
  assert.match(cn, /`## Open` 里没有仍 pending 的条目——既未被接受、也不是已登记的 follow-up——也没有仍悬着的 assumption/);
});

test('PR-51 the two editions carry the same obligations at the four drifted sentences', () => {
  // kickoff: the CN no longer names a requirement-document sign-off (6.0 has no such document)
  assert.match(EN, /^> This kickoff \*is\* the human intent acknowledgment\.$/m);
  assert.match(CN, /^> 这句 kickoff \*就是\*人对意图的认可。$/m);
  assert.doesNotMatch(CN, /需求文档的签核/);
  // R3: every phase change and every review round — no retired step vocabulary in the CN
  assert.match(EN, /the state file is updated after every phase change and every review round/);
  assert.match(CN, /每次阶段变化、每轮评审之后都更新状态文件/);
  assert.doesNotMatch(CN, /每完成一步/);
  // Reality Check bullet: the CN states the assumption lifecycle exactly once
  const cnRc = CN.match(/^- \*\*只有三类。\*\*.*$/m);
  assert.ok(cnRc, 'CN Reality Check bullet found');
  assert.strictEqual((cnRc[0].match(/直到.{0,3}被解决或所有者接受/g) || []).length, 1, 'the lifecycle is stated once');
  assert.match(cnRc[0], /\*\*实现前先验证\*\*。它的生命周期只有两个出口/);
  // Specify bullet: "contract only — never source" belongs to the producer's revisions in both editions
  assert.match(EN, /\(reviewer P3; the producer's revisions touch the contract only — never source\)/);
  assert.doesNotMatch(EN, /\(reviewer P3, on the contract only — never source\)/);
  assert.match(CN, /\(评审方 P3;生产方的修订只改契约、绝不碰源码\)/);
  // the reviewer's own source inspection is untouched (R2) and P3 still lets it read the repo
  assert.match(EN, /reviewer's own source inspection still allowed/);
  assert.match(EN, /You may read the whole repo, its callers, config and prototypes on your own initiative\./);
  // follow-up bullet: the CN says 委托, like every other rendering of "delegation"
  assert.match(CN, /\(建 change 与实施仍服从委托\)/);
  assert.doesNotMatch(CN, /仍服从既有授权/);
});

test('PR-52 the handbook and VISION describe the current mechanisms', () => {
  for (const [label, doc, open] of [['EN', CONCEPTS, '`## Open`'], ['CN', CONCEPTS_CN, '`## Open`']]) {
    assert.doesNotMatch(doc, /evidence summary|证据摘要/, `${label}: P3's default input is not an "evidence summary"`);
    assert.doesNotMatch(doc, /cumulative \*\*issue ledger\*\* per change|累积的\*\*问题台账\*\*/, `${label}: cross-round memory is not a cumulative ledger`);
    assert.ok(doc.includes(open), `${label}: ## Open is named`);
    assert.match(doc, /review-progress/, `${label}: review-progress is part of the memory`);
    assert.doesNotMatch(doc, /open ledger row if the change kept a ledger|若保留了台账则没有 open 行/, `${label}: archive refusals match §4`);
    assert.doesNotMatch(doc, /become rows;|才进正式行/, `${label}: gaps become pending items, not rows`);
    assert.doesNotMatch(doc, /spec\/design content only|只改 spec\/design 内容/, `${label}: design is retired`);
  }
  assert.match(CONCEPTS, /contract, diff, the `## Open` items, uncovered boundaries/);
  assert.match(CONCEPTS, /contract \+ diff \+ Open items \+ uncovered boundaries/);
  assert.match(CONCEPTS, /legacy ledger still carrying `open` rows, no `## Open` item still pending, no standing assumption/);
  assert.match(CONCEPTS, /touches the contract \(the delta specs\) only — never source/);
  assert.match(CONCEPTS_CN, /契约、diff、`## Open` 条目、未覆盖边界/);
  assert.match(CONCEPTS_CN, /只改契约\(增量 spec\)——绝不动源码/);
  // the §7.0 heading and the PR-18 sentences stay (anchors and the "no ledger" rule are unchanged)
  assert.match(CONCEPTS, /^### 7\.0 The Issue Ledger \(Optional; Shared by Review Loops\)$/m);
  assert.match(CONCEPTS_CN, /^### 7\.0 问题台账（可选；评审循环共用）$/m);
  // VISION's paving table: no machine-read ledger, no verification matrix, no test-name row — the trigger narrative stays
  for (const [label, v] of [['EN', VISION], ['CN', VISION_CN]]) {
    assert.doesNotMatch(v, /issue ledger with machine-readable statuses|带机器可读状态的问题台账/, `${label}: no machine-read ledger row`);
    assert.doesNotMatch(v, /^\| Verification matrix|^\| 验证矩阵/m, `${label}: no verification-matrix row`);
    assert.doesNotMatch(v, /test names carrying them|携带它的测试名/, `${label}: test names are not a current mechanism`);
    assert.match(v, /apriori verify/, `${label}: the binding is verify's`);
    assert.match(v, /gate --json/, `${label}: open items and verdicts are data`);
  }
  assert.match(VISION, /P8 narrows to what binding cannot prove/, 'the historical trigger narrative is kept');
});

test('CK-18 the v2 script is gone and nothing calls it', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'scripts', 'check_docs.py')), 'scripts/check_docs.py is absent');
  for (const p of ['package.json', '.github/workflows/ci.yml', 'README.md', 'README_cn.md', 'docs/ci.md', 'docs/cli.md', 'RUNBOOK.md', 'RUNBOOK_cn.md']) {
    assert.ok(!read(p).includes('check_docs'), `${p} does not reference check_docs.py`);
  }
  assert.match(read('.github/workflows/ci.yml'), /check --self/);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'apriori.js'), 'check', '--self'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `check --self passes on the repository:\n${r.stdout}${r.stderr}`);
});
