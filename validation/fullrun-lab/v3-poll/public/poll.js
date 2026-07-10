// 投票页胶水：渲染结果条 + 投票入口；3 秒轮询；localStorage 已投锁定。
import { createPoller, votedState, markVoted, percentages } from '/poll-core.js';

const POLL_ID = window.POLL_ID;
const titleEl = document.getElementById('title');
const statusEl = document.getElementById('status');
const voteArea = document.getElementById('vote-area');
const resultsArea = document.getElementById('results-area');
const totalEl = document.getElementById('total');

let last = null;

function render(data) {
  last = data;
  titleEl.textContent = data.title;
  document.title = data.title + ' — 快速投票';
  const voted = votedState({ storage: localStorage, pollId: POLL_ID });
  const closed = data.status === 'closed';
  statusEl.textContent = closed ? '投票已关闭' : voted === 'voted' ? '你已投过票 — 结果实时更新中' : '选一项投票 — 结果实时更新中';
  statusEl.className = 'status' + (closed ? ' closed' : '');

  voteArea.hidden = closed || voted === 'voted';
  if (!voteArea.hidden) {
    voteArea.replaceChildren(
      ...data.options.map((o, i) => {
        const b = document.createElement('button');
        b.className = 'vote-btn';
        b.textContent = o.text;
        b.addEventListener('click', () => castVote(i));
        return b;
      })
    );
  }

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

async function castVote(optionIndex) {
  const res = await fetch(`/api/polls/${POLL_ID}/vote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ optionIndex }),
  }).catch(() => null);
  if (res && res.ok) {
    markVoted({ storage: localStorage, pollId: POLL_ID });
    render(await res.json());
  } else if (res && res.status === 409) {
    render(last ? { ...last, status: 'closed' } : last);
    fetchResults().then(render).catch(() => {});
  }
}

createPoller({ fetchResults, onUpdate: render, setIntervalFn: (fn, ms) => window.setInterval(fn, ms) }).start();
