'use strict';
// DO-01 — the docs-only exception is gone (6.2 batch A-8).
//
// Astra P13: both RUNBOOK editions and docs/concepts told a documentation project to put
// `apriori check` in place of `npm test`. `check` prints `RESULT: PASS` and emits no TAP, so
// `verify` reads it as a non-TAP run, C1 never passes and review-ready is never reached — the
// recipe could not work. No fake TAP adapter replaces it: a change with no executable test
// evidence has no C1 evidence, and a documentation project that wants the workflow must provide
// a real TAP-emitting check.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FILES = ['RUNBOOK.md', 'RUNBOOK_cn.md', 'README.md', 'README_cn.md', 'templates/command.md',
  'docs/concepts.md', 'docs/concepts_cn.md', 'docs/ci.md', 'docs/ci_cn.md', 'docs/cli.md', 'docs/cli_cn.md',
  'docs/troubleshooting.md', 'docs/troubleshooting_cn.md', 'docs/legacy.md', 'docs/legacy_cn.md'];

test('DO-01 no document tells a docs-only project to substitute `apriori check` for the test command', () => {
  for (const f of FILES) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    // the SUBSTITUTION, in every wording it had — not the mention of `apriori check` itself, which the
    // replacement sentence makes on purpose ("emits no TAP and cannot stand in")
    for (const re of [
      /docs-only[^.\n]*`apriori check`[^.\n]*(in place of|stands in for|instead of|green\b)/i,
      /`apriori check`[^.\n]*(in place of|stands in for|instead of) `npm test`/,
      /replace `npm test` with `apriori check`/, /map[^.\n]*"tests"[^.\n]*`apriori check`/,
      /纯文档[^。\n]*`apriori check`[^。\n]*(顶替|替换|换成|代替|全绿)/, /`apriori check`[^。\n]*(顶替|替换|换成|代替)[^。\n]*`npm test`/,
      /把 `npm test` 换成 `apriori check`/, /映射成 `apriori check`/,
    ]) assert.doesNotMatch(t, re, `${f}: the exception survives`);
  }
  // the one sentence that replaces it, in the four documents that carried the exception
  for (const f of ['RUNBOOK.md', 'docs/concepts.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(t, /a change with no executable test evidence has no C1 evidence; a documentation project that wants the workflow must provide a real TAP-emitting check/, f);
  }
  for (const f of ['RUNBOOK_cn.md', 'docs/concepts_cn.md']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(t, /没有可执行测试证据的 change 就没有 C1 证据;想走这套流程的文档项目必须提供一个真正会输出 TAP 的检查/, f);
  }
  // and no fake TAP adapter appeared to paper over it
  for (const f of fs.readdirSync(path.join(ROOT, 'lib')))
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'lib', f), 'utf8'), /docs-only|fake TAP|synthetic TAP/i, f);
});
