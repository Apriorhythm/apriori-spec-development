'use strict';
/*
 * apriori flow — the ONE reader of a change's flow-state.md (6.2).
 *
 * A LEAF module: it requires nothing, so status, readiness, review, gate, doctor and archive
 * can all read the state through it without opening a cycle. Read-only: nothing here writes.
 *
 * The grammar is one explicit Markdown subset, and the reader is FAIL-CLOSED on what it cannot
 * read — an unreadable section is a structural defect naming its line, never an empty section:
 *
 *   scalars      `key: value` at column 0; key = lowercase kebab; optional trailing `# comment`;
 *                an empty value reads as absent; the same key twice with the SAME value is
 *                tolerated, with DIFFERENT values it is a defect naming both lines
 *   sections     `## Title` (any level >= 2, `#` levels end the previous section too), optional
 *                trailing `# annotation` (the RUNBOOK template's own form), title matched whole
 *                and case-insensitively; a title written twice is a defect naming both lines,
 *                and nothing under either is hidden
 *   items        `- ` or `* ` lines; an INDENTED follow-on line continues the item. Under a
 *                JUDGED section (Open, Reality Check, the legacy Evidence) anything else that is
 *                not blank — a numbered line, a bare line — is a defect naming the line: it could
 *                be the item the reader would otherwise merge or drop. `## Next` is human prose
 *                and stays lenient (list items read, the rest is ignored — nothing judges it).
 *   gates:       the append-only log: `- <entry>` lines, continuation lines joined, until the
 *                next heading or key. `lastGate` is the last dated entry OF THE BLOCK.
 *   inert        fenced code (```…```) and HTML comments (<!-- … -->) ANYWHERE — an item, a fact
 *                or a gates: entry inside one is documentation: never an item, never a fact,
 *                never an authorization. An UNCLOSED fence or comment is a defect: the rest of
 *                the file is unreadable, and unreadable never reads as "nothing owed".
 *
 * Line numbers survive the pre-pass (inert lines become blank lines), so every defect names the
 * line a human has to look at. CRLF is normalized first.
 */

const KEY_RE = /^([a-z][a-z-]*):(.*)$/;
const HEADING_RE = /^(#{1,6})[ \t]+(.*?)[ \t]*$/;
const ITEM_RE = /^\s*[-*]\s+(.*)$/;
const NUMBERED_RE = /^\s*\d+[.)]\s/;
const DATED_RE = /^\d{4}-\d{2}-\d{2}\S*\s+.+$/;
const JUDGED = { open: 'open', 'reality check': 'reality check', evidence: 'evidence' };
const TRACKED_KEYS = ['change', 'mode', 'phase', 'delivery', 'escalation'];
// The 5.x identity keys — spelled here (the leaf) so the reader and C3 see the same live keys;
// readiness re-exports them and diagnoses, never decides, by them.
const LEGACY_IDENTITY = ['tier', 'track', 'track-rationale', 'round', 'current-step'];
// The keys that END a section when they appear at column 0 inside one: the state's own fields
// and the legacy ones. Any OTHER `word:` line inside a section is section content — under a
// judged section a located structural defect — never a scalar that quietly empties the section.
// `artifact-root` and `lineage` are RETIRED (batch C) but stay in this set as LEGACY
// TOLERANCE: published/prior templates wrote the lines (v5.0.0 for artifact-root, every
// scaffold up to 6.2 for lineage), so an old bundle carrying them must keep parsing — read
// and ignored, never a defect, and no consumer anywhere (they are not TRACKED_KEYS). Lineage
// itself now lives in the Reality Check as a `decision:` line (see MIGRATING).
const STATE_KEYS = new Set([...TRACKED_KEYS, 'reviewer-session', 'artifact-root', 'lineage', ...LEGACY_IDENTITY]);
// a fence OPENS with three or more backticks or tildes (an info string may follow); it CLOSES
// only on a line of the SAME marker, at least as long, carrying nothing else — a shorter line,
// the other marker, or a tagged line is content of the fence (that is how a ```` block quotes
// a ``` block). Up to three spaces of indentation, as Markdown has it.
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FACT_KINDS = ['observed', 'decision', 'assumption'];

