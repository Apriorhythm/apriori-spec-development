// Test helper: spin up an app on an ephemeral port over a temp data dir.
import { createApp } from '../src/server.js';
import { createStore } from '../src/store.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function startServer(opts = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'qp-test-'));
  const store = createStore(join(dir, 'polls'), opts.storeOpts);
  const server = createApp(store);
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  return {
    base,
    store,
    async stop() {
      await new Promise((res) => server.close(res));
      await rm(dir, { recursive: true, force: true });
    },
  };
}

export async function api(base, method, path, body, headers = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!('content-type' in Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])))) {
      init.headers['Content-Type'] = 'application/json';
    }
  }
  const res = await fetch(base + path, init);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: res.status, json, text, headers: res.headers };
}

export async function createPoll(base, overrides = {}) {
  const body = { title: '午饭吃啥', options: ['火锅', '麻辣烫'], ...overrides };
  const r = await api(base, 'POST', '/api/polls', body);
  return r;
}

// extract poll id + adminToken from a create response
export function idsFrom(r) {
  const shareUrl = r.json.shareUrl;
  const adminUrl = r.json.adminUrl;
  const id = shareUrl.split('/').pop();
  const token = new URL('http://x' + adminUrl).searchParams.get('token');
  return { id, token, shareUrl, adminUrl };
}
