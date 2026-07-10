'use strict';
// 服务端渲染页面（PC-05/06/09/15）。所有用户文本经 htmlEscape；内联 JSON 经 jsonForScript。
const { htmlEscape, jsonForScript } = require('./escape');

const POLL_INTERVAL_MS = 3000;

function layout(title, body) {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${htmlEscape(title)}</title></head><body>${body}</body></html>`;
}

function closedBanner(poll) {
  const reason = poll.deadlineMs && Date.now() >= poll.deadlineMs ? '已到截止时间' : '发起人已关闭';
  return `<p class="closed" role="status">投票已关闭（${htmlEscape(reason)}）。你仍可查看结果。</p>`;
}

// 创建页
function createPage() {
  return layout('创建投票', `
<h1>创建快速投票</h1>
<form id="createForm">
  <label>标题 <input name="title" maxlength="200" required></label>
  <fieldset><legend>选项（2..20）</legend>
    <input name="option" placeholder="选项 1"><input name="option" placeholder="选项 2">
    <input name="option" placeholder="选项 3"><input name="option" placeholder="选项 4">
  </fieldset>
  <label><input type="radio" name="mode" value="single" checked>单选</label>
  <label><input type="radio" name="mode" value="multiple">多选</label>
  <label>截止时间（可选）<input type="datetime-local" name="deadline"></label>
  <button type="submit">创建</button>
</form>
<div id="out"></div>
<script src="/public/create.js"></script>`);
}

// 投票页（PC-05 软限脚本 / PC-09 关闭态 / PC-15 转义）
function votePage(poll) {
  const isClosed = poll.status === 'closed' || (poll.deadlineMs && Date.now() >= poll.deadlineMs);
  const inputType = poll.mode === 'single' ? 'radio' : 'checkbox';
  const opts = poll.options.map((o) =>
    `<label><input type="${inputType}" name="opt" value="${htmlEscape(o.id)}"> ${htmlEscape(o.text)}</label>`).join('');
  const voteControls = isClosed ? '' :
    `<form id="voteForm"><fieldset>${opts}</fieldset><button type="submit">投票</button></form>`;
  const banner = isClosed ? closedBanner(poll) : '';
  const bootstrap = `<script>window.__POLL__=${jsonForScript({ pollId: poll.pollId, mode: poll.mode, closed: isClosed })};</script>`;
  // PC-05 软限：同浏览器已投过 → 直接跳结果视图。key 作用域 origin+pollId。
  const softLimit = `<script>
(function(){var p=window.__POLL__;var k='voted:'+location.origin+':'+p.pollId;
if(localStorage.getItem(k)){location.replace('/r/'+p.pollId);}})();
</script>`;
  return layout(poll.title, `
<h1>${htmlEscape(poll.title)}</h1>
${banner}
${voteControls}
<p><a href="/r/${htmlEscape(poll.pollId)}">查看结果</a></p>
${bootstrap}${softLimit}
<script src="/public/poll.js"></script>`);
}

// 结果页（PC-06 轮询 / PC-15）
function resultPage(poll) {
  const rows = poll.options.map((o) =>
    `<li data-id="${htmlEscape(o.id)}"><span class="t"></span> <b class="c">${o.count}</b></li>`).join('');
  const closed = poll.status === 'closed' || (poll.deadlineMs && Date.now() >= poll.deadlineMs);
  const banner = closed ? closedBanner(poll) : '';
  const bootstrap = `<script>window.__RESULT__=${jsonForScript({ pollId: poll.pollId, intervalMs: POLL_INTERVAL_MS })};</script>`;
  const poller = `<script>
(function(){var r=window.__RESULT__;
function esc(s){return s;}
function render(d){document.getElementById('title').textContent=d.title;
document.getElementById('total').textContent=d.total;
var byId={};d.options.forEach(function(o){byId[o.id]=o;});
document.querySelectorAll('#list li').forEach(function(li){var o=byId[li.getAttribute('data-id')];
if(o){li.querySelector('.t').textContent=o.text;li.querySelector('.c').textContent=o.count;}});}
function pull(){fetch('/api/polls/'+r.pollId+'/results').then(function(x){return x.json();}).then(render);}
pull();setInterval(pull, ${POLL_INTERVAL_MS});})();
</script>`;
  return layout(poll.title, `
<h1 id="title">${htmlEscape(poll.title)}</h1>
${banner}
<p>总票数：<b id="total">${poll.total != null ? poll.total : ''}</b></p>
<ul id="list">${rows}</ul>
${bootstrap}${poller}`);
}

// 管理页
function adminPage(poll, key) {
  const closed = poll.status === 'closed' || (poll.deadlineMs && Date.now() >= poll.deadlineMs);
  return layout('管理 · ' + poll.title, `
<h1>管理：${htmlEscape(poll.title)}</h1>
<p><a href="/r/${htmlEscape(poll.pollId)}">结果</a> · 投票链接 <code>/p/${htmlEscape(poll.pollId)}</code></p>
${closed ? closedBanner(poll) : `<button id="closeBtn">关闭投票</button>`}
<script>window.__ADMIN__=${jsonForScript({ pollId: poll.pollId, key })};</script>
<script src="/public/admin.js"></script>`);
}

module.exports = { POLL_INTERVAL_MS, layout, createPage, votePage, resultPage, adminPage };
