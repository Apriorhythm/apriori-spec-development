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
