// Persistence layer: one JSON file per poll, atomic writes, per-poll serialized mutations.
import { promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { ApiError } from './errors.js';
import { createQueue } from './queue.js';

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function createStore(dataDir, opts = {}) {
  const queue = createQueue();
  // opts.injectFailure: () => boolean  — when true, atomicWrite fails (test hook, CC-04)
  // opts.atomicWrite: full override (advanced)
  const injectFailure = opts.injectFailure;

  function fileFor(id) {
    if (!ID_RE.test(id)) return null; // reject path traversal / illegal ids
    return join(dataDir, id + '.json');
  }

  async function ensureDir() {
    await fsp.mkdir(dataDir, { recursive: true });
  }

  async function atomicWrite(filePath, dataStr) {
    if (injectFailure && injectFailure()) {
      throw new ApiError('PERSIST_FAILED', 'injected persist failure');
    }
    if (opts.atomicWrite) return opts.atomicWrite(filePath, dataStr);
    const tmp = filePath + '.tmp.' + randomBytes(6).toString('hex');
    // --- PRE-COMMIT: any failure here leaves the OLD file intact -> honest 500 (GAP-5) ---
    try {
      const fh = await fsp.open(tmp, 'w');
      try {
        await fh.writeFile(dataStr);
        await fh.sync(); // fsync the temp file
      } finally {
        await fh.close();
      }
    } catch (e) {
      await fsp.rm(tmp, { force: true }).catch(() => {});
      if (e instanceof ApiError) throw e;
      throw new ApiError('PERSIST_FAILED', e.message);
    }
    // --- COMMIT POINT: rename is atomic. After it succeeds the write is observable. ---
    try {
      await fsp.rename(tmp, filePath);
    } catch (e) {
      await fsp.rm(tmp, { force: true }).catch(() => {});
      if (e instanceof ApiError) throw e;
      throw new ApiError('PERSIST_FAILED', e.message); // rename failed -> old file intact
    }
    // --- POST-COMMIT durability hardening: fsync the directory so the rename survives a
    //     crash. If THIS fails the data is already committed & visible, so we must NOT
    //     report PERSIST_FAILED (that would lie: "500 => no observable change", GAP-5).
    //     We log and accept the (near-impossible) residual durability risk instead. ---
    try {
      if (opts.injectDirSyncFailure && opts.injectDirSyncFailure()) throw new Error('injected dir fsync failure');
      const dh = await fsp.open(dataDir, 'r');
      try { await dh.sync(); } finally { await dh.close(); }
    } catch (e) {
      console.error(`[store] directory fsync failed after commit (data visible, durability at risk): ${e.message}`);
    }
  }

  // Pure read. Returns the raw poll object or null (not found / corrupt).
  async function load(id) {
    const fp = fileFor(id);
    if (!fp) return null;
    let raw;
    try {
      raw = await fsp.readFile(fp, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
    try {
      return JSON.parse(raw);
    } catch {
      console.error(`[store] skipping corrupt poll file: ${fp}`);
      return null;
    }
  }

  // Create a brand-new poll file (id is fresh, no contention).
  async function create(poll) {
    await ensureDir();
    const fp = fileFor(poll.id);
    await atomicWrite(fp, JSON.stringify(poll, null, 2));
    return poll;
  }

  // Serialized read-modify-write for an existing poll.
  // fn(poll) may throw ApiError or return { changed: boolean }.
  async function mutate(id, fn) {
    const fp = fileFor(id);
    if (!fp) throw new ApiError('POLL_NOT_FOUND');
    return queue.runExclusive(id, async () => {
      const poll = await load(id);
      if (!poll) throw new ApiError('POLL_NOT_FOUND');
      const res = (await fn(poll)) || {};
      if (res.changed) {
        await atomicWrite(fp, JSON.stringify(poll, null, 2));
      }
      // fn may request a persisted state change AND still signal an error to the
      // caller (e.g. lazy-close on an expired poll that then rejects the vote, GAP-4).
      if (res.error) throw res.error;
      return poll;
    });
  }

  return { load, create, mutate, ensureDir, _queueSize: queue._size };
}
