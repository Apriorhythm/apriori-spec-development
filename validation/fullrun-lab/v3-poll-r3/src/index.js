// Entry point. Env: PORT (default 3000), DATA_DIR (default ./data/polls).
import { createStore } from './store.js';
import { createApp } from './server.js';
import { join } from 'node:path';

const port = Number(process.env.PORT ?? 3000);
const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data', 'polls');

const store = createStore(dataDir);
await store.ensureDir();
const server = createApp(store);

server.listen(port, () => {
  const actual = server.address().port;
  // The test harness (CC-02) waits for this line to learn the ephemeral port.
  console.log(`READY ${actual}`);
});
