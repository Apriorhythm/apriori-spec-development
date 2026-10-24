'use strict';
/*
 * apriori note — append ONE stamped entry to an active change's `gates:` log.
 * Zero deps — pure Node stdlib.
 *
 * The stamp is the CLI's local clock at the moment of writing (lib/flow.js localStamp — the same
 * shape `apriori new` writes), so a gates: entry's time is the time of recording and never a
 * time the agent fills in. There is deliberately no date argument: an entry about an earlier
 * event says so in its own words. The command only appends — every byte before the new entry
 * stays — and it refuses anything that is not an active change's own, readable flow-state with
 * exactly one `gates:` block. `--owner` writes the `owner:` label for a human's decision
 * transcribed verbatim: it transcribes, it does not prove the human decided (R1).
 */
const fs = require('fs');
const path = require('path');
const { withStrict } = require('./args');
const { structure, localStamp } = require('./flow');
const { resolveChange, validateChangeName, fileReadDefect } = require('./resolve');

const USAGE = `usage: apriori note --change <name> [--owner] "<text>"

  Appends \`- <YYYY-MM-DDTHH:MM> note: <text>\` to apriori/changes/<name>/flow-state.md's gates: log
  (\`--owner\` writes \`owner:\` for a human's decision, verbatim). The stamp is the time of recording,
  written by the CLI from its local clock — there is no date or time argument. A multi-line text
  is one entry (continuation lines indented); a line that would open a list item, a code fence or an
  HTML comment is refused, never rewritten. A text may not begin with \`-\` (the parser reads a
  leading dash as a flag): begin with a word. Nothing before the new entry is changed.`;

