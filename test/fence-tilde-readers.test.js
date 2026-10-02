'use strict';
// fence-tilde-readers — TX-01 (the shared fence grammar: ``` as always, ~~~ by line, marker and
// length), TX-02 (the backtick reading is unchanged: every Markdown file in this repository strips
// exactly as the historical regex did), TX-03 (every structural reader honours the same fences:
// config rows, scenario discovery in check and verify alike, the delta parser, the store scan and
// the MODIFIED-block engine). Follow-up FU-1 of batch-review-fixes; owner 2026-10-03 "开干".
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const text = require('../lib/text');

const ROOT = path.join(__dirname, '..');
const OLD = (t) => t.replace(/```[\s\S]*?```/g, '');           // the historical backtick reading

test('TX-01 the shared fence grammar: tildes by line, marker and length; backticks as always', () => {
  const S = text.stripFences;
  // a tilde fence hides what it holds, structure-shaped lines included
  assert.strictEqual(S('a\n~~~\n#### Scenario: XX-99 fake\n~~~\nb'), 'a\n\nb');
  // an info string may follow the opener; the closer may be longer, indented up to three spaces, trailing blanks allowed
  assert.strictEqual(S('~~~ md\nX\n   ~~~~  \nY'), '\nY');
  // a shorter run, a tagged line or the other marker does not close it
  assert.strictEqual(S('~~~~\n~~~\nX\n~~~ md\n```\n~~~~\nY'), '\nY');
  // inline ~~~ is ordinary text, and so is a line indented four spaces
  assert.strictEqual(S('say `~~~` twice: `~~~`'), 'say `~~~` twice: `~~~`');
  assert.strictEqual(S('    ~~~\nX\n    ~~~'), '    ~~~\nX\n    ~~~');
  // an unclosed tilde opener is ordinary text, as an unclosed backtick one is
  assert.strictEqual(S('~~~\nX'), '~~~\nX');
  assert.strictEqual(S('```\nX'), '```\nX');
  // whichever opens first wins; inside one, the other marker is content
  assert.strictEqual(S('```\n~~~\n```\nY\n~~~'), '\nY\n~~~');
  assert.strictEqual(S('~~~\n```\n~~~\nY\n```'), '\nY\n```');
  // CRLF lines read the same
  assert.strictEqual(S('~~~\r\nX\r\n~~~\r\nY'), '\nY');
  // spans are what stripFences removes, in order
  const t = 'a\n```\nx\n```\nb\n~~~\ny\n~~~\nc';
  assert.deepStrictEqual(text.fenceSpans(t).map(([s, e]) => t.slice(s, e)), ['```\nx\n```', '~~~\ny\n~~~']);
  // the line readers' open/close rule: ``` as before (any indentation; any ```-led line closes), ~~~ by marker and length
  assert.deepStrictEqual(text.fenceOpen('  ```js'), { ch: '`', len: 3 });
  assert.deepStrictEqual(text.fenceOpen('~~~~ md'), { ch: '~', len: 4 });
  assert.strictEqual(text.fenceOpen('    ~~~'), null);
  assert.strictEqual(text.fenceCloses({ ch: '`', len: 3 }, '```js'), true);
  assert.strictEqual(text.fenceCloses({ ch: '~', len: 4 }, '~~~'), false);
  assert.strictEqual(text.fenceCloses({ ch: '~', len: 3 }, '~~~ md'), false);
  assert.strictEqual(text.fenceCloses({ ch: '~', len: 3 }, ' ~~~~ '), true);
  assert.strictEqual(text.fenceCloses({ ch: '~', len: 3 }, '```'), false);
});

