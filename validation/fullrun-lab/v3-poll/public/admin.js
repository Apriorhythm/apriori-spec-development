// 管理页胶水：公开结果 + 关闭按钮（需求定案：不展示更多信息）。
import { createPoller, percentages } from '/poll-core.js';

const POLL_ID = window.POLL_ID;
const ADMIN_KEY = window.ADMIN_KEY;
const titleEl = document.getElementById('title');
const statusEl = document.getElementById('status');
const resultsArea = document.getElementById('results-area');
const totalEl = document.getElementById('total');
const closeBtn = document.getElementById('close-btn');
const errorEl = document.getElementById('error');

function render(data) {
  titleEl.textContent = data.title;
  const closed = data.status === 'closed';
  statusEl.textContent = closed ? '投票已关闭' : '投票进行中';
  statusEl.className = 'status' + (closed ? ' closed' : '');
  closeBtn.disabled = closed;
  closeBtn.textContent = closed ? '已关闭' : '关闭投票';
  const pct = percentages(data.options);
  resultsArea.replaceChildren(
    ...data.options.map((o, i) => {
      const row = document.createElement('div');
      row.className = 'result-row';
      const label = document.createElement('div');
      label.className = 'result-label';
      const name = document.createElement('span');
      name.textContent = o.text;
      const count = document.createElement('span');
      count.textContent = `${o.votes} 票 (${pct[i]}%)`;
      label.append(name, count);
      const track = document.createElement('div');
      track.className = 'result-track';
      const fill = document.createElement('div');
      fill.className = 'result-fill';
      fill.style.width = pct[i] + '%';
      track.appendChild(fill);
      row.append(label, track);
      return row;
    })
  );
  totalEl.textContent = `共 ${data.total} 票`;
}

async function fetchResults() {
  const res = await fetch(`/api/polls/${POLL_ID}`);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
}

closeBtn.addEventListener('click', async () => {
  errorEl.hidden = true;
  const res = await fetch(`/api/polls/${POLL_ID}/close`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: ADMIN_KEY }),
  }).catch(() => null);
  if (res && res.ok) render(await res.json());
  else {
    errorEl.textContent = res ? (await res.json()).error : '网络错误，请重试';
    errorEl.hidden = false;
  }
});

createPoller({ fetchResults, onUpdate: render, setIntervalFn: (fn, ms) => window.setInterval(fn, ms) }).start();
