'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// the script is ESM with an import-safe entry guard — dynamic import never runs main()
const mod = import(pathToFileURL(path.join(__dirname, '..', 'scripts', 'golden-path.mjs')).href);

// seam builders — no fixture touches the real filesystem, env, or `where`
const win = (over = {}) => ({
  platform: 'win32',
  env: {},
  whereGit: () => ({ status: 1, stdout: '' }),
  existsFile: () => false,
  log: () => {},
  ...over,
});
const fileSet = (...paths) => {
  const s = new Set(paths.map((p) => p.toLowerCase()));
  return (p) => s.has(String(p).toLowerCase());
};

test('GP-06 posix stays bare bash', async () => {
  const { resolveBash } = await mod;
  let consulted = 0;
  const spy = () => { consulted++; return false; };
  const out = resolveBash({ platform: 'linux', env: new Proxy({}, { get: spy }),
    whereGit: () => { consulted++; return { status: 0, stdout: '' }; },
    existsFile: spy, log: () => { consulted++; } });
  assert.strictEqual(out, 'bash');
  assert.strictEqual(consulted, 0, 'posix must not consult env/where/fs/log');
});

test('GP-07 the explicit override is honored or fails loudly', async () => {
  const { resolveBash } = await mod;
  const good = 'C:\\Tools\\Git\\bin\\bash.exe';
  assert.strictEqual(resolveBash(win({ env: { APRIORI_GIT_BASH: good }, existsFile: fileSet(good) })), good);
  assert.throws(() => resolveBash(win({ env: { APRIORI_GIT_BASH: 'Git\\bin\\bash.exe' }, existsFile: () => true })),
    /APRIORI_GIT_BASH/);
  assert.throws(() => resolveBash(win({ env: { APRIORI_GIT_BASH: 'C:\\nope\\bash.exe' } })), /APRIORI_GIT_BASH/);
});

test('GP-08 every Git-for-Windows layout derives its root', async () => {
  const { resolveBash } = await mod;
  const cases = [
    ['C:\\Program Files\\Git\\cmd\\git.exe', 'C:\\Program Files\\Git\\bin\\bash.exe'],
    ['C:\\Program Files\\Git\\mingw64\\bin\\git.exe', 'C:\\Program Files\\Git\\bin\\bash.exe'],
    ['D:\\Apps\\PortableGit\\mingw32\\bin\\git.exe', 'D:\\Apps\\PortableGit\\bin\\bash.exe'],
    ['C:\\Git\\bin\\git.exe', 'C:\\Git\\bin\\bash.exe'],
  ];
  for (const [hit, want] of cases) {
    const out = resolveBash(win({ whereGit: () => ({ status: 0, stdout: hit + '\r\n' }), existsFile: fileSet(want) }));
    assert.strictEqual(out, want, hit);
  }
  // bin\bash.exe absent → usr\bin fallback
  const usr = 'C:\\Program Files\\Git\\usr\\bin\\bash.exe';
  const out = resolveBash(win({
    whereGit: () => ({ status: 0, stdout: 'C:\\Program Files\\Git\\cmd\\git.exe\r\n' }),
    existsFile: fileSet(usr) }));
  assert.strictEqual(out, usr);
  // multi-hit CRLF output with blanks and spaces: first existing candidate in first-hit order wins
  const first = 'C:\\Program Files\\Git\\bin\\bash.exe';
  const multi = resolveBash(win({
    whereGit: () => ({ status: 0, stdout: '\r\nC:\\Program Files\\Git\\cmd\\git.exe\r\nC:\\Other Git\\bin\\git.exe\r\n\r\n' }),
    existsFile: fileSet(first, 'C:\\Other Git\\bin\\bash.exe') }));
  assert.strictEqual(multi, first);
  // an unrecognized hit shape derives nothing; conventional path picks it up instead
  const conv = 'C:\\PF\\Git\\bin\\bash.exe';
  const viaConv = resolveBash(win({
    env: { ProgramFiles: 'C:\\PF' },
    whereGit: () => ({ status: 0, stdout: 'C:\\Weird\\usr\\bin\\git.exe\r\n' }),
    existsFile: fileSet(conv) }));
  assert.strictEqual(viaConv, conv);
  // sharper: usr\bin\git.exe derives NOTHING even when the would-be wrong candidate EXISTS —
  // an MSYS/Cygwin sibling bash is never selected (WBIMPL-1)
  assert.throws(() => resolveBash(win({
    whereGit: () => ({ status: 0, stdout: 'C:\\Weird\\usr\\bin\\git.exe\r\n' }),
    existsFile: fileSet('C:\\Weird\\usr\\bin\\bash.exe') })), /no Git Bash found/);
});

test('GP-09 no Git Bash means a named cure, never the shim', async () => {
  const { resolveBash } = await mod;
  assert.throws(() => resolveBash(win()), /install Git for Windows|APRIORI_GIT_BASH/);
  // the never-bare-bash sweep: every win32 fixture that RESOLVES must return an absolute .exe path
  const outcomes = [];
  const fixtures = [
    win({ env: { APRIORI_GIT_BASH: 'C:\\g\\bin\\bash.exe' }, existsFile: fileSet('C:\\g\\bin\\bash.exe') }),
    win({ whereGit: () => ({ status: 0, stdout: 'C:\\g\\cmd\\git.exe\r\n' }), existsFile: fileSet('C:\\g\\bin\\bash.exe') }),
    win({ env: { LocalAppData: 'C:\\u\\AppData\\Local' }, existsFile: fileSet('C:\\u\\AppData\\Local\\Programs\\Git\\bin\\bash.exe') }),
  ];
  for (const fx of fixtures) outcomes.push(resolveBash(fx));
  for (const o of outcomes) {
    assert.notStrictEqual(o, 'bash');
    assert.match(o, /^[A-Za-z]:\\.*bash\.exe$/);
    assert.ok(!/system32/i.test(o), 'the WSL shim must never be a candidate');
  }
});

test('GP-10 the resolved bash is visible (win32 only, once)', async () => {
  const { resolveBash } = await mod;
  const logs = [];
  const good = 'C:\\g\\bin\\bash.exe';
  resolveBash(win({ whereGit: () => ({ status: 0, stdout: 'C:\\g\\cmd\\git.exe\r\n' }),
    existsFile: fileSet(good), log: (m) => logs.push(m) }));
  assert.strictEqual(logs.length, 1);
  assert.match(logs[0], /bash = C:\\g\\bin\\bash\.exe/);
  // posix: the log seam is never called (GP-06 asserts via the consulted counter too)
  const plogs = [];
  resolveBash({ platform: 'darwin', log: (m) => plogs.push(m) });
  assert.strictEqual(plogs.length, 0);
});
