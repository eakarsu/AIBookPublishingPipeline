const { createClient, escapeHtml, normalizeList } = window.PublishingApi;
const apiBase = window.localStorage.getItem('publishing.api') || 'http://localhost:4000/api';
let token = window.sessionStorage.getItem('publishing.token') || '';
const request = createClient({ baseUrl: apiBase, getToken: () => token });
const byId = (id) => document.getElementById(id);
const demoCredentialsButton=document.createElement('button');demoCredentialsButton.type='button';demoCredentialsButton.textContent='Auto Fill Demo Credentials';demoCredentialsButton.setAttribute('aria-label','Auto Fill Demo Credentials');demoCredentialsButton.addEventListener('click',async()=>{try{const credentials=await request('/auth/demo-credentials');byId('login-form').elements.email.value=credentials.email;byId('login-form').elements.password.value=credentials.password;}catch(error){setStatus(error.message,'error');}});byId('login-form').insertBefore(demoCredentialsButton,byId('login-form').querySelector('button'));
function setStatus(message, kind=''){ byId('status').textContent=message; byId('status').className=`status ${kind}`; }
function list(payload){ return normalizeList(payload); }
function table(rows, columns){ if(!rows.length)return '<p class="empty">No records returned.</p>'; return `<table><thead><tr>${columns.map(([,l])=>`<th>${escapeHtml(l)}</th>`).join('')}</tr></thead><tbody>${rows.map((r)=>`<tr>${columns.map(([k])=>`<td>${escapeHtml(r[k]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
function showAuthenticated(value){ byId('login-panel').hidden=value; byId('workspace').hidden=!value; byId('logout').hidden=!value; }

async function refresh(){
  setStatus('Loading publishing records…','loading'); byId('refresh').disabled=true;
  try{
    const [manuscripts,production,tasks,royalties]=await Promise.all(['/manuscripts?limit=20','/production?limit=10','/tasks?limit=8','/royalties?limit=10'].map(request));
    const ms=list(manuscripts), ps=list(production), ts=list(tasks), rs=list(royalties);
    const published=ms.filter((m)=>String(m.status).toLowerCase()==='published').length;
    byId('metrics').innerHTML=[['Manuscripts',ms.length],['Published',published],['Production jobs',ps.length],['Royalty records',rs.length]].map(([l,v])=>`<article><span>${escapeHtml(l)}</span><strong>${v}</strong></article>`).join('');
    byId('manuscripts').innerHTML=table(ms,[['title','Title'],['author','Author'],['genre','Genre'],['word_count','Words'],['status','Stage'],['overall_score','Score']]);
    byId('production').innerHTML=table(ps,[['book_title','Book'],['format','Format'],['print_run','Run'],['printer','Printer'],['status','Status']]);
    byId('royalties').innerHTML=table(rs,[['book_title','Book'],['channel','Channel'],['units_sold','Units'],['royalty_amount','Royalty'],['payment_status','Payment']]);
    byId('tasks').innerHTML=ts.length?ts.map((t)=>`<div class="task"><strong>${escapeHtml(t.task_title)}</strong><span>${escapeHtml(t.book_title||'Portfolio')} · ${escapeHtml(t.priority||'Normal')}</span><p>${escapeHtml(t.status||'To do')} · due ${escapeHtml(t.due_date||'unscheduled')}</p></div>`).join(''):'<p class="empty">No production tasks.</p>';
    byId('updated').textContent=`Updated ${new Date().toLocaleString()}`; setStatus('Publishing pipeline loaded.','success');
  }catch(error){setStatus(error.message,'error');if(/token|access denied|unauthorized|401/i.test(error.message))logout();}finally{byId('refresh').disabled=false;}
}
async function login(event){event.preventDefault();const data=new FormData(event.currentTarget);setStatus('Signing in…','loading');try{const result=await request('/auth/login',{method:'POST',body:JSON.stringify({email:data.get('email'),password:data.get('password')})});token=result.token;sessionStorage.setItem('publishing.token',token);showAuthenticated(true);await refresh();}catch(error){setStatus(error.message,'error');}}
async function addManuscript(event){event.preventDefault();const data=new FormData(event.currentTarget);setStatus('Adding manuscript…','loading');try{await request('/manuscripts',{method:'POST',body:JSON.stringify({title:data.get('title'),author:data.get('author'),genre:data.get('genre'),word_count:Number(data.get('word_count')),status:'draft'})});event.currentTarget.reset();await refresh();setStatus('Manuscript added to the draft pipeline.','success');}catch(error){setStatus(error.message,'error');}}
function logout(){token='';sessionStorage.removeItem('publishing.token');showAuthenticated(false);setStatus('Signed out.');}
byId('login-form').addEventListener('submit',login);byId('manuscript-form').addEventListener('submit',addManuscript);byId('refresh').addEventListener('click',refresh);byId('logout').addEventListener('click',logout);showAuthenticated(Boolean(token));if(token)refresh();
