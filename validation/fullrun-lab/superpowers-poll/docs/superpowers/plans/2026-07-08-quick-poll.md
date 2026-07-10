# 快速投票小工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个零依赖 Node 的快速投票小工具：建投票→发链接→匿名投票→实时看结果，发起人可用管理链接关闭投票。

**Architecture:** 三层：`lib/store.js`（JSON 文件读写）、`lib/polls.js`（业务规则与计票）、`server.js`（HTTP 路由 + 静态页托管）。前端为 `public/` 下三个自包含 HTML 页面（原生 JS，轮询刷新结果）。

**Tech Stack:** Node ≥18 内置模块（`http`/`fs`/`crypto`/`node:test`，运行环境为 v24），无任何 npm 依赖；E2E 冒烟用全局安装的 Playwright。

**Spec:** `docs/superpowers/specs/2026-07-07-quick-poll-design.md`

## Global Constraints

- 零 npm 依赖：只用 Node 内置模块；测试用 `node --test`
- 数据文件固定为 `<dataDir>/polls.json`；生产 dataDir 为项目下 `data/`（git 忽略）；测试一律用临时目录
- 服务监听 `0.0.0.0`，端口 `Number(process.env.PORT) || 3000`
- 错误响应一律 `{"error": "<中文消息>"}`；校验限制：问题 ≤200 字、选项 2–20 个、单个选项 ≤100 字
- `id` 6 位、`adminToken` 16 位，字符集 `abcdefghjkmnpqrstuvwxyz23456789`，用 `crypto.randomBytes` 生成
- 公开 API 响应绝不含 `adminToken`
- 写数据文件必须"写临时文件再 rename"
- 页面/文案为中文

---

### Task 1: 项目脚手架 + 数据层 store.js

**Files:**
- Create: `package.json`, `.gitignore`
- Create: `lib/store.js`
- Test: `test/store.test.js`

**Interfaces:**
- Consumes: 无（首个任务）
- Produces: `createStore(dataDir)` → `{ get(id), all(), put(poll) }`。`get` 未命中返回 `undefined`；`all()` 返回内部对象（id → poll）；`put(poll)` 以 `poll.id` 为 key 存入并立即持久化。模块导出 `module.exports = { createStore }`。

- [x] **Step 1: 写脚手架文件**

`package.json`:

```json
{
  "name": "superpowers-poll",
  "version": "0.1.0",
  "private": true,
  "description": "快速投票小工具：建投票、发链接、匿名投票、实时看结果",
  "scripts": {
    "start": "node server.js",
    "test": "node --test test/"
  },
  "engines": { "node": ">=18" }
}
```

`.gitignore`:

```
data/
*.bak-*
node_modules/
```

- [x] **Step 2: 写失败的测试**

`test/store.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../lib/store');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'poll-store-'));
}

test('put 后可 get；新建 store 实例（模拟重启）后数据仍在', () => {
  const dir = tmpDir();
  const store = createStore(dir);
  store.put({ id: 'abc123', question: 'q', votes: [] });
  assert.equal(store.get('abc123').question, 'q');

  const reopened = createStore(dir);
  assert.equal(reopened.get('abc123').question, 'q');
});

test('数据文件不存在时从空数据开始', () => {
  const store = createStore(tmpDir());
  assert.equal(store.get('nope'), undefined);
  assert.deepEqual(store.all(), {});
});

test('数据文件损坏时备份为 polls.json.bak-* 并从空数据开始', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'polls.json'), '{broken json');
  const store = createStore(dir);
  assert.deepEqual(store.all(), {});
  const baks = fs.readdirSync(dir).filter((f) => f.startsWith('polls.json.bak-'));
  assert.equal(baks.length, 1);
});

test('写入是原子的：目录里不残留 .tmp 文件', () => {
  const dir = tmpDir();
  const store = createStore(dir);
  store.put({ id: 'x1', votes: [] });
  assert.ok(!fs.readdirSync(dir).some((f) => f.endsWith('.tmp')));
});
```

- [x] **Step 3: 跑测试确认失败**

Run: `node --test test/store.test.js`
Expected: FAIL —— `Cannot find module '../lib/store'`

- [x] **Step 4: 写最小实现**

`lib/store.js`:

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function createStore(dataDir) {
  const file = path.join(dataDir, 'polls.json');
  const data = load();

  function load() {
    if (!fs.existsSync(file)) return {};
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      const backup = `${file}.bak-${Date.now()}`;
      fs.renameSync(file, backup);
      console.error(`polls.json 损坏，已备份为 ${backup}，从空数据开始`);
      return {};
    }
  }

  function save() {
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  }

  return {
    get(id) {
      return data[id];
    },
    all() {
      return data;
    },
    put(poll) {
      data[poll.id] = poll;
      save();
    },
  };
}

