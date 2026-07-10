'use strict';
/*
 * apriori check — structural consistency checks (JS port of v2's check_docs.py, adapted for V3).
 * Zero deps — pure Node stdlib. Each check returns an array of failure strings.
 *
 * Ported from v2 (behaviour-equivalent): anchor resolution, file-link existence,
 * EN/CN heading alignment, verdict-phrase table + drift variants, codex-command EN/CN parity.
 * V3 changes: CK-04 every spec scenario carries a bindable ID; CK-05 no OpenSpec adapter
 * references remain (the v2 "adapter wording" assertions invert to "no openspec/opsx at all").
 */
const fs = require('fs');
const path = require('path');

// ---- helpers (ported from gh_slug / parse / num_prefix) ---------------------
function ghSlug(heading) {
  const s = heading.trim().toLowerCase().replace(/`/g, '').replace(/\*/g, '');
  let out = '';
  for (const ch of s) {
    if (ch === ' ') out += '-';
    else if (ch === '-' || ch === '_') out += ch;
    else if (/[\p{L}\p{N}\p{M}]/u.test(ch)) out += ch;
  }
  return out;
}
function stripFences(text) { return text.replace(/```[\s\S]*?```/g, ''); }
function headings(text) {
  const s = stripFences(text);
  return [...s.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((m) => [m[1].length, m[2]]);
}
function anchors(text) { return [...stripFences(text).matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]); }
function fileLinks(text) { return [...stripFences(text).matchAll(/\]\((\.\/[^)#]+)(?:#[^)]*)?\)/g)].map((m) => m[1]); }
function numPrefix(t) { const m = t.trim().match(/^(\d+(?:\.\d+)*)\b/); return m ? m[1] : null; }
function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }

// ---- CK-01: anchors resolve, file links exist -------------------------------
function checkLinks(root, name, text) {
  const fails = [];
  const slugs = new Set(headings(text).map(([, t]) => ghSlug(t)));
  for (const a of anchors(text)) if (!slugs.has(a)) fails.push(`${name}: broken anchor #${a}`);
  for (const f of fileLinks(text)) if (!fs.existsSync(path.join(root, f))) fails.push(`${name}: broken file link ${f}`);
  return fails;
}

// ---- CK-02: EN/CN heading alignment (length, levels, numeric prefixes) -------
function checkHeadingAlignment(enName, enText, cnName, cnText) {
  const fails = [];
  const eh = headings(enText), ch = headings(cnText);
  if (eh.length !== ch.length) fails.push(`heading count mismatch: ${enName}=${eh.length} vs ${cnName}=${ch.length}`);
  const n = Math.min(eh.length, ch.length);
  for (let i = 0; i < n; i++) {
    const [el, et] = eh[i], [cl, ct] = ch[i];
    const ep = numPrefix(et), cp = numPrefix(ct);
    const numOk = (ep && cp) ? ep === cp : true;
    if (el !== cl || !numOk) fails.push(`heading misaligned @#${i + 1}: [h${el}] ${et.slice(0, 40)} <-> [h${cl}] ${ct.slice(0, 40)}`);
  }
  return fails;
}

// ---- CK-03: verdict phrase table + drift variants + codex-command parity -----
const VERDICT_PHRASES = [
  'VERDICT: no major issues, ready to proceed to execution',
  'VERDICT: no major issues',
  'VERDICT: no spec-vs-code gaps',
  'VERDICT: extraction accepted',
  'VERDICT: extraction rejected',
  'VERDICT: <N> issues open',
];
const FORBIDDEN_VARIANTS = [
  [/ready to execute/g, 'EN drift variant "ready to execute"'],
  [/可进入执行(?!阶段)/g, 'CN drift variant 「可进入执行」 missing 「阶段」'],
];
function checkVerdictPhrases(files) {
  // files: {name -> text}; runbooks must contain every canonical phrase; no drift variants; every VERDICT: string is a table entry
  const fails = [];
  for (const rb of ['RUNBOOK.md', 'RUNBOOK_cn.md'])
    if (files[rb]) for (const p of VERDICT_PHRASES) if (!files[rb].includes(p)) fails.push(`${rb}: phrase-table entry missing: ${p}`);
  for (const [name, text] of Object.entries(files)) {
    for (const [re, label] of FORBIDDEN_VARIANTS)
      for (const m of text.matchAll(re)) fails.push(`${name}:${lineOf(text, m.index)}: ${label}`);
    for (const m of text.matchAll(/VERDICT:[^"'`」\n]+/g)) {
      const q = m[0].replace(/[ .。);,，]+$/, '');
      if (!VERDICT_PHRASES.some((p) => q === p || q.startsWith(p)))
        fails.push(`${name}:${lineOf(text, m.index)}: VERDICT string not in table: ${q}`);
    }
  }
  return fails;
}

// codex command extraction (ported from codex_candidates)
const CODEX_BARE = new Set(['codex', 'exec', 'resume']);
function codexCandidates(text) {
  const cmds = [];
  for (const line of text.split('\n')) {
    let start = 0, idx;
    while ((idx = line.indexOf('codex exec', start)) >= 0) {
      let frag = line.slice(idx); start = idx + 10;
      frag = frag.replace(/\\"/g, '"').replace(/——/g, ' — ');
      const raw = frag;
      frag = frag.replace(/(^|\s)"[^"]*"/g, '$1').replace(/(^|\s)'[^']*'/g, '$1').replace(/\s#.*$/, '');
      const tokens = [];
      for (let tok of frag.split(/\s+/).filter(Boolean)) {
        tok = tok.replace(/[,;)。]+$/, '');
        const prev = tokens[tokens.length - 1];
        const isFlagVal = prev && prev.startsWith('-') && /^[A-Za-z0-9._/-]+$/.test(tok);
        if (CODEX_BARE.has(tok) || isFlagVal ||
            /^(-{1,2}[A-Za-z][\w-]*|[A-Za-z_]+=("[^"]*"|\S+)|<[^>]+>|\||2>&1|<|\/dev\/null)$/.test(tok)) tokens.push(tok);
        else break;
      }
      const checkable = !raw.includes('...') && !raw.includes('…') && !tokens.includes('--last') &&
        (tokens.some((t) => t.startsWith('-')) || raw.includes('"'));
      if (checkable && tokens.length > 2) cmds.push(tokens);
    }
  }
  return cmds;
}
function checkCodexCommands(enText, cnText) {
  const fails = [];
  const en = codexCandidates(enText), cn = codexCandidates(cnText);
  if (en.length !== cn.length) { fails.push(`codex command count mismatch: ${en.length} vs ${cn.length}`); return fails; }
  for (let i = 0; i < en.length; i++)
    if (en[i].join(' ') !== cn[i].join(' ')) fails.push(`codex command #${i + 1} token mismatch: EN[${en[i]}] CN[${cn[i]}]`);
  return fails;
}

// ---- CK-03 (checker 8): codex known-good forms (ported from v2) --------------
const CODEX_EXEMPT = [['codex', 'exec', 'resume', '-s', 'read-only', '<session-id>']];
function checkCodexKnownForms(files) {
  const fails = [];
  for (const [name, text] of Object.entries(files)) {
    for (const tokens of codexCandidates(text)) {
      if (!tokens.includes('resume')) continue;
      if (CODEX_EXEMPT.some((e) => e.join(' ') === tokens.join(' '))) continue;
      if (tokens.includes('-s')) fails.push(`${name}: resume command uses -s (rejected on codex >=0.14x): ${tokens.join(' ')}`);
      if (!(tokens.includes('-c') && tokens.includes('sandbox_mode="read-only"')))
        fails.push(`${name}: resume command missing -c sandbox_mode="read-only": ${tokens.join(' ')}`);
    }
  }
  for (const rb of ['RUNBOOK.md', 'RUNBOOK_cn.md'])
    if (files[rb] && !files[rb].includes('< /dev/null')) fails.push(`${rb}: missing the \`< /dev/null\` non-interactive guidance`);
  return fails;
}

// ---- CK-04: every spec scenario carries a bindable ID -----------------------
function checkScenarioIds(specText, name, idPattern = '[A-Z]+-\\d+') {
  const idRe = new RegExp('^(' + idPattern + ')\\b');
  const fails = [];
  // fenced scenarios are documentation, not spec — same rule as the spec-runner (SR-13)
  for (const m of stripFences(specText).matchAll(/^####\s+Scenario:\s+(.*)$/gm))
    if (!idRe.test(m[1].trim())) fails.push(`${name}: scenario without a bindable ID: ${m[1].slice(0, 50)}`);
  return fails;
}

// ---- CK-05: no OpenSpec adapter references remain (V3 is single plain-files) --
const OPENSPEC_MARKERS = [/\/opsx:/, /openspec\//, /\(adapter:/i, /OpenSpec adapter/];
function checkNoOpenspec(name, text) {
  const fails = [];
  for (const line of text.split('\n')) for (const re of OPENSPEC_MARKERS)
    if (re.test(line)) { fails.push(`${name}: residual OpenSpec reference: ${line.trim().slice(0, 60)}`); break; }
  return fails;
}

// ---- CK-06: scaffolded-runbook freshness (warn-only, never a failure) ---------
const PACKAGED_RUNBOOK = path.join(__dirname, '..', 'RUNBOOK.md');
function checkRunbookFreshness(root, packagedPath = PACKAGED_RUNBOOK) {
  const scaffolded = path.join(root, 'apriori', 'runbook.md');
  if (!fs.existsSync(scaffolded) || !fs.existsSync(packagedPath)) return [];
  if (fs.readFileSync(scaffolded, 'utf8') === fs.readFileSync(packagedPath, 'utf8')) return [];
  return [`apriori/runbook.md differs from the installed apriori-cli runbook — run 'apriori update' to refresh`];
}

// ---- cli --------------------------------------------------------------------
// Two modes. CONSUMER (default): checks the project's own spec store (CK-04) and
// scaffolded-runbook freshness (CK-06) — nothing else, so a consumer legitimately using
// OpenSpec or shipping its own README is never failed by apriori's self-checks.
// SELF (--self): additionally runs the apriori repo's handbook checks (EN/CN pairs,
// verdict phrases, codex commands, no-openspec residue) — used by this repo's own CI.
function cli(argv) {
  const root = process.cwd();
  let specsDir = 'apriori/specs';
  let self = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--specs') specsDir = argv[++i];
    else if (argv[i] === '--self') self = true;
  }
  const fails = [];

  // CK-04 over the spec store — a missing path is an ERROR, never a silent PASS
  const specsPath = path.join(root, specsDir);
  if (!fs.existsSync(specsPath)) {
    console.error(`error: spec store path does not exist: ${specsDir}` +
      (fs.existsSync(path.join(root, 'apriori')) ? '' : ` — is this an apriori project? (run 'apriori init')`));
    console.log('\nRESULT: ERROR');
    return 2;
  }
  const specFiles = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) specFiles.push(p);
    }
  })(specsPath);
  for (const f of specFiles) fails.push(...checkScenarioIds(fs.readFileSync(f, 'utf8'), path.relative(root, f)));

  if (self) {
    // Handbook checks (apriori repo dogfooding) — run when the pairs exist
    const PAIRS = [['README.md', 'README_cn.md'], ['RUNBOOK.md', 'RUNBOOK_cn.md'], ['VISION.md', 'VISION_cn.md']];
    const files = {};
    for (const [en, cn] of PAIRS) for (const nm of [en, cn]) {
      const p = path.join(root, nm);
      if (fs.existsSync(p)) files[nm] = fs.readFileSync(p, 'utf8');
    }
    for (const [name, text] of Object.entries(files)) {
      fails.push(...checkLinks(root, name, text));
      fails.push(...checkNoOpenspec(name, text));
    }
    for (const [en, cn] of PAIRS) if (files[en] && files[cn]) fails.push(...checkHeadingAlignment(en, files[en], cn, files[cn]));
    if (Object.keys(files).length) fails.push(...checkVerdictPhrases(files));
    if (files['RUNBOOK.md'] && files['RUNBOOK_cn.md']) fails.push(...checkCodexCommands(files['RUNBOOK.md'], files['RUNBOOK_cn.md']));
    if (Object.keys(files).length) fails.push(...checkCodexKnownForms(files));
  }

  for (const f of fails) console.log('✗ ' + f);
  for (const w of checkRunbookFreshness(root)) console.log('! ' + w);   // CK-06: warn-only
  console.log('\nRESULT:', fails.length ? `FAIL (${fails.length})` : 'PASS');
  return fails.length ? 1 : 0;
}

module.exports = {
  ghSlug, headings, anchors, fileLinks, checkLinks, checkHeadingAlignment,
  checkVerdictPhrases, codexCandidates, checkCodexCommands, checkCodexKnownForms, checkScenarioIds, checkNoOpenspec,
  checkRunbookFreshness, cli,
};
