// 创建页：收集标题/选项/模式/截止 → POST；成功后展示两条链接。
(function () {
  var form = document.getElementById('createForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = form.querySelector('input[name=title]').value;
    var options = Array.prototype.slice.call(form.querySelectorAll('input[name=option]'))
      .map(function (i) { return i.value; }).filter(function (v) { return v.trim().length; });
    var mode = form.querySelector('input[name=mode]:checked').value;
    var dl = form.querySelector('input[name=deadline]').value;
    var body = { title: title, options: options, mode: mode };
    if (dl) body.deadline = new Date(dl).toISOString();
    fetch('/api/polls', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().then(function (b) { return { ok: res.ok, b: b }; }); })
      .then(function (r) {
        var out = document.getElementById('out');
        if (!r.ok) { out.textContent = '创建失败：' + (r.b.error || ''); return; }
        out.innerHTML = '';
        var a1 = document.createElement('p'); a1.id='voteUrl'; a1.textContent = r.b.voteUrl;
        var a2 = document.createElement('p'); a2.id='adminUrl'; a2.textContent = r.b.adminUrl;
        var lbl=document.createElement('p'); lbl.textContent='投票链接与管理链接（自己保管）：';
        out.appendChild(lbl); out.appendChild(a1); out.appendChild(a2);
      });
  });
})();