// THE CANONICAL OWNER ENTRY — the one shape every authorization in this tool reads through:
//   - <YYYY-MM-DDTHH:MM> owner: <verb payload>
// The TIMESTAMP is RANGE-checked, not calendar-checked: month 01-12, day 01-31, hour 00-23,
// minute 00-59. A 31st of February is a typo, not an authorization forgery, and this tool
// ships no calendar. `9999-99-99T99:99` is refused; `T1100` and `T11:00` are both legal.
const OWNER_ENTRY_RE = /^-[ \t]+(\d{4}-\d{2}-\d{2}T\d{2}:?\d{2})[ \t]+owner:[ \t]+([\s\S]*)$/;
function ownerEntry(entry) {
  const m = OWNER_ENTRY_RE.exec(entry);
  if (!m) return null;
  const [, stamp, payload] = m;
  const [, mo, d, h, mi] = /^\d{4}-(\d{2})-(\d{2})T(\d{2}):?(\d{2})$/.exec(stamp);
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31 || +h > 23 || +mi > 59) return null;
  return { stamp, payload };
}

// The pre-pass: CRLF → LF, fenced and commented regions blanked (line count preserved), the two
// unclosed cases reported. -> { lines: string[], defects: string[] }
function scan(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = [], defects = [];
  let fence = null, comment = null;            // the open region: {line, char, len} / 1-based line
  for (let i = 0; i < raw.length; i++) {
    const n = i + 1;
    let t = raw[i];
    if (comment !== null) {
      const close = t.indexOf('-->');
      if (close < 0) { lines.push(''); continue; }
      comment = null;
      t = t.slice(close + 3);
    }
    if (fence !== null) {
      const c = new RegExp(`^ {0,3}\\${fence.char}{${fence.len},}[ \\t]*$`).exec(t);
      if (c) fence = null;
      lines.push('');
      continue;
    }
    const o = FENCE_OPEN_RE.exec(t);
    if (o) { fence = { line: n, char: o[1][0], len: o[1].length }; lines.push(''); continue; }
    while (t.includes('<!--')) {                 // inline spans: what is outside them stays live
      const open = t.indexOf('<!--');
      const close = t.indexOf('-->', open + 4);
      if (close < 0) { t = t.slice(0, open); comment = n; break; }
      t = t.slice(0, open) + t.slice(close + 3);
    }
    lines.push(t);
  }
  if (fence !== null) defects.push(`line ${fence.line}: unclosed code fence — everything after it is unreadable; close it with ${fence.char.repeat(fence.len)}`);
  if (comment !== null) defects.push(`line ${comment}: unclosed HTML comment — everything after it is unreadable; close it with -->`);
  return { lines, defects };
}

const clip = (s) => (s.length > 60 ? s.slice(0, 59) + '…' : s);

