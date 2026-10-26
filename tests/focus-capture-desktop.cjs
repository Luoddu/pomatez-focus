// Actual main/preload/renderer, synthetic service only, hidden and muted.
const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
process.env.POMATEZ_HEADLESS='1';process.env.POMATEZ_PROFILE=path.join(__dirname,'../artifacts/test-profiles',randomUUID());
const {FocusService}=require('../app/electron/build/focus/service.js');
const tasks=[1,2].map(n=>({id:'p'+n,planId:'p'+n,taskId:'original',title:`Synthetic original · 第 ${n} 个番茄`,source:'feishu',sourceKey:'synthetic',quadrant:'iu'}));
let creates=[],synced=0,shared=[];
FocusService.prototype.status=()=>({configured:true,sourceKey:'synthetic'});
FocusService.prototype.today=async()=>structuredClone(tasks);
FocusService.prototype.generateToday=async()=>({created:0});
FocusService.prototype.history=async()=>({sourceKey:'synthetic',records:shared,missing:0});
FocusService.prototype.projects=async()=>({sourceKey:'synthetic',projects:[{id:'project-research',name:'Synthetic research',projectType:'research'}]});
FocusService.prototype.sync=async r=>{synced++;return {synced:true,planId:r.task.planId||'p1'}};
FocusService.prototype.archiveHistory=async r=>{const saved={...r,sync:'synced',cloudSynced:true};shared=[saved,...shared.filter(x=>x.id!==r.id)];return saved};
FocusService.prototype.createQuickTask=async q=>{
  creates.push(structuredClone(q));if(creates.length===1)throw Error('Synthetic offline');
  const rows=Array.from({length:q.count},(_,i)=>({id:`captured-${i+1}`,planId:`captured-${i+1}`,taskId:'captured-task',title:`${q.title} · 第 ${i+1} 个番茄`,source:'feishu',sourceKey:q.sourceKey,quadrant:q.quadrant,projectType:q.projectType}));
  tasks.push(...rows);return {created:true,taskId:'captured-task',tasks:rows};
};
require('../app/electron/build/main.js');
const delay=ms=>new Promise(r=>setTimeout(r,ms)),timeout=setTimeout(()=>app.exit(2),60000);
app.whenReady().then(async()=>{try{
  let win;for(let i=0;i<200;i++){win=BrowserWindow.getAllWindows()[0];if(win&&!win.webContents.isLoadingMainFrame()&&win.webContents.getURL().startsWith('file:'))break;await delay(30)}
  const js=s=>win.webContents.executeJavaScript(s,true);
  const until=async fn=>{for(let i=0;i<200;i++){if(await fn())return;await delay(25)}throw Error('UI timed out '+fn)};
  const click=name=>js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(name)}||b.textContent.trim()===${JSON.stringify(name)});if(!b)throw Error('Missing '+${JSON.stringify(name)});b.click()})()`);
  const set=(selector,value)=>js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`);
  const data=()=>js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
  const queue=()=>js("JSON.parse(localStorage.getItem('pomatez-quick-edit-outbox-v1')||'[]')");
  await until(()=>js("!!document.querySelector('.chip:not(:disabled)')&&!!document.querySelector('.capture-input input')"));
  await js("document.querySelector('.chip').click()");await click('开始专注');await until(async()=>!!(await data()).active);
  await click('暂停');const before=(await data()).active;
  await set('[aria-label="随手记临时事项"]','Synthetic interruption');
  await js("document.querySelector('[aria-label=\"随手记临时事项\"]').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));document.querySelector('.capture-input').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
  assert.equal((await queue()).length,0);
  await js("document.querySelector('[aria-label=\"随手记临时事项\"]').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}))");
  await click('记下');await until(async()=>(await queue()).length===1);
  const intent=(await queue())[0];assert.equal(intent.payload.capture,true);assert.equal(intent.payload.count,1);assert.equal(creates.length,0);assert.deepEqual((await data()).active,before);assert.equal((await data()).records.length,0);
  await set('[aria-label="随手记临时事项"]','Keep on disk failure');
  await js("window.captureOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pomatez-quick-edit-outbox-v1')throw Error('synthetic full');return window.captureOriginalSet.call(this,k,v)};void 0");
  await click('记下');assert.equal((await queue()).length,1);assert.equal(await js("document.querySelector('[aria-label=\"随手记临时事项\"]').value"),'Keep on disk failure');
  await js("Storage.prototype.setItem=window.captureOriginalSet;void 0");
  await set('[aria-label="随手记临时事项"]','');
  // Simulate a draft captured yesterday, then a normal app reload today.
  await js("(()=>{const q=JSON.parse(localStorage.getItem('pomatez-quick-edit-outbox-v1'));const d=new Date();d.setDate(d.getDate()-1);q[0].payload.day=d.setHours(0,0,0,0);localStorage.setItem('pomatez-quick-edit-outbox-v1',JSON.stringify(q))})()");
  win.reload();await until(()=>js("!!document.querySelector('.timing-center')&&document.body.textContent.includes('待整理 1')"));
  assert.equal((await queue())[0].id,intent.id);assert.equal((await data()).active.id,before.id);assert.equal((await data()).active.status,'paused');assert.equal(creates.length,0);
  win.setSize(1600,1000);await delay(100);fs.writeFileSync(path.join(__dirname,'../artifacts/p068-capture-timing.png'),(await win.webContents.capturePage()).toPNG());
  await click('结束');await click('确认结束');await until(()=>js("!!document.querySelector('.review-card')"));
  assert.equal(await js("[...document.querySelectorAll('.capture-item button')].some(b=>!b.disabled)"),true);
  // Saved focus still syncs even while another captured intent awaits classification.
  await click('记录番茄');await until(async()=>synced>0&&!(await data()).active);assert.equal(creates.length,0);assert.equal((await queue())[0].id,intent.id);
  await click('整理');await until(()=>js("!!document.querySelector('[aria-label=\"新增任务所属项目\"] option[value=\"project-research\"]')"));
  await set('[aria-label="新增任务名称"]','Organized interruption');await set('[aria-label="新增任务番茄数"]','2');await set('[aria-label="临时事项象限"]','inu');await set('[aria-label="新增任务所属项目"]','project-research');
  await click('确认整理');await until(()=>creates.length===1);await until(async()=>(await queue())[0]?.state==='failed');
  assert.equal(creates[0].id,intent.id);assert.equal(creates[0].day,new Date().setHours(0,0,0,0));assert.equal(creates[0].projectId,'project-research');assert.equal(creates[0].projectType,'research');assert.equal(creates[0].capture,undefined);
  await click('重试待同步操作');await until(async()=>(await queue()).length===0);assert.equal(creates.length,2);assert.equal(creates[1].id,intent.id);assert.equal((await data()).records.length,1);
  await until(()=>js("[...document.querySelectorAll('.task')].some(e=>e.textContent.includes('Organized interruption')&&e.querySelectorAll('.chip').length===2)"));
  win.setSize(900,1100);await delay(100);fs.writeFileSync(path.join(__dirname,'../artifacts/p068-capture-board-portrait.png'),(await win.webContents.capturePage()).toPNG());
  const result={passed:7,checks:['IME composition does not submit','capture preserves paused active and zero records','storage failure retains input','cross-day reload keeps stable intent and active','deferred task does not block saved focus sync','explicit title/count/quadrant/project classification schedules untouched item today','network retry reuses original identity and renders two slots'],hidden:!win.isVisible(),muted:win.webContents.isAudioMuted(),liveCloudWrites:0};
  assert.ok(result.hidden&&result.muted);fs.writeFileSync(path.join(__dirname,'../artifacts/p068-capture-desktop.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));clearTimeout(timeout);app.exit(0);
}catch(e){console.error(e.stack);clearTimeout(timeout);app.exit(1)}});