module.exports = { createStore };
```

- [x] **Step 5: 跑测试确认通过**

Run: `node --test test/store.test.js`
Expected: PASS —— 4 个测试全绿

- [x] **Step 6: 提交**

```bash
git add package.json .gitignore lib/store.js test/store.test.js
git commit -m "feat: 项目脚手架 + JSON 文件数据层 store"
```

---

### Task 2: 业务层 polls.js —— 建投票与校验

**Files:**
- Create: `lib/polls.js`
- Test: `test/polls.test.js`

**Interfaces:**
- Consumes: Task 1 的 store 接口 `{ get, all, put }`（测试里用内存假 store，不碰文件）
- Produces:
  - `createPolls(store, now = () => new Date())` → `{ create, getView, vote, adminView, close }`（本任务先实现 `create`，其余 Task 3 补）
  - `create({question, options, multiple, deadline})` → 完整 poll 对象 `{id, adminToken, question, options, multiple, deadline, closed, votes, createdAt}`，并已 `store.put`。`deadline` 存 ISO 字符串或 `null`。
  - `class PollError extends Error`，带 `status`（number）与中文 `message`
  - `module.exports = { createPolls, PollError }`

- [x] **Step 1: 写失败的测试**

`test/polls.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPolls, PollError } = require('../lib/polls');

function memStore() {
  const data = {};
  return {
    get: (id) => data[id],
    all: () => data,
    put: (p) => {
      data[p.id] = p;
    },
  };
}

function make(now) {
  return createPolls(memStore(), now);
}

test('create：合法输入生成完整 poll 并存入 store', () => {
  const store = memStore();
  const polls = createPolls(store);
  const poll = polls.create({
    question: ' 周五团建去哪 ',
    options: ['烤肉', ' 火锅 ', '', '轰趴馆'],
    multiple: true,
    deadline: null,
  });
  assert.match(poll.id, /^[a-z2-9]{6}$/);
  assert.match(poll.adminToken, /^[a-z2-9]{16}$/);
  assert.equal(poll.question, '周五团建去哪');
  assert.deepEqual(poll.options, ['烤肉', '火锅', '轰趴馆']);
  assert.equal(poll.multiple, true);
  assert.equal(poll.deadline, null);
  assert.equal(poll.closed, false);
  assert.deepEqual(poll.votes, []);
  assert.equal(store.get(poll.id), poll);
});

test('create：问题为空 / 超 200 字被拒', () => {
  const polls = make();
  assert.throws(() => polls.create({ question: '  ', options: ['a', 'b'] }), (e) => e instanceof PollError && e.status === 400 && e.message === '问题不能为空');
  assert.throws(() => polls.create({ question: 'x'.repeat(201), options: ['a', 'b'] }), (e) => e.status === 400 && e.message === '问题不能超过 200 字');
});

test('create：选项数量与长度校验', () => {
  const polls = make();
  assert.throws(() => polls.create({ question: 'q', options: ['只有一个', ' '] }), (e) => e.status === 400 && e.message === '至少需要 2 个选项');
  assert.throws(() => polls.create({ question: 'q', options: Array.from({ length: 21 }, (_, i) => `选项${i}`) }), (e) => e.status === 400 && e.message === '选项不能超过 20 个');
  assert.throws(() => polls.create({ question: 'q', options: ['a', 'b'.repeat(101)] }), (e) => e.status === 400 && e.message === '单个选项不能超过 100 字');
});

