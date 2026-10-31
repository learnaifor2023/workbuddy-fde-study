'use strict';
const $=id=>document.getElementById(id);
const KEY='workbuddy-fde-cid-v1';
const UPGRADE_KEY=KEY+'-before-upgrade-20261031', HISTORY_KEY=KEY+'-history-v2';
let history=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
let DATA,byId,state,cursor=0,wrongOnly=false,saveOK=true;
const initial=()=>({version:DATA.version,answers:{},revealed:[],wrong:[],mode:'practice',submitted:false,deadline:null,ids:DATA.questions.map(q=>q.id),position:0,optionOrders:{},form:''});
function valid(s){
 if(!s||s.version!==DATA.version||!['practice','exam'].includes(s.mode)||typeof s.answers!=='object'||!s.answers||Array.isArray(s.answers)||typeof s.submitted!=='boolean'||!Number.isInteger(s.position)||s.position<0||s.position>=DATA.questions.length)return false;
 const ids=a=>Array.isArray(a)&&a.every(x=>Number.isInteger(x)&&byId.has(x))&&new Set(a).size===a.length;
 if(!ids(s.ids)||!s.ids.length||!ids(s.wrong)||!ids(s.revealed))return false;
 if(!Object.entries(s.answers).every(([id,a])=>byId.has(Number(id))&&Array.isArray(a)&&a.every(x=>Number.isInteger(x)&&x>=0&&x<4)&&new Set(a).size===a.length&&(byId.get(Number(id)).type==='多选'||a.length<=1)))return false;
 if(s.mode==='exam'&&(!Number.isFinite(s.deadline)||s.ids.length!==60||s.ids.filter(id=>byId.get(id).type==='单选').length!==40||s.ids.filter(id=>byId.get(id).type==='多选').length!==20))return false;
 if(s.optionOrders && (typeof s.optionOrders!=='object'||!Object.entries(s.optionOrders).every(([id,a])=>byId.has(Number(id))&&Array.isArray(a)&&a.length===4&&same(a,[0,1,2,3]))))return false;
 return true;
}
function save(){state.position=cursor;try{localStorage.setItem(KEY,JSON.stringify(state));saveOK=true}catch{saveOK=false}}
function isRight(q){return same(state.answers[q.id]||[],q.answer)}
function active(){return state.ids.map(id=>byId.get(id))}
function filtered(){return active().filter(q=>(!Number($('module').value)||q.module===Number($('module').value))&&(!$('type').value||q.type===$('type').value)&&(!$('origin').value||q.origin===$('origin').value)&&(!wrongOnly||state.wrong.includes(q.id)))}
function resetFilters(){$('module').value='0';$('type').value='';$('origin').value='';wrongOnly=false;cursor=0}
function sourceLinks(ids){return ids.map(id=>`<a href="${esc(DATA.sources[id][1])}" target="_blank" rel="noopener">${esc(DATA.sources[id][0])}</a>`).join(' / ')}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function showQuestion(scroll=false){
 const list=filtered();cursor=Math.max(0,Math.min(cursor,list.length-1));const q=list[cursor];
 if(!q){$('question').innerHTML='<div class="panel empty">当前没有符合条件的题目。<br>可调整筛选或回到顺序练习。</div>';updateControls();return}
 const order=state.optionOrders?.[q.id]||[0,1,2,3];
 const seen=state.submitted||state.revealed.includes(q.id),a=state.answers[q.id]||[];
 $('question').innerHTML=`<article class="panel question" id="currentQuestion" data-id="${q.id}"><div class="questionmeta"><span class="badge">${q.type} · ${cursor+1}/${list.length}</span><span class="note">${esc(DATA.modules[q.module-1][0])} · 题库#${q.id}</span>${q.level!=='core'?`<span class="badge">${q.level==='case'?'综合案例':'课程版本细节'}</span>`:''}</div><h2 class="questiontitle">${esc(q.stem)}</h2><div class="origin">${q.batch==='advanced'?'10/31新增补强':'原120题'} · 原创练习 · 非真题</div>${order.map((i,pos)=>`<label class="option ${seen?(q.answer.includes(i)?'right':a.includes(i)?'wrong':''):a.includes(i)?'selected':''}"><input type="${q.type==='多选'?'checkbox':'radio'}" name="answer" value="${i}" ${a.includes(i)?'checked':''} ${state.submitted?'disabled':''}><span>${'ABCD'[pos]}. ${esc(q.options[i])}</span></label>`).join('')}${seen?`<div class="analysis ${isRight(q)?'':'bad'}"><strong>${isRight(q)?'答对了':'尚未答对'} · 正确答案 ${q.answer.map(i=>'ABCD'[order.indexOf(i)]).sort().join('、')}</strong><p>${esc(q.explanation)}</p>${q.point?`<p><b>考点：</b>${esc(q.point)}<br><b>易错：</b>${esc(q.pitfall)}</p>`:''}${q.revisionNote?`<p class="note">核验修订：${esc(q.revisionNote)}</p>`:''}<div class="note">依据：${sourceLinks(q.sources)}</div><a class="guide-link" href="./guide.html#m${q.module}">回看本模块精讲 →</a></div>`:''}</article>`;
 updateControls();save();if(scroll)$('question').scrollIntoView({behavior:'smooth',block:'start'});
}
function updateControls(){
 const list=filtered(),current=list[cursor],n=active().filter(q=>(state.answers[q.id]||[]).length).length,exam=state.mode==='exam'&&!state.submitted;
 $('bar').style.width=(n/state.ids.length*100)+'%';
 $('status').textContent=`${state.form?state.form+' · ':''}${state.mode==='exam'?'模考':'练习'}${state.submitted?'已提交':''} · 已答${n}/${state.ids.length} · 错题${state.wrong.length}${saveOK?' · 自动保存':' · 保存受限，请备份进度'}`;
 $('prev').disabled=!current||cursor===0;$('next').disabled=!current||cursor===list.length-1;
 $('check').classList.toggle('hidden',exam||state.submitted);$('check').disabled=!current;
 $('submit').textContent=state.mode==='exam'?'交卷':'查看总评';$('submit').disabled=state.submitted;
 for(const id of ['module','type','origin','wrong'])$(id).disabled=exam;
 $('wrong').textContent=wrongOnly?'退出错题':'错题重练';
 $('numbers').innerHTML=list.map(q=>{const reviewed=state.submitted||state.revealed.includes(q.id);return `<button data-jump="${q.id}" class="${reviewed?isRight(q)?'good':'bad':(state.answers[q.id]||[]).length?'done':''} ${current?.id===q.id?'active':''}" aria-label="跳转题库第${q.id}题">${q.id}</button>`}).join('');
}
function showResult(){
 if(!state.submitted){$('result').classList.add('hidden');return}
 const arr=active(),n=arr.filter(isRight).length,s=arr.filter(q=>q.type==='单选'),m=arr.filter(q=>q.type==='多选'),points=s.filter(isRight).length*1.5+m.filter(isRight).length*2;
 $('result').classList.remove('hidden');$('result').innerHTML=`<h2>${esc(state.form||'本次')}结果</h2><div class="statgrid">${state.mode==='exam'?`<div class="stat">模拟分数<b>${points}/100</b>${points>=70?'本轮达标':'建议回看错题'}</div>`:''}<div class="stat">正确率<b>${(n/arr.length*100).toFixed(1)}%</b>${n}/${arr.length}题</div><div class="stat">单选<b>${s.filter(isRight).length}/${s.length}</b></div><div class="stat">多选<b>${m.filter(isRight).length}/${m.length}</b></div></div><p class="note">模考按官方公布的1.5分/单选、2分/多选计分，多选错选漏选均为0分；这是原创练习成绩，不代表正式考试结果。建议A、B卷首次闭卷成绩分别达到85分以上，且能解释错项，再用官方样题校准；85分是备考建议，并非通过概率或保证。重复作答高分不等于未见题能力。</p>${DATA.modules.map((mod,i)=>{const a=arr.filter(q=>q.module===i+1),k=a.filter(isRight).length;return `<div class="modulebar"><span>${esc(mod[0])}</span><div class="progress"><span style="width:${a.length?k/a.length*100:0}%"></span></div><span>${k}/${a.length}</span></div>`}).join('')}`;
}
function finish(auto=false){
 if(state.submitted)return;if(!auto&&!confirm(`将按本轮全部${state.ids.length}题提交，未答题计未答对。确认？`))return;
 state.submitted=true;if(state.mode==='exam'){const points=active().filter(isRight).reduce((s,q)=>s+(q.type==='单选'?1.5:2),0);history.push({form:state.form||'混合卷',points,at:new Date().toISOString()});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history))}catch{}renderHistory()}state.wrong=[...new Set([...state.wrong.filter(id=>!state.ids.includes(id)),...active().filter(q=>!isRight(q)).map(q=>q.id)])];state.revealed=[...new Set([...state.revealed,...state.ids])];save();showResult();showQuestion();tick();$('result').scrollIntoView({behavior:'smooth',block:'start'});
}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function examIds(){const pick=(type,quota)=>quota.flatMap((n,i)=>shuffle(DATA.questions.filter(q=>q.type===type&&q.module===i+1)).slice(0,n).map(q=>q.id));return [...shuffle(pick('单选',DATA.exam.singleQuota)),...shuffle(pick('多选',DATA.exam.multiQuota))]}
function begin(mode,ids,form){
 if(!confirm(`开始${form}？当前轮次将切换；本轮所含题目重新作答，其他题目记录保留。建议先备份进度。`))return;
 const prev=state;state=initial();state.answers={...prev.answers};for(const id of ids)delete state.answers[id];
 state.wrong=[...prev.wrong];state.revealed=prev.revealed.filter(id=>!ids.includes(id));state.optionOrders={...(prev.optionOrders||{})};
 for(const id of ids)state.optionOrders[id]=shuffle([0,1,2,3]);
 state.mode=mode;state.ids=ids;state.form=form;if(mode==='exam')state.deadline=Date.now()+120*60000;
 resetFilters();save();showResult();showQuestion(true);tick();
}
function start(mode){begin(mode,mode==='exam'?examIds():DATA.questions.map(q=>q.id),mode==='exam'?'混合随机卷':'全240题')}
function formIds(f){const ids=DATA.forms[f];return ['单选','多选'].flatMap(t=>shuffle(ids.filter(id=>byId.get(id).type===t)))}
function renderHistory(){
 $('history').innerHTML='<b>模考记录（本浏览器）</b><p class="note">A、B卷互不重题，但若先练新增题或看过解析，整卷首次成绩也不再是未见题检验。每卷第一次提交会标出；请据真实学习顺序判断。</p>'+ (history.length?history.slice(-12).reverse().map(h=>{const first=history.find(x=>x.form===h.form)===h;return `<p>${esc(h.form)} · ${h.points}/100 ${first?'· 本卷首次提交':''} · ${esc(h.at.slice(0,16).replace('T',' '))}</p>`}).join(''):'<p>暂无模考提交记录。建议先A卷，再复习薄弱点，最后B卷。</p>');
}
function tick(){if(!state)return;if(state.mode!=='exam'){$('time').textContent='练习 · 不计时';return}if(state.submitted){$('time').textContent='模考已提交';return}const sec=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));$('time').textContent=`剩余 ${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;if(!sec)finish(true)}
async function init(){
 try{DATA=window.FDE_BANK;if(!DATA){const r=await fetch('./bank.json?v=20261031');if(!r.ok)throw Error('题库读取失败');DATA=await r.json();}byId=new Map(DATA.questions.map(q=>[q.id,q]));state=initial();try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(valid(saved)){state=saved;if(!localStorage.getItem(UPGRADE_KEY)&&!saved.optionOrders)localStorage.setItem(UPGRADE_KEY,JSON.stringify(saved));}}catch{saveOK=false}cursor=Number.isInteger(state.position)?state.position:0;try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');if(Array.isArray(h))history=h.filter(x=>typeof x.form==='string'&&Number.isFinite(x.points)&&typeof x.at==='string')}catch{}renderHistory();
 DATA.modules.forEach((mod,i)=>$('module').insertAdjacentHTML('beforeend',`<option value="${i+1}">${i+1}. ${esc(mod[0])}（${mod[1]}%）</option>`));
 $('mergeSummary').textContent='240道原创练习：160单选、80多选。原120题保留，新增120道补强题。A/B卷各60道新题（40单选、20多选），互不重叠，并按十模块分值精确配题。每轮选项重排，答案按选项内容保存。';
 $('audit').innerHTML=[...DATA.audit].sort((a,b)=>a.sourceNumber-b.sourceNumber).map(a=>`<div class="auditrow"><b>原站#${a.sourceNumber} · ${esc(a.status)}</b><br>${esc(a.note)}${a.questionIds.length?'<br>练习位置：'+a.questionIds.map(id=>`<button data-audit="${id}">题库#${id}</button>`).join(''):''}</div>`).join('');
 $('sources').innerHTML=Object.entries(DATA.sources).map(([id,v])=>`<div class="sourceitem"><a href="${esc(v[1])}" target="_blank" rel="noopener">${esc(id+' '+v[0])}</a></div>`).join('');
 $('diagnostic').onclick=()=>begin('practice',DATA.modules.flatMap((_,i)=>['单选','多选'].map(type=>shuffle(DATA.questions.filter(q=>q.batch==='advanced'&&q.module===i+1&&q.type===type))[0].id)),'新增20题诊断');$('newPractice').onclick=()=>begin('practice',DATA.questions.filter(q=>q.batch==='advanced').map(q=>q.id),'新增120题');for(const f of ['A','B'])$('exam'+f).onclick=()=>begin('exam',formIds(f),'补强'+f+'卷');$('app').classList.remove('hidden');$('loadState').classList.add('hidden');bind();showResult();showQuestion();tick();setInterval(tick,1000);window.quizQA={same,isRight,examIds,valid,data:DATA,getState:()=>state,formIds,filtered,showQuestion,finish};
 }catch(e){$('loadState').textContent='题库暂时未能加载，请联网刷新重试。'+e.message;}
}
function jump(id){if(state.mode==='exam'&&!state.submitted&&!state.ids.includes(id)){alert('此题不在当前模考中，交卷后可进入练习。');return}if(state.mode==='exam'&&state.submitted&&!state.ids.includes(id)){state.mode='practice';state.submitted=false;state.deadline=null;state.ids=DATA.questions.map(q=>q.id);showResult();tick()}resetFilters();cursor=filtered().findIndex(q=>q.id===id);showQuestion(true)}
function bind(){
 $('question').addEventListener('change',e=>{if(e.target.name!=='answer'||state.submitted)return;const q=filtered()[cursor];state.answers[q.id]=[...$('question').querySelectorAll('input:checked')].map(el=>Number(el.value));state.revealed=state.revealed.filter(id=>id!==q.id);save();showQuestion()});
 $('check').onclick=()=>{const q=filtered()[cursor];if(!q)return;if(!(state.answers[q.id]||[]).length){alert('请先选择答案。');return}if(!state.revealed.includes(q.id))state.revealed.push(q.id);state.wrong=state.wrong.filter(id=>id!==q.id);if(!isRight(q))state.wrong.push(q.id);save();showQuestion();};
 $('prev').onclick=()=>{cursor--;showQuestion(true)};$('next').onclick=()=>{cursor++;showQuestion(true)};
 $('numbers').onclick=e=>{const id=Number(e.target.dataset.jump);if(!id)return;cursor=filtered().findIndex(q=>q.id===id);$('more').open=false;showQuestion(true)};
 $('audit').onclick=e=>{const id=Number(e.target.dataset.audit);if(id)jump(id)};
 for(const id of ['module','type','origin'])$(id).onchange=()=>{cursor=0;showQuestion()};
 $('practice').onclick=()=>start('practice');$('exam').onclick=()=>start('exam');$('submit').onclick=()=>finish();
 $('wrong').onclick=()=>{if(wrongOnly){wrongOnly=false;cursor=0;showQuestion();return}if(!state.wrong.length){alert('还没有错题。先练习并核对答案，或完成一轮模考。');return}const wrong=[...state.wrong];state.mode='practice';state.submitted=false;state.deadline=null;state.ids=DATA.questions.map(q=>q.id);for(const id of wrong)delete state.answers[id];state.revealed=state.revealed.filter(id=>!wrong.includes(id));resetFilters();wrongOnly=true;save();showResult();showQuestion(true);tick()};
 $('oldBackup').onclick=()=>{const s=localStorage.getItem(UPGRADE_KEY);if(!s){alert('此浏览器没有检测到升级前旧版记录；可用备份进度保存当前记录。');return}download('FDE升级前进度.json',JSON.stringify({kind:'workbuddy-fde-cid-backup',version:DATA.version,state:JSON.parse(s)},null,2),'application/json;charset=utf-8')};
 $('backup').onclick=()=>download('FDE备考进度.json',JSON.stringify({kind:'workbuddy-fde-cid-backup',version:DATA.version,savedAt:new Date().toISOString(),state,history},null,2),'application/json;charset=utf-8');
 $('restore').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('备份文件过大');const b=JSON.parse((await file.text()).replace(/^\ufeff/,''));if(b.kind!=='workbuddy-fde-cid-backup'||!valid(b.state))throw Error('不是当前版本的有效备份');if(!confirm('用备份中的作答与错题替换当前记录？'))return;state=b.state;const pos=state.position||0;resetFilters();cursor=pos;if(Array.isArray(b.history)){history=b.history.filter(x=>typeof x.form==='string'&&Number.isFinite(x.points)&&typeof x.at==='string');localStorage.setItem(HISTORY_KEY,JSON.stringify(history));renderHistory()}save();showResult();showQuestion();tick();alert('进度已导入。')}catch(err){alert('导入失败：'+err.message)}finally{e.target.value=''}};
 $('export').onclick=()=>{const q=DATA.questions.filter(q=>state.wrong.includes(q.id));download('FDE备考错题.txt','腾讯云 FDE 错题\n'+new Date().toLocaleString()+'\n\n'+q.map(q=>`题库#${q.id} [${DATA.modules[q.module-1][0]}]\n${q.stem}\n${q.options.map((o,i)=>'ABCD'[i]+'. '+o).join('\n')}\n答案：${q.answer.map(i=>'ABCD'[i]).join('、')}\n解析：${q.explanation}\n${q.sources.map(s=>DATA.sources[s][1]).join('\n')}`).join('\n\n'),'text/plain;charset=utf-8')};
 $('reset').onclick=()=>{if(!confirm('删除此浏览器保存的作答、错题与计时？'))return;state=initial();history=[];try{localStorage.setItem(HISTORY_KEY,'[]')}catch{}renderHistory();resetFilters();save();showResult();showQuestion();tick()};
}
$('phoneHelp').onclick=()=>$('phonePanel').classList.remove('hidden');$('closePhone').onclick=()=>$('phonePanel').classList.add('hidden');init();
