// Real hidden main/preload/production renderer. Fake clock and service; no real API.
const {app,BrowserWindow}=require('electron'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {FocusService}=require('../app/electron/build/focus/service');
let calls=0,release,failed=false,hold=true,readRelease,source='synthetic-refresh',holdRead=true;
let pendingReads=[];
const rows=()=>[{id:'p1',planId:'p1',taskId:'t1',title:'Synthetic task · 第 1 个番茄',source:'feishu',sourceKey:source,quadrant:'iu'}];
FocusService.prototype.status=()=>({configured:true,sourceKey:source});
FocusService.prototype.today=async()=>{if(holdRead)await new Promise(r=>{pendingReads.push(r);readRelease=()=>{for(const done of pendingReads.splice(0))done()}});return rows()};
FocusService.prototype.history=async()=>({sourceKey:source,records:[],missing:0});
FocusService.prototype.generateToday=async function(){calls++;this.onGenerateProgress?.({stage:'tasks'});if(hold)await new Promise(r=>release=r);if(failed)throw Error('Synthetic generation failed');return {created:0,eligibleTasks:1,blocked:0}};
require('../app/electron/build/main');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),deadline=setTimeout(()=>app.exit(2),55000);
app.whenReady().then(async()=>{try{
 let win;const until=async f=>{for(let i=0;i<200;i++){if(await f())return;await wait(25)}throw Error('Timeout: '+f)};
 await until(()=>{win=BrowserWindow.getAllWindows()[0];return win&&!win.webContents.isLoadingMainFrame()&&win.webContents.getURL().startsWith('file:')&&readRelease});
 const js=s=>win.webContents.executeJavaScript(s,true),clock=(d,h,m)=>new Date(2026,9,d,h,m).getTime(),checks=[];
 const advance=async at=>js(`window.__refreshClock=${at};window.dispatchEvent(new Event('focus'))`);
 const inject=async at=>js(`(()=>{window.__refreshClock=${at};const Original=Date;window.Date=class extends Original{constructor(...args){args.length?super(...args):super(window.__refreshClock)}static now(){return window.__refreshClock}}})()`);
 const label=()=>js("document.querySelector('.gen-label')?.textContent"),gen=()=>js("document.querySelector('.gen-btn').click()"),stamp=()=>js("JSON.parse(localStorage.getItem('pomatez-daily-refresh-v1')).entries.find(e=>e.source==='synthetic-refresh')");
 const load=async at=>{await inject(at);holdRead=false;readRelease();try{await until(()=>js("!!document.querySelector('.gen-btn')&&!document.querySelector('.gen-btn').disabled"))}catch(e){console.error('Diagnostic',JSON.stringify({calls,view:await js("({now:Date.now(),date:new Date().toString(),label:document.querySelector('.gen-label')?.textContent,disabled:document.querySelector('.gen-btn')?.disabled,toast:document.querySelector('.toast')?.textContent,metadata:localStorage.getItem('pomatez-daily-refresh-v1'),text:document.body.textContent.slice(-600)})")}));throw e}};
 if(process.env.POMO_REFRESH_PHASE==='resume'){
  await load(clock(11,9,40));assert.equal(calls,0);assert.match(await label(),/10\.11 周日 09:12已刷新/);checks.push('cold-process restart preserves successful stamp and does not regenerate');
 }else{
  await load(clock(10,8,29));assert.equal(calls,0);await advance(clock(10,8,30));await until(()=>calls===1);
  await advance(clock(10,8,30));assert.equal(calls,1);assert.equal((await stamp()).completedAt,0);
  holdRead=true;await advance(clock(10,8,31));release();await until(()=>js("document.querySelector('.gen-track')?.getAttribute('aria-valuenow')==='96'"));assert.equal((await stamp()).completedAt,0);
  holdRead=false;readRelease();await until(async()=> (await stamp()).completedAt===clock(10,8,31));await until(()=>js("!document.querySelector('.gen-track')"));
  assert.equal(await label(),'10.10 周六 08:31已刷新');checks.push('08:29 waits; 08:30 single persisted attempt; no successful label before complete board refresh');
  await advance(clock(10,8,33));await gen();await until(()=>calls===2);release();await until(async()=> (await stamp()).completedAt===clock(10,8,33));checks.push('manual refresh remains available and stamps actual completion');
  await until(()=>js("!document.querySelector('.gen-track')"));await advance(clock(11,8,20));
  await js("document.querySelector('.btn-begin').click()");await until(()=>js("JSON.parse(localStorage.getItem('pomatez-focus-v1')).active?.status==='active'"));
  await advance(clock(11,9,0));assert.equal(calls,2);checks.push('scheduled refresh defers during real active focus');
  const click=async text=>js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)}||b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('missing button');b.click()})()`);
  await click('结束');await click('确认结束');await click('放弃本次');await until(()=>calls===3);
  failed=true;release();await until(()=>js("document.querySelector('.gen-btn').classList.contains('failed')"));assert.equal((await stamp()).completedAt,clock(10,8,33));
  await advance(clock(11,9,10));await wait(100);assert.equal(calls,3);checks.push('failure never marks success and repeated focus events do not replay writes');
  failed=false;await advance(clock(11,9,12));await gen();await until(()=>calls===4);release();await until(async()=> (await stamp()).completedAt===clock(11,9,12));await until(()=>js("!document.querySelector('.gen-track')"));
  assert.equal(await label(),'10.11 周日 09:12已刷新');checks.push('explicit manual retry recovers and updates timestamp');
  win.setContentSize(760,780);await wait(200);assert.equal(await js("document.documentElement.scrollWidth<=innerWidth"),true);
  assert.equal(await js("(()=>{const b=document.querySelector('.gen-label');return b.scrollWidth<=b.clientWidth})()"),true);checks.push('timestamp fits original narrow overview header without overflow');
 }
 assert.equal(win.isVisible(),false);assert.equal(win.webContents.isAudioMuted(),true);
 fs.writeFileSync(path.join(__dirname,`../artifacts/auto-refresh-${process.env.POMO_REFRESH_PHASE}.json`),JSON.stringify({passed:checks.length,checks,calls,isolated:true,muted:true},null,2));console.log(JSON.stringify({passed:checks.length,checks}));clearTimeout(deadline);app.exit(0);
}catch(e){console.error(e.stack);clearTimeout(deadline);app.exit(1)}});