test('create：deadline 非法或不在未来被拒；合法则存 ISO 串', () => {
  const now = () => new Date('2026-07-08T12:00:00Z');
  const polls = make(now);
  assert.throws(() => polls.create({ question: 'q', options: ['a', 'b'], deadline: '不是时间' }), (e) => e.status === 400 && e.message === '截止时间格式不正确');
  assert.throws(() => polls.create({ question: 'q', options: ['a', 'b'], deadline: '2026-07-08T11:00:00Z' }), (e) => e.status === 400 && e.message === '截止时间必须晚于当前时间');
  const poll = polls.create({ question: 'q', options: ['a', 'b'], deadline: '2026-07-09T12:00:00Z' });
  assert.equal(poll.deadline, new Date('2026-07-09T12:00:00Z').toISOString());
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `node --test test/polls.test.js`
Expected: FAIL —— `Cannot find module '../lib/polls'`

- [x] **Step 3: 写最小实现**

`lib/polls.js`:

```js
'use strict';
const crypto = require('node:crypto');

class PollError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const ID_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomId(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ID_CHARS[bytes[i] % ID_CHARS.length];
  return out;
}

function createPolls(store, now = () => new Date()) {
  function create(input) {
    const question = String(input.question ?? '').trim();
    if (!question) throw new PollError(400, '问题不能为空');
    if (question.length > 200) throw new PollError(400, '问题不能超过 200 字');

    const raw = Array.isArray(input.options) ? input.options : [];
    const options = raw.map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 2) throw new PollError(400, '至少需要 2 个选项');
    if (options.length > 20) throw new PollError(400, '选项不能超过 20 个');
    if (options.some((o) => o.length > 100)) throw new PollError(400, '单个选项不能超过 100 字');

    let deadline = null;
    if (input.deadline) {
      const d = new Date(input.deadline);
      if (Number.isNaN(d.getTime())) throw new PollError(400, '截止时间格式不正确');
      if (d <= now()) throw new PollError(400, '截止时间必须晚于当前时间');
      deadline = d.toISOString();
    }

    const poll = {
      id: randomId(6),
      adminToken: randomId(16),
      question,
      options,
      multiple: Boolean(input.multiple),
      deadline,
      closed: false,
      votes: [],
      createdAt: now().toISOString(),
    };
    store.put(poll);
    return poll;
  }

  return { create };
}

module.exports = { createPolls, PollError };
```

- [x] **Step 4: 跑测试确认通过**

Run: `node --test test/polls.test.js`
Expected: PASS —— 4 个测试全绿

- [x] **Step 5: 提交**

```bash
git add lib/polls.js test/polls.test.js
git commit -m "feat: polls 业务层 —— 建投票与输入校验"
```

---

### Task 3: 业务层 polls.js —— 投票、计票、视图与关闭

**Files:**
- Modify: `lib/polls.js`（在 `createPolls` 内新增函数并扩展返回值）
- Test: `test/polls.test.js`（追加测试）

**Interfaces:**
- Consumes: Task 2 的 `create` 与 `PollError`
- Produces（`createPolls(...)` 返回值补全为 `{ create, getView, vote, adminView, close }`）：
  - `getView(id)` → 公开视图 `{id, question, options, multiple, deadline, closed, open, counts, total}`；不存在抛 404 `投票不存在`。**绝不含 adminToken。**
  - `vote(id, choices)` → 记录一票并返回更新后的公开视图。错误：404 同上；409 `投票已关闭` / `投票已过截止时间`；400 `请至少选择一个选项` / `选项不合法` / `该投票为单选，只能选择一个选项`
  - `adminView(token)` → 与公开视图同款字段；token 未命中抛 404 `管理链接不存在`
  - `close(token)` → 置 `closed = true` 并持久化，返回更新后视图
  - `open` 定义：`!closed && (deadline 为 null || now() < new Date(deadline))`
  - `counts[i]` = 包含下标 i 的投票次数；`total` = `votes.length`

- [x] **Step 1: 追加失败的测试**

在 `test/polls.test.js` 末尾追加：

```js
test('getView：公开视图字段齐全、计票正确、不含 adminToken', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b', 'c'], multiple: true });
  polls.vote(poll.id, [0]);
  polls.vote(poll.id, [0, 2]);
  const view = polls.getView(poll.id);
  assert.deepEqual(view.counts, [2, 0, 1]);
  assert.equal(view.total, 2);
  assert.equal(view.open, true);
  assert.equal(view.closed, false);
  assert.ok(!('adminToken' in view));
  assert.ok(!('votes' in view));
});

test('getView：不存在的 id 抛 404', () => {
  const polls = make();
  assert.throws(() => polls.getView('nope42'), (e) => e.status === 404 && e.message === '投票不存在');
});

test('vote：单选只允许一个选项；choices 校验', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  assert.throws(() => polls.vote(poll.id, [0, 1]), (e) => e.status === 400 && e.message === '该投票为单选，只能选择一个选项');
  assert.throws(() => polls.vote(poll.id, []), (e) => e.status === 400 && e.message === '请至少选择一个选项');
  assert.throws(() => polls.vote(poll.id, undefined), (e) => e.status === 400 && e.message === '请至少选择一个选项');
  assert.throws(() => polls.vote(poll.id, [5]), (e) => e.status === 400 && e.message === '选项不合法');
  assert.throws(() => polls.vote(poll.id, [0.5]), (e) => e.status === 400 && e.message === '选项不合法');
  const view = polls.vote(poll.id, [1]);
  assert.deepEqual(view.counts, [0, 1]);
});

test('vote：多选可含多个不重复下标，重复被拒', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'], multiple: true });
  assert.throws(() => polls.vote(poll.id, [0, 0]), (e) => e.status === 400 && e.message === '选项不合法');
  const view = polls.vote(poll.id, [0, 1]);
  assert.deepEqual(view.counts, [1, 1]);
  assert.equal(view.total, 1);
});

test('vote：已关闭 409；过截止时间 409 且 open=false', () => {
  let t = new Date('2026-07-08T12:00:00Z');
  const polls = make(() => t);
  const p1 = polls.create({ question: 'q', options: ['a', 'b'] });
  const closed = polls.create({ question: 'q3', options: ['a', 'b'] });
  polls.close(closed.adminToken);
  assert.throws(() => polls.vote(closed.id, [0]), (e) => e.status === 409 && e.message === '投票已关闭');

  const dated = polls.create({ question: 'q4', options: ['a', 'b'], deadline: '2026-07-08T13:00:00Z' });
  t = new Date('2026-07-08T13:00:01Z');
  assert.throws(() => polls.vote(dated.id, [0]), (e) => e.status === 409 && e.message === '投票已过截止时间');
  assert.equal(polls.getView(dated.id).open, false);
  assert.equal(polls.getView(p1.id).open, true);
});

test('adminView / close：按 token 取视图、关闭投票；未知 token 404', () => {
  const polls = make();
  const poll = polls.create({ question: 'q', options: ['a', 'b'] });
  const view = polls.adminView(poll.adminToken);
  assert.equal(view.id, poll.id);
  assert.ok(!('adminToken' in view));
  const closedView = polls.close(poll.adminToken);
  assert.equal(closedView.closed, true);
  assert.equal(closedView.open, false);
  assert.throws(() => polls.adminView('0'.repeat(16)), (e) => e.status === 404 && e.message === '管理链接不存在');
  assert.throws(() => polls.close('0'.repeat(16)), (e) => e.status === 404 && e.message === '管理链接不存在');
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `node --test test/polls.test.js`
Expected: FAIL —— `polls.vote is not a function`（等新增函数未定义）

- [x] **Step 3: 实现**

在 `lib/polls.js` 的 `createPolls` 内、`create` 之后新增，并替换 return：

```js
  function isOpen(poll) {
    if (poll.closed) return false;
    if (poll.deadline && now() >= new Date(poll.deadline)) return false;
    return true;
  }

  function view(poll) {
    const counts = poll.options.map(
      (_, i) => poll.votes.filter((v) => v.includes(i)).length
    );
    return {
      id: poll.id,
      question: poll.question,
      options: poll.options,
      multiple: poll.multiple,
      deadline: poll.deadline,
      closed: poll.closed,
      open: isOpen(poll),
      counts,
      total: poll.votes.length,
    };
  }

  function getPoll(id) {
    const poll = store.get(id);
    if (!poll) throw new PollError(404, '投票不存在');
    return poll;
  }

  function getView(id) {
    return view(getPoll(id));
  }

  function vote(id, choices) {
    const poll = getPoll(id);
    if (poll.closed) throw new PollError(409, '投票已关闭');
    if (!isOpen(poll)) throw new PollError(409, '投票已过截止时间');
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new PollError(400, '请至少选择一个选项');
    }
    const validIndex = (c) => Number.isInteger(c) && c >= 0 && c < poll.options.length;
    if (!choices.every(validIndex) || new Set(choices).size !== choices.length) {
      throw new PollError(400, '选项不合法');
    }
    if (!poll.multiple && choices.length > 1) {
      throw new PollError(400, '该投票为单选，只能选择一个选项');
    }
    poll.votes.push(choices);
    store.put(poll);
    return view(poll);
  }

  function findByToken(token) {
    const all = store.all();
    for (const id of Object.keys(all)) {
      if (all[id].adminToken === token) return all[id];
    }
    throw new PollError(404, '管理链接不存在');
  }

  function adminView(token) {
    return view(findByToken(token));
  }

  function close(token) {
    const poll = findByToken(token);
    poll.closed = true;
    store.put(poll);
    return view(poll);
  }

  return { create, getView, vote, adminView, close };
```

- [x] **Step 4: 跑全部测试确认通过**

Run: `node --test test/`
Expected: PASS —— store + polls 全绿

- [x] **Step 5: 提交**

```bash
git add lib/polls.js test/polls.test.js
git commit -m "feat: polls 业务层 —— 投票/计票/视图/关闭"
```

---

### Task 4: server.js —— HTTP API 与页面路由

**Files:**
- Create: `server.js`
- Test: `test/server.test.js`

**Interfaces:**
- Consumes: `createStore(dataDir)`（Task 1）、`createPolls(store)` 与 `PollError`（Task 2/3）
- Produces:
  - `createServer(dataDir)` → 未 listen 的 `http.Server`（测试用 `listen(0)`）；`module.exports = { createServer }`
  - 直接运行 `node server.js` 时监听 `0.0.0.0:${PORT||3000}`，dataDir 为 `<项目>/data`
  - 路由见 spec 第 6 节；页面路由返回 `public/` 下 HTML（Task 5 创建；本任务先建占位页让路由测试可跑）
  - 错误响应统一 `{"error": "<中文消息>"}`；非法 JSON body → 400 `请求格式不正确`；未匹配路径 → 404 `页面不存在`

- [x] **Step 1: 写失败的测试**

`test/server.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');

async function startServer(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-srv-'));
  const server = createServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

async function post(base, p, body) {
  const res = await fetch(base + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test('全流程：建投票→投票→查结果→关闭→再投被拒', async (t) => {
  const base = await startServer(t);

  const created = await post(base, '/api/polls', {
    question: '周五团建去哪',
    options: ['烤肉', '火锅', '轰趴馆'],
    multiple: false,
  });
  assert.equal(created.status, 201);
  const { id, adminToken } = created.body;
  assert.match(id, /^[a-z2-9]{6}$/);
  assert.match(adminToken, /^[a-z2-9]{16}$/);

  const voted = await post(base, `/api/polls/${id}/vote`, { choices: [1] });
  assert.equal(voted.status, 200);
  assert.deepEqual(voted.body.counts, [0, 1, 0]);

  const view = await fetch(`${base}/api/polls/${id}`).then((r) => r.json());
  assert.equal(view.total, 1);
  assert.equal(view.open, true);
  assert.ok(!('adminToken' in view));

  const admin = await fetch(`${base}/api/admin/${adminToken}`).then((r) => r.json());
  assert.equal(admin.id, id);

  const closed = await post(base, `/api/admin/${adminToken}/close`, {});
  assert.equal(closed.status, 200);
  assert.equal(closed.body.closed, true);

  const rejected = await post(base, `/api/polls/${id}/vote`, { choices: [0] });
  assert.equal(rejected.status, 409);
  assert.equal(rejected.body.error, '投票已关闭');
});

test('错误路径：404 / 校验 400 / 非法 JSON 400', async (t) => {
  const base = await startServer(t);

  const missing = await fetch(`${base}/api/polls/nope42`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, '投票不存在');

  const invalid = await post(base, '/api/polls', { question: '', options: ['a', 'b'] });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, '问题不能为空');

  const badJson = await fetch(`${base}/api/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{broken',
  });
  assert.equal(badJson.status, 400);
  assert.equal((await badJson.json()).error, '请求格式不正确');

  const unknown = await fetch(`${base}/api/what`);
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error, '页面不存在');
});

test('页面路由：/、/poll/:id、/admin/:token 返回 HTML', async (t) => {
  const base = await startServer(t);
  for (const p of ['/', '/poll/abc123', '/admin/abcdefgh23456789']) {
    const res = await fetch(base + p);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type'), /text\/html/);
  }
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `node --test test/server.test.js`
Expected: FAIL —— `Cannot find module '../server'`

- [x] **Step 3: 实现 server.js + 占位页面**

先建占位页（Task 5 会替换成真实页面）：

```bash
mkdir -p public
printf '<!doctype html><meta charset="utf-8"><title>快速投票</title>占位\n' > public/index.html
printf '<!doctype html><meta charset="utf-8"><title>投票</title>占位\n' > public/poll.html
printf '<!doctype html><meta charset="utf-8"><title>管理</title>占位\n' > public/admin.html
```

`server.js`:

```js
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('./lib/store');
const { createPolls, PollError } = require('./lib/polls');

const PUBLIC_DIR = path.join(__dirname, 'public');

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendFile(res, name, type) {
  res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
  res.end(fs.readFileSync(path.join(PUBLIC_DIR, name)));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new PollError(400, '请求格式不正确'));
      }
    });
    req.on('error', reject);
  });
}

