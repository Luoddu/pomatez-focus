const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
if(process.env.POMATEZ_HEADLESS!=='1'||!process.env.POMATEZ_PROFILE)throw Error('isolated profile required');
const {FocusService}=require('../app/electron/build/focus/service');
FocusService.prototype.status=()=>({configured:false});FocusService.prototype.today=async()=>[];FocusService.prototype.history=async()=>({records:[],missing:0});FocusService.prototype.dailyReviews=async()=>({reviews:{}});
const main=require('../app/electron/build/main'),{call}=require('../app/electron/src/assets/sleep-client.cjs');
const timer=setTimeout(()=>app.exit(2),55000),wait=ms=>new Promise(r=>setTimeout(r,ms));
const req=(op,extra={})=>({protocol:1,requestId:randomUUID(),op,...extra});
const check=r=>{assert.equal(r.error,undefined,JSON.stringify(r));return r;};
app.whenReady().then(async()=>{try{
 const farm=BrowserWindow.getAllWindows()[0],profile=process.env.POMATEZ_PROFILE;
 for(let i=0;i<150;i++){try{if(JSON.parse(fs.readFileSync(path.join(main.journeyGateway.directory,'status.json'))).instance===main.journeyGateway.instance)break;}catch(_){}await wait(50);}
 const today=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
 if(process.env.P097_HERMES_PYTHON){
  const {spawn}=require('node:child_process');
  await new Promise((resolve,reject)=>{const child=spawn(process.env.P097_HERMES_PYTHON,[path.resolve('tests/hermes-sleep-desktop-fixture.py'),path.resolve('artifacts/node24/node.exe'),path.join(profile,'bridge-receipts')],{env:{...process.env,APPDATA:path.dirname(profile)},windowsHide:true,stdio:['ignore','pipe','pipe']});let out='';child.stdout.on('data',c=>out+=c);child.stderr.on('data',c=>out+=c);child.on('error',reject);child.on('exit',code=>code===0?(console.log(out),resolve()):reject(Error(out)));});
 }
 for(let n=6;n>=0;n--){const date=new Date(today+'T00:00:00Z');date.setUTCDate(date.getUTCDate()-n);const day=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()-1);const previous=date.toISOString().slice(0,10);
  const bed=check(await call(req('check_in',{kind:'bedtime',at:previous+'T23:'+String(20+n*3).padStart(2,'0')+':00+08:00',expectedRevision:null}),profile));
  check(await call(req('check_in',{kind:'wake',at:day+'T07:'+String(30+n*3).padStart(2,'0')+':00+08:00',expectedRevision:bed.entry.revision}),profile));
 }
 for(let i=0;i<100;i++){if(await farm.webContents.executeJavaScript('Boolean(window.focusApi?.sleepRequest)'))break;await wait(100);}
 const stats=await farm.webContents.executeJavaScript("window.focusApi.sleepRequest({op:'stats',days:7})");check(stats);assert.equal(stats.summary.bedtimeSamples,7);
 const goals=await farm.webContents.executeJavaScript("window.focusApi.sleepRequest({op:'set_goals',bedtime:'23:30',wakeBy:'08:00'})");check(goals);
 assert.ok(await farm.webContents.executeJavaScript("window.focusApi.sleepRequest({op:'check_in'}).then(()=>false,()=>true)"));
 await farm.webContents.reload();await wait(2500);
 for(let i=0;i<100;i++){if(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-point').length===12"))break;await wait(100);}
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-point').length"),12);
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-today').textContent==='今天'"));
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-target').length"),2);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-averages').length"),0);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-details-link').length"),0);
 const {SleepStore}=require('../app/electron/build/focus/sleep'),originalHandle=SleepStore.prototype.handle;
 let historyFail=true, historyCalls=0;
 SleepStore.prototype.handle=function(q){if(q.op==='stats'&&q.days===30)return (historyCalls++,wait(500)).then(()=>historyFail?{error:{message:'synthetic history unavailable'}}:originalHandle.call(this,q));return originalHandle.call(this,q);};
 await farm.webContents.executeJavaScript("document.querySelector('.sleep-history-slider').focus()");
 farm.webContents.sendInputEvent({type:'keyDown',keyCode:'Left'});farm.webContents.sendInputEvent({type:'keyUp',keyCode:'Left'});await wait(150);
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-empty-overlay').textContent.includes('正在读取历史')"));
 await wait(500);
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-empty-overlay').textContent.includes('未读取成功')"));
 historyFail=false; assert.equal(historyCalls,1);
 // Hidden Electron windows do not emit a second DOM focus event; retry with real keyboard input.
 farm.webContents.sendInputEvent({type:'keyDown',keyCode:'Left'});farm.webContents.sendInputEvent({type:'keyUp',keyCode:'Left'});await wait(650);
 assert.equal(historyCalls,2);
 farm.webContents.sendInputEvent({type:'keyDown',keyCode:'Right'});farm.webContents.sendInputEvent({type:'keyUp',keyCode:'Right'});await wait(100);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-empty-overlay').length"),0,await farm.webContents.executeJavaScript("document.querySelector('.sleep-section').innerText"));
 SleepStore.prototype.handle=originalHandle;
 assert.equal(await farm.webContents.executeJavaScript("document.querySelector('.sleep-history-slider').value"),'-1');
 const sliderClip=await farm.webContents.executeJavaScript("(()=>{const r=document.querySelector('.sleep-preview').getBoundingClientRect();return {x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)}})()");fs.writeFileSync(path.resolve('artifacts/p097-slider139.png'),(await farm.webContents.capturePage(sliderClip)).toPNG());
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-today').getAttribute('x')==='295.57142857142856'"));
 await farm.webContents.executeJavaScript("(()=>{const s=document.querySelector('.sleep-history-slider');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(s,'-24');s.dispatchEvent(new Event('input',{bubbles:true}));})()");await wait(150);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-today').length"),0);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-point').length"),0);
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-history-slider').getAttribute('aria-valuetext').length>20"));
 await farm.webContents.executeJavaScript("(()=>{const s=document.querySelector('.sleep-history-slider');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(s,'0');s.dispatchEvent(new Event('input',{bubbles:true}));s.blur();})()");await wait(150);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-point').length"),12);
 await farm.webContents.executeJavaScript("document.querySelector('[aria-label=\"专注统计\"]').click()");await wait(500);
 assert.ok(await farm.webContents.executeJavaScript("Boolean(document.querySelector('.stats-page .sleep-full-stats'))"));
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-history-slider').length"),0);
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-averages').innerText.includes('23:29')"));
 await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-ranges button')[1].click()");await wait(250);
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-chart').getAttribute('aria-label').includes('30天')"));
 await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-ranges button')[0].click();document.querySelector('.sleep-goal-link').click()");await wait(150);
 await farm.webContents.executeJavaScript("(()=>{const input=document.querySelector('[aria-label=\"就寝目标\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'23:00');input.dispatchEvent(new Event('input',{bubbles:true}));})()");await wait(150);
 await farm.webContents.executeJavaScript("document.querySelector('.sleep-goals button[type=submit]').click()");await wait(500);
 assert.equal(check(await call(req('goals'),profile)).goals.bedtime,'23:00');
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-marker-late').length"),6);
 await farm.webContents.executeJavaScript("document.querySelector('.sleep-goal-link').click()");await wait(100);
 await farm.webContents.executeJavaScript("(()=>{const input=document.querySelector('[aria-label=\"就寝目标\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'22:30');input.dispatchEvent(new Event('input',{bubbles:true}));})()");await wait(100);
 await farm.webContents.executeJavaScript("document.querySelector('.sleep-goals button[type=submit]').click()");await wait(400);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-marker-very-late').length"),6);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-marker-late').length"),1);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-marker-check').length"),7);
 await farm.webContents.executeJavaScript("Array.from(document.querySelectorAll('.stats-page button')).find(b=>b.textContent==='返回').click()");await wait(500);
 farm.setSize(1600,1100);await wait(300);
 fs.writeFileSync(path.resolve('artifacts/p097-dashboard-wide.png'),(await farm.webContents.capturePage()).toPNG());
 const ratio=await farm.webContents.executeJavaScript("(()=>{const r=document.querySelector('.rhythm-dashboard');return getComputedStyle(r).gridTemplateColumns.split(' ').map(parseFloat)})()");assert.ok(Math.abs(ratio[0]/ratio[1]-2/3)<0.03);
 farm.setSize(860,1100);await wait(300);
 await farm.webContents.executeJavaScript("document.querySelector('.rhythm-dashboard').scrollIntoView({block:'start'})");await wait(200);
 fs.writeFileSync(path.resolve('artifacts/p097-dashboard-narrow.png'),(await farm.webContents.capturePage()).toPNG());
 assert.ok(await farm.webContents.executeJavaScript('document.documentElement.scrollWidth<=window.innerWidth'));
 assert.ok(await farm.webContents.executeJavaScript("(()=>{const r=document.querySelector('.rhythm-dashboard').getBoundingClientRect(),c=document.querySelector('.calendar-section').getBoundingClientRect();return c.top>=r.bottom-1})()"));
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-preview').getBoundingClientRect().height<=180"));
 assert.ok(await farm.webContents.executeJavaScript("Array.from(document.querySelectorAll('.farm-scene .farm-sway,.farm-scene .farm-cloud,.farm-scene .farm-owl-eyes')).every(e=>getComputedStyle(e).animationName==='none')"));
 assert.equal(farm.isVisible(),false);
 console.log(JSON.stringify({passed:true,checks:['real sleep transport','renderer statistics','goal form save','renderer write denial','rolling window endpoints and today label','history slider keyboard and return','history loading failure and recovery','global statistics only','7/30 range toggle','mean shown','goal markers update with goals','2:3 layout','176px compact height','narrow calendar non-overlap','ambient animation stopped'],profile:'synthetic'}));clearTimeout(timer);app.exit(0);
 }catch(e){console.error(e);clearTimeout(timer);app.exit(1)}});
