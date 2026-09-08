'use strict';
// RC — the review-ready reclaim discipline (v6.1 fold-in, completed in 6.2).
// plan/17 §四.1 folded the v6.1 "reclaim before review" rule into one clause: clear the useless
// residue AND the statements the change left contradicting the implementation. Only the residue
// half (probes, temp files, dead code) landed; the contradicted-statements half (a comment that
// says nine kinds while the enum has eleven, a DDL header that says "no new table" right above a
// CREATE TABLE) had two replay arms of evidence and was never written. These anchors pin the
// complete clause in BOTH editions of the P2 review-ready producer prompt.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EN = fs.readFileSync(path.join(ROOT, 'RUNBOOK.md'), 'utf8');
const CN = fs.readFileSync(path.join(ROOT, 'RUNBOOK_cn.md'), 'utf8');

test('RC-01 EN review-ready reclaims residue AND the statements contradicting the implementation', () => {
  assert.match(EN, /reclaim the probes, temporary files and dead code this change left behind, along with any comment or DDL header it left contradicting the implementation; then read the COMPLETE diff/);
});

test('RC-02 CN review-ready carries the same complete clause', () => {
  assert.match(CN, /回收本 change 留下的探针、临时文件与失效代码,连同它留下的与实现相矛盾的注释或 DDL 抬头;然后读完\*\*完整\*\* diff/);
});
