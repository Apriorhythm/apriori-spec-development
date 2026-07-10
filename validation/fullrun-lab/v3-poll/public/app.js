// 创建页胶水：收集表单 -> POST /api/polls -> 展示双链接。
const form = document.getElementById('create-form');
const optionsBox = document.getElementById('options');
const errorEl = document.getElementById('error');

document.getElementById('add-option').addEventListener('click', () => {
  if (optionsBox.children.length >= 20) return;
  const row = document.createElement('div');
  row.className = 'option-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 80;
  input.placeholder = `选项 ${optionsBox.children.length + 1}`;
  row.appendChild(input);
  optionsBox.appendChild(row);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  const title = document.getElementById('title').value;
  const options = [...optionsBox.querySelectorAll('input')].map((i) => i.value);
  const res = await fetch('/api/polls', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, options }),
  }).catch(() => null);
  if (!res || !res.ok) {
    errorEl.textContent = res ? (await res.json()).error : '网络错误，请重试';
    errorEl.hidden = false;
    return;
  }
  const data = await res.json();
  const voteA = document.getElementById('vote-link');
  const adminA = document.getElementById('admin-link');
  voteA.href = voteA.textContent = data.voteUrl;
  adminA.href = adminA.textContent = data.adminUrl;
  document.getElementById('result').hidden = false;
  form.hidden = true;
});
