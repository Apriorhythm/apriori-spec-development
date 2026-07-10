'use strict';
/*
 * args — the one strict argv parser every subcommand shares (CL-11..17).
 * --help/-h anywhere → {ok:false, code:0} (caller prints usage to stdout, exits 0).
 * Unknown dash-tokens, missing values, empty multi sets, arity violations →
 * {ok:false, code:2, message} (caller prints message + usage to stderr, exits 2).
 * Nothing is ever silently ignored — a typo must never verify the wrong thing green.
 */

// spec = { sub, usage, flags: {'--name': 'value'|'multi'|'flag'}, positionals: 0|1, aliases: {'-y':'--yes'} }
function parseStrict(argv, spec) {
  const aliases = { '-h': '--help', ...(spec.aliases || {}) };
  const def = spec.flags || {};
  const flags = {};
  const positionals = [];
  const err = (message) => ({ ok: false, code: 2, message });
  // help wins over EVERYTHING, wherever it appears (S6/CL-11) — pre-scan before any validation
  for (const raw of argv) if ((aliases[raw] || raw) === '--help') return { ok: false, code: 0 };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const tok = aliases[raw] || raw;
    if (tok.startsWith('-')) {
      const kind = def[tok];
      if (!kind) return err(`unknown flag '${raw}' for 'apriori ${spec.sub}'`);
      if (kind === 'flag') flags[tok] = true;                       // idempotent on repeat
      else if (kind === 'value') {
        // consumes EXACTLY the next token, verbatim (the req's rule) — only absence is an error
        if (argv[i + 1] === undefined) return err(`flag '${tok}' needs a value`);
        flags[tok] = argv[++i];                                     // repeats: last-write-wins
      } else {                                                      // multi: until the next dash token
        const vals = flags[tok] || [];
        const before = vals.length;
        while (argv[i + 1] !== undefined && !argv[i + 1].startsWith('-')) vals.push(argv[++i]);
        if (vals.length === before) return err(`flag '${tok}' needs at least one value`);
        flags[tok] = vals;                                          // repeats: accumulate
      }
    } else positionals.push(raw);
  }
  const arity = spec.positionals || 0;
  if (positionals.length > arity) return err(`unexpected argument '${positionals[arity]}' for 'apriori ${spec.sub}'`);
  if (positionals.length < arity) return err(`'apriori ${spec.sub}' expects ${arity} argument(s)`);
  return { ok: true, flags, positionals };
}

// Uniform wiring: parse; help → usage to stdout, 0; error → message + usage to stderr, 2;
// ok → hand {flags, positionals} to the command body.
function withStrict(argv, spec, body) {
  const p = parseStrict(argv, spec);
  if (!p.ok) {
    if (p.code === 0) { console.log(spec.usage); return 0; }
    // commands with a pure-JSON contract (gate GT-11, doctor DR-10) keep stdout JSON
    // even for parse errors when --json was requested
    if (spec.jsonError && argv.includes('--json')) { console.log(spec.jsonError(p.message)); return 2; }
    console.error(`${spec.sub}: ${p.message}\n${spec.usage}`);
    return 2;
  }
  return body(p.flags, p.positionals);
}

module.exports = { parseStrict, withStrict };
