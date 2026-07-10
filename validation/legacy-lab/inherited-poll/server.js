'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('./lib/store');
const { createPolls, PollError } = require('./lib/polls');
const voter = require('./lib/voter-identity');

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
        const parsed = raw ? JSON.parse(raw) : {};
        // 合法 JSON 但不是对象（null、数组、裸字符串/数字）一律按格式错误处理：
        // 下游代码假定 body 是普通对象（body.question / body.choices），放行会 500（RB-01）。
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return reject(new PollError(400, '请求格式不正确'));
        }
        resolve(parsed);
      } catch {
        reject(new PollError(400, '请求格式不正确'));
      }
    });
    req.on('error', reject);
  });
}

// storeIo 仅用于测试的故障注入直通（design.md §4）；生产调用不传第二个参数。
function createServer(dataDir, { storeIo } = {}) {
  const store = createStore(dataDir, storeIo);
  const polls = createPolls(store);
  // 构造期加载/生成签名密钥：文件损坏 → 这里直接抛错，服务不启动（VD-10）。
  const secret = voter.loadOrCreateSecret(dataDir);

  // 从请求头解析并校验投票者 cookie；合法返回 raw，否则 null。
  function verifiedRaw(req) {
    const cookies = voter.parseCookieHeader(req.headers.cookie);
    return voter.verify(cookies[voter.COOKIE_NAME], secret);
  }

  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const get = req.method === 'GET';
    const postReq = req.method === 'POST';
    let m;
    try {
      if (get && pathname === '/') return sendFile(res, 'index.html', 'text/html');
      if (get && pathname === '/style.css') return sendFile(res, 'style.css', 'text/css');
      if (get && /^\/poll\/[a-z0-9]+$/.test(pathname)) return sendFile(res, 'poll.html', 'text/html');
      if (get && /^\/admin\/[a-z0-9]+$/.test(pathname)) return sendFile(res, 'admin.html', 'text/html');

      if (postReq && pathname === '/api/polls') {
        const body = await readJsonBody(req);
        const poll = polls.create(body);
        return sendJson(res, 201, { id: poll.id, adminToken: poll.adminToken });
      }
      if (get && (m = pathname.match(/^\/api\/polls\/([a-z0-9]+)$/))) {
        // 标识签发只在这一个入口：无/非法 cookie → 签发新标识并 Set-Cookie；有效则不重复下发。
        let raw = verifiedRaw(req);
        let issued = null;
        if (raw === null) {
          issued = voter.issue(secret);
          raw = issued.raw;
        }
        // 先取视图：404 等失败会在这里抛出——失败响应不下发新 cookie（B1，EXEC-001 修复）。
        const body = polls.getView(m[1], voter.digest(raw, secret));
        if (issued) res.setHeader('Set-Cookie', voter.buildSetCookie(issued.value));
        return sendJson(res, 200, body);
      }
      if (postReq && (m = pathname.match(/^\/api\/polls\/([a-z0-9]+)\/vote$/))) {
        const raw = verifiedRaw(req);
        // 无有效标识：403 拒绝，不计票，也不下发新 cookie（不奖励非法请求，VD-04）。
        if (raw === null) return sendJson(res, 403, { error: '未获得投票标识' });
        const body = await readJsonBody(req);
        return sendJson(res, 200, polls.vote(m[1], body.choices, voter.digest(raw, secret)));
      }
      if (get && (m = pathname.match(/^\/api\/admin\/([a-z0-9]+)$/))) {
        return sendJson(res, 200, polls.adminView(m[1]));
      }
      if (postReq && (m = pathname.match(/^\/api\/admin\/([a-z0-9]+)\/close$/))) {
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