function createServer(dataDir) {
  const store = createStore(dataDir);
  const polls = createPolls(store);

  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const get = req.method === 'GET';
    const postReq = req.method === 'POST';
    let m;
    try {
      if (get && pathname === '/') return sendFile(res, 'index.html', 'text/html');
      if (get && pathname === '/style.css') return sendFile(res, 'style.css', 'text/css');
      if (get && /^\/poll\/[a-z2-9]+$/.test(pathname)) return sendFile(res, 'poll.html', 'text/html');
      if (get && /^\/admin\/[a-z2-9]+$/.test(pathname)) return sendFile(res, 'admin.html', 'text/html');

      if (postReq && pathname === '/api/polls') {
        const body = await readJsonBody(req);
        const poll = polls.create(body);
        return sendJson(res, 201, { id: poll.id, adminToken: poll.adminToken });
      }
      if (get && (m = pathname.match(/^\/api\/polls\/([a-z2-9]+)$/))) {
        return sendJson(res, 200, polls.getView(m[1]));
      }
      if (postReq && (m = pathname.match(/^\/api\/polls\/([a-z2-9]+)\/vote$/))) {
        const body = await readJsonBody(req);
        return sendJson(res, 200, polls.vote(m[1], body.choices));
      }
      if (get && (m = pathname.match(/^\/api\/admin\/([a-z2-9]+)$/))) {
        return sendJson(res, 200, polls.adminView(m[1]));
      }
      if (postReq && (m = pathname.match(/^\/api\/admin\/([a-z2-9]+)\/close$/))) {
        const body = await readJsonBody(req);
        void body;
        return sendJson(res, 200, polls.close(m[1]));
      }
      return sendJson(res, 404, { error: '页面不存在' });
    } catch (err) {
      if (err instanceof PollError) return sendJson(res, err.status, { error: err.message });
      console.error(err);
      return sendJson(res, 500, { error: '服务器内部错误' });
    }
  });
}

