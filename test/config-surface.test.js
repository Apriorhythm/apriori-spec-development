'use strict';
// config surface — CF-19/CF-20/CF-21: the human-held config exposes only parameters something
// actually reads. A row nothing consumes is a control plane that does not exist: it reads as
// supervision, it is obeyed by nobody. These tests pin the surface itself, not its prose.
//
// Three DIFFERENT sets — conflating them is how a dead row gets called live:
//   · CLI_KEYS      — read at runtime through lib/config.js getConfig()
//   · AGENT_KEYS    — never read by any command; the agent reads them out of the file (RUNBOOK)
//   · SCAFFOLD_KEYS — what `init` actually writes by default
// `test-cmd` is a CLI key that the DEFAULT scaffold does not carry: `init --test-cmd` adds it.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseConfig, getConfig } = require('../lib/config');
const init = require('../lib/init');

const REPO = path.join(__dirname, '..');

const CLI_KEYS = ['id-pattern', 'cas', 'test-cmd'];
const AGENT_KEYS = ['language'];
const SCAFFOLD_KEYS = ['language', 'id-pattern', 'cas'];

// Removed in 6.0 slice 2b: read by nobody — not the CLI, not the agent's protocol.
// `verification-profile` joined them in slice 5: it had a reader and no consumer, and it scaled
// evidence by PROJECT TYPE — the second list §6's risk rows replaced.
const REMOVED_PARAMS = ['step5-cap', 'step6-cap', 'spike-cap', 'extraction-review-cap',
  'shrink-state', 'rejected-ratio-guard', 'shrink-proposal-freq', 'post-merge-review-freq',
  'verification-profile'];

// 'Field' is the table header row the shared parser cannot distinguish from a key
const keysOf = (text) => [...parseConfig(text).values.keys()].filter((k) => k !== 'Field').sort();

test('CF-19 the shipped template exposes only keys the CLI or the agent reads', () => {
  const tpl = fs.readFileSync(path.join(REPO, 'templates', 'process-config.md'), 'utf8');
  assert.strictEqual(parseConfig(tpl).conflicts.size, 0);
  assert.deepStrictEqual(keysOf(tpl), [...SCAFFOLD_KEYS].sort());
  // every shipped row is accounted for by one of the two reader populations
  for (const k of keysOf(tpl)) assert.ok(CLI_KEYS.includes(k) || AGENT_KEYS.includes(k), `unread row '${k}'`);
  for (const p of REMOVED_PARAMS) assert.ok(!tpl.includes(p), `template still carries '${p}'`);
});

test('CF-20 the default `init` scaffold carries the default surface and nothing dead', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-cfgsurf-'));
  init.scaffold(root, ['claude']);
  const cfg = fs.readFileSync(path.join(root, 'apriori', 'process-config.md'), 'utf8');
  assert.deepStrictEqual(keysOf(cfg), [...SCAFFOLD_KEYS].sort());
  // the scaffolded protocol must not promise a parameter the scaffolded config does not carry
  const rb = fs.readFileSync(path.join(root, 'apriori', 'runbook.md'), 'utf8');
  for (const p of REMOVED_PARAMS) {
    assert.ok(!cfg.includes(p), `scaffolded config still carries '${p}'`);
    assert.ok(!rb.includes(p), `scaffolded runbook still promises '${p}'`);
  }
});

test('CF-21 `init --test-cmd` adds exactly one row, and it is a live CLI key', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-cfgcmd-'));
  init.scaffold(root, ['claude'], { testCmd: 'node -e "console.log(1)"' });
  const cfg = fs.readFileSync(path.join(root, 'apriori', 'process-config.md'), 'utf8');
  assert.deepStrictEqual(keysOf(cfg), [...SCAFFOLD_KEYS, 'test-cmd'].sort());
  // live, not decorative: the real reader every consumer goes through returns it
  const { value, problem } = getConfig(root, 'test-cmd');
  assert.strictEqual(problem, null);
  assert.strictEqual(value, 'node -e "console.log(1)"');
  for (const p of REMOVED_PARAMS) assert.ok(!cfg.includes(p), `scaffolded config still carries '${p}'`);
});
