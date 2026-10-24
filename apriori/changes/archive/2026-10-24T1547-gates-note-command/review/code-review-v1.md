<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-24 — recorded on behalf of the reviewer (R2 transcription); the reviewer's full output follows verbatim -->

# code-review v1: gates-note-command

**Reviewer:** an independent fresh session on a different tier (RUNBOOK §1 R2, non-Codex path). It worked read-only and wrote nothing into the bundle.

## What was checked

- The behavior contract: `specs/note` (NT-01..NT-06), `specs/status` (ST-47, ST-48) and `specs/protocol` (PR-73).
- The full diff `v6-dev...HEAD` (87d64a2): `lib/note.js`, `lib/flow.js` (recordedStamps / localStamp / futureStamps), `lib/status.js`, `lib/review.js` hints, `lib/new.js`, `bin/apriori.js`, the RUNBOOK §3 gates block and §1 R4, `docs/cli.md` / `docs/cli_cn.md`, the CHANGELOG, and the three shape-freeze test edits.
- `flow-state.md`: `## Open` is empty and no uncovered boundary is named.
- The callers the new writer feeds: `scan` / `structure` / `gatesEntries` in `lib/flow.js`, and the owner-payload readers in `lib/readiness.js` (evidence-accept, force, drop, unreviewed) and `lib/review.js` (reframe, progressRecords, rulingRecords).
- Commands run:
  - `node --test` on `test/note.test.js` and the three shape-contract files: 26/26 pass.
  - `apriori gate --change gates-note-command --json`: only C8 is blocked (no review yet). C1 was skipped because no test command is configured.
  - `apriori status --change`.
  - `apriori check`: PASS.
- `appendEntry` is pure (text in, text out), so I probed it in memory with `node -e`. No files were written.

## Substantive issues

- **GN-1 — A multi-line note can open further entries, including an `owner:` decision.**
  - **Description.** NT-03 requires that a text with line breaks "SHALL be written as one entry … never as a second entry". `lib/note.js` itself claims that "the text can never open a second entry". `entryLines` only indents the continuation lines, by `indent + '  '`. But `gatesEntries` (lib/flow.js) starts a new entry at any line matching `/^\s*-\s/`, whatever its indentation. So any continuation line that starts with `- ` becomes its own entry.
  - **Probe.** `appendEntry(base, "2026-10-24T16:00", "note", "review done:\n- CR-01 fixed\n- 2026-10-24T16:00 owner: approve archive")` gave:
    - 4 entries instead of 2;
    - the last entry has `payload: 'approve archive'`;
    - `parseFlowState(...).lastGate` = `2026-10-24T16:00 owner: approve archive`.
  - **Why it matters for authorization.** A plain `note:` invocation, without `--owner`, can produce an owner decision. The owner-payload readers in `readiness.js` (`evidence-accept`, force, drop, `--unreviewed`) and `review.js` (reframe) would treat it as authorization.
  - **Why it matters for the command's main use.** The intended use is multi-line `review-progress` and `ruling` records, and those naturally carry bullet lists. A text such as `"review-progress code-review round 3 — issues: GN-1; actions:\n- GN-1 fixed\n- …; evidence: test/x.test.js; approach: kept — …"` is read back as three entries. The `evidence:` and `approach:` parts fall outside the progress entry, so C8 reads the record as incomplete. That is the exact case the RUNBOOK and the C8 hints now send the agent to.
  - **Related case.** A `<!--` inside the text is written unchanged. In the probe it produced the defect `unclosed HTML comment — everything after it is unreadable`, which also hides the entry itself.
  - **Test gap.** The NT-03 test shares the scenario ID but only uses continuation lines that do not start with `- `. It never injects the adversarial condition.
  - **Risk.** High. The writer meant to make gates entries trustworthy can split one record into several and can mint owner entries. The contract's hard guarantee holds only on the happy path.
  - **Suggested fix.** Neutralize each continuation line so that `gatesEntries` can never read it as an entry start. For example, escape a leading `-` (and `*`, if the readers ever accept it), or refuse such text with exit 2 and a clear message. Also refuse or escape `<!--`, `-->` and fence openers. Add NT-03 cases that assert exactly one new entry, `payload === null` and an unchanged `lastGate` for texts with `- …`, `- <stamp> owner: …` and `<!--`.

- **GN-2 — "Every byte before the new entry stays as it was" fails for CRLF files.**
  - **Description.** `appendEntry` runs `String(text).replace(/\r\n?/g, '\n')` over the whole file, then writes the result back. A CRLF flow-state comes back as an all-LF file: the probe gave `startsWith(original) === false`. NT-01 and the docs ("nothing before the new entry changes", and the CN wording that not a single byte changes) promise byte preservation. The repo has just gone through Windows portability work (`windows-ci-portability`, `bd08-windows-separators`), so CRLF checkouts are a real input. NT-01 only tests an LF scaffold.
  - **Risk.** Medium-low. The file still reads the same, but the whole-file diff violates the append-only promise the command exists to give. A git-tracked bundle would show a full rewrite.
  - **Suggested fix.** Detect the file's line ending, insert the entry using that ending, and leave the prefix untouched. Alternatively, narrow the contract text to "content-preserving", with a test either way. Add a CRLF case to NT-01.

## Risk surfaces examined

- **Input validation:**
  - change-name validation, and archived / missing / symlinked change dirs and flow-states (via `resolveChange` and `fileReadDefect`);
  - zero or two `gates:` blocks;
  - empty or whitespace-only text;
  - unknown flags and backdating flags (`--at`, `--date`, `--time` exit 2).
- **Structural injection** through the note text: GN-1.
- **Append position:** gates block last; gates followed by another section (the entry lands correctly inside the block); a trailing comment line inside the block.
- **Byte preservation:** GN-2.
- **Status advisory:**
  - It shares one reading with `lastRecorded` (`recordedStamps`).
  - It changes nothing else: exit code, `lastRecorded` and `lastGate` are unchanged, and the list view prints no advisory line.
  - The day-only rule is correct: a day-only entry of today is not flagged, one of a later day is.
  - The JSON key is added; the shape-freeze tests are updated consistently (28 keys; the type table).
- **Hints and docs:**
  - The C8 hints name the command and keep the entry grammar.
  - RUNBOOK R4 keeps the grammar.
  - §3 announces no gate or defect for a hand-written stamp.
  - The EN/CN headings align (`check` PASS).
- **Scope:** no backdating mechanism; P3 untouched; old archives untouched. Nothing goes beyond the agreed approach. The approach is sound.

## Risk surfaces not examined

- The full 916-test suite: only the change's own test file and the three shape files were run.
- Concurrent writers and atomicity of `writeFileSync`. Out of scope for a single-agent log.
- Behavior on Windows hosts, beyond the CRLF reasoning above.
- `apriori verify` binding. C1 was skipped for lack of a configured test command; the producer's GREEN projection was not re-run.

## Advisories

- A-1. If the existing entries sit at column 0 (`- 2026-…`, which the readers accept), `indent = m[1] || indent` falls back to two spaces. The new entry is then not "indented like the entries before it". It still parses.
- A-2. A text whose first line is blank (`"\nfoo"`) writes `- <stamp> note: ` with an empty head. Consider refusing it, or lifting the first non-blank line.
- A-3. A text starting with `-` (for example `"- CR-01 fixed"`) is rejected by `withStrict` as an unknown flag, and no `--` end-of-options escape is documented.
- A-4. If a gates block ends with a non-entry raw line (a comment), the new entry is placed after it. That is harmless, but worth a sentence in the contract.

VERDICT: 2 issues open
