const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
if(!process.versions.electron){const env={...process.env,POMATEZ_HEADLESS:'1',POMATEZ_PROFILE:fs.mkdtempSync(path.join(os.tmpdir(),'pomo-manual-dialog-'))};delete env.ELECTRON_RUN_AS_NODE;const r=spawnSync(require('electron'),[__filename],{env,cwd:path.resolve(__dirname,'..'),windowsHide:true,stdio:'inherit',timeout:60000});if(r.error)throw r.error;process.exit(r.status??1);}
assert.equal(process.env.POMATEZ_HEADLESS,'1');assert.ok(process.env.POMATEZ_PROFILE);
const {app,BrowserWindow,session}=require('electron');require('../app/electron/build/main');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),deadline=setTimeout(()=>app.exit(2),50000);
app.whenReady().then(async()=>{
session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));let win;for(let i=0;i<100;i++){win=BrowserWindow.getAllWindows()[0];if(win&&!win.webContents.isLoadingMainFrame())break;await wait(100);}assert.ok(win);assert.equal(win.isVisible(),false);win.setMinimumSize(320,400);
const js=s=>win.webContents.executeJavaScript(s,true);
const geometry=()=>js(`(()=>{const selectors=['.overview-section .stat','.calendar-section','.journey-card','.scientific-rest','.records'];return selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return {selector,x:r.x,y:r.y,width:r.width,height:r.height};});})()`);
for(const [width,height] of [[1080,1600],[1440,900],[480,800]]){
 win.setSize(width,height);await wait(180);
 await js("document.querySelector('.records-section').scrollIntoView({block:'center'})");await wait(70);
 const before=await geometry();
 await js("(()=>{const b=[...document.querySelectorAll('.records-section button')].find(b=>b.textContent==='补记');b.focus();b.click();})()");await wait(100);
 assert.equal(await js("document.querySelector('.right-col').classList.contains('is-editing-record')"),false);
 assert.equal(await js("document.querySelector('.manual-dialog').getAttribute('aria-modal')"),'true');
 const after=await geometry();for(let i=0;i<before.length;i++)for(const k of ['x','y','width','height'])assert.ok(Math.abs(before[i][k]-after[i][k])<2,`${width} ${before[i].selector} ${k}: ${before[i][k]}→${after[i][k]}`);
 assert.equal(await js("document.querySelector('.focus-app').inert"),true);
 assert.equal(await js("document.querySelector('.manual-dialog').scrollWidth <= document.querySelector('.manual-dialog').clientWidth"),true);
 assert.equal(await js("document.documentElement.scrollWidth <= window.innerWidth"),true);
 const d=await js("(()=>{const r=document.querySelector('.manual-dialog').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()");assert.ok(d.x>=0 && d.y>=0 && d.x+d.width<=width+1 && d.y+d.height<=height+1,JSON.stringify({width,height,dialog:d,actual:win.getSize()}));
 if(width===1080){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Page.enable');const shot=await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.resolve('artifacts/manual-dialog-portrait.png'),Buffer.from(shot.data,'base64'));win.webContents.debugger.detach();}
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");await wait(70);assert.equal(await js("document.querySelector('.manual-dialog')===null"),true);assert.equal(await js("document.querySelector('.focus-app').inert"),false);assert.equal(await js("document.activeElement.textContent"),'补记');
}
await js("(()=>{const b=[...document.querySelectorAll('.records-section button')].find(b=>b.textContent==='补记');b.focus();b.click();})()");await wait(70);
await js("(()=>{const e=document.querySelector('#manual-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Synthetic named manual');e.dispatchEvent(new Event('input',{bubbles:true}));})()");
await js("[...document.querySelectorAll('.manual-dialog button')].find(b=>b.textContent==='保存补记').click()");await wait(100);
assert.equal(await js("document.querySelector('.manual-dialog')===null"),true);
const data=await js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");assert.equal(data.records.length,1);assert.ok(data.records[0].task.title.includes('Synthetic named manual'));assert.equal(data.records[0].completedCount,1);assert.equal(data.records[0].acceptedSeconds,1500);assert.ok(data.records[0].endedAt>data.records[0].startedAt);
assert.equal(win.isVisible(),false);console.log('PASS: manual portal keeps overview/calendar/journey/rest/history rectangles unchanged at1080 portrait/1440 landscape/480 narrow; bounded dialog; Escape/focus/inert restoration; named manual save');clearTimeout(deadline);app.exit(0);
}).catch(e=>{console.error(e.stack);clearTimeout(deadline);app.exit(1);});
