### Requirement: process-config parses as structure, never as full-text regex
A shared reader (`lib/config.js`) SHALL be the single entry for every process-config consumer: it scans line-by-line, treating fenced code blocks (``` open/close; an unterminated fence makes the rest of the file inert) and HTML comments (`<!-- … -->`, multi-line; unterminated likewise inert; first-open wins, no nesting) as non-content; a config row is any `|`-leading table row — first cell key, second cell value, extra columns ignored, header and separator rows skipped; duplicate rows with the same key and value are tolerated silently, while different values for one key are a CONFLICT problem. Config problems surface ONLY when the key is actually consumed. The `--no-cas` flag keeps explicit supremacy over any config state.

#### Scenario: CF-01 fenced and commented rows never take effect
- WHEN process-config carries `| cas | optional |` inside a fenced block (or an HTML comment) and `| cas | required |` as a live row, with an unstamped MODIFIED delta being archived
- THEN the archive is DENIED (the live `required` wins; the fenced example grants nothing) — and the reversed layout (fenced `required`, live `optional`) waives with the waiver named

#### Scenario: CF-02 multi-column rows parse by their first two cells
- WHEN a live row reads `| cas | optional | 注释说明 |` (template-style extra column)
- THEN the key/value parse as cas/optional and the extra cell is ignored

#### Scenario: CF-03 duplicates tolerate sameness and refuse conflict
- WHEN one config carries `| cas | optional |` twice, and another carries `| cas | optional |` plus `| cas | required |`
- THEN the first reads cleanly as optional; the second is a CONFLICT — at consumption the archive errors (exit 1, nothing written) and gate C7 blocks naming the config conflict, never treating it as a waiver

#### Scenario: CF-04 unterminated blocks are inert, not effective
- WHEN a fence opens and never closes before rows that would otherwise waive CAS (same for an unterminated HTML comment)
- THEN those rows grant nothing — the file's tail is inert and an unstamped mutation archive is denied

#### Scenario: CF-05 config errors surface only at consumption
- WHEN the config carries a cas CONFLICT but the archived change is fully stamped (or ADDED-only)
- THEN the archive proceeds normally — the cas key was never consulted, so the bad row is invisible to this run

#### Scenario: CF-06 the waiver is discoverable
- WHEN `apriori archive` and `apriori gate` print their usage
- THEN both list `--no-cas`

#### Scenario: CF-07 the template names the cas row
- WHEN `templates/process-config.md` is read
- THEN it carries a `cas` row example documenting required-vs-optional semantics

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
- THEN it carries an `id-pattern` row whose parsed value is the built-in default and whose table cells are PIPE-FREE prose (a parsed cell value can never display a lone `\|`, so the escaping guidance must not live in a cell); the pipe-escaping guidance lives in an adjacent HTML comment (non-content for parseConfig — no escaping applies there), stating BOTH layers separately — every in-cell pipe is written `\|` (an alternation parses to a bare `|` in the regex source; a literal-pipe match is written `[\|]`, parsing to `[|]`) — with no phrasing that calls `\|` a "literal pipe" of the regex; AND the template's whole table survives parsing end-to-end (structure + parsed id-pattern value asserted, not only a text grep)
