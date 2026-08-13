'use strict';
/*
 * id-match-child — the terminable matcher for CONFIG-sourced id-patterns.
 * A config row is repository input that CI consumes automatically; applying it in-process
 * would let a catastrophic-backtracking pattern hang the CLI. This fixed script (never
 * source-interpolated) is spawned shell:false with {pattern, texts} as stdin data and
 * answers {ids} on stdout; the parent SIGKILLs it on budget. Exit codes: 0 ok · 1 bad input.
 */
const { leadId } = require('./spec-runner');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let req;
  try { req = JSON.parse(raw); } catch { process.exit(1); }
  if (!req || typeof req.pattern !== 'string' || !Array.isArray(req.texts)) process.exit(1);
  let re;
  try { re = new RegExp(req.pattern); } catch { process.exit(1); }
  const ids = req.texts.map((t) => (typeof t === 'string' ? leadId(t, re) : null));
  process.stdout.write(JSON.stringify({ ids }));
});
