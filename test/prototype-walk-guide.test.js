'use strict';
// prototype-walk-guide — PW-01 (init installs the guide as one managed file), PW-02 (update installs it
// once, then refreshes/protects/leaves it by manifest state), PW-03 (doctor names a missing guide the
// runbook relies on), PW-04 (Ground offers a walk and sends the agent to the guide; the header names it),
// PW-05 (the guide's entry, checklist and constraints; the operator paragraph), PW-06 (MIGRATING's
// downgrade limit). Owner 2026-10-02 + Claude × Astra plan C-b.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'apriori.js');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');
const GUIDE = 'apriori/guides/prototype-walk.md';
const PKG_GUIDE = read('guides/prototype-walk.md');
const init = require('../lib/init');
const update = require('../lib/update');
const doctor = require('../lib/doctor');
const managed = require('../lib/managed');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-pw-'));
const manifestOf = (root) => JSON.parse(fs.readFileSync(path.join(root, 'apriori', 'managed.json'), 'utf8')).files;
const sha = (p) => 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const actionOf = (actions, file) => (actions.find((a) => a.file === file) || {}).action;

test('PW-01 init installs the guide byte-for-byte and records it, and skips what is not its own', () => {
  // fresh project
  const fresh = tmp();
  const r = init.scaffold(fresh, ['claude']);
  assert.strictEqual(actionOf(r.actions, GUIDE), 'created');
  assert.strictEqual(fs.readFileSync(path.join(fresh, GUIDE), 'utf8'), PKG_GUIDE);
  assert.strictEqual(manifestOf(fresh)[GUIDE], sha(path.join(fresh, GUIDE)));
  // a user file already at the path: untouched, no entry
  const userFile = tmp();
  fs.mkdirSync(path.join(userFile, 'apriori', 'guides'), { recursive: true });
  fs.writeFileSync(path.join(userFile, GUIDE), 'my own notes\n');
  const u = init.scaffold(userFile, ['claude']);
  assert.strictEqual(actionOf(u.actions, GUIDE), 'skipped');
  assert.strictEqual(fs.readFileSync(path.join(userFile, GUIDE), 'utf8'), 'my own notes\n');
  assert.ok(!(GUIDE in manifestOf(userFile)), 'an existing file must never be adopted');
  // apriori/guides is a regular file: skipped with a reason
  const blocked = tmp();
  fs.mkdirSync(path.join(blocked, 'apriori'), { recursive: true });
  fs.writeFileSync(path.join(blocked, 'apriori', 'guides'), 'not a dir\n');
  const b = init.scaffold(blocked, ['claude']);
  assert.match(actionOf(b.actions, GUIDE), /not a regular file \(skipped/);
  assert.strictEqual(fs.readFileSync(path.join(blocked, 'apriori', 'guides'), 'utf8'), 'not a dir\n');
  // apriori/guides is a symlink out of the project: skipped, nothing written outside
  const esc = tmp(), outside = tmp();
  fs.mkdirSync(path.join(esc, 'apriori'), { recursive: true });
  fs.symlinkSync(outside, path.join(esc, 'apriori', 'guides'));
  const e = init.scaffold(esc, ['claude']);
  assert.match(actionOf(e.actions, GUIDE), /escapes the project root \(skipped/);
  assert.deepStrictEqual(fs.readdirSync(outside), [], 'nothing may be written outside the project');
  // dry run: reported, nothing written
  const dry = tmp();
  const d = init.scaffold(dry, ['claude'], { dryRun: true });
  assert.strictEqual(actionOf(d.actions, GUIDE), 'created');
  assert.ok(!fs.existsSync(path.join(dry, GUIDE)));
  // it ships
  assert.ok(JSON.parse(read('package.json')).files.includes('guides/'));
});

test('PW-02 the guide is installed once, then refreshed, protected or left alone by its manifest state', () => {
  // a project an older CLI initialized: no guide, no entry
  const aged = () => {
    const root = tmp();
    init.scaffold(root, ['claude']);
    fs.rmSync(path.join(root, 'apriori', 'guides'), { recursive: true, force: true });
    const files = manifestOf(root); delete files[GUIDE];
    managed.writeManifest(root, files);
    return root;
  };
  const root = aged();
  const first = update.run(root);
  assert.strictEqual(actionOf(first.actions, GUIDE), 'created (first install)');
  assert.strictEqual(fs.readFileSync(path.join(root, GUIDE), 'utf8'), PKG_GUIDE);
  assert.strictEqual(manifestOf(root)[GUIDE], sha(path.join(root, GUIDE)));
  // the summary counts it as a refresh (never "everything already matches" over a file it just wrote)
  const cliRoot = aged();
  const out = spawnSync('node', [BIN, 'update'], { cwd: cliRoot, encoding: 'utf8' });
  assert.strictEqual(out.status, 0, out.stderr);
  assert.match(out.stdout, /✓ apriori\/guides\/prototype-walk\.md {2}\(created \(first install\)\)/);
  assert.doesNotMatch(out.stdout, /everything already matches/);
  // second run
  assert.strictEqual(actionOf(update.run(root).actions, GUIDE), 'up-to-date');
  // the package's guide changed → updated and re-hashed
  const newer = path.join(tmp(), 'guide.md');
  fs.writeFileSync(newer, PKG_GUIDE + '\nA later edition.\n');
  assert.strictEqual(actionOf(update.run(root, { guideSrc: newer }).actions, GUIDE), 'updated');
  assert.strictEqual(manifestOf(root)[GUIDE], sha(newer));
  // the user edited it → modified, bytes and entry kept
  fs.appendFileSync(path.join(root, GUIDE), '\nteam notes\n');
  const edited = fs.readFileSync(path.join(root, GUIDE), 'utf8'), entry = manifestOf(root)[GUIDE];
  assert.match(actionOf(update.run(root).actions, GUIDE), /^modified \(skipped/);
  assert.strictEqual(fs.readFileSync(path.join(root, GUIDE), 'utf8'), edited);
  assert.strictEqual(manifestOf(root)[GUIDE], entry);
  // the user deleted the listed guide → reported missing, not recreated (init's job)
  fs.rmSync(path.join(root, GUIDE));
  assert.match(actionOf(update.run(root).actions, GUIDE), /^missing \(skipped — recreating is init's job\)/);
  assert.ok(!fs.existsSync(path.join(root, GUIDE)));
  // an unlisted user file at the path → unmanaged, untouched
  const foreign = aged();
  fs.mkdirSync(path.join(foreign, 'apriori', 'guides'), { recursive: true });
  fs.writeFileSync(path.join(foreign, GUIDE), 'mine\n');
  assert.match(actionOf(update.run(foreign).actions, GUIDE), /^unmanaged \(skipped/);
  assert.strictEqual(fs.readFileSync(path.join(foreign, GUIDE), 'utf8'), 'mine\n');
  // dry run on a project without it: reported, neither the guide nor the manifest written
  const dryRoot = aged();
  const mBefore = fs.readFileSync(path.join(dryRoot, 'apriori', 'managed.json'), 'utf8');
  assert.strictEqual(actionOf(update.run(dryRoot, { dryRun: true }).actions, GUIDE), 'created (first install)');
  assert.ok(!fs.existsSync(path.join(dryRoot, GUIDE)));
  assert.strictEqual(fs.readFileSync(path.join(dryRoot, 'apriori', 'managed.json'), 'utf8'), mBefore);
  // PW-R1 (review round 1): every update branch refuses to hash or write through what is not a plain file
  // in a plain directory — a listed guide swapped for a symlink whose target still matches the hash
  const swapped = tmp(); init.scaffold(swapped, ['claude']);
  const elsewhere = path.join(swapped, 'docs', 'moved-guide.md');
  fs.mkdirSync(path.dirname(elsewhere), { recursive: true });
  fs.renameSync(path.join(swapped, GUIDE), elsewhere);
  fs.symlinkSync(elsewhere, path.join(swapped, GUIDE));
  const sw = update.run(swapped, { guideSrc: newer });
  assert.match(actionOf(sw.actions, GUIDE), /^not a regular file \(skipped — a symlink sits at/);
  assert.strictEqual(fs.readFileSync(elsewhere, 'utf8'), PKG_GUIDE, 'the symlink target must not be written through');
  // apriori/guides itself a symlink to a directory inside the project
  const linkedDir = tmp(); init.scaffold(linkedDir, ['claude']);
  fs.renameSync(path.join(linkedDir, 'apriori', 'guides'), path.join(linkedDir, 'real-guides'));
  fs.symlinkSync(path.join(linkedDir, 'real-guides'), path.join(linkedDir, 'apriori', 'guides'));
  const ld = update.run(linkedDir, { guideSrc: newer });
  assert.match(actionOf(ld.actions, GUIDE), /^not a regular file \(skipped — something other than a plain directory sits at apriori\/guides/);
  assert.strictEqual(fs.readFileSync(path.join(linkedDir, 'real-guides', 'prototype-walk.md'), 'utf8'), PKG_GUIDE);
  // a directory at the guide's path: reported, no crash, the rest of the update still lands
  const dirAt = tmp(); init.scaffold(dirAt, ['claude']);
  fs.rmSync(path.join(dirAt, GUIDE)); fs.mkdirSync(path.join(dirAt, GUIDE));
  fs.writeFileSync(path.join(dirAt, 'apriori', 'runbook.md'), '# older runbook\n');
  const mf = manifestOf(dirAt); mf['apriori/runbook.md'] = sha(path.join(dirAt, 'apriori', 'runbook.md')); managed.writeManifest(dirAt, mf);
  const da = update.run(dirAt);
  assert.match(actionOf(da.actions, GUIDE), /^not a regular file \(skipped — a directory or other non-file sits at/);
  assert.strictEqual(actionOf(da.actions, 'apriori/runbook.md'), 'updated');
  assert.strictEqual(manifestOf(dirAt)['apriori/runbook.md'], sha(path.join(dirAt, 'apriori', 'runbook.md')));
  // an unlisted dangling symlink is reported, not silently passed over
  const dangling = aged();
  fs.mkdirSync(path.join(dangling, 'apriori', 'guides'), { recursive: true });
  fs.symlinkSync(path.join(dangling, 'nowhere.md'), path.join(dangling, GUIDE));
  assert.match(actionOf(update.run(dangling).actions, GUIDE), /^not a regular file \(skipped — a symlink sits at/);
  assert.ok(!fs.existsSync(path.join(dangling, 'nowhere.md')));
});

test('PW-03 doctor reports a missing guide the runbook names, and nothing otherwise', () => {
  const healthy = () => {
    const root = tmp();
    init.scaffold(root, ['claude']);
    return root;
  };
  const TAP_OK = `node -e "console.log('TAP version 13\\n1..1\\nok 1 - fine')"`;
  const guideFindings = (r) => r.checks.filter((c) => c.id === 'D2' && c.status === 'finding' && c.detail.includes(GUIDE));
  const ok = doctor.runDoctor({ cwd: healthy(), testCmd: TAP_OK });
  assert.strictEqual(guideFindings(ok).length, 0, JSON.stringify(ok.checks));
  const gone = healthy(); fs.rmSync(path.join(gone, GUIDE));
  const g = guideFindings(doctor.runDoctor({ cwd: gone, testCmd: TAP_OK }));
  assert.strictEqual(g.length, 1);
  assert.match(g[0].detail, /missing — the runbook names it/);
  assert.match(g[0].fix, /apriori update/);
  const dir = healthy(); fs.rmSync(path.join(dir, GUIDE)); fs.mkdirSync(path.join(dir, GUIDE));
  const dg = guideFindings(doctor.runDoctor({ cwd: dir, testCmd: TAP_OK }));
  assert.strictEqual(dg.length, 1);
  assert.match(dg[0].detail, /is not a regular file/);
  const noRb = healthy(); fs.rmSync(path.join(noRb, GUIDE)); fs.rmSync(path.join(noRb, 'apriori', 'runbook.md'));
  const nr = doctor.runDoctor({ cwd: noRb, testCmd: TAP_OK });
  assert.strictEqual(guideFindings(nr).length, 0);
  assert.ok(nr.checks.some((c) => c.id === 'D2' && c.status === 'finding' && /apriori\/runbook\.md/.test(c.detail)));
});

test('PW-04 Ground carries the offer, the once-per-requirement rule and the read-before-running pointer, and the header names the guide', () => {
  const EN = read('RUNBOOK.md');
  const bullet = flat(EN.match(/^- \*\*A runnable UI prototype among the sources\.\*\*.*$/m)[0]);
  assert.match(bullet, /sources include a runnable UI prototype meant as an acceptance basis, and nothing on record walks it for this scope \(a `checklist\.md` registered from a walk of the same prototype version\)/);
  assert.match(bullet, /offer the owner an optional \*\*prototype walk\*\* — once per requirement, when its sources are first registered; record their answer as a `decision`/);
  assert.match(bullet, /If they already authorized a walk, run it; if they already chose, do not ask again\./);
  assert.match(bullet, /Screenshots or a static design are not a runnable prototype\./);
  assert.match(bullet, /\*\*Before you run a walk, read `apriori\/guides\/prototype-walk\.md` in full and follow it\.\*\*/);
  assert.match(bullet, /the prototype's own defects follow the requirement sources and recorded decisions first, and only what nothing settles goes to the owner as an `## Open` item/);
  assert.match(bullet, /Skipping the walk skips none of the source checks \(P2\)\./);
  // it sits in Ground, right after the source-material rule
  const ground = EN.slice(EN.indexOf('### Ground'), EN.indexOf('### Specify'));
  assert.ok(ground.indexOf('**A runnable UI prototype among the sources.**') > ground.indexOf('**Discussion held elsewhere is source material'));
  const header = EN.slice(0, EN.search(/^## /m));
  assert.match(flat(header), /This file is self-contained but for one guide: .* except the prototype-walk procedure, which lives in `apriori\/guides\/prototype-walk\.md` \(installed beside this copy\) and is read only when a walk runs \(§4 Ground\)\./);
  const p3 = EN.match(/### P3 [\s\S]*?(?=### P4 )/);
  assert.strictEqual(crypto.createHash('sha256').update(p3[0]).digest('hex').slice(0, 16), '97a85ca560d41c70');
});

test('PW-05 the guide carries its entry, method, checklist fields and four constraints, and both operator editions point a human at it', () => {
  const g = PKG_GUIDE;
  for (const p of ['`PROTOTYPE`', '`SOURCES`', '`SCOPE`', '`CAPS`', '`OUT`', '`SCRATCH`']) assert.ok(g.includes(`| ${p} |`), `entry parameter ${p}`);
  assert.match(g, /Walk the prototype `<PROTOTYPE>` against `<SOURCES>` per `apriori\/guides\/prototype-walk\.md`, scope `<SCOPE>`\./);
  for (const h of ['### 3.1 Static interaction analysis', '### 3.2 Serve it locally', '### 3.3 Runtime discovery', '### 3.4 UI state model',
                   '### 3.5 State signature and de-duplication', '### 3.6 Traversal', '### 3.7 Interactions and boundaries to cover',
                   '### 3.8 Path explosion control', '### 3.9 Errors', '### 3.10 Screenshots', '### 3.11 Coverage'])
    assert.ok(g.includes(h), h);
  const checklist = g.slice(g.indexOf('## 5. '), g.indexOf('## 6. '));
  for (const f of ['ID', 'version', 'observable', 'evidence', 'scope', 'ruling', 'implementation', 'verification'])
    assert.match(checklist, new RegExp('\\| `' + f + '` \\|'), `checklist field ${f}`);
  assert.match(flat(checklist), /keep \*\*one\*\* progress source: do not fork a second ledger elsewhere/);
  // PW-R2: scope (must the delivery show it?) is apart from ruling (how?); a corrected defect is an `in` row
  assert.match(flat(checklist), /\| `scope` \| whether the delivery must show this row: `in` · `out`/);
  assert.match(flat(checklist), /\| `ruling` \| how the delivery shows it: `as prototype` · `corrected — <source line or recorded decision>`/);
  assert.match(flat(checklist), /A prototype defect the sources correct is an `in` row with ruling `corrected — …`: the delivery must show the corrected behaviour, and it is reconciled like every other `in` row — against its ruling, not against the prototype/);
  assert.doesNotMatch(g, /not-reproduced/);
  // PW-R3: cited evidence survives the archive
  assert.match(flat(checklist), /\| `evidence` \| where it was read: a screenshot kept under `OUT\/evidence\/`/);
  assert.match(flat(g), /A screenshot a checklist row cites is kept in `OUT\/evidence\/` — it is that row's evidence and must survive the archive/);
  // PW-R4: reuse the covered scope; continue an authorized walk for what it did not cover
  assert.match(flat(g), /reuses it for the scope it covered at that prototype version\. It does not re-walk what is covered; with the owner's authorization it \*\*continues\*\* the same walk for what is not/);
  assert.match(flat(g), /The runbook's once-per-requirement offer is about starting a walk; finishing one the owner authorized needs no new offer\./);
  // PW-R5: an archived checklist is frozen — continuation and reconciliation go to a successor in the current change
  assert.match(flat(g), /once it is archived, its bundle is frozen \(§4\) — never edit it\. Instead start a \*\*successor\*\* `checklist\.md` in the current change's `OUT`: carry every row over with its id, sources and evidence references/);
  assert.match(flat(g), /From then on the successor is the one current progress source; the archived predecessor is history\./);
  assert.match(flat(g), /in the current checklist, which for an archived walk is a successor in the current change \(§9\), never the frozen original/);
  assert.doesNotMatch(flat(g), /adding rows to the same checklist/);
  assert.match(flat(checklist), /Ticking is not proof: the check also looks at the assertion behind each tick and the conditions it ran under/);
  const constraints = flat(g.slice(g.indexOf('## 6. '), g.indexOf('## 7. ')));
  assert.match(constraints, /1\. \*\*Equivalence is justified \(§3\.5\)\.\*\*.*keep injected states apart from user-reachable ones/);
  assert.match(constraints, /2\. \*\*Caps are set before running and never become a claim\.\*\*.*it is never "fully covered"/);
  assert.match(constraints, /3\. \*\*Tools are optional prerequisites, not new dependencies\.\*\*.*apriori-cli does not install or require them.*The prototype itself stays unmodified/);
  assert.match(constraints, /4\. \*\*Isolation and scrubbing\.\*\*.*masking the screenshots alone is not enough/);
  assert.match(flat(g), /If anything is still uncovered, the report says so; it never says "all done"\./);
  assert.match(g, /`observed: <OUT>\/checklist\.md — prototype <version>, walked <date>;/);
  // generalized: none of one requirement's own components are rules here
  assert.doesNotMatch(g, /运维|工单|企微|Notification Channels|Region Picker|People Picker|Project Picker/);
  assert.match(flat(read('docs/operator.md')), /\*\*Prototype walk \(optional, before the contract\):\*\*.*per `apriori\/guides\/prototype-walk\.md`.*Playwright or an equivalent.*The checklist is source material: it authorizes nothing/);
  assert.match(flat(read('docs/operator_cn.md')), /\*\*原型走查\(可选,在写契约之前\):\*\*.*`apriori\/guides\/prototype-walk\.md`.*Playwright 或同类.*清单是来源材料:它不授权任何事/);
});

test('PW-06 MIGRATING names the first install and the downgrade limit', () => {
  const m = read('MIGRATING.md');
  const sec = flat(m.slice(m.indexOf('## prototype-walk-guide'), m.indexOf('\n## ', m.indexOf('## prototype-walk-guide') + 5)));
  assert.match(sec, /`apriori update` installs `apriori\/guides\/prototype-walk\.md`\*\* on a project that never had it/);
  assert.match(sec, /A guide you edited locally is reported `modified` and left alone/);
  assert.match(sec, /\*\*Downgrading is not supported\*\* once the guide is recorded: a CLI from before this change refuses a manifest that lists it \(`managed\.json: 'apriori\/guides\/prototype-walk\.md' is not a refresh target`\)/);
});