module.exports = { createServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer(path.join(__dirname, 'data')).listen(port, '0.0.0.0', () => {
    console.log(`快速投票已启动: http://localhost:${port}`);
  });
}
```

注意：`/style.css` 路由指向 Task 5 才创建的文件；本任务的页面路由测试只覆盖三个 HTML 路由，不测 style.css，所以占位阶段不会 500。

- [x] **Step 4: 跑全部测试确认通过**

Run: `node --test test/`
Expected: PASS —— 全部测试绿

- [x] **Step 5: 提交**

```bash
git add server.js public/index.html public/poll.html public/admin.html test/server.test.js
git commit -m "feat: HTTP 服务 —— API 路由 + 页面托管"
```

---

### Task 5: 前端三页面（建投票 / 投票 / 管理）

**Files:**
- Create: `public/style.css`
- Modify: `public/index.html`, `public/poll.html`, `public/admin.html`（替换占位内容）
- Test: `test/server.test.js`（追加对 style.css 与页面关键内容的断言）

**Interfaces:**
- Consumes: Task 4 的全部 API；localStorage 键约定 `voted:<pollId>`（投票成功后前端写 `"1"`）
- Produces: 用户可用的三张页面；Task 6 的 Playwright 冒烟依赖这里的元素 id（`#question`、`#options`、`#add-option`、`#multiple`、`#deadline`、`#create`、`#links`、`#vote-url`、`#admin-url`、`#form`、`#submit`、`#results`、`#notice`、`#close`）

