'use strict';
/*
 * Leaf text helpers shared by check, review, readiness and spec-runner — this module
 * requires nothing, so any sibling can import it without opening a cycle.
 */

// THE fence grammar every structural reader shares (fence-tilde-readers). It is this tool's own
// grammar, not CommonMark — containers (lists, blockquotes) are not modeled:
//   backticks — the historical reading, unchanged byte for byte: a run of ``` ANYWHERE opens and
//               the next ``` closes (the lazy span `/```[\s\S]*?```/`); an unclosed opener is text.
//   tildes    — a LINE whose first non-blank characters (up to three spaces in) are three or more
//               `~` opens, an info string may follow; the first later line holding only `~` at
//               least as many (up to three spaces in, trailing blanks allowed) closes. An inline
//               `~~~` is ordinary text.
// Whichever opens first wins, and inside one the other marker is content. Span readers
// (stripFences, fenceSpans) treat an unclosed tilde opener as text, as they do a backtick one;
// line readers (config, the delta parser) keep their own policy for an unclosed fence and use
// fenceOpen / fenceCloses for the open and close lines.
const TILDE_OPEN_RE = /^ {0,3}(~{3,})([^\n]*)$/;              // [^\n]: a CRLF line keeps its \r in the info string
const TILDE_CLOSE_RE = /^ {0,3}(~{3,})[ \t]*\r?$/;

function fenceOpen(line) {
  if (/^\s*```/.test(line)) return { ch: '`', len: 3 };      // the line readers' historical backtick rule
  const m = TILDE_OPEN_RE.exec(line);
  return m ? { ch: '~', len: m[1].length } : null;
}
function fenceCloses(open, line) {
  if (open.ch === '`') return /^\s*```/.test(line);           // historical: any ```-led line closes
  const m = TILDE_CLOSE_RE.exec(line);
  return !!m && m[1].length >= open.len;
}

// [[start, end)] of every CLOSED fence span, in order, non-overlapping. Near-linear on any input:
// the next ``` is searched once per position it can move past (an exhausted search is never
// repeated), and the closer of a tilde opener of length L — the first later bare run at least L
// long — comes from a max segment tree over the bare runs, never from rescanning or refiltering.
function fenceSpans(text) {
  const s = String(text);
  const starts = [0];
  for (let i = s.indexOf('\n'); i >= 0; i = s.indexOf('\n', i + 1)) starts.push(i + 1);
  const lineAt = (k) => { const e = k + 1 < starts.length ? starts[k + 1] - 1 : s.length; return s.slice(starts[k], e); };
  const openers = [];                                     // [line index, run length] of every tilde opener line
  const cLine = [], cLen = [];                            // every bare tilde line, in line order, and its run length
  for (let j = 0; j < starts.length; j++) {
    const line = lineAt(j);
    if (line.indexOf('~~~') < 0) continue;
    const m = TILDE_OPEN_RE.exec(line);
    if (m) openers.push([j, m[1].length]);
    const c = TILDE_CLOSE_RE.exec(line);
    if (c) { cLine.push(j); cLen.push(c[1].length); }
  }
  let size = 1;
  while (size < cLen.length) size <<= 1;
  const tree = new Array(2 * size).fill(0);               // max run length per node
  cLen.forEach((n, i) => { tree[size + i] = n; });
  for (let i = size - 1; i >= 1; i--) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]);
  const firstAtLeast = (node, lo, hi, from, L) => {       // first closer index >= from with length >= L, or -1
    if (hi < from || tree[node] < L) return -1;
    if (lo === hi) return lo;
    const mid = (lo + hi) >> 1;
    const r = firstAtLeast(2 * node, lo, mid, from, L);
    return r >= 0 ? r : firstAtLeast(2 * node + 1, mid + 1, hi, from, L);
  };
  const closerAfter = (j, L) => {
    let lo = 0, hi = cLine.length;                        // first closer on a later line
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cLine[mid] > j) hi = mid; else lo = mid + 1; }
    if (lo >= cLine.length) return -1;
    const k = firstAtLeast(1, 0, size - 1, lo, L);
    return k >= 0 && k < cLine.length ? cLine[k] : -1;
  };
  const spans = [];
  let pos = 0, o = 0, b = -2;                             // b: the next ``` at or after pos; -2 unknown, -1 none left
  while (pos < s.length) {
    while (o < openers.length && starts[openers[o][0]] < pos) o++;
    const [t, tLen] = o < openers.length ? openers[o] : [-1, 0];
    if (b !== -1 && b < pos) b = s.indexOf('```', pos);
    if (t < 0 && b < 0) break;
    if (t >= 0 && (b < 0 || starts[t] < b)) {
      const c = closerAfter(t, tLen);
      if (c < 0) { pos = (t + 1 < starts.length ? starts[t + 1] : s.length); continue; }   // unclosed: text
      const end = c + 1 < starts.length ? starts[c + 1] - 1 : s.length;
      spans.push([starts[t], end]);
      pos = end;
      continue;
    }
    const e = s.indexOf('```', b + 3);
    if (e < 0) { pos = b + 3; b = -1; continue; }         // unclosed: text, and no later ``` can close
    spans.push([b, e + 3]);
    pos = e + 3;
  }
  return spans;
}

// drop every CLOSED fence span (an unclosed opener is ordinary text)
function stripFences(text) {
  const s = String(text);
  let out = '', at = 0;
  for (const [a, b] of fenceSpans(s)) { out += s.slice(at, a); at = b; }
  return out + s.slice(at);
}

// a reason must carry a letter or a digit IN ANY SCRIPT — `\w` is ASCII-only and would
// make every Chinese reason illegal in a log written in Chinese
const HAS_REASON = /[\p{L}\p{N}]/u;

module.exports = { stripFences, fenceSpans, fenceOpen, fenceCloses, HAS_REASON };
