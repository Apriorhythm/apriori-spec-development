#!/usr/bin/env node
'use strict';
/* apriori CLI — single self-contained entry, zero dependencies. Dispatches subcommands. */

const sub = process.argv[2];
const rest = process.argv.slice(3);

const USAGE = `apriori <command>

  verify    bind spec scenarios to test runs (STEP5 gate)
  archive   merge a change's delta specs into the living store (STEP6)
  check     structural consistency checks (CI / pre-commit)
  init      scaffold the workflow + per-tool pointers

Run 'apriori <command>' with no args for that command's usage.`;

async function main() {
  switch (sub) {
    case 'verify':  return require('../lib/spec-runner').cli(rest);
    case 'archive': return require('../lib/archive-merge').cli(rest);
    case 'check':   return require('../lib/check').cli(rest);
    case 'init':    return require('../lib/init').cli(rest);
    case undefined:
    case '-h':
    case '--help':  console.log(USAGE); return 0;
    default:        console.error(`unknown command: ${sub}\n\n${USAGE}`); return 2;
  }
}

main().then((code) => process.exit(code));
