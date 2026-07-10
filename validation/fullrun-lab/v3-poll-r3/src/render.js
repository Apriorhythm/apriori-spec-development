// Server-side rendering. All user text is HTML-escaped (SEC-02);
// the client script updates the DOM with textContent only (SEC-02 dynamic path).
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// safe embed of JSON into a <script type="application/json"> block
function jsonBlock(id, obj) {
  const json = JSON.stringify(obj).replace(/</g, '\\u003c');
  return `<script id="${id}" type="application/json">${json}</script>`;
}

function layout(title, bodyHtml) {
  return `<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
 body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem}
 .bar{background:#e5e7eb;border-radius:6px;overflow:hidden;height:22px;margin:2px 0}
 .bar > span{display:block;height:100%;background:#3b82f6}
 .opt{margin:.6rem 0}
 button{padding:.5rem 1rem;font-size:1rem;cursor:pointer}
 .muted{color:#666}
</style></head><body>${bodyHtml}</body></html>`;
}

function resultsHtml(pub) {
  return pub.options.map((o) => `
    <div class="opt">
      <div>${escapeHtml(o.text)} — <b>${o.votes}</b> 票 (${o.percent}%)</div>
      <div class="bar"><span style="width:${o.percent}%"></span></div>
    </div>`).join('');
}

export function renderCreatePage() {
  return layout('创建投票', `
   <h1>创建快速投票</h1>
   <form id="create-form">
     <p><input id="title" placeholder="投票标题" size="40" maxlength="100"></p>
     <div id="options">
       <p><input class="opt-in" placeholder="选项 1" maxlength="50"></p>
       <p><input class="opt-in" placeholder="选项 2" maxlength="50"></p>
     </div>
     <p><button type="button" id="add-opt">+ 添加选项</button></p>
     <p><label><input type="checkbox" id="multi"> 允许多选</label></p>
     <p><label>截止时间(可选) <input type="datetime-local" id="deadline"></label></p>
     <p><button type="submit">生成投票链接 🚀</button></p>
   </form>
   <div id="links" hidden></div>
   <script>
   const form=document.getElementById('create-form');
   document.getElementById('add-opt').onclick=()=>{
     const box=document.getElementById('options');
     if(box.querySelectorAll('.opt-in').length>=10) return;
     const p=document.createElement('p');const i=document.createElement('input');
     i.className='opt-in';i.maxLength=50;i.placeholder='选项';p.appendChild(i);box.appendChild(p);
   };
   form.onsubmit=async(e)=>{
     e.preventDefault();
     const options=[...document.querySelectorAll('.opt-in')].map(i=>i.value).filter(v=>v.trim());
     const body={title:document.getElementById('title').value,options,
       mode:document.getElementById('multi').checked?'multi':'single'};
     const dl=document.getElementById('deadline').value;
     if(dl) body.deadline=new Date(dl).toISOString();
     const res=await fetch('/api/polls',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
     const j=await res.json();
     const box=document.getElementById('links');box.hidden=false;box.textContent='';
     if(!res.ok){box.textContent='创建失败: '+(j&&j.error);return;}
     const a1=document.createElement('p');a1.textContent='分享链接(发给大家投票): '+location.origin+j.shareUrl;
     const a2=document.createElement('p');a2.textContent='管理链接(自己收好,用来关闭): '+location.origin+j.adminUrl;
     box.appendChild(a1);box.appendChild(a2);
   };
   </script>`);
}

// share/vote page. pub = toPublic(poll). If closed -> results only, no vote form.
export function renderSharePage(pub) {
  if (pub.closed) {
    return layout(pub.title, `
     <h1>${escapeHtml(pub.title)}</h1>
     <p class="muted">该投票已关闭 (closed)</p>
     <div id="results">${resultsHtml(pub)}</div>
     <p class="muted">共 ${pub.totalVoters} 人投票</p>`);
  }
  const modeLabel = pub.mode === 'multi' ? '(多选)' : '(单选)';
  const inputs = pub.options.map((o) => `
     <div class="opt"><label>
       <input type="${pub.mode === 'multi' ? 'checkbox' : 'radio'}" name="optionIds" value="${escapeHtml(o.id)}">
       ${escapeHtml(o.text)}
     </label></div>`).join('');
  return layout(pub.title, `
   <h1>${escapeHtml(pub.title)} <span class="muted">${modeLabel}</span></h1>
   ${jsonBlock('poll-data', pub)}
   <form id="vote-form">
     ${inputs}
     <p><button type="submit">投票</button></p>
   </form>
   <div id="results" hidden></div>
   <p id="voter-count" class="muted"></p>
   <script>
   const pid=${JSON.stringify(pub.id)};
   const form=document.getElementById('vote-form');
   const results=document.getElementById('results');
   const vc=document.getElementById('voter-count');
   function renderResults(p){
     results.textContent='';
     for(const o of p.options){
       const wrap=document.createElement('div');wrap.className='opt';
       const line=document.createElement('div');
       // SEC-02: option text via textContent only, never innerHTML
       line.textContent=o.text+' — '+o.votes+' 票 ('+o.percent+'%)';
       const bar=document.createElement('div');bar.className='bar';
       const span=document.createElement('span');span.style.width=o.percent+'%';
       bar.appendChild(span);wrap.appendChild(line);wrap.appendChild(bar);results.appendChild(wrap);
     }
     vc.textContent='共 '+p.totalVoters+' 人投票';
     form.hidden=true;results.hidden=false;
   }
   // soft block: already voted on this browser -> show results, hide form
   if(localStorage.getItem('voted:'+pid)){
     const p=JSON.parse(document.getElementById('poll-data').textContent);
     renderResults(p);
   }
   form.onsubmit=async(e)=>{
     e.preventDefault();
     const optionIds=[...form.querySelectorAll('input[name=optionIds]:checked')].map(i=>i.value);
     const res=await fetch('/api/polls/'+pid+'/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({optionIds})});
     const j=await res.json();
     if(res.ok){ localStorage.setItem('voted:'+pid,'1'); renderResults(j); }
     else { vc.textContent='投票失败: '+(j&&j.error); } // VT-09: no voted flag on failure
   };
   </script>`);
}

export function renderAdminPage(pub, token) {
  return layout('管理 · ' + pub.title, `
   <h1>管理:${escapeHtml(pub.title)}</h1>
   <p class="muted">状态: ${pub.closed ? '已关闭' : '进行中'} · 共 ${pub.totalVoters} 人投票</p>
   <div id="results">${resultsHtml(pub)}</div>
   ${pub.closed ? '' : `<p><button id="close-btn">关闭投票</button></p>`}
   <p id="msg" class="muted"></p>
   <script>
   const pid=${JSON.stringify(pub.id)};
   const token=${JSON.stringify(token)};
   const btn=document.getElementById('close-btn');
   if(btn){btn.onclick=async()=>{
     const res=await fetch('/api/polls/'+pid+'/close',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':token},body:JSON.stringify({adminToken:token})});
     document.getElementById('msg').textContent=res.ok?'已关闭,刷新查看结果':'关闭失败';
     if(res.ok) location.reload();
   };}
   </script>`);
}
