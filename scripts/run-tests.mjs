#!/usr/bin/env node
// Portable test entry: enumerate test/*.test.js ourselves and hand the explicit list to
// `node --test`. Why not a glob or a directory arg: glob patterns need node >= 21, and
// directory scanning misbehaves on newer majors — while bare `node --test` recurses the
// whole repo and picks up the imported lab trees under validation/. Explicit is portable.
// Extra argv (e.g. --test-reporter=tap) is passed through.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'test');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort().map((f) => path.join(dir, f));
if (!files.length) { console.error('run-tests: no test/*.test.js files found'); process.exit(2); }
const r = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], { stdio: 'inherit', cwd: root });
process.exit(r.status === null ? 1 : r.status);
