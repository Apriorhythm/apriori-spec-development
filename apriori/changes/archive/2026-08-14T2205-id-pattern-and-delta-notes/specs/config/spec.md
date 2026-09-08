<!-- apriori-base: sha256:ae0956626bd316f42450420c87672ea7d262a6b400af0830809615484d2a8fca -->

## MODIFIED Requirements

### Requirement: process-config cells honor the markdown pipe escape
`parseConfig` SHALL split table rows into cells by a per-character scan: for each `|`, count the consecutive backslashes immediately before it — an odd count means the last backslash escapes the pipe (that backslash is removed and the pipe joins the current cell's value; the remaining backslashes stay literal); an even count (including zero) means the pipe is a cell separator and every backslash stays literal. No other backslash sequence is ever unescaped (`\\` never collapses to `\` — parseConfig is not a markdown renderer). The rule applies to EVERY key uniformly — including a pipe inside a regex character class: EVERY pipe that belongs to a cell's value is written `\|` in the cell, wherever it sits in the value. Consequently a regex that must match a literal pipe character is written `[\|]` in the cell, parsing to the source `[|]` (a bare escaped pipe `\|` in the final source is unreachable by construction — the character-class form is the canonical literal-pipe spelling). `readConfig` SHALL surface a present-but-unreadable `process-config.md` (directory, permission failure, any read error) as a consumption-time problem through `getConfig`, never as a thrown exception.

#### Scenario: CF-08 odd backslash runs keep the pipe in the value
- WHEN a live row reads `| id-pattern | (AC\|BR)-\d+ |` and another config carries a cell fragment `a\\\|b`
- THEN the first parses to the value `(AC|BR)-\d+` (the escaping backslash removed, the pipe in the value) and the second cell value contains `a\\|b` (three backslashes: one removed, two kept, pipe joined)

#### Scenario: CF-09 even backslash runs keep the pipe a separator
- WHEN a cell fragment ends `a\\|b` and another ends `a\\\\|b`
- THEN both pipes act as cell separators — the values end with `a\\` and `a\\\\` respectively, every backslash kept literal

#### Scenario: CF-10 unescaped configs parse exactly as before
- WHEN an existing config with no backslash-pipe sequences is parsed (plain `test-cmd` and `cas` rows, template-style multi-column rows, fenced and commented rows)
- THEN every key/value parses identically to the pre-escape behavior — fenced/commented rows stay inert, extra columns stay ignored

#### Scenario: CF-11 an unreadable config is a consumption-time problem
- WHEN `apriori/process-config.md` exists but cannot be read as a file (e.g. it is a directory) and a consumer asks `getConfig` for any key
- THEN the consumer receives a problem naming `process-config` (no exception is thrown), and each command surfaces it per its own error contract

#### Scenario: CF-12 the template names the id-pattern row with two-layer pipe wording
- WHEN `templates/process-config.md` is read AND parsed by `parseConfig`
- THEN it carries an `id-pattern` row whose parsed value is the built-in default — the template's VALUE cell, its DEFAULT cell and the built-in-default wording in the adjacent comment SHALL all state that one pattern, since the value cell is what `init` writes into a new project and what `resolveIdPattern` consumes FIRST: leaving a stale value there would silently pin every new project to the old pattern while a documentation-only check still passed and whose table cells are PIPE-FREE prose (a parsed cell value can never display a lone `\|`, so the escaping guidance must not live in a cell); the pipe-escaping guidance lives in an adjacent HTML comment (non-content for parseConfig — no escaping applies there), stating BOTH layers separately — every in-cell pipe is written `\|` (an alternation parses to a bare `|` in the regex source; a literal-pipe match is written `[\|]`, parsing to `[|]`) — with no phrasing that calls `\|` a "literal pipe" of the regex; AND the template's whole table survives parsing end-to-end (structure + parsed id-pattern value asserted, not only a text grep)

#### Scenario: CF-18 a freshly initialised project inherits the current pattern end to end
- WHEN `apriori init` scaffolds a project and nothing in `apriori/process-config.md` is edited by hand
- THEN `resolveIdPattern` answers with the template's pattern and `origin: 'config'` — the row is live, not decorative — and that pattern recognises multi-segment and lowercase-suffixed IDs (`AC-BIS-01`, `LIFE-DWS-01`, `AC-30f`) on BOTH sides of the binding: scenario titles and TAP descriptions, the latter through the config-origin child
- AND `check`'s CK-04, `doctor`'s D6, `verify` and `gate`'s C1 reach the same conclusion about those titles on that project — one effective pattern, four consumers, no second hard-coded copy
