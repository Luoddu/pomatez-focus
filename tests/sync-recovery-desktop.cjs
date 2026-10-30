// Real production main/preload/renderer. Service uses synthetic data only.
const {app,BrowserWindow}=require('electron'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(process.env.POMATEZ_HEADLESS!=='1'||!process.env.POMATEZ_PROFILE)throw Error('isolated silent profile required');
const root=path.resolve(__dirname,'..'),old=process.env.POMO_SYNC_EXPECT_OLD==='1',checks=[];
const {FocusService}=require('../app/electron/build/focus/service');
const source='synthetic-recovery',tasks=[{id:'p1',planId:'p1',taskId:'t1',title:'Synthetic sync task · 第 1 个番茄',source:'feishu',sourceKey:source,quadrant:'iu'}];
let initial=true,readers=[],saved=[],calls=[],archives=[],firstId,failFirst=true,failHistory=false;
FocusService.prototype.status=()=>({configured:true,sourceKey:source});
FocusService.prototype.projects=async()=>({sourceKey:source,projects:[]});
FocusService.prototype.today=async()=>{if(initial)await new Promise(r=>readers.push(r));return tasks};
FocusService.prototype.history=async()=>{if(failHistory)throw Error('Synthetic history read failure');return {sourceKey:source,records:saved,missing:0}};
FocusService.prototype.generateToday=async()=>{throw Error('unexpected generation')};
FocusService.prototype.classifyHistory=async()=>({classified:0});
FocusService.prototype.sync=async r=>{firstId=firstId||r.id;calls.push(r.id);if(failFirst&&r.id===firstId)throw Error('Synthetic original record conflict; untouched');return {synced:true,planId:r.task.planId}};
FocusService.prototype.archiveHistory=async r=>{archives.push(r.id);const record={...r,sync:'synced',cloudSynced:true};saved=saved.filter(s=>s.id!==r.id).concat(record);return record};
require('../app/electron/build/main');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),deadline=setTimeout(()=>app.exit(2),50000);
app.whenReady().then(async()=>{try{
 let win;const until=async f=>{for(let i=0;i<240;i++){if(await f())return;await wait(25)}throw Error('Timeout '+f)};
 await until(()=>{win=BrowserWindow.getAllWindows()[0];return win&&!win.webContents.isLoadingMainFrame()&&readers.length});
 const js=s=>win.webContents.executeJavaScript(s,true),base=new Date().setHours(7,0,0,0);
 await js(`window.__now=${base};{const Original=Date;window.Date=class extends Original{constructor(...a){super(...(a.length?a:[window.__now]))}static now(){return window.__now}}};void 0`);
 initial=false;readers.splice(0).forEach(r=>r());await until(()=>js("!!document.querySelector('.quad-iu .chip')&&!document.querySelector('[aria-label=\"手动同步\"]').disabled"));
 const stored=()=>js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
 const click=label=>js(`(()=>{const b=[...document.querySelectorAll('button,summary')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)throw Error('Missing '+${JSON.stringify(label)});b.click()})()`);
 const set=(selector,value)=>js(`{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))}`);
 const advance=async ms=>{await js(`window.__now=${base+ms};window.dispatchEvent(new Event('focus'))`);await wait(120)};
 const idle=()=>until(()=>js("!document.querySelector('[aria-label=\"手动同步\"]').disabled"));
 const choose=()=>js("{const e=document.querySelector('#manual-task');e.value=[...e.options].find(o=>o.value!=='free').value;e.dispatchEvent(new Event('change',{bubbles:true}))}");
 await js("document.querySelector('.btn-begin').click()");await until(async()=>(await stored()).active?.status==='active');const active=(await stored()).active;
 await click('补记');await choose();await click('保存补记');await until(async()=>(await stored()).records.length===1);const original=(await stored()).records[0];
 await advance(300000);await until(()=>calls.length===1);await idle();
 assert.equal((await stored()).records[0].cloudSynced,undefined);assert.equal((await stored()).active.id,active.id);
 if(old){
  const t0=await js("({badge:document.querySelector('.sync-progress')?.textContent,details:!!document.querySelector('.sync-error-details'),causeVisible:document.body.textContent.includes('Synthetic original record conflict')})");
  assert.equal(t0.badge,'同步未完成');assert.equal(t0.details,false);assert.equal(t0.causeVisible,false);checks.push({oldFailure:t0});
 }else{
  assert.ok(await js("!!document.querySelector('[aria-label=\"查看同步失败原因\"]')"));await click('查看同步失败原因');
  assert.ok(await js("document.querySelector('.sync-error-details').textContent.includes('Synthetic original record conflict')"));
  assert.ok(await js("document.querySelector('.sync-error-details').textContent.includes('写回番茄记录失败')"));
  assert.equal(await js("!!document.querySelector('.toast.error')"),false);checks.push('automatic failure keeps exact record/time/stage/reason in optional quiet details, no toast');
 }
 // A later successful record must not make the skipped original failure disappear.
 await click('补记');await choose();const local=at=>{const d=new Date(at);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,19)};
 await set('#manual-when',local(base-55*60000));await set('#manual-end',local(base-30*60000));await click('保存补记');await until(async()=>(await stored()).records.length===2);
 await advance(600000);await until(()=>calls.length===2&&saved.length===1);await idle();assert.equal(calls.filter(id=>id===firstId).length,1);assert.equal((await stored()).records.filter(r=>!r.cloudSynced).length,1);
 if(old){
  assert.equal(await js("!!document.querySelector('.sync-progress')"),false);checks.push('old read-only/later success clears failure badge while original pending record is still skipped');
 }else{
  assert.ok(await js("!!document.querySelector('.sync-progress.error')"));await click('查看同步失败原因');assert.ok(await js("document.querySelector('.sync-error-details').textContent.includes('Synthetic original record conflict')"));
  checks.push('later success and cloud readback keep original failed revision visible and never auto replay it');
  await click('暂停');await until(async()=>(await stored()).active.status==='paused');const paused=(await stored()).active;
  failFirst=false;await click('手动同步');await until(async()=>saved.length===2&&(await stored()).records.every(r=>r.cloudSynced));await idle();
  assert.equal(calls.filter(id=>id===firstId).length,2);assert.equal(archives.filter(id=>id===firstId).length,1);assert.equal((await stored()).records.length,2);assert.deepEqual((await stored()).active,paused);
  assert.equal(await js("!!document.querySelector('.sync-progress')"),false);checks.push('explicit retry succeeds on same ID once, clears matching error, preserves both records and paused timer/segments');
  const recordsBefore=(await stored()).records;failHistory=true;await click('手动同步');await idle();await until(()=>js("!!document.querySelector('.sync-progress.error')"));await click('查看同步失败原因');
  assert.ok(await js("document.querySelector('.sync-error-details').textContent.includes('回读飞书成果失败：Synthetic history read failure')"));assert.deepEqual((await stored()).records,recordsBefore);assert.equal(calls.length,3);
  failHistory=false;await click('手动同步');await idle();await until(()=>js("!document.querySelector('.sync-progress')"));assert.equal(calls.length,3);assert.deepEqual((await stored()).active,paused);checks.push('history-read failure names its phase, never undoes cloud receipts or replays already shared records; retry still works');
  // Verify keyboard-accessible details stay inside narrow viewport without floating sync animations.
  failHistory=true;await click('手动同步');await idle();await until(()=>js("!!document.querySelector('.sync-progress.error')"));win.setContentSize(480,900);await click('查看同步失败原因');
  const box=await js("(()=>{const e=document.querySelector('.sync-error-details');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {left:r.left,right:r.right,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}})()");assert.ok(box.left>=0&&box.right<=box.viewport+1&&!box.overflow,JSON.stringify(box));
  fs.writeFileSync(path.join(root,'artifacts/p077-details-preview.png'),(await win.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG());
  checks.push('details are opt-in summary control; narrow view fits, no old fixed sync surface');
 }
 assert.equal(win.isVisible(),false);assert.equal(win.webContents.isAudioMuted(),true);
 const result={checks,silent:true,realWrites:0};fs.writeFileSync(path.join(root,`artifacts/p077-${old?'t0':'recovery'}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result));clearTimeout(deadline);app.exit(0);
}catch(e){console.error(e.stack);clearTimeout(deadline);app.exit(1)}});
