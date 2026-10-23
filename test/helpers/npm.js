'use strict';
// npm is a .cmd shim on Windows: spawning the bare name fails with ENOENT, and Node refuses to spawn a
// .cmd without a shell (CVE-2024-27980). Every test that packs the package goes through this seam, so
// the Windows CI matrix runs it the same way the POSIX one does. On the shell path an argument with
// whitespace is quoted (a temp dir under a user name with a space); the tests pass nothing else.
const { spawnSync, execFileSync } = require('node:child_process');
const WIN = process.platform === 'win32';
const NPM = WIN ? 'npm.cmd' : 'npm';
const shellArgs = (args) => (WIN ? args.map((a) => (/\s/.test(a) ? `"${a}"` : a)) : args);
function npmSync(args, opts = {}) { return spawnSync(NPM, shellArgs(args), { ...opts, shell: WIN }); }
function npmOut(args, opts = {}) { return execFileSync(NPM, shellArgs(args), { ...opts, shell: WIN }); }
module.exports = { npmSync, npmOut, NPM };
