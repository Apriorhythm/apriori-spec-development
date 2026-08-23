# process-config — supervision parameters (HUMAN-HELD)

<!-- Lives at `apriori/process-config.md` (scaffolded there by `apriori init`).
     Governance: this file is owned by a human; the agent READS it and never writes it (RUNBOOK §1 R3).
     Missing file → the defaults printed in RUNBOOK §4 apply.
     Invalid value → a consumption-time problem, never a silent fallback (see each row's rule). -->

| Field | Value | Legal range | Default |
|---|---|---|---|
| language | auto | auto (match the human) / any language name, e.g. `中文`, `English` | auto |
| id-pattern | [A-Z]+(?:-[A-Z]+)*-\d+[a-z]* | bare JS regex source for scenario IDs; pipe escaping: see the comment below this table | [A-Z]+(?:-[A-Z]+)*-\d+[a-z]* |
| cas | required | required = archive denies unstamped mutation deltas / optional = warn only (waiver visible) | required |

<!-- id-pattern pipe escaping (two separate layers — do not conflate them):
     inside a table cell, EVERY pipe belonging to the value is written \| — so an
     alternation like (AC\|BR)-\d+ parses to the regex source (AC|BR)-\d+ (a bare | = alternation);
     to MATCH a literal pipe character, use a character class: write [\|] in the cell,
     which parses to the regex source [|]. Precedence: --id-pattern flag (verify/gate) >
     this row > built-in default [A-Z]+(?:-[A-Z]+)*-\d+[a-z]*. An uncompilable row is a consumption-time
     error (verify/gate/check exit 2; doctor reports a D6 finding) — never a silent fallback. -->
