<!-- provenance: provider=anthropic model=claude-opus-5-5 session=resumed-from-round-1 date=2026-10-24 — recorded on behalf of the reviewer (R2 transcription); the reviewer's full output follows verbatim -->

# code-review v3: gates-note-command

## Scope

Round 3 is scoped to what changed since round 2: `git diff a5e303c..HEAD` (a216d09). The changes are the `appendEntry` final-newline handling and the A-6 hint in `lib/note.js`, plus the new NT-01 cases in `test/note.test.js`. The remaining paths in the stat are `flow-state.md` (the producer's notes) and the landed `review/code-review-v2.md`, which are bookkeeping and not product code. I judged the fix against the readers it feeds: `scan`, `structure` and `gatesEntries` in `lib/flow.js`, and the fix's own bare-CR guard on the next run. `node --test test/note.test.js` gave 9/9. I probed `appendEntry` in memory with `node -e`; no files were written.

## Round-2 finding

- GN-3: ADDRESSED — when the file has no final newline, its last raw line is now closed with the file's own CR and a trailing `''` element is pushed. The join then emits exactly one EOL, and the post-hoc `out += eol` is gone. I probed eleven inputs, each followed by a second `appendEntry` on the result:
  - **Probed inputs:** LF and CRLF, each with and without a final newline; LF and CRLF with gates before `## Next` and no final newline; a mixed-EOL file with and without a final newline; a bare `gates:` with no newline; LF and CRLF files with trailing blank lines.
  - **Results on every input:** no bare CR, no doubled `\r\r`, and the second write is accepted. Entry counts are as expected (3 after two writes; 2 for the bare `gates:` case), with no structural defects.
  - **Gates mid-file:** the bytes before the entry equal the original's prefix exactly. Only the missing final newline is added, after the entry, as the file's own EOL (`…\r\n## Next\r\n- n\r\n`).
  - **Tests:** the new NT-01 cases cover LF and CRLF no-final-newline, re-acceptance by a second `apriori note`, and the CRLF gates-before-`## Next` case.

## New substantive issues

None. The A-6 change only alters a refusal message string. Refusal behaviour (exit 2, nothing written) is unchanged.

## Risk surfaces examined

- Line-ending preservation, all cases listed above.
- Self-poisoning through the bare-CR guard on the next run: closed.
- Prefix byte-identity when inserting mid-file.
- Trailing blank lines after the gates block: kept after the entry.
- Interaction with `scan`'s CR normalization and line numbering: entry counts and defects are as expected.
- That the GN-1 hazard refusals are unaffected: `textProblem` changed only in its message.

## Risk surfaces not examined

- The full 916-test suite, corpus replay, `apriori verify --change` and `apriori check`: I relied on the producer's report.
- Real Windows hosts, where file I/O might add encoding effects such as a BOM. Not exercised here.

## Advisories

- A-7. In a mixed-EOL file, the presence of any CRLF makes every new line CRLF. Probe: a mostly-LF file with one CRLF line gets CRLF entries after LF lines. Bytes before the entry are kept and the readers are unaffected. The contract's "the file's own line ending (LF or CRLF)" leaves the mixed case undefined. If it matters, a single sentence in the contract would settle it (for example, "the last line's ending", or "CRLF if any").
- A-5 (from v2) still stands and was deliberately left as is: refusing `+ ` continuation lines is stricter than needed but harmless.

VERDICT: no spec-vs-code gaps
