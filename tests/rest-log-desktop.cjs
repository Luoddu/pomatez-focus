const {app,BrowserWindow}=require("electron"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
if(process.env.POMATEZ_HEADLESS!=="1"||!process.env.POMATEZ_PROFILE)throw Error("isolated silent profile required");
const {FocusService}=require("../app/electron/build/focus/service");
const seedStart=new Date().setHours(0,0,0,0), source="synthetic-rest-log";
const seed={id:"seed-six",task:{id:"free-six",title:"合成科研",kind:"free",source:"feishu",sourceKey:source,projectType:"research"},startedAt:seedStart,endedAt:seedStart+9000000,plannedSeconds:1500,elapsedSeconds:9000,acceptedSeconds:9000,completedCount:6,status:"saved",sync:"synced",cloudSynced:true};
FocusService.prototype.status=()=>({configured:true,sourceKey:source});
FocusService.prototype.today=async()=>[];
FocusService.prototype.history=async()=>({sourceKey:source,records:[seed],missing:0});
FocusService.prototype.generateToday=async()=>({created:0});
FocusService.prototype.dailyReviews=async()=>({sourceKey:source,reviews:{}});
require("../app/electron/build/main");
const wait=ms=>new Promise(r=>setTimeout(r,ms)),deadline=setTimeout(()=>app.exit(2),55000);
app.whenReady().then(async()=>{try{
  let win;const until=async fn=>{for(let i=0;i<160;i++){if(await fn())return;await wait(40)}throw Error("timeout "+fn)};
  await until(()=>{win=BrowserWindow.getAllWindows()[0];return win&&!win.webContents.isLoadingMainFrame()&&win.webContents.getURL().startsWith("file:")});
  assert.equal(win.isVisible(),false);assert.equal(win.webContents.isAudioMuted(),true);
  const js=s=>win.webContents.executeJavaScript(s,true),checks=[];
  const click=(text,selector="button")=>js(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(text)}||b.getAttribute('aria-label')===${JSON.stringify(text)});if(!b||b.disabled)throw Error('unavailable '+${JSON.stringify(text)});b.click()})()`);
  const log=()=>js(`JSON.parse(localStorage.getItem('pomatez-rest-log-v1:${source}'))`);
  const focus=()=>js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
  if(process.env.POMO_REST_PHASE === "diagnose") {
    await wait(1500);
    console.log("READONLY_SYNTHETIC_DIAG",await js("({text:document.body.textContent.slice(-1800),rest:localStorage.getItem('pomatez-rest-log-v1:synthetic-rest-log'),focus:localStorage.getItem('pomatez-focus-v1')})"));
    clearTimeout(deadline); app.exit(0); return;
  }
  await until(()=>js("document.querySelectorAll('.journey-tomato[data-complete=true]').length===6&&!document.querySelector('[aria-label=吃饭记录]').disabled"));
  const todayPlan=await js("(()=>{const e=document.querySelector('.journey-card');return JSON.parse(localStorage.getItem('pomatez-journey-v1:'+e.dataset.scope+':'+e.dataset.day))})()");
  const mealKeys=todayPlan.stages.flatMap(s=>s.restActions.map((kind,i)=>({kind,key:`${s.id}:${i}`}))).filter(x=>x.kind==='meal').map(x=>x.key);
  if(process.env.POMO_REST_PHASE==="resume"){
    const previous=await log();assert.equal(previous.events.length,5);assert.equal(previous.events[4].endedAt,null);
    const resumedAt=Math.max(Date.now(),previous.events[4].startedAt)+15000;
    await js(`(()=>{window.__restClock=${resumedAt};const Original=Date;window.Date=class extends Original{constructor(...args){args.length?super(...args):super(window.__restClock)}static now(){return window.__restClock}}})()`);
    try { await until(()=>js("!!document.querySelector('[aria-label=吃饭记录] [role=timer]')")); }
    catch(error) { console.error("Synthetic restart diagnostic",await js("({text:document.body.textContent.slice(-1400),rest:localStorage.getItem('pomatez-rest-log-v1:synthetic-rest-log'),focus:localStorage.getItem('pomatez-focus-v1')})"));throw error; }
    await click("吃饭记录");await click("吃完了");assert.ok((await log()).events[4].endedAt);assert.equal((await log()).events.length,5);
    assert.equal((await focus()).records.filter(r=>r.id===seed.id).length,1);
    checks.push("cold process restores ongoing actual meal; explicit finish preserves five records and single focus seed");
  }else{
    const base=Date.now();await js(`(()=>{window.__restClock=${base};const Original=Date;window.Date=class extends Original{constructor(...args){args.length?super(...args):super(window.__restClock)}static now(){return window.__restClock}};window.__writes=0;window.__originalRestSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('pomatez-rest-log-v1:'))window.__writes++;return window.__originalRestSet.call(this,k,v)}})()`);
    const advance=async seconds=>{await js(`window.__restClock=${base+seconds*1000};void 0`);await wait(1100)};
    await click("吃饭记录");await click("去吃饭");let first=await log();assert.equal(first.events[0].afterCount,6);assert.equal(first.events[0].presetKey,mealKeys[0]);
    const order=await js("[...document.querySelectorAll('.journey-tomato,[data-rest-event]')].map(e=>({tomato:!!e.dataset.journeySlot,event:e.dataset.restEvent}))");
    const eventIndex=order.findIndex(e=>e.event===first.events[0].id);assert.equal(order.slice(0,eventIndex).filter(e=>e.tomato).length,6);
    assert.equal(await js("document.querySelectorAll('.journey-tomato').length"),16);checks.push("first bowl moves after six actual tomatoes; all sixteen slots retained and first preset consumed");
    await js("window.__writes=0");await advance(70);assert.equal(await js("document.querySelector('[aria-label=吃饭记录] [role=timer]').textContent"),"01:10");assert.equal(await js("window.__writes"),0);
    await js("window.__hidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__hidden});window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));void 0");
    await advance(80);assert.equal(await js("document.querySelector('[aria-label=吃饭记录] [role=timer]').textContent"),"01:10");
    await js("window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));void 0");
    assert.equal(await js("document.querySelector('[aria-label=吃饭记录] [role=timer]').textContent"),"01:20");assert.equal(await js("window.__writes"),0);
    checks.push("visible positive timer advances without rest-log disk writes");
    await click("小憩记录");await click("去睡觉");let current=await log();assert.equal(current.events[0].endedAt,current.events[1].startedAt);assert.equal(current.events[1].kind,"nap");
    const firstCompleted=current.events[0];
    await advance(130);await js("document.querySelector('.btn-begin').click()");await until(()=>js("JSON.parse(localStorage.getItem('pomatez-focus-v1')).active?.status==='active'"));assert.equal((await log()).events[1].endedAt,base+130000);
    checks.push("meal to nap closes previous event; free focus closes nap before starting the original timer");
    await js("window.__focusSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pomatez-focus-v1')throw Error('Synthetic focus quota');return window.__focusSet.call(this,k,v)};void 0");
    await click("吃饭记录");await click("去吃饭");assert.equal((await log()).events.length,2);assert.equal((await focus()).active.status,"active");assert.match(await js("document.querySelector('.journey-error').textContent"),/暂停/);
    await js("Storage.prototype.setItem=window.__focusSet;void 0");
    await click("去吃饭");await until(()=>js("JSON.parse(localStorage.getItem('pomatez-focus-v1')).active?.status==='paused'"));current=await log();assert.equal(current.events[2].presetKey,mealKeys[1]);assert.deepEqual(current.events[0],firstCompleted);
    checks.push("failed timer pause rolls back rest; successful second meal matches second preset and pauses same focus");
    const unchanged=JSON.stringify(current);await js("window.__normalRestSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('pomatez-rest-log-v1:'))return;return window.__normalRestSet.call(this,k,v)};void 0");
    await click("吃饭记录");await click("吃完了");assert.equal(JSON.stringify(await log()),unchanged);assert.match(await js("document.querySelector('.journey-error').textContent"),/未保存/);
    await js("Storage.prototype.setItem=window.__normalRestSet;void 0");await click("吃完了");assert.ok((await log()).events[2].endedAt);
    await click("吃饭记录");await click("去吃饭");const open=await log();assert.equal(open.events.length,4);
    // Resume write failure must retain the ongoing rest, then normal resume closes it.
    await js("window.__resumeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pomatez-focus-v1')throw Error('Synthetic resume quota');return window.__resumeSet.call(this,k,v)};void 0");
    await click("继续");assert.equal((await log()).events[3].endedAt,null);assert.equal((await focus()).active.status,"paused");
    await js("Storage.prototype.setItem=window.__resumeSet;void 0");await click("继续");assert.ok((await log()).events[3].endedAt);assert.equal((await focus()).active.status,"active");
    checks.push("failed rest receipt preserves open event; failed focus resume rolls back closing and retry succeeds");
    await click("结束");await click("确认结束");await click("放弃本次");await until(()=>js("!JSON.parse(localStorage.getItem('pomatez-focus-v1')).active"));
    // Leave an actual UI-created event for the independent cold process, without rewriting/reloading fixture bytes.
    await click("吃饭记录");await click("去吃饭");assert.equal((await log()).events.length,5);
    win.setSize(760,620);await wait(300);assert.equal(await js("document.documentElement.scrollWidth<=innerWidth+1"),true);
    win.setSize(1440,960);await wait(250);
    await js("document.querySelector('.journey-card').scrollIntoView({block:'center'})");
    await click("吃饭记录");await until(()=>js("!!document.querySelector('.journey-rest-menu')"));
    assert.equal(await js("document.querySelector('.journey-rest-menu').getBoundingClientRect().width>0"),true);
    win.webContents.invalidate();await wait(350);
    const rect=await js("(()=>{const r=document.querySelector('.journey-card').getBoundingClientRect();return {x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)+45}})()");
    fs.writeFileSync(path.join(__dirname,"../artifacts/rest-log-preview.png"),(await win.capturePage(rect,{stayHidden:true,stayAwake:true})).toPNG());
    checks.push("narrow overview layout and inline menu fit original column; silent screenshot captured");
  }
  fs.writeFileSync(path.join(__dirname,`../artifacts/rest-log-${process.env.POMO_REST_PHASE}.json`),JSON.stringify({passed:checks.length,checks},null,2));console.log(JSON.stringify({passed:checks.length,checks}));clearTimeout(deadline);app.exit(0);
}catch(error){console.error(error);clearTimeout(deadline);app.exit(1)}});
