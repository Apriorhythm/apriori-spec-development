#!/usr/bin/env node
'use strict';
/* apriori CLI — single self-contained entry, zero dependencies. Dispatches subcommands. */

const sub = process.argv[2];
const rest = process.argv.slice(3);

const USAGE = `apriori <command>

  new       scaffold a change dir + flow-state skeleton (bare kebab-case name)
  status    show where a change is: phase, reality check, evidence, next actions (--json)
  verify    bind spec scenarios to test runs (the Build & Test binding gate) (--json)
  archive   merge a change's delta specs into the living store (freezes the bundle)
  stamp     print the CAS base-stamp line for a store file (delta authoring)
  gate      aggregate the mechanical gate checks for one change (CI-friendly)
  doctor    diagnose the project↔apriori seam (onboarding health check)
  check     structural consistency checks (CI / pre-commit)
  init      scaffold the workflow + per-tool pointers
  update    refresh tool-owned files (runbook copy, command pointers) after a CLI upgrade

Run 'apriori <command>' with no args for that command's usage.`;

async function main() {
  switch (sub) {
    case 'new':     return require('../lib/new').cli(rest);
    // retired in 6.0: the lane was a parallel process, not a shortcut. Refused with a
    // pointer rather than deleted outright — `apriori hotfix new x` in an old habit or
    // an old script should say what replaced it, not 'unknown command'.
    case 'hotfix':
      console.error("apriori hotfix: removed in 6.0 — there is one flow now.\n"
        + "  New work:  apriori new <name>\n"
        + "             (reproduce -> fix -> regression -> one independent review)\n"
        + "  A bundle the lane left behind: convert it to a change, or finish it with apriori-cli 5.x.");
      return 2;
    case 'status':  return require('../lib/status').cli(rest);
    case 'verify':  return require('../lib/spec-runner').cli(rest);
    case 'archive': return require('../lib/archive-merge').cli(rest, {
      // the bin seam: archive-merge never requires spec-runner; the integrity report's
      // terminable id matcher (config > default) is composed here and injected lazily
      idMatcherFactory: (cwd) => {
        const { resolveIdPattern } = require('../lib/config');
        const r = resolveIdPattern(cwd, null);
        if (r.error) return { error: r.error };
        return require('../lib/spec-runner').makeIdMatcher(r);
      },
    });
    case 'stamp':   return require('../lib/archive-merge').stampCli(rest);
    case 'gate':    return require('../lib/gate').cli(rest);
    case 'doctor':  return require('../lib/doctor').cli(rest);
    case 'check':   return require('../lib/check').cli(rest);
    case 'init':    return require('../lib/init').cli(rest);
    case 'update':  return require('../lib/update').cli(rest);
    case '-v':
    case '--version': console.log(require('../package.json').version); return 0;
    case undefined:
    case '-h':
    case '--help':  console.log(USAGE); return 0;
    default:        console.error(`unknown command: ${sub}\n\n${USAGE}`); return 2;
  }
}

// An UNCAUGHT exception is an evaluation nobody can trust: exit 2, like every other
// untrustworthy run — and under --json still JSON, `{result: 'ERROR', errors: [...]}`, so a
// machine consumer never has to parse prose to learn that the run blew up (JC-08).
main().then(
  (code) => process.exit(code),
  (err) => {
    const msg = err && err.message ? err.message : String(err);
    if (process.argv.includes('--json')) console.log(JSON.stringify({ result: 'ERROR', errors: [msg] }, null, 2));
    else console.error(`apriori: ${msg}`);
    process.exit(2);
  }
);
