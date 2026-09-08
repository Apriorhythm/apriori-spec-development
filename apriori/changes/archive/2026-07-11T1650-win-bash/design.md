# Design — win-bash

All in `scripts/golden-path.mjs` (DD-1: single consumer).

`export function resolveBash(opts = {})`:
- seams: `platform = opts.platform ?? process.platform`, `env = opts.env ?? process.env`, `whereGit = opts.whereGit ?? (() => spawnSync('where', ['git'], { shell: false, encoding: 'utf8' }))`, `existsFile = opts.existsFile ?? ((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } })`, `log = opts.log ?? console.error` (stderr keeps walk stdout sentinel-clean).
- `platform !== 'win32'` → return `'bash'` immediately (GP-06: no env/where/fs consultation — early return before any seam use).
- override: `env.APRIORI_GIT_BASH` set → `path.win32.isAbsolute(v)` REQUIRED (path.win32 so posix-host tests behave; DD-3) and `existsFile(v)` REQUIRED → return v; else `fail('golden-path: APRIORI_GIT_BASH is set but …')` (the existing fail() = message + exit 1; in resolveBash THROW instead and let callers fail() — throwing keeps the function testable).
- candidates (ordered, deduped via Set on lower-cased path):
  - from whereGit(): `r.status === 0 && r.stdout` else []; `r.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)`; per hit: match `/^(.*)\\(?:cmd|mingw64\\bin|mingw32\\bin|bin)\\git\.exe$/i` → root = m[1]; push `root + '\\bin\\bash.exe'`, `root + '\\usr\\bin\\bash.exe'`.
  - conventional: for each of `env.ProgramFiles`, `env['ProgramFiles(x86)']`, `env.LocalAppData` (present only): `<v>\Git\bin\bash.exe`, `<v>\Git\usr\bin\bash.exe` (LocalAppData variant under `\Programs\Git\`).
  - first with `existsFile` → log once `golden-path: bash = <path>` → return.
  - none → throw Error('golden-path: no Git Bash found on this Windows machine — install Git for Windows or set APRIORI_GIT_BASH to its bin\\bash.exe').
- NOTE the mingw64 regex derivation: for `C:\Program Files\Git\mingw64\bin\git.exe` the alternation consumes `mingw64\bin`, so m[1] = `C:\Program Files\Git` — the WB-1 two-levels-up case is handled by the single regex.
- logging exactly once: resolve at main() start into a const `BASH`; the log lives in resolveBash but main calls it once (GP-10). Non-win32 logs nothing (returns before the log line? NO — log only on win32; posix output unchanged, G1 byte-identical).

Spawn sites: `spawnSync(BASH, ['walk.sh'], …)` and `spawnSync(BASH, ['-c', cmd], …)` — no shell:true anywhere (spaces in Program Files survive argv spawning).

Entry guard: the script ALREADY guards main with `if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(...)` — KEEP IT UNCHANGED; it is import-safe and Windows-normalization-safe (WBSPEC-1: the v1 idea of an href-equality guard is dropped). main() wraps `resolveBash()` in try/catch and routes `e.message` to the existing `fail()` so the no-bash cure reaches users as a named message, never a stack trace (WBSPEC-2).
Tests: new `test/golden-path-resolve.test.js` importing the named export via CommonJS dynamic `await import(pathToFileURL(...golden-path.mjs).href)`. Fixtures per GP-06..10 with fake seams; no fixture touches the real filesystem/where. Dedupe test asserts FIRST-HIT ORDER is preserved (check lower-cased set, push original). GP-06's test also asserts the log seam is NEVER called on non-win32 (posix output byte-identical).

Risk note: no entry-guard change at all; `node scripts/golden-path.mjs --local` behavior identical except the win32-only bash log line (CI job unchanged).