test('TX-02 the backtick reading is unchanged across this repository', () => {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith('.md')) files.push(p);
    }
  };
  walk(ROOT);
  assert.ok(files.length > 200, `the corpus is the repository's Markdown (${files.length} files)`);
  const differ = files.filter((f) => { const t = fs.readFileSync(f, 'utf8'); return text.stripFences(t) !== OLD(t); });
  assert.deepStrictEqual(differ.map((f) => path.relative(ROOT, f)), [], 'no file with only backtick fences may read differently');
  // and synthetic edges of the historical reading
  for (const t of ['```x``` and ```', '````\n```\nX\n```\n````', 'a ``` b ``` c ``` d', '```\n```\n```'])
    assert.strictEqual(text.stripFences(t), OLD(t), JSON.stringify(t));
  // every spec store and delta splits into requirement blocks exactly as the historical regex split it
  const am = require('../lib/archive-merge');
  const REQ_RE = /^###\s+Requirement:\s+(.+?)\s*$([\s\S]*?)(?=^###\s+Requirement:|$(?![\s\S]))/gm;
  const oldBlocks = (t) => { const out = []; let m; REQ_RE.lastIndex = 0; while ((m = REQ_RE.exec(t)) !== null) out.push([m[1].trim(), m[0].replace(/\s+$/, '') + '\n']); return out; };
  const specs = files.filter((f) => /[\/]specs[\/]/.test(path.relative(ROOT, f)) && path.relative(ROOT, f).startsWith('apriori'));
  assert.ok(specs.length > 100, `stores and deltas (${specs.length})`);
  for (const f of specs) {
    const t = fs.readFileSync(f, 'utf8');
    assert.deepStrictEqual([...am.parseRequirementsStrict(t).map], oldBlocks(t).filter(([n], i, a) => a.findIndex(([x]) => x === n) === i), path.relative(ROOT, f));
  }
  // the historical regex's own walk is kept where no fence is involved (review FTR-3): a heading
  // whose name runs onto the next line, a nameless heading line ending the previous block, adjacent blocks
  for (const t of ['### Requirement:\n### Requirement: B\nbody\n', '### Requirement: A\nx\n### Requirement:\n',
    '### Requirement: A\n### Requirement: B\n', '### Requirement:   \n\n### Requirement: C\nz', 'pre\n### Requirement: A\r\nx\r\n### Requirement: B\r\n'])
    assert.deepStrictEqual([...am.parseRequirementsStrict(t).map], oldBlocks(t), JSON.stringify(t));
  // no input makes the scanner superlinear (review FTR-2): far beyond any real document, each well
  // under two seconds — a quadratic scan of the first input alone would take minutes
  const distinct = (n) => { let t = ''; for (let L = n + 3; L >= 4; L--) t += '~'.repeat(L) + ' tag\n'; return t + '~~~\n'.repeat(n * n); };
  for (const t of ['~~~info\n'.repeat(200000), '~~~~\n~~~\n'.repeat(100000), distinct(600), '```\n' + '~~~info\n'.repeat(100000)]) {
    const t0 = process.hrtime.bigint();
    text.stripFences(t);
    assert.ok(Number(process.hrtime.bigint() - t0) / 1e6 < 2000, `the fence scan stays near-linear (${t.length} bytes)`);
  }
});

