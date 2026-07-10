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
      if (get && /^\/poll\/[a-z0-9]+$/.test(pathname)) return sendFile(res, 'poll.html', 'text/html');
      if (get && /^\/admin\/[a-z0-9]+$/.test(pathname)) return sendFile(res, 'admin.html', 'text/html');

      if (postReq && pathname === '/api/polls') {
        const body = await readJsonBody(req);
        const poll = polls.create(body);
        return sendJson(res, 201, { id: poll.id, adminToken: poll.adminToken });
      }
      if (get && (m = pathname.match(/^\/api\/polls\/([a-z0-9]+)$/))) {
        return sendJson(res, 200, polls.getView(m[1]));
      }
      if (postReq && (m = pathname.match(/^\/api\/polls\/([a-z0-9]+)\/vote$/))) {
        const body = await readJsonBody(req);
        return sendJson(res, 200, polls.vote(m[1], body.choices));
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