// The structure pass over the scanned lines.
// -> { scalars: Map<key,[{value,line}]>, sections: [{title, key, line, body:[{n,text}]}],
//      gates: [{line, body}], defects: string[] }
function structure(text) {
  const { lines, defects } = scan(text);
  const scalars = new Map(), sections = [], gates = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const n = i + 1, t = lines[i];
    const h = HEADING_RE.exec(t);
    if (h) {
      const title = h[2].replace(/[ \t]+#.*$/, '').trim();
      cur = h[1].length >= 2 ? { title, key: title.toLowerCase(), line: n, body: [] } : null;
      if (cur) sections.push(cur);
      continue;
    }
    const k = KEY_RE.exec(t);
    // inside a SECTION only a heading, `gates:` or a known state key ends it (F2): a stray
    // `risk: …` under ## Open is the item that forgot its `- `, not a scalar
    if (k && (!cur || cur.key === undefined || k[1] === 'gates' || STATE_KEYS.has(k[1]))) {
      if (k[1] === 'gates') { cur = { line: n, body: [] }; gates.push(cur); continue; }
      const value = k[2].replace(/\s*#.*$/, '').trim();
      if (!scalars.has(k[1])) scalars.set(k[1], []);
      scalars.get(k[1]).push({ value, line: n });
      cur = null;
      continue;
    }
    if (cur) cur.body.push({ n, text: t });
  }
  for (const [key, occ] of scalars) {
    const first = occ.find((o) => o.value !== '');
    if (!first) continue;
    for (const o of occ) if (o.value !== '' && o.value !== first.value)
      defects.push(`line ${o.line}: \`${key}:\` is set twice with different values (line ${first.line}: ${first.value}, line ${o.line}: ${o.value}) — one value per key`);
  }
  const seen = new Map();
  for (const s of sections) {
    if (seen.has(s.key)) defects.push(`line ${s.line}: section \`## ${seen.get(s.key).title}\` is written twice (lines ${seen.get(s.key).line} and ${s.line}) — one section per title`);
    else seen.set(s.key, s);
  }
  if (gates.length > 1) defects.push(`line ${gates[1].line}: \`gates:\` is written twice (lines ${gates[0].line} and ${gates[1].line}) — one append-only log`);
  return { scalars, sections, gates, defects };
}

// The items of every section carrying `title`. `strict` sections turn every non-blank,
// non-list, non-continuation line into a defect. -> { items: string[], defects: string[] }
function itemsOf(st, title, strict) {
  const key = title.toLowerCase();
  const label = JUDGED[key] || key;
  const items = [], defects = [];
  for (const s of st.sections) {
    if (s.key !== key) continue;
    let last = null;
    for (const { n, text } of s.body) {
      if (!text.trim()) continue;
      const it = ITEM_RE.exec(text);
      if (it) { last = { text: it[1].trim() }; items.push(last); continue; }
      if (last && /^\s/.test(text) && !NUMBERED_RE.test(text)) { last.text += ' ' + text.trim(); continue; }
      if (strict) defects.push(`line ${n}: ${label} section line is not a list item — write \`- ${clip(text.trim().replace(/^\s*\d+[.)]\s+/, ''))}\``);
    }
  }
  return { items: items.map((i) => i.text), defects };
}

// -> [string] — each item's text, continuation joined, marker stripped (compat signature)
function sectionItems(text, title) {
  return itemsOf(structure(text), title, !!JUDGED[title.toLowerCase()]).items;
}

// gates: entries with their RAW first line beside the continuation-joined form, plus the
// owner-decision payload (null for a `note:` line and every near miss). Every consumer of this
// function is asking whether a human authorized something.
function gatesEntries(text) {
  const st = typeof text === 'string' ? structure(text) : text;
  const out = [];
  for (const g of st.gates) {
    for (const { n, text: line } of g.body) {
      if (/^\s*-\s/.test(line)) out.push({ firstLine: line.replace(/\s+$/, ''), joined: line.trim(), line: n });
      else if (out.length && line.trim()) out[out.length - 1].joined += ' ' + line.trim();
    }
  }
  for (const e of out) { const o = ownerEntry(e.joined); e.payload = o ? o.payload : null; e.stamp = o ? o.stamp : null; }
  return out;
}

// The Reality Check — the three kinds a Ground fact can be, and nothing else. A line naming no
// kind is `malformed` (structural, never acceptable).
function realityOf(st) {
  const out = { observed: [], decision: [], assumption: [], malformed: [] };
  for (const item of itemsOf(st, 'Reality Check', true).items) {
    const m = /^([a-z]+)\s*:\s*(.*)$/i.exec(item);
    const kind = m && m[1].toLowerCase();
    if (!m || !FACT_KINDS.includes(kind)) { out.malformed.push(item); continue; }
    out[kind].push(m[2].trim());
  }
  return out;
}
function realityCheck(text) { return realityOf(structure(text)); }

// The parsed state: the tracked scalars, the last gate, the sections, and every structural
// defect the file carries (each naming its line). Never throws on content.
function parseFlowState(text) {
  const st = structure(text);
  const out = {};
  for (const key of TRACKED_KEYS) {
    const occ = (st.scalars.get(key) || []).find((o) => o.value !== '');
    if (occ) out[key] = occ.value;
  }
  const dated = gatesEntries(st).map((e) => e.firstLine.replace(/^\s*-\s*/, '').trim()).filter((s) => DATED_RE.test(s));
  out.lastGate = dated.length ? dated[dated.length - 1] : null;
  out.next = itemsOf(st, 'Next', false).items;
  const open = itemsOf(st, 'Open', true);
  out.openIssues = open.items;
  out.reality = realityOf(st);
  const evidence = itemsOf(st, 'Evidence', true);
  out.defects = [...st.defects, ...open.defects, ...itemsOf(st, 'Reality Check', true).defects, ...evidence.defects];
  return out;
}

// every structural defect of a state text, each naming its line — [] for a legal file
function structuralDefects(text) { return parseFlowState(text).defects; }

// the 5.x identity keys a state still carries LIVE — read off the same structured, fence- and
// comment-stripped pass as everything else (F6): a `round: 1` inside an example is inert
function legacyKeys(text) {
  const st = structure(text);
  return LEGACY_IDENTITY.filter((k) => st.scalars.has(k));
}

module.exports = { scan, structure, sectionItems, gatesEntries, ownerEntry, realityCheck, parseFlowState, structuralDefects, legacyKeys, FACT_KINDS, LEGACY_IDENTITY };