test('TX-03 every structural reader honours the same fences', () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-tx-'));
  // config: a tilde-fenced row grants nothing; the live row decides; an unterminated tilde fence makes the rest inert
  const config = require('../lib/config');
  const c1 = config.parseConfig('~~~\n| cas | optional |\n~~~\n\n| cas | required |\n');
  assert.strictEqual(c1.values.get('cas'), 'required');
  assert.ok(!config.parseConfig('~~~ md\n| cas | optional |\n').values.has('cas'));
  assert.strictEqual(config.parseConfig('~~~~\n~~~\n| cas | optional |\n~~~~\n| test-cmd | npm test |\n').values.get('test-cmd'), 'npm test');
  assert.ok(!config.parseConfig('~~~~\n~~~\n| cas | optional |\n~~~~\n').values.has('cas'));
  // scenario discovery: verify's scanner and check's CLI both pass over a tilde-fenced example (CK-14 parity)
  const am = require('../lib/archive-merge');
  const spec = '### Requirement: R\nBody.\n\n~~~md\n#### Scenario: no id fenced example\n~~~\n\n#### Scenario: TX-90 real\n- t\n';
  assert.deepStrictEqual(am.scanScenarioTitles(spec), ['TX-90 real']);
  const root = tmp();
  fs.mkdirSync(path.join(root, 'apriori', 'specs', 'm'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori', 'specs', 'm', 'spec.md'), spec);
  const ck = spawnSync('node', [path.join(ROOT, 'bin', 'apriori.js'), 'check'], { cwd: root, encoding: 'utf8' });
  assert.strictEqual(ck.status, 0, ck.stdout + ck.stderr);
  const col = require('../lib/spec-runner').collectScenarios([path.join(root, 'apriori', 'specs')], /[A-Z]+-\d+/);
  assert.deepStrictEqual([...col.byId.keys()], ['TX-90']);
  assert.deepStrictEqual(col.unidentified, []);
  // the delta parser: a tilde fence is opaque — its heading-shaped lines are body, never structure or a problem
  const delta = '## ADDED Requirements\n\n### Requirement: Fenced\n\nBody.\n\n~~~md\n## Bogus Heading\n### Requirement: InsideFence\n<!-- apriori-base: sha256:zzz -->\n~~~\n\n#### Scenario: TX-91 f\n- t\n';
  const p = am.parseDeltaStrict(delta);
  assert.deepStrictEqual(p.problems, []);
  assert.deepStrictEqual([...p.delta.ADDED.keys()], ['Fenced']);
  assert.match(p.delta.ADDED.get('Fenced'), /Bogus Heading/);
  assert.deepStrictEqual(am.parseDeltaStrict(delta.replace(/\n/g, '\r\n')).problems, []);
  // the store scan and the MODIFIED-block engine read the same fences
  const store = '### Requirement: A\nProse.\n\n~~~\n### Requirement: Ghost\n#### Scenario: TX-92 ghost\n~~~\n\n#### Scenario: TX-93 a\n- t\n';
  // the store scan: a fenced requirement heading is block content, never a boundary — on raw text too
  // (merge, the MODIFIED baseline and the single-file form read the raw store — review FTR-1)
  assert.deepStrictEqual([...am.parseRequirementsStrict(store).map.keys()], ['A']);
  assert.strictEqual(am.parseRequirementsStrict(store).map.get('A'), store.replace(/\s+$/, '') + '\n', 'the block is the raw text, fence and all');
  assert.deepStrictEqual([...am.parseRequirementsStrict(text.stripFences(store)).map.keys()], ['A']);
  // through the archive merge: a prose-only MODIFIED replacement of the whole block leaves no ghost
  // behind, the projection lists the real scenario once, and a rerun changes nothing
  const fullStore = '# Store\n\n' + store;
  const replaced = store.replace('Prose.', 'Updated prose.');
  const delta2 = am.parseDeltaStrict(`## MODIFIED Requirements\n\n${replaced}`);
  assert.deepStrictEqual(delta2.problems, []);
  const merged = am.merge(fullStore, delta2.delta, 'c');
  assert.deepStrictEqual(merged.conflicts, []);
  const rendered = am.renderStore(fullStore, merged.store);
  assert.deepStrictEqual(am.scanScenarioTitles(rendered), ['TX-93 a']);
  assert.ok(rendered.startsWith('# Store\n\n### Requirement: A\nUpdated prose.'));
  const again = am.merge(rendered, delta2.delta, 'c');
  assert.strictEqual(am.renderStore(rendered, again.store), rendered, 'a rerun is a no-op');
  // a store with no live requirement — only a fenced example, or prose — keeps its text when the first
  // requirement is added (review FTR-4); an empty store renders just the blocks
  const added = am.parseDeltaStrict('## ADDED Requirements\n\n### Requirement: Real\n\n#### Scenario: TX-99 r\n- t\n').delta;
  for (const pre of ['# Store\n\nExplain.\n\n~~~\n### Requirement: Example\n~~~\n', '# Store\n\nProse only.\n']) {
    const out = am.renderStore(pre, am.merge(pre, added, 'c').store);
    assert.strictEqual(out, pre.replace(/\s*$/, '\n\n') + '### Requirement: Real\n\n#### Scenario: TX-99 r\n- t\n');
    assert.deepStrictEqual(am.scanScenarioTitles(out), ['TX-99 r']);
    assert.strictEqual(am.renderStore(out, am.merge(out, added, 'c').store), out, 'a rerun is a no-op');
  }
  assert.strictEqual(am.renderStore('', am.merge('', added, 'c').store), '### Requirement: Real\n\n#### Scenario: TX-99 r\n- t\n');
  // composition never lets one part swallow another (review FTR-5): a kept preamble holding an unclosed
  // tilde opener would pair with the first fence inside the added block and hide its heading — the
  // rendered store must read back as exactly its merged blocks, or the archive refuses, writing nothing
  const swallowing = '# Store\n\n~~~\n';
  const fencedAdd = am.parseDeltaStrict('## ADDED Requirements\n\n### Requirement: Real\nBody.\n\n~~~\nexample\n~~~\n\n#### Scenario: TX-99 real\n- t\n');
  const sm = am.merge(swallowing, fencedAdd.delta, 'c');
  assert.match(am.renderReadback(am.renderStore(swallowing, sm.store), sm.store) || '', /'Real' is swallowed or altered by the text before it/);
  const dir = tmp(), storeFile = path.join(dir, 'spec.md'), deltaFile = path.join(dir, 'delta.md');
  fs.writeFileSync(storeFile, swallowing);
  fs.writeFileSync(deltaFile, '## ADDED Requirements\n\n### Requirement: Real\nBody.\n\n~~~\nexample\n~~~\n\n#### Scenario: TX-99 real\n- t\n');
  const one = spawnSync('node', [path.join(ROOT, 'bin', 'apriori.js'), 'archive', '--store', storeFile, '--delta', deltaFile, '--change', 'c', '--write', '--no-cas'], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(one.status, 1, one.stdout + one.stderr);
  assert.match(one.stderr, /'Real' is swallowed or altered by the text before it/);
  assert.match(one.stdout, /RESULT: FAILED PREFLIGHT — nothing written/);
  assert.strictEqual(fs.readFileSync(storeFile, 'utf8'), swallowing, 'nothing written');
  // the high-level form's projection refuses the same module as a conflict (archive then writes nothing)
  const proj = tmp();
  fs.mkdirSync(path.join(proj, 'apriori', 'specs', 'kv'), { recursive: true });
  fs.writeFileSync(path.join(proj, 'apriori', 'specs', 'kv', 'spec.md'), swallowing);
  fs.mkdirSync(path.join(proj, 'apriori', 'changes', 'c', 'specs', 'kv'), { recursive: true });
  const dfile = path.join(proj, 'apriori', 'changes', 'c', 'specs', 'kv', 'spec.md');
  fs.writeFileSync(dfile, '## ADDED Requirements\n\n### Requirement: Real\nBody.\n\n~~~\nexample\n~~~\n\n#### Scenario: TX-99 real\n- t\n');
  const pj = am.buildProjection(path.join(proj, 'apriori', 'specs'), am.discoverDeltas(path.join(proj, 'apriori', 'changes'), 'c').files, 'c');
  assert.ok(pj.conflicts.some((c) => /'Real' is swallowed or altered by the text before it/.test(c)), JSON.stringify(pj.conflicts));
  assert.strictEqual(pj.texts.get('kv/spec.md'), swallowing, 'the refused module keeps its store text in the projection (nothing rendered over it)');
  // and every store in this repository renders and reads back as its own blocks
  for (const f of fs.readdirSync(path.join(ROOT, 'apriori', 'specs'))) {
    const t = fs.readFileSync(path.join(ROOT, 'apriori', 'specs', f, 'spec.md'), 'utf8');
    const m = am.parseRequirementsStrict(t).map;
    assert.strictEqual(am.renderReadback(am.renderStore(t, m), m), null, f);
  }
  // the engine: a scenario-looking line inside a tilde fence is body, not a scenario — rewriting the
  // fence's contents drops nothing, and the real scenario is retained by its id
  const idOf = (title) => { const m = /^([A-Z]+-\d+)\b/.exec(title); return m ? m[1] : null; };
  const cmp = am.compareModifiedBlock(store.trim(), store.replace('#### Scenario: TX-92 ghost', 'an example, reworded').trim(), idOf);
  assert.deepStrictEqual(cmp.dropped, []);
  assert.deepStrictEqual(cmp.ambiguous, []);
  assert.deepStrictEqual(cmp.retained.map((r) => r.id), ['TX-93']);
  assert.deepStrictEqual(cmp.missingLines, [{ scenario: null, line: '#### Scenario: TX-92 ghost' }], 'the reworded fenced line is prose that went missing, reported as such');
  // the review reader: a verdict quoted in a tilde fence of a self-contained doc is an example, and a
  // round summary's id lists and re-review conclusions skip what a tilde fence holds
  const review = require('../lib/review');
  const bundle = tmp();
  fs.mkdirSync(path.join(bundle, 'review'));
  const PROV = '<!-- provenance: provider=anthropic model=claude-sonnet-5 session=sess-1 date=2026-08-24 -->';
  fs.writeFileSync(path.join(bundle, 'review', 'req-review-v1.md'),
    `${PROV}\n# Review\n\nThe vocabulary:\n\n~~~\nVERDICT: ESCALATE\n~~~\n\nMy conclusion:\n\nVERDICT: ACCEPT\n`);
  const f = review.reviewFacts(bundle);
  assert.deepStrictEqual(f.problems, []);
  assert.strictEqual(f.families[0].verdict, 'accept');
  const conc = review.reReviewConclusions('- AB-1: ADDRESSED — fixed\n~~~\n- AB-2: NOT ADDRESSED — quoted example\n~~~\n');
  assert.deepStrictEqual([...conc.keys()], ['AB-1']);
});
