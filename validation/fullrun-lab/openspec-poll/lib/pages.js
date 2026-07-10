// 服务端渲染页面：布局 + HTML 转义 + 5 个页面。无框架、无构建，JS 仅作复制按钮增强。
export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const CSS = `
:root { --fg:#1a1a2e; --muted:#6b7280; --bg:#f7f7fb; --card:#fff; --accent:#4f46e5; --accent2:#eef2ff; --danger:#b91c1c; --ok:#047857; --line:#e5e7eb; }
* { box-sizing:border-box; }
body { margin:0; font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif; background:var(--bg); color:var(--fg); line-height:1.6; }
main { max-width:520px; margin:0 auto; padding:24px 16px 48px; }
h1 { font-size:1.35rem; margin:.5rem 0 1rem; overflow-wrap:anywhere; }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:20px; margin-bottom:16px; }
label { display:block; font-weight:600; margin:14px 0 4px; }
input[type=text], input[type=datetime-local], input[type=number] { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:8px; font-size:1rem; }
.opt-row { margin-bottom:8px; }
button, .btn { display:inline-block; background:var(--accent); color:#fff; border:0; border-radius:8px; padding:12px 20px; font-size:1rem; cursor:pointer; text-decoration:none; }
button.secondary { background:var(--accent2); color:var(--accent); }
.choice { display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--line); border-radius:8px; margin-bottom:8px; cursor:pointer; overflow-wrap:anywhere; }
.choice:has(:checked) { border-color:var(--accent); background:var(--accent2); }
.bar-track { background:var(--accent2); border-radius:6px; height:10px; overflow:hidden; margin-top:4px; }
.bar { background:var(--accent); height:100%; }
.row-head { display:flex; justify-content:space-between; gap:8px; overflow-wrap:anywhere; }
.muted { color:var(--muted); font-size:.9rem; }
.status { display:inline-block; padding:2px 10px; border-radius:999px; font-size:.85rem; }
.status.open { background:#ecfdf5; color:var(--ok); }
.status.closed { background:#fef2f2; color:var(--danger); }
.linkbox { display:flex; gap:8px; margin:6px 0 14px; }
.linkbox input { flex:1; font-size:.9rem; color:var(--muted); }
.error { background:#fef2f2; color:var(--danger); border:1px solid #fecaca; border-radius:8px; padding:10px 14px; margin-bottom:14px; }
.notice { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:.95rem; }
footer { text-align:center; margin-top:24px; }
footer a { color:var(--muted); font-size:.85rem; }
`;

const COPY_JS = `
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const input = document.getElementById(btn.dataset.copy);
    try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand('copy'); }
    const old = btn.textContent; btn.textContent = '已复制'; setTimeout(() => btn.textContent = old, 1200);
  });
});
`;

