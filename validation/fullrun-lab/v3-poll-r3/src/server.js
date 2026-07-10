// HTTP layer: routing, body limits, content-type enforcement, error mapping.
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { ApiError } from './errors.js';
import { validateCreate, validateVote } from './validate.js';
import { newPoll, applyVote, closePoll, toPublic, isExpired } from './model.js';

const BODY_LIMIT = 16 * 1024; // 16 KiB

function sendJson(res, status, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(s);
}
function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
function sendError(res, err) {
  if (err instanceof ApiError) return sendJson(res, err.status, { error: err.code, message: err.message });
  console.error('[server] unexpected error:', err);
  return sendJson(res, 500, { error: 'INTERNAL', message: 'internal error' });
}

// Read a JSON body, enforcing content-type and the 16 KiB cap. Empty body -> {}.
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const ct = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (ct !== 'application/json') return reject(new ApiError('UNSUPPORTED_MEDIA_TYPE'));
    let size = 0;
    const chunks = [];
    let aborted = false;
    req.on('data', (c) => {
      if (aborted) return;
      size += c.length;
      if (size > BODY_LIMIT) {
        aborted = true;
        req.pause();
        req.removeAllListeners('data');
        req.resume(); // drain remaining bytes so the socket can carry our 413 response
        reject(new ApiError('PAYLOAD_TOO_LARGE'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.trim() === '') return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new ApiError('INVALID_JSON')); }
    });
    req.on('error', reject);
  });
}

// Constant-time token comparison (GAP-3): always run timingSafeEqual against a
// fixed-length buffer so a length/type mismatch does not short-circuit earlier
// than a value mismatch.
function safeTokenEqual(candidate, actual) {
  if (typeof actual !== 'string') return false;
  const b = Buffer.from(actual, 'utf8');
  const a = Buffer.from(typeof candidate === 'string' ? candidate : '', 'utf8');
  const padded = Buffer.alloc(b.length);
  a.copy(padded); // truncate or zero-pad to b.length
  const eq = timingSafeEqual(padded, b);
  return eq && a.length === b.length;
}

export function createApp(store) {
  // load a poll, lazily persisting closed status if the deadline has passed.
  async function loadEffective(id, now = Date.now()) {
    const poll = await store.load(id);
    if (!poll) return null;
    if (poll.status === 'open' && isExpired(poll, now)) {
      // serialize the lazy-close write through the per-poll queue (SPEC-4)
      await store.mutate(id, (p) => {
        if (p.status === 'open' && isExpired(p, now)) { p.status = 'closed'; return { changed: true }; }
        return { changed: false };
      }).catch(() => {});
      return await store.load(id);
    }
    return poll;
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      const parts = path.split('/').filter(Boolean);
      const { renderCreatePage, renderSharePage, renderAdminPage } = await import('./render.js');

      // GET /
      if (req.method === 'GET' && path === '/') {
        return sendHtml(res, 200, renderCreatePage());
      }

      // POST /api/polls
      if (req.method === 'POST' && path === '/api/polls') {
        const body = await readJsonBody(req);
        const fields = validateCreate(body);
        const poll = newPoll(fields);
        await store.create(poll);
        return sendJson(res, 201, {
          shareUrl: `/poll/${poll.id}`,
          adminUrl: `/admin/${poll.id}?token=${poll.adminToken}`,
        });
      }

      // /api/polls/:id ...
      if (parts[0] === 'api' && parts[1] === 'polls' && parts[2]) {
        const id = decodeURIComponent(parts[2]);
        // GET /api/polls/:id  (public result)
        if (req.method === 'GET' && parts.length === 3) {
          const poll = await loadEffective(id);
          if (!poll) throw new ApiError('POLL_NOT_FOUND');
          return sendJson(res, 200, toPublic(poll));
        }
        // POST /api/polls/:id/vote
        if (req.method === 'POST' && parts[3] === 'vote' && parts.length === 4) {
          const body = await readJsonBody(req);
          const { optionIds } = validateVote(body);
          const poll = await store.mutate(id, (p) => {
            const now = Date.now();
            // first post-expiry access is a vote: persist the lazy-close, then reject (GAP-4)
            if (p.status === 'open' && isExpired(p, now)) {
              p.status = 'closed';
              return { changed: true, error: new ApiError('POLL_CLOSED') };
            }
            applyVote(p, optionIds, now); // throws POLL_CLOSED / SINGLE_CHOICE_VIOLATION / OPTION_NOT_FOUND
            return { changed: true };
          });
          return sendJson(res, 200, toPublic(poll));
        }
        // POST /api/polls/:id/close
        if (req.method === 'POST' && parts[3] === 'close' && parts.length === 4) {
          const body = await readJsonBody(req);
          // body wins when the field is PRESENT (GAP-2) — decided by presence, not truthiness,
          // so an empty body token does not silently fall back to the header.
          const token = Object.prototype.hasOwnProperty.call(body, 'adminToken')
            ? body.adminToken
            : req.headers['x-admin-token'];
          const poll = await store.mutate(id, (p) => {
            if (!safeTokenEqual(token, p.adminToken)) throw new ApiError('INVALID_ADMIN_TOKEN');
            const wasOpen = p.status === 'open';
            closePoll(p); // idempotent
            return { changed: wasOpen };
          });
          return sendJson(res, 200, { status: poll.status });
        }
      }

      // GET /poll/:id  (share page, SSR)
      if (req.method === 'GET' && parts[0] === 'poll' && parts[1] && parts.length === 2) {
        const poll = await loadEffective(decodeURIComponent(parts[1]));
        if (!poll) return sendHtml(res, 404, '<h1>投票不存在</h1>');
        return sendHtml(res, 200, renderSharePage(toPublic(poll)));
      }

      // GET /admin/:id?token=
      if (req.method === 'GET' && parts[0] === 'admin' && parts[1] && parts.length === 2) {
        const id = decodeURIComponent(parts[1]);
        const poll = await loadEffective(id);
        if (!poll) return sendHtml(res, 404, '<h1>投票不存在</h1>');
        const token = url.searchParams.get('token') || '';
        if (!safeTokenEqual(token, poll.adminToken)) {
          return sendHtml(res, 403, '<h1>无效的管理链接</h1>');
        }
        return sendHtml(res, 200, renderAdminPage(toPublic(poll), token));
      }

      return sendJson(res, 404, { error: 'NOT_FOUND', message: 'no such route' });
    } catch (err) {
      return sendError(res, err);
    }
  });
}
