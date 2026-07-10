// 管理页：凭 key 关闭投票。
(function () {
  var a = window.__ADMIN__;
  var btn = document.getElementById('closeBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    fetch('/api/polls/' + a.pollId + '/close', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ adminKey: a.key })
    }).then(function (res) {
      if (res.ok) location.reload(); else res.json().then(function (b) { alert('关闭失败：' + (b.error || res.status)); });
    });
  });
})();
