'use strict';
// hotfix-lane T7.2/T7.3 — the two digest domains and their one record encoding
// (HF-25..HF-30).
const test = require('node:test');
const assert = require('node:assert');

const { digestRecord, digestCore, approvalToken, canonicalPath } = require('../lib/hotfix.js');

const bundle = (o = {}) => ({
  deltaFiles: [{ path: 'specs/gate/spec.md', text: '## MODIFIED Requirements\n' }],
  decisionsText: '',
  sections: new Map([['Conclusion', 'the summary line said items, the store says rows\n'], ['Bindings', 'GT-01: tests: gate.test.js\n']]),
  header: new Map([['hotfix', 'fix'], ['change-kind', 'code-trivial']]),
  baseline: 'a1b2c3d',
  ...o,
});

test('HF-25 the record encoding resists tag and boundary forgery', () => {
  // under a naive `<tag>\n<bytes>` framing these two pairs serialize identically
  const a = digestRecord('x\n3\nyyy', 'z');
  const b = digestRecord('x', '3\nyyy\nz');
  assert.strictEqual('x\n3\nyyy' + '\n' + 'z', 'x' + '\n' + '3\nyyy\nz', 'the naive framing really does collide');
  assert.notStrictEqual(a.toString('utf8'), b.toString('utf8'), 'a newline in the tag cannot forge a record boundary');
  assert.ok(a.toString('utf8').startsWith('7\nx\n3\nyyy\n'), `tag length is prefixed: ${JSON.stringify(a.toString('utf8'))}`);
});

test('HF-26 the review digest covers business entities and excludes process metadata', () => {
  const base = digestCore(bundle());
  const moves = [
    bundle({ sections: new Map([['Conclusion', 'something else\n'], ['Bindings', 'GT-01: tests: gate.test.js\n']]) }),
    bundle({ deltaFiles: [{ path: 'specs/gate/spec.md', text: '## ADDED Requirements\n' }] }),
    bundle({ header: new Map([['hotfix', 'fix'], ['change-kind', 'code-behavior']]) }),
    bundle({ sections: new Map([['Conclusion', 'the summary line said items, the store says rows\n'], ['Bindings', 'GT-02: tests: other.test.js\n']]) }),
  ];
  for (const [i, m] of moves.entries()) assert.notStrictEqual(digestCore(m), base, `business change ${i} moves the digest`);

  // the exclusion domain: Gates is not a business section and never reaches digestCore
  const withGates = bundle();
  withGates.sections.set('Gates', 'gate3: self-passed\n');
  assert.strictEqual(digestCore(withGates), base, 'process metadata leaves the digest byte-identical');
});

test('HF-27 digest ordering is byte order, not locale order', () => {
  const files = [{ path: 'specs/b.md', text: 'b' }, { path: 'specs/A.md', text: 'A' }, { path: 'specs/a.md', text: 'a' }];
  const one = digestCore(bundle({ deltaFiles: files }));
  const two = digestCore(bundle({ deltaFiles: [...files].reverse() }));
  assert.strictEqual(one, two, 'input order does not matter');

  const folded = digestCore(bundle({ deltaFiles: [{ path: 'specs/A.md', text: 'a' }, { path: 'specs/a.md', text: 'A' }] }));
  assert.notStrictEqual(folded, one, 'case is never folded — A.md and a.md are distinct paths');

  const headerOrder = digestCore(bundle({ header: new Map([['change-kind', 'code-trivial'], ['hotfix', 'fix']]) }));
  assert.strictEqual(headerOrder, digestCore(bundle()), 'header fields sort by key');
});

test('HF-28 the token binds the core to the store and truth baselines in a fixed domain order', () => {
  const core = 'c'.repeat(64);
  const files = [
    { domain: 'store', path: 'apriori/specs/gate/spec.md', sha: '1'.repeat(64) },
    { domain: 'truth', path: 'apriori/truth/gate.md', sha: '2'.repeat(64) },
  ];
  const a = approvalToken(core, files);
  const b = approvalToken(core, [...files].reverse());
  assert.deepStrictEqual([a.problems, b.problems], [[], []]);
  assert.strictEqual(a.token, b.token, 'domain order is fixed regardless of input order');

  const moved = approvalToken(core, [files[0], { ...files[1], sha: '3'.repeat(64) }]);
  assert.notStrictEqual(moved.token, a.token, 'a moved baseline invalidates the token');

  // there is no artifact domain — an artifact entry contributes nothing (f2 was not ruled in)
  const withArtifact = approvalToken(core, [...files, { domain: 'artifact', path: 'evidence/shot.png', sha: '4'.repeat(64) }]);
  assert.strictEqual(withArtifact.token, a.token, 'no artifact domain exists under the ruled combination');
});

test('HF-29 canonical paths refuse `..` and never fold case', () => {
  assert.deepStrictEqual(canonicalPath('apriori/./specs//gate/spec.md'), { path: 'apriori/specs/gate/spec.md', problem: null });
  assert.ok(canonicalPath('apriori/specs/../specs/gate/spec.md').problem.includes('..'), 'dot-dot refused');

  const core = 'c'.repeat(64);
  const two = approvalToken(core, [
    { domain: 'store', path: 'apriori/specs/Gate/spec.md', sha: '1'.repeat(64) },
    { domain: 'store', path: 'apriori/specs/gate/spec.md', sha: '1'.repeat(64) },
  ]);
  const one = approvalToken(core, [{ domain: 'store', path: 'apriori/specs/gate/spec.md', sha: '1'.repeat(64) }]);
  assert.notStrictEqual(two.token, one.token, 'case-different paths are two records, not one');
});

test('HF-30 one canonical path may not carry two different hashes', () => {
  const core = 'c'.repeat(64);
  const clash = approvalToken(core, [
    { domain: 'store', path: 'apriori/specs/gate/spec.md', sha: '1'.repeat(64) },
    { domain: 'store', path: 'apriori/./specs/gate/spec.md', sha: '2'.repeat(64) },
  ]);
  assert.ok(clash.problems.some((p) => /twice/.test(p)), `clash reported: ${clash.problems}`);
  assert.strictEqual(clash.token, null, 'no token is produced from a contradictory input');

  const same = approvalToken(core, [
    { domain: 'store', path: 'apriori/specs/gate/spec.md', sha: '1'.repeat(64) },
    { domain: 'store', path: 'apriori/./specs/gate/spec.md', sha: '1'.repeat(64) },
  ]);
  assert.deepStrictEqual(same.problems, []);
  assert.strictEqual(same.token, approvalToken(core, [{ domain: 'store', path: 'apriori/specs/gate/spec.md', sha: '1'.repeat(64) }]).token, 'equal hashes dedup to one record');
});
