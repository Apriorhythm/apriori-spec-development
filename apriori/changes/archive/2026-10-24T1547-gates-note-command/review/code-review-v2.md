<!-- provenance: provider=anthropic model=claude-opus-5-5 session=resumed-from-round-1 date=2026-10-24 — recorded on behalf of the reviewer (R2 transcription); the reviewer's full output follows verbatim -->

# code-review v2: gates-note-command

## Scope

Round 2 is scoped to what changed: `git diff 87d64a2..HEAD` (571d626, a5e303c). I read it together with the code it affects:
- `lib/note.js`, in full;
- the readers it defends against: `scan`, `structure`, `gatesEntries` and `ownerEntry` (`OWNER_ENTRY_RE`) in `lib/flow.js`, and the owner-payload readers. `readiness.gatesEntriesRaw` is `flow.gatesEntries`, so evidence-accept, force, drop, unreviewed and the reframe/progress/ruling readers in `lib/review.js` all go through the same entry rule;
- the revised `specs/note` text;
- `test/note.test.js`.

`node --test test/note.test.js` gave 9/9. I probed `appendEntry` and `textProblem` in memory with `node -e`; no files were written.

## Round-1 findings

- GN-1: ADDRESSED — `textProblem` refuses `<!--` or `-->` anywhere, and refuses any continuation line that, once trimmed, opens with `-`, `*` or `+` followed by whitespace or end of line, or with a ``` / `~~~` fence. Continuation lines are now indented by at least four spaces, so KEY_RE, HEADING_RE and FENCE_OPEN_RE (at most 3 spaces) cannot match them. In-memory probes:
  - `- b`, `\t-\tb`, NBSP-prefixed `- b`, a bare `-`, `+ b`, an indented `~~~` and a forged `- <stamp> owner: …` (with and without `--owner`) are all refused.
  - `# h`, `gates:`, `phase: done`, `1. b`, and a `- …` joined through U+2028, U+0085 or VT are written as one entry with no owner payload and no structural defect.
  - Every reader goes through the same `/^\s*-\s/` rule, so one entry per invocation holds for all of them.
  - NT-03 now injects six hazards plus the `--owner` forgery, and asserts exit 2, bytes unchanged and no `last decision:`.
- GN-2: ADDRESSED — the whole-file normalization is gone. Raw lines are split on LF and each keeps its CR. New lines carry the file's own EOL. A file with bare CR line endings is refused. Probe: a CRLF file with a trailing newline gives `startsWith(original) === true` and appends `"  - … note: x\r\n    y\r\n"`. NT-01 asserts the CRLF case. (A regression the fix introduces on a neighbouring input is GN-3 below.)

## New substantive issues

- **GN-3 — A CRLF file without a trailing newline gets `\r\r\n`, and the next `apriori note` then refuses that file.**
  - **Description.** When `!trailingNewline`, `appendEntry` first adds `\r` to the last raw line. When the entry is inserted at the end, it also adds `\r` to every entry line. Then `if (!out.endsWith('\n')) out += eol` appends a full `\r\n` after a line that already ends in `\r`.
  - **Probe 1, gates last.** A CRLF scaffold without its final newline gives `…note: x\r\n    y\r\r\n`.
  - **Probe 2, gates mid-file.** The `## Next` / `- n` tail becomes `- n\r\r\n`.
  - **What follows.** The current contract (NT-01: "the new lines use the file's own line ending") does not hold on this input. Worse, the output now contains a bare CR. The fix's own guard `/\r(?!\n)/` then makes the next `apriori note` exit 1 with "flow-state.md uses bare CR line endings". The command breaks its own next run on a file it wrote itself.
  - **Readers.** `scan` reads `\r\r\n` as one extra blank line, so status, gate and the owner readers are unaffected.
  - **Test gap.** NT-01's CRLF case only covers a file that ends with a newline.
  - **Risk.** Low-to-medium. The input is an edge case (Windows editors that drop the final newline), but the result is a stuck writer whose error message blames the user's file.
  - **Suggested fix.** Close a newline-less last line with a full `eol` and drop the trailing-EOL patch-up. For example: `if (!trailingNewline) { lines[lines.length - 1] += cr; lines.push(''); }`, keep `l + cr` for the entry lines, and do not append `eol` when `out` already ends with `\n`. Add an NT-01 case with a CRLF file and no final newline. It should assert no `\r\r`, that the result passes `appendEntry` again, and that the file is unchanged up to the entry. The LF no-newline case already gives `…scaffold\n  - … note: x\n`, which is correct.

## Risk surfaces examined

- Entry-splitting and owner minting across every gates reader: closed.
- Comment and fence injection: closed.
- Heading, key and section-break injection through continuation lines: not reachable at a four-space indent.
- Unicode and odd whitespace in continuation lines (NBSP, VT, U+2028, U+0085): not split into entries.
- Line-ending preservation (LF and CRLF; with and without a final newline; gates last and mid-file; bare CR): GN-3.
- Column-0 logs (A-1): the entry goes at column 0 and its continuation at four spaces, correct.
- The first non-blank line as head (A-2), the usage note on a leading `-` (A-3), the "after the last non-blank line" clause (A-4): consistent with the code.
- `--owner` with a plain multi-line text: the joined payload stays verbatim (`evidence-accept R-01 — ok more words`).
- Refusals return exit 2 with the usage before any write: confirmed.

## Risk surfaces not examined

- The full 916-test suite, the corpus-replay tests (ARR-03/DLV-05) and `apriori verify --change`: I relied on the producer's report.
- The doc wording diffs in `docs/cli*.md`, beyond confirming they match the code (documentation is advisory).
- Files with mixed EOLs: CRLF is chosen when any CRLF is present. Earlier bytes are kept. Not judged further.

## Advisories

- A-5. `textProblem` also refuses `+ ` continuation lines, which `gatesEntries` would not read as an entry. This is stricter than needed but harmless, and the contract wording ("would open a list item") covers it.
- A-6. A refused `<!--` / `-->` also blocks a human's verbatim words that happen to contain an arrow `-->`. The message says why, but a hint about the alternative (rephrase, e.g. `→`) would save a round-trip.

VERDICT: 1 issues open
