// quick-poll 入口：零依赖 Node HTTP 服务（design §1）。
// 部署：node server.js（HOST 默认 0.0.0.0，PORT 默认 3000）。单进程前提——串行化正确性依赖之。
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStore } from './lib/store.js';
import { createQueue } from './lib/queue.js';
import { makeIds } from './lib/ids.js';
import { createPolls } from './lib/polls.js';
import { createRouter } from './lib/router.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export async function createApp(opts = {}) {
  const dataDir = opts.dataDir ?? path.join(ROOT, 'data');
  const store = createStore({ dataDir, fs: opts.fs });
  await store.init();
  const polls = createPolls({ store, queue: createQueue(), ids: opts.ids ?? makeIds() });
  const handler = createRouter({
    polls,
    publicDir: path.join(ROOT, 'public'),
    logger: opts.logger,
    listenHost: opts.listenHost,
    port: opts.port,
  });
  return { server: http.createServer(handler), store, polls };
}

async function main() {
  const HOST = process.env.HOST || '0.0.0.0';
  const PORT = Number(process.env.PORT) || 3000;
  const { server } = await createApp({ listenHost: HOST, port: PORT });
  server.listen(PORT, HOST, () => console.log(`quick-poll listening on http://${HOST}:${PORT}`));
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.on(sig, () => server.close(() => process.exit(0))); // 已成功响应的请求均已落盘，无需排空
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