// What a text may NOT carry — the state file's readers decide this, not taste: `gatesEntries`
// opens a new entry on ANY line matching /^\s*-\s/, whatever its indentation, so a continuation
// line beginning with a list marker would become a second entry (an `owner:` one included —
// minted authorization, GN-1); `scan` blanks everything from `<!--` to `-->`, so a comment
// marker would hide the entry and the rest of the log; a fence opener needs <= 3 spaces of
// indentation, which the 4-space continuation indent below rules out, and is refused as well
// so the rule does not depend on the indent. Refused texts are usage errors (exit 2): the
// command rewrites nothing silently — an owner's words stay verbatim or are not written.
function textProblem(text) {
  if (/<!--|-->/.test(text)) return 'the text may not contain an HTML comment marker (`<!--` / `-->`): the state file\'s readers would blank the log from there on — rephrase it (an arrow is `→`)';
  const parts = String(text).replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const l of parts.slice(1)) {
    if (/^[-*+](\s|$)/.test(l)) return `a continuation line may not open a list item (\`${l.slice(0, 24)}\`): the gates: readers would read it as a second entry — write the list inline, parts separated by \`;\``;
    if (/^(\`{3,}|~{3,})/.test(l)) return `a continuation line may not open a code fence (\`${l.slice(0, 12)}\`)`;
  }
  return null;
}

// Build the entry lines: the first carries the stamp and label and the text's first non-blank
// line; every further non-blank line becomes a continuation line indented by at least four
// spaces (two more than the entry, never fewer than four — see textProblem), so no reader of
// the state file can take it for an entry, a heading, a key or a fence. -> string[]
function entryLines(stamp, label, text, indent) {
  const parts = String(text).replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  const [first, ...rest] = parts;
  const cont = ' '.repeat(Math.max(indent.length + 2, 4));
  return [`${indent}- ${stamp} ${label}: ${first}`, ...rest.map((l) => `${cont}${l}`)];
}

// Append to the gates: block of a flow-state text, keeping every byte before the new entry and
// the file's own line ending. -> { ok, text, lines, line } | { ok:false, error, usage? }
function appendEntry(text, stamp, label, body) {
  const problem = textProblem(body);
  if (problem) return { ok: false, usage: true, error: problem };
  const src = String(text);
  if (/\r(?!\n)/.test(src)) return { ok: false, error: 'flow-state.md uses bare CR line endings — convert it to LF or CRLF first' };
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const st = structure(src);                      // line numbers survive the reader's CRLF normalization
  if (!st.gates.length) return { ok: false, error: 'flow-state.md has no `gates:` block — nothing to append to' };
  if (st.gates.length > 1) return { ok: false, error: `flow-state.md writes \`gates:\` twice (lines ${st.gates[0].line} and ${st.gates[1].line}) — one append-only log only` };
  const lines = src.split('\n');                 // raw: a CRLF file keeps its '\r' at each line's end
  const g = st.gates[0];
  // the last non-blank line of the block, read from the RAW lines by number (the structured
  // pass blanks fenced/commented text; the file bytes decide where the block really ends)
  let lastIdx = g.line - 1;                    // the `gates:` line itself (0-based)
  let indent = '  ';
  for (const { n } of g.body) {
    const raw = (lines[n - 1] || '').replace(/\r$/, '');
    if (raw.trim()) {
      lastIdx = n - 1;
      const m = /^(\s*)-\s/.exec(raw);
      if (m) indent = m[1];                      // column-0 entries get a column-0 entry (A-1)
    }
  }
  const entry = entryLines(stamp, label, body, indent);
  const cr = eol === '\r\n' ? '\r' : '';
  // a file without a final newline: close its last line with the file's own EOL exactly once
  // (the trailing '' element stands for that newline when the lines are joined) — GN-3
  if (!src.endsWith('\n')) { lines[lines.length - 1] += cr; lines.push(''); }
  lines.splice(lastIdx + 1, 0, ...entry.map((l) => l + cr));
  return { ok: true, text: lines.join('\n'), lines: entry, line: lastIdx + 2 };
}

// Locate the active change's flow-state, refusing everything else. -> { ok, flow, rel } | { ok:false, error }
function locate(root, name) {
  const v = validateChangeName(name);
  if (!v.ok) return { ok: false, error: `invalid change name '${name}' — bare kebab-case only` };
  const loc = resolveChange(root, name);
  if (loc.error) return { ok: false, error: loc.error };
  if (!loc.dir) return { ok: false, error: `change '${name}' not found under apriori/changes/ (${name} is missing)` };
  if (loc.stage === 'archived') return { ok: false, error: `change '${name}' is archived — the archived bundle is frozen, nothing is written to it` };
  const flow = path.join(loc.dir, 'flow-state.md');
  const d = fileReadDefect(loc.dir, flow);
  if (d) return { ok: false, error: `flow-state.md unreadable for '${name}' — ${d.kind === 'symlink' ? 'it is a symlink' : d.kind}: ${d.path}` };
  return { ok: true, flow, rel: path.relative(root, flow) };
}

function note(root, name, text, { owner = false, now = new Date() } = {}) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, usage: true, error: 'the text is empty' };
  const l = locate(root, name);
  if (!l.ok) return l;
  const r = appendEntry(fs.readFileSync(l.flow, 'utf8'), localStamp(now), owner ? 'owner' : 'note', text);
  if (!r.ok) return r;                              // a refused text is a usage error (r.usage), nothing written
  fs.writeFileSync(l.flow, r.text);
  return { ok: true, rel: l.rel, line: r.line, lines: r.lines };
}

function cli(argv) {
  return withStrict(argv, { sub: 'note', usage: USAGE, positionals: 1, flags: { '--change': 'value', '--owner': 'flag' } }, (f, pos) => {
    if (!f['--change']) { console.error(`note: --change <name> is required\n${USAGE}`); return 2; }
    const r = note(process.cwd(), f['--change'], pos[0], { owner: !!f['--owner'] });
    if (!r.ok) {
      if (r.usage) { console.error(`note: ${r.error}\n${USAGE}`); return 2; }
      console.error(`  ✗ ${r.error}`); return 1;
    }
    console.log(`  ✓ ${r.rel}:${r.line}`);
    for (const l of r.lines) console.log(`  ${l.trim()}`);
    return 0;
  });
}

module.exports = { textProblem, entryLines, appendEntry, note, cli, USAGE };
