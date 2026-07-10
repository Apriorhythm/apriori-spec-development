// 测试基建：起真实 HTTP 服务（随机端口 + 独立临时 data 目录），原始 http 客户端（可设任意 Host 头）。
import http from 'node:http';
import path from 'node:path';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.js';

const TMP_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '.tmp');

export async function startApp(opts = {}) {
  await fsp.mkdir(TMP_ROOT, { recursive: true });
  const dataDir = opts.dataDir ?? (await fsp.mkdtemp(path.join(TMP_ROOT, 'data-')));
  const app = await createApp({ logger: () => {}, ...opts, dataDir });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const port = app.server.address().port;
  return {
    ...app,
    dataDir,
    port,
    close: () => new Promise((r) => app.server.close(r)),
    req: (method, p, o = {}) => rawReq(port, method, p, o),
    readPollFile: async (id) => JSON.parse(await fsp.readFile(path.join(dataDir, id + '.json'), 'utf8')),
  };
}

// 原始 http 客户端：path 原样发送（不做归一化），headers 任意（含 Host）。
export function rawReq(port, method, p, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const data =
      body === undefined ? null : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    const r = http.request(
      { host: '127.0.0.1', port, method, path: p, headers: { 'content-type': 'application/json', ...headers } },
      (res) => {
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(buf); } catch {}
          resolve({ status: res.statusCode, text: buf, json });
        });
      }
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

export async function createPoll(app, over = {}) {
  return app.req('POST', '/api/polls', { body: { title: '午饭吃什么', options: ['火锅', '麻辣烫', '沙拉'], ...over } });
}

export function adminKeyOf(createJson) {
  return createJson.adminUrl.split('/').pop();
}

// fs 记录器：包装 store 所需的全部 fs 方法，记录 [op, ...路径参数]。
export function recordingFs(real = fsp) {
  const ops = [];
  const wrap =
    (name) =>
    (...args) => {
      ops.push([name, ...args.filter((a) => typeof a === 'string')]);
      return real[name](...args);
    };
  const fs = {};
  for (const name of ['mkdir', 'readdir', 'readFile', 'writeFile', 'unlink', 'link', 'rename']) fs[name] = wrap(name);
  return { ops, fs };
}

// 可注入故障的 fs：fail 集合中的方法一律抛错。
export function failingFs(failOps, real = fsp) {
  const fs = {};
  for (const name of ['mkdir', 'readdir', 'readFile', 'writeFile', 'unlink', 'link', 'rename'])
    fs[name] = (...args) =>
      failOps.has(name) ? Promise.reject(Object.assign(new Error('injected disk failure'), { code: 'EIO' })) : real[name](...args);
  return fs;
}