- [x] **Step 1: 追加失败的测试**

在 `test/server.test.js` 末尾追加：

```js
test('前端资产：style.css 可达；页面含真实应用标记', async (t) => {
  const base = await startServer(t);
  const css = await fetch(`${base}/style.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);

  const index = await fetch(`${base}/`).then((r) => r.text());
  assert.match(index, /id="create"/);
  const poll = await fetch(`${base}/poll/abc123`).then((r) => r.text());
  assert.match(poll, /id="results"/);
  const admin = await fetch(`${base}/admin/abcdefgh23456789`).then((r) => r.text());
  assert.match(admin, /id="close"/);
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `node --test test/server.test.js`
Expected: FAIL —— style.css 404（`页面不存在` JSON），页面断言不匹配占位内容

- [x] **Step 3: 写样式与三张页面**

`public/style.css`:

```css
* { box-sizing: border-box; }
body {
  font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
  max-width: 560px; margin: 0 auto; padding: 24px 16px; color: #222;
}
h1 { font-size: 1.4rem; }
label { display: block; margin: 12px 0 4px; }
input[type="text"], input[type="datetime-local"] {
  width: 100%; padding: 8px; border: 1px solid #bbb; border-radius: 6px; font-size: 1rem;
}
.option-row { display: flex; gap: 8px; margin-bottom: 8px; }
.option-row button { flex: 0 0 auto; }
button {
  padding: 8px 16px; border: 0; border-radius: 6px; background: #2563eb;
  color: #fff; font-size: 1rem; cursor: pointer;
}
button.secondary { background: #e5e7eb; color: #222; }
button:disabled { background: #9ca3af; cursor: not-allowed; }
.check { display: flex; align-items: center; gap: 8px; margin: 12px 0; }
.check label, .choice label { display: inline; margin: 0; }
.choice { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 1.05rem; }
.result-row { margin: 10px 0; }
.result-label { display: flex; justify-content: space-between; font-size: 0.95rem; }
.bar { height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin-top: 4px; }
.bar > div { height: 100%; background: #2563eb; }
.notice { padding: 10px 12px; border-radius: 6px; background: #fef3c7; margin: 12px 0; }
.error { background: #fee2e2; }
.linkbox { background: #f3f4f6; border-radius: 6px; padding: 10px 12px; margin: 8px 0; word-break: break-all; }
.muted { color: #6b7280; font-size: 0.9rem; }
```

`public/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>快速投票 · 新建</title>
<link rel="stylesheet" href="/style.css">
<body>
<h1>新建投票</h1>
<div id="form">
  <label for="question">问题</label>
  <input type="text" id="question" maxlength="200" placeholder="比如：周五团建去哪？">
  <label>选项</label>
  <div id="options">
    <div class="option-row"><input type="text" maxlength="100" placeholder="选项 1"></div>
    <div class="option-row"><input type="text" maxlength="100" placeholder="选项 2"></div>
  </div>
  <button type="button" class="secondary" id="add-option">+ 加一个选项</button>
  <div class="check">
    <input type="checkbox" id="multiple"><label for="multiple">允许多选</label>
  </div>
  <label for="deadline">截止时间（可不填）</label>
  <input type="datetime-local" id="deadline">
  <p><button type="button" id="create">创建投票</button></p>
  <div id="error" class="notice error" hidden></div>
</div>
<div id="links" hidden>
  <h1>创建成功</h1>
  <p>投票链接（发到群里）：</p>
  <div class="linkbox" id="vote-url"></div>
  <p><button type="button" id="copy-vote">复制投票链接</button></p>
  <p>管理链接（自己收好，<strong>丢了找不回</strong>，可用来关闭投票）：</p>
  <div class="linkbox" id="admin-url"></div>
  <p><button type="button" class="secondary" id="copy-admin">复制管理链接</button></p>
</div>
<script>
const $ = (s) => document.querySelector(s);
let optionCount = 2;

$('#add-option').addEventListener('click', () => {
  optionCount += 1;
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = '<input type="text" maxlength="100" placeholder="选项 ' + optionCount + '">'
    + '<button type="button" class="secondary">删</button>';
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('#options').appendChild(row);
});

function showError(msg) {
  const box = $('#error');
  box.textContent = msg;
  box.hidden = false;
}

$('#create').addEventListener('click', async () => {
  $('#error').hidden = true;
  const options = [...document.querySelectorAll('#options input')].map((i) => i.value);
  const deadlineRaw = $('#deadline').value;
  const body = {
    question: $('#question').value,
    options,
    multiple: $('#multiple').checked,
    deadline: deadlineRaw ? new Date(deadlineRaw).toISOString() : null,
  };
  const res = await fetch('/api/polls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return showError(data.error || '创建失败');
  $('#form').hidden = true;
  $('#links').hidden = false;
  const voteUrl = location.origin + '/poll/' + data.id;
  const adminUrl = location.origin + '/admin/' + data.adminToken;
  $('#vote-url').textContent = voteUrl;
  $('#admin-url').textContent = adminUrl;
  $('#copy-vote').addEventListener('click', () => navigator.clipboard.writeText(voteUrl));
  $('#copy-admin').addEventListener('click', () => navigator.clipboard.writeText(adminUrl));
});
</script>
</body>
</html>
```

