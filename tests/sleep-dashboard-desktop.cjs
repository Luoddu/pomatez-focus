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
 for(let i=0;i<100;i++){if(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-point').length===14"))break;await wait(100);}
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-point').length"),14);
 assert.equal(await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-target').length"),2);
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-averages').innerText.includes('23:29')"));
 await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-ranges button')[1].click()");await wait(250);
 assert.ok(await farm.webContents.executeJavaScript("document.querySelector('.sleep-chart').getAttribute('aria-label').includes('30天')"));
 await farm.webContents.executeJavaScript("document.querySelectorAll('.sleep-ranges button')[0].click();document.querySelector('.sleep-goal-link').click()");await wait(150);
 await farm.webContents.executeJavaScript("(()=>{const input=document.querySelector('[aria-label=\"就寝目标\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'23:00');input.dispatchEvent(new Event('input',{bubbles:true}));})()");await wait(150);
 await farm.webContents.executeJavaScript("document.querySelector('.sleep-goals button[type=submit]').click()");await wait(500);
 assert.equal(check(await call(req('goals'),profile)).goals.bedtime,'23:00');
 farm.setSize(1600,1100);await wait(300);
 fs.writeFileSync(path.resolve('artifacts/p097-dashboard-wide.png'),(await farm.webContents.capturePage()).toPNG());
 const ratio=await farm.webContents.executeJavaScript("(()=>{const r=document.querySelector('.rhythm-dashboard');return getComputedStyle(r).gridTemplateColumns.split(' ').map(parseFloat)})()");assert.ok(Math.abs(ratio[0]/ratio[1]-2/3)<0.03);
 farm.setSize(860,1100);await wait(300);
 fs.writeFileSync(path.resolve('artifacts/p097-dashboard-narrow.png'),(await farm.webContents.capturePage()).toPNG());
 assert.ok(await farm.webContents.executeJavaScript('document.documentElement.scrollWidth<=window.innerWidth'));
 assert.equal(farm.isVisible(),false);
 console.log(JSON.stringify({passed:8,checks:['real sleep transport','renderer statistics','renderer goal save','renderer write denial','14 endpoints and target lines','cross-midnight mean shown','2:3 layout','narrow no overflow'],profile:'synthetic'}));clearTimeout(timer);app.exit(0);
 }catch(e){console.error(e);clearTimeout(timer);app.exit(1)}});
