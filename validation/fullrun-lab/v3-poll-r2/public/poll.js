// 投票页交互：提交所选 option ID；成功(2xx)后置 localStorage 软限标记并跳结果页。
(function () {
  var p = window.__POLL__;
  if (!p || p.closed) return;
  var form = document.getElementById('voteForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ids = Array.prototype.slice.call(form.querySelectorAll('input[name=opt]:checked')).map(function (i) { return i.value; });
    fetch('/api/polls/' + p.pollId + '/vote', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionIds: ids })
    }).then(function (res) {
      if (res.ok) {
        localStorage.setItem('voted:' + location.origin + ':' + p.pollId, '1'); // 仅 2xx 后置标记（PC-13）
        location.assign('/r/' + p.pollId);
      } else {
        return res.json().then(function (b) { alert('投票失败：' + (b.error || res.status)); });
      }
    }).catch(function () { alert('网络错误'); });
  });
})();