`public/poll.html`:

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>快速投票</title>
<link rel="stylesheet" href="/style.css">
<body>
<h1 id="question">加载中…</h1>
<div id="notice" class="notice" hidden></div>
<div id="form" hidden>
  <div id="choices"></div>
  <p><button type="button" id="submit">投票</button></p>
  <div id="error" class="notice error" hidden></div>
</div>
<h2>当前结果</h2>
<div id="results"></div>
<p class="muted" id="total"></p>
<script>
const $ = (s) => document.querySelector(s);
const pollId = location.pathname.split('/')[2];
const votedKey = 'voted:' + pollId;
let rendered = false;

function renderResults(view) {
  $('#results').innerHTML = view.options.map((opt, i) => {
    const count = view.counts[i];
    const pct = view.total ? Math.round((count / view.total) * 100) : 0;
    return '<div class="result-row"><div class="result-label"><span></span><span>'
      + count + ' 票 · ' + pct + '%</span></div><div class="bar"><div style="width:'
      + pct + '%"></div></div></div>';
  }).join('');
  document.querySelectorAll('#results .result-label span:first-child')
    .forEach((el, i) => { el.textContent = view.options[i]; });
  $('#total').textContent = '共 ' + view.total + ' 人参与';
}

function renderForm(view) {
  const type = view.multiple ? 'checkbox' : 'radio';
  $('#choices').innerHTML = view.options.map((_, i) =>
    '<div class="choice"><input type="' + type + '" name="choice" id="c' + i
    + '" value="' + i + '"><label for="c' + i + '"></label></div>'
  ).join('');
  document.querySelectorAll('#choices label')
    .forEach((el, i) => { el.textContent = view.options[i]; });
}

function updateState(view) {
  document.title = view.question + ' · 快速投票';
  $('#question').textContent = view.question;
  renderResults(view);
  const voted = localStorage.getItem(votedKey);
  const notice = $('#notice');
  if (voted) {
    notice.textContent = '你已经投过票了，下面是当前结果。';
    notice.hidden = false; $('#form').hidden = true;
  } else if (!view.open) {
    notice.textContent = view.closed ? '投票已关闭，下面是最终结果。' : '投票已过截止时间，下面是最终结果。';
    notice.hidden = false; $('#form').hidden = true;
  } else {
    notice.hidden = true;
    if (!rendered) { renderForm(view); rendered = true; }
    $('#form').hidden = false;
  }
}

async function load() {
  const res = await fetch('/api/polls/' + pollId);
  const data = await res.json();
  if (!res.ok) {
    $('#question').textContent = data.error || '加载失败';
    return;
  }
  updateState(data);
}

$('#submit').addEventListener('click', async () => {
  $('#error').hidden = true;
  const choices = [...document.querySelectorAll('#choices input:checked')]
    .map((i) => Number(i.value));
  const res = await fetch('/api/polls/' + pollId + '/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choices }),
  });
  const data = await res.json();
  if (!res.ok) {
    const box = $('#error');
    box.textContent = data.error || '投票失败';
    box.hidden = false;
    if (res.status === 409) updateState(await (await fetch('/api/polls/' + pollId)).json());
    return;
  }
  localStorage.setItem(votedKey, '1');
  updateState(data);
});

load();
setInterval(load, 3000);
</script>
</body>
</html>
```

`public/admin.html`:

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>投票管理</title>
<link rel="stylesheet" href="/style.css">
<body>
<h1 id="question">加载中…</h1>
<div id="notice" class="notice" hidden></div>
<h2>当前结果</h2>
<div id="results"></div>
<p class="muted" id="total"></p>
<p><button type="button" id="close">关闭投票</button></p>
<p class="muted" id="share"></p>
<script>
const $ = (s) => document.querySelector(s);
const token = location.pathname.split('/')[2];

function render(view) {
  document.title = view.question + ' · 投票管理';
  $('#question').textContent = view.question;
  $('#results').innerHTML = view.options.map((opt, i) => {
    const count = view.counts[i];
    const pct = view.total ? Math.round((count / view.total) * 100) : 0;
    return '<div class="result-row"><div class="result-label"><span></span><span>'
      + count + ' 票 · ' + pct + '%</span></div><div class="bar"><div style="width:'
      + pct + '%"></div></div></div>';
  }).join('');
  document.querySelectorAll('#results .result-label span:first-child')
    .forEach((el, i) => { el.textContent = view.options[i]; });
  $('#total').textContent = '共 ' + view.total + ' 人参与';
  $('#share').textContent = '投票链接：' + location.origin + '/poll/' + view.id;
  const notice = $('#notice');
  if (!view.open) {
    notice.textContent = view.closed ? '投票已关闭。' : '投票已过截止时间。';
    notice.hidden = false;
    $('#close').disabled = true;
    $('#close').textContent = view.closed ? '已关闭' : '已截止';
  }
}

async function load() {
  const res = await fetch('/api/admin/' + token);
  const data = await res.json();
  if (!res.ok) {
    $('#question').textContent = data.error || '加载失败';
    $('#close').disabled = true;
    return;
  }
  render(data);
}

$('#close').addEventListener('click', async () => {
  if (!confirm('确定关闭投票？关闭后不能再投。')) return;
  const res = await fetch('/api/admin/' + token + '/close', { method: 'POST' });
  const data = await res.json();
  if (res.ok) render(data);
});

load();
setInterval(load, 3000);
</script>
</body>
</html>
```

