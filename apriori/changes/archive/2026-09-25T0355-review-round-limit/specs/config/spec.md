<!-- apriori-base: sha256:f02eff204726a95a39e60511b578492eaf0b69cc584366b563c4b4086d993a60 -->
# Delta — config (review-round-limit)

## ADDED Requirements

### Requirement: review-round-limit is a structured, human-held config key
`lib/config.js` SHALL expose `resolveReviewRoundLimit(cwd)` reading the `review-round-limit` row through the shared structured reader: a missing row (or a missing file) resolves to `{ value: 7, origin: 'default' }`; an explicit row resolves to `{ value: <n>, origin: 'config' }` only when its trimmed cell is a decimal SAFE integer >= 1 (a cell long enough to overflow is not a limit); any other cell — including a present row whose cell is empty or all hyphens, even beside another row that carries a number — a conflicting set of rows or an unreadable file resolves to `{ error }` whose message itself starts with `review-round-limit:` and ends with the legal range `an integer >= 1 (missing row = 7)`, naming the offending cell(s) between them (the cells of a conflict, at most three shown, each bounded); the 200-character cap is spent on that middle part, so the key and the range are never truncated away; C8 repeats that message once, never prefixing the key twice. The shared reader SHALL keep ignoring a blank cell for every other key. The scaffolded template SHALL ship the row `| review-round-limit | 7 | … |` so the number is visible where the human edits it, and the CLI reference (both editions, §8.0) SHALL document the key beside `id-pattern` and `cas`.

#### Scenario: CF-30 the default is 7 and the template ships it visibly
- WHEN no process-config exists, then one without the row, then the scaffolded template itself
- THEN the first two resolve to 7 with origin `default`; the template carries a live `review-round-limit` row whose value cell is `7`

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
