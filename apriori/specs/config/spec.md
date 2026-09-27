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

#### Scenario: CF-07 the template ships no cas row
- WHEN `templates/process-config.md` is read
- THEN it carries NO `cas` row (a missing row is the built-in default, `required`); the required-vs-optional semantics and the `| cas | optional |` waiver form are documented in the CLI reference (`docs/cli.md` §8.0, both editions)

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

#### Scenario: CF-12 the template ships no id-pattern row — the pattern lives in one place
- WHEN `templates/process-config.md` is read AND parsed by `parseConfig`
- THEN it carries NO `id-pattern` row and no copy of the pattern anywhere (the built-in default in `lib/config.js` is the single source — every shipped copy was a drift surface); its table parses end-to-end with `language` as the one live row and zero conflicts; the two-layer pipe-escaping guidance (`\|` in a cell parses to a bare alternation `|`; a literal-pipe match is written `[\|]`, parsing to `[|]`) and the built-in default, verbatim and in the formatter-stable `{0,}` spelling, live in the CLI reference (`docs/cli.md` §8.0, both editions)

#### Scenario: CF-18 a freshly initialised project inherits the current pattern end to end
- WHEN `apriori init` scaffolds a project and nothing in `apriori/process-config.md` is edited by hand
- THEN `resolveIdPattern` answers with the built-in default and `origin: 'default'` — the scaffold ships no row, a missing row IS the default — and that pattern recognises multi-segment and lowercase-suffixed IDs (`AC-BIS-01`, `LIFE-DWS-01`, `AC-30f`) on BOTH sides of the binding: scenario titles and TAP descriptions
- AND `check`'s CK-04, `doctor`'s D6, `verify` and `gate`'s C1 reach the same conclusion about those titles on that project — one effective pattern, four consumers, no second hard-coded copy

### Requirement: review-round-limit is a structured, human-held config key
`lib/config.js` SHALL expose `resolveReviewRoundLimit(cwd)` reading the `review-round-limit` row through the shared structured reader: a missing row (or a missing file) resolves to `{ value: 8, origin: 'default' }`; an explicit row resolves to `{ value: <n>, origin: 'config' }` only when its trimmed cell is a decimal SAFE integer >= 1 (a cell long enough to overflow is not a limit); any other cell — including a present row whose cell is empty or all hyphens, even beside another row that carries a number — a conflicting set of rows or an unreadable file resolves to `{ error }` whose message itself starts with `review-round-limit:` and ends with the legal range `an integer >= 1 (missing row = 8)`, naming the offending cell(s) between them (the cells of a conflict, at most three shown, each bounded); the 200-character cap is spent on that middle part, so the key and the range are never truncated away; C8 repeats that message once, never prefixing the key twice. The shared reader SHALL keep ignoring a blank cell for every other key. The scaffolded template SHALL ship the row `| review-round-limit | 8 | … |` so the number is visible where the human edits it, and the CLI reference (both editions, §8.0) SHALL document the key beside `id-pattern` and `cas`.

#### Scenario: CF-30 the default is 8 and the template ships it visibly
- WHEN no process-config exists, then one without the row, then the scaffolded template itself
- THEN the first two resolve to 8 with origin `default`; the template carries a live `review-round-limit` row whose value cell is `8`; an existing row reading `7` still resolves to 7 — a raised default never overrides an explicit value

#### Scenario: CF-31 legal and illegal cells
- WHEN the row's value cell is `1`, `7`, `12`, ` 9 ` (padded), then `0`, `-1`, `2.5`, `abc`, `7 rounds`, and finally two rows `3` and `5`
- THEN the first four resolve to the integer with origin `config`; each of the next five is an `error` naming `review-round-limit`, the cell and the legal range; the conflicting pair is an `error` naming the conflict

#### Scenario: CF-32 the key is consumed by C8 through the shared reader only
- WHEN `lib/review.js` and `lib/gate.js` are read
- THEN neither carries a second table parser for the key — the limit enters the loop as a resolved value passed by the consumer, and `lib/config.js` is the only file that reads the row

#### Scenario: CF-33 a present row with an empty or hyphen cell is an error, never the default
- WHEN the row's value cell is empty, a space, `-` or `---`; and when such a row stands beside `| review-round-limit | 3 |`, in either order
- THEN the resolver answers an `error` naming `review-round-limit`, `empty value cell` and the legal range in every case (the paired case also names `'3'`), and C8 blocks on it exactly as on an explicit `0`; a blank `id-pattern` cell still resolves to that key's default

#### Scenario: CF-34 a cell too long to be a safe integer is an error, not an infinite limit
- WHEN the cell is 20 nines, 400 ones, or `9007199254740992`
- THEN each is an `error` naming the key and the range; `9007199254740991` resolves to that integer

#### Scenario: CF-35 an unreadable file and a conflict resolve to errors that name the key and the range
- WHEN `apriori/process-config.md` is a directory; when two rows read `3` and `5`; and when five rows conflict, two of them 120 characters long
- THEN the first resolves to an `error` starting `review-round-limit: ` and containing `cannot be read` and the range, which the loop repeats once and `archive` refuses on; the second names `('3' vs '5')` and the range; the third is at most 200 characters, still starts with the key and still ends with the range