export function layout(title, body, { withCopyJs = false } = {}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
${body}
<footer><a href="/">⚡ 快速投票</a></footer>
</main>
${withCopyJs ? `<script>${COPY_JS}</script>` : ''}
</body>
</html>`;
}

const errorBlock = (error) => (error ? `<div class="error">${escapeHtml(error)}</div>` : '');
const statusBadge = (open) =>
  open ? '<span class="status open">进行中</span>' : '<span class="status closed">已结束</span>';

/** 首页：创建表单。 */
export function createFormPage({ error = null, values = {} } = {}) {
  const optionValues = values.options?.length ? values.options : ['', ''];
  const optionInputs = Array.from({ length: Math.max(optionValues.length, 2) }, (_, i) =>
    `<div class="opt-row"><input type="text" name="option" maxlength="100" placeholder="选项 ${i + 1}" value="${escapeHtml(optionValues[i] ?? '')}"></div>`
  ).join('\n');

  return layout('创建投票', `
<h1>⚡ 创建一个快速投票</h1>
${errorBlock(error)}
<form class="card" method="post" action="/create">
  <label for="title">投票标题</label>
  <input type="text" id="title" name="title" maxlength="200" required placeholder="例如：周五团建去哪" value="${escapeHtml(values.title ?? '')}">

  <label>选项（至少 2 个，留空的行忽略）</label>
  ${optionInputs}
  <div class="opt-row"><input type="text" name="option" maxlength="100" placeholder="选项（可留空）"></div>
  <div class="opt-row"><input type="text" name="option" maxlength="100" placeholder="选项（可留空）"></div>
  <div class="opt-row"><input type="text" name="option" maxlength="100" placeholder="选项（可留空）"></div>

  <label><input type="checkbox" name="multi" value="1" ${values.multi ? 'checked' : ''}> 允许多选</label>
  <label for="maxChoices">多选上限（可选，仅多选时生效）</label>
  <input type="number" id="maxChoices" name="maxChoices" min="2" placeholder="不填 = 不限" value="${escapeHtml(values.maxChoices ?? '')}">

  <label for="deadline">截止时间（可选）</label>
  <input type="datetime-local" id="deadline" name="deadline" value="${escapeHtml(values.deadline ?? '')}">

  <p><button type="submit">创建投票</button></p>
</form>`);
}

/** 创建成功页：双链接，一次性展示。 */
export function createdPage(poll, adminKey, origin) {
  const voteUrl = `${origin}/p/${poll.id}`;
  const adminUrl = `${origin}/p/${poll.id}/admin/${adminKey}`;
  return layout('投票已创建', `
<h1>投票已创建 🎉</h1>
<div class="card">
  <p><strong>${escapeHtml(poll.title)}</strong></p>
  <label>参与链接（发到群里）</label>
  <div class="linkbox"><input type="text" id="vote-url" readonly value="${escapeHtml(voteUrl)}"><button class="secondary" data-copy="vote-url" type="button">复制</button></div>
  <label>管理链接（只给你自己）</label>
  <div class="linkbox"><input type="text" id="admin-url" readonly value="${escapeHtml(adminUrl)}"><button class="secondary" data-copy="admin-url" type="button">复制</button></div>
  <div class="notice">⚠️ 管理链接仅此一次展示，请立即保存。用它可以关闭投票。</div>
  <p><a class="btn" href="/p/${poll.id}">前往投票页</a></p>
</div>`, { withCopyJs: true });
}

/** 投票页。 */
export function votePage(poll, { error = null } = {}) {
  const type = poll.multi ? 'checkbox' : 'radio';
  const hint = poll.multi
    ? (poll.maxChoices != null ? `多选，最多选 ${poll.maxChoices} 项` : '多选，不限项数')
    : '单选';
  const deadlineNote = poll.deadline
    ? `<p class="muted">截止：${escapeHtml(new Date(poll.deadline).toLocaleString('zh-CN', { hour12: false }))}</p>`
    : '';
  const choices = poll.options.map((label, i) =>
    `<label class="choice"><input type="${type}" name="choice" value="${i}"> ${escapeHtml(label)}</label>`
  ).join('\n');

  return layout(poll.title, `
<h1>${escapeHtml(poll.title)}</h1>
<p class="muted">${hint} · 匿名投票</p>
${deadlineNote}
${errorBlock(error)}
<form class="card" method="post" action="/p/${poll.id}/vote">
  ${choices}
  <p><button type="submit">投票</button> <a href="/p/${poll.id}/results" class="muted">先看结果 →</a></p>
</form>`);
}

/** 结果页。 */
export function resultsPage(view, pollId) {
  const rows = view.rows.map((r) => `
<div style="margin-bottom:14px">
  <div class="row-head"><span>${escapeHtml(r.label)}</span><span class="muted">${r.count} 票 · ${r.pct}%</span></div>
  <div class="bar-track"><div class="bar" style="width:${r.pct}%"></div></div>
</div>`).join('\n');
  const multiNote = view.multi
    ? '<p class="muted">多选投票：占比 = 选了该项的人数比例，合计可能超过 100%。</p>'
    : '';

  return layout(`结果 · ${view.title}`, `
<h1>${escapeHtml(view.title)}</h1>
<p>${statusBadge(view.open)} <span class="muted">共 ${view.total} 人参与</span></p>
<div class="card">
${rows}
</div>
${multiNote}
<p>${view.open ? `<a class="btn secondary btn" href="/p/${pollId}">去投票</a> ` : ''}<button class="secondary" onclick="location.reload()">刷新结果</button></p>`);
}

/** 管理页。 */
export function adminPage(poll, adminKey, open) {
  const closeForm = open
    ? `<form method="post" action="/p/${poll.id}/admin/${adminKey}/close" onsubmit="return confirm('确认关闭？关闭后不可重新打开。')">
  <button type="submit" style="background:var(--danger)">关闭投票</button>
</form>`
    : '<p class="notice">该投票已关闭（或已过截止时间），只能查看结果。</p>';

  return layout(`管理 · ${poll.title}`, `
<h1>${escapeHtml(poll.title)}</h1>
<p>${statusBadge(open)} <span class="muted">共 ${poll.totalVoters} 人参与</span></p>
<div class="card">
  <p class="muted">这是发起人管理页。</p>
  ${closeForm}
  <p style="margin-top:14px"><a href="/p/${poll.id}/results">查看结果 →</a></p>
</div>`);
}

/** 404 页。 */
export function notFoundPage() {
  return layout('投票不存在', `
<h1>投票不存在</h1>
<div class="card"><p>链接可能有误，或该投票不存在。</p><p><a class="btn" href="/">创建一个新投票</a></p></div>`);
}

/** 投票已结束提示页（尝试投票时）。 */
export function closedPage(pollId) {
  return layout('投票已结束', `
<h1>投票已结束</h1>
<div class="card"><p>该投票已停止接受新提交。</p><p><a class="btn" href="/p/${pollId}/results">查看结果</a></p></div>`);
}