- [x] **Step 4: 跑全部测试确认通过**

Run: `node --test test/`
Expected: PASS —— 含新增前端资产测试

- [x] **Step 5: 手动冒烟（可选但建议）**

```bash
PORT=3100 node server.js &
curl -s http://127.0.0.1:3100/ | head -5
kill %1
```

Expected: 输出 index.html 开头（含 `新建投票`）

- [x] **Step 6: 提交**

```bash
git add public/ test/server.test.js
git commit -m "feat: 前端三页面 —— 建投票/投票/管理"
```

---

### Task 6: Playwright 端到端冒烟 + README

**Files:**
- Create: `test/e2e.test.js`
- Create: `README.md`

**Interfaces:**
- Consumes: 全站（真实浏览器走 Task 5 页面 + Task 4 API）；Task 5 定义的元素 id
- Produces: `npm run test:e2e` 脚本（Playwright 为全局安装，需 `NODE_PATH="$(npm root -g)"`；普通 `npm test` 不含 e2e，保持零依赖可跑）

- [x] **Step 1: 写 E2E 测试（先写全，一次跑通即可——服务器与页面已就绪，此测试主要是回归保障）**

`test/e2e.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server');
const { chromium } = require('playwright');

test('浏览器冒烟：建投票→投票→看结果→刷新后不能再投', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-e2e-'));
  const server = createServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close();
    server.close();
  });
  const page = await browser.newPage();

  await page.goto(base + '/');
  await page.fill('#question', '周五团建去哪');
  const optionInputs = page.locator('#options input');
  await optionInputs.nth(0).fill('烤肉');
  await optionInputs.nth(1).fill('火锅');
  await page.click('#create');
  await page.waitForSelector('#links:not([hidden])');
  const voteUrl = await page.textContent('#vote-url');
  assert.match(voteUrl, /\/poll\/[a-z2-9]{6}$/);

  await page.goto(voteUrl);
  await page.waitForSelector('#form:not([hidden])');
  await page.check('#c1');
  await page.click('#submit');
  await page.waitForSelector('#notice:not([hidden])');
  const results = await page.textContent('#results');
  assert.ok(results.includes('1 票'), '结果里应显示 1 票');

  await page.reload();
  await page.waitForSelector('#notice:not([hidden])');
  assert.ok((await page.textContent('#notice')).includes('已经投过'), '刷新后应提示已投过');
  assert.ok(await page.locator('#form').isHidden(), '已投过时投票表单应隐藏');
});
```

在 `package.json` 的 `scripts` 里追加（`test` 行保持不变）：

```json
    "test:e2e": "NODE_PATH=\"$(npm root -g)\" node --test test/e2e.test.js"
```

注意 `npm test` 用 `node --test test/` 会把 e2e 一起跑——为保持 `npm test` 零依赖，把 `test` 脚本改为显式列出单测文件：

```json
    "test": "node --test test/store.test.js test/polls.test.js test/server.test.js"
```

- [x] **Step 2: 跑 E2E 确认通过**

Run: `npm run test:e2e`
Expected: PASS —— 1 个测试绿（首跑较慢，浏览器启动）

- [x] **Step 3: 写 README.md**

```markdown
# 快速投票

开会/群里征集意见用的小工具：建投票 → 发链接 → 匿名投票 → 实时看结果。

## 运行

    node server.js          # http://localhost:3000，局域网用本机 IP 访问
    PORT=8080 node server.js

零依赖，不需要 npm install。数据存 `data/polls.json`。

## 使用

1. 打开首页建投票（问题 + 选项，可多选、可设截止时间）
2. 把**投票链接**发到群里；**管理链接**自己收好（可关闭投票，丢了找不回）
3. 大家点开即投（匿名，浏览器标记防重复），结果实时可看

## 测试

    npm test                # 单测 + 集成（零依赖）
    npm run test:e2e        # Playwright 浏览器冒烟（需全局安装 playwright）
```

- [x] **Step 4: 跑全部测试确认通过**

Run: `npm test && npm run test:e2e`
Expected: 全绿

- [x] **Step 5: 提交**

```bash
git add test/e2e.test.js package.json README.md
git commit -m "test: Playwright 端到端冒烟；docs: README"
```
