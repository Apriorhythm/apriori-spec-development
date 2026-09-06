'use strict';
/*
 * args — the one strict argv parser every subcommand shares (CL-11..17).
 * --help/-h anywhere → {ok:false, code:0} (caller prints usage to stdout, exits 0).
 * Unknown dash-tokens, missing values, empty multi sets, arity violations →
 * {ok:false, code:2, message} (caller prints message + usage to stderr, exits 2).
 * Nothing is ever silently ignored — a typo must never verify the wrong thing green.
 */

// THE ONE WALKER. The token-consumption rules live here and nowhere else: a value flag consumes
// EXACTLY the next token, verbatim (a dash token included); a repeated value flag is
// last-write-wins; a multi flag takes tokens until the next dash token; a flag is idempotent.
// `strict` stops at the first problem (the parser); lenient walks past an unknown flag or a
// missing trailing value WITHOUT inventing anything (the request-context recovery an error view
// needs — never a scan of argv for flag-looking strings, which would read a swallowed
// `--escalation` or `--json` as a flag). -> { flags, positionals, error: string|null }
function consume(argv, spec, strict) {
  const aliases = { '-h': '--help', ...(spec.aliases || {}) };
  const def = spec.flags || {};
  const flags = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const tok = aliases[raw] || raw;
    if (tok.startsWith('-')) {
      const kind = def[tok];
      if (!kind) { if (strict) return { flags, positionals, error: `unknown flag '${raw}' for 'apriori ${spec.sub}'` }; continue; }
      if (kind === 'flag') flags[tok] = true;                       // idempotent on repeat
      else if (kind === 'value') {
        if (argv[i + 1] === undefined) { if (strict) return { flags, positionals, error: `flag '${tok}' needs a value` }; continue; }
        flags[tok] = argv[++i];                                     // repeats: last-write-wins
      } else {                                                      // multi: until the next dash token
        const vals = flags[tok] || [];
        const before = vals.length;
        while (argv[i + 1] !== undefined && !argv[i + 1].startsWith('-')) vals.push(argv[++i]);
        if (vals.length === before) { if (strict) return { flags, positionals, error: `flag '${tok}' needs at least one value` }; continue; }
        flags[tok] = vals;                                          // repeats: accumulate
      }
    } else positionals.push(raw);
  }
  return { flags, positionals, error: null };
}

// spec = { sub, usage, flags: {'--name': 'value'|'multi'|'flag'}, positionals: 0|1, aliases: {'-y':'--yes'} }
function parseStrict(argv, spec) {
  const aliases = { '-h': '--help', ...(spec.aliases || {}) };
  const err = (message) => ({ ok: false, code: 2, message });
  // help wins over EVERYTHING, wherever it appears (S6/CL-11) — pre-scan before any validation
  for (const raw of argv) if ((aliases[raw] || raw) === '--help') return { ok: false, code: 0 };
  const { flags, positionals, error } = consume(argv, spec, true);
  if (error) return err(error);
  const arity = spec.positionals || 0;
  if (positionals.length > arity) return err(`unexpected argument '${positionals[arity]}' for 'apriori ${spec.sub}'`);
  if (positionals.length < arity) return err(`'apriori ${spec.sub}' expects ${arity} argument(s)`);
  return { ok: true, flags, positionals };
}

// The REQUEST CONTEXT of an argv that may not have parsed: the flags the same rules reach,
// leniently. A command's error view reads its {view, change, json} off this — the normal path
// reads the identical flags off parseStrict, so the two can never disagree about which view was
// asked for (F5, Astra round 2).
function recover(argv, spec) { return consume(argv, spec, false).flags; }

// Uniform wiring: parse; help → usage to stdout, 0; error → message + usage to stderr, 2;
// ok → hand {flags, positionals} to the command body.
function withStrict(argv, spec, body) {
  const p = parseStrict(argv, spec);
  if (!p.ok) {
    if (p.code === 0) { console.log(spec.usage); return 0; }
    // commands with a pure-JSON contract (gate GT-11, doctor DR-10, verify/status JC-01/04) keep
    // stdout JSON even for parse errors when --json was requested: the command's `jsonError`
    // recovers the request context (view, change, whether --json was really a flag) with the
    // walker's own rules and answers null when no JSON was asked for
    if (spec.jsonError) { const out = spec.jsonError(p.message, argv); if (out) { console.log(out); return 2; } }
    console.error(`${spec.sub}: ${p.message}\n${spec.usage}`);
    return 2;
  }
  return body(p.flags, p.positionals);
}

module.exports = { parseStrict, recover, withStrict };
