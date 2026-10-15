const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync,spawn}=require('node:child_process');
if(!process.versions.electron){
 for(const mode of ['api','tray','manual']){
  const env={...process.env,POMATEZ_HEADLESS:mode==='api'?'1':'0',POMATEZ_STARTUP_ROUTING_TEST:mode==='api'?'':mode,POMATEZ_PROFILE:fs.mkdtempSync(path.join(os.tmpdir(),'pomo-startup-'+mode+'-'))};delete env.ELECTRON_RUN_AS_NODE;
  const r=spawnSync(require('electron'),[__filename,...(mode==='manual'?[]:['--start-in-tray'])],{env,cwd:path.resolve(__dirname,'..'),windowsHide:true,stdio:'inherit',timeout:60000});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);
 }process.exit(0);
}

assert.ok(process.env.POMATEZ_PROFILE);
const electron=require('electron'),{app,BrowserWindow,session}=electron;let managed=[],writes=0;
const routing=process.env.POMATEZ_STARTUP_ROUTING_TEST;
let showCalls=0,trayCalls=0;
if(routing){
 assert.equal(process.env.POMATEZ_HEADLESS,'0');
 const {EventEmitter}=require('node:events');
 Object.defineProperty(electron,'Tray',{value:class extends EventEmitter {constructor(){super();trayCalls++;}setToolTip(){}setContextMenu(){}destroy(){}}});
 BrowserWindow.prototype.show=function(){showCalls++;};BrowserWindow.prototype.focus=function(){};
 require('../app/electron/build/focus/activitywatch').ActivityWatchRest.prototype.start=function(){};
 require('../app/electron/build/focus/activitywatchRuntime').ActivityWatchRuntime.prototype.ensure=async()=>{};
 app.commandLine.appendSwitch('mute-audio');app.on('web-contents-created',(_,c)=>c.setAudioMuted(true));
}

// Simulate only the OS boundary. The actual main/preload/settings UI runs.
Object.defineProperty(app,'isPackaged',{get:()=>true});
app.getLoginItemSettings=o=>({openAtLogin:managed.some(x=>JSON.stringify(x.args)===JSON.stringify(o.args)),launchItems:structuredClone(managed).map(x=>({...x,args:[]}))});
app.setLoginItemSettings=v=>{writes++;managed=v.openAtLogin ? [{name:v.name,path:process.execPath,args:v.args,scope:'user',enabled:v.enabled}] : [];};
require('../app/electron/build/main');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),deadline=setTimeout(()=>app.exit(2),50000);
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));let win;for(let i=0;i<100;i++){win=BrowserWindow.getAllWindows()[0];if(win&&!win.webContents.isLoadingMainFrame())break;await wait(100);}assert.ok(win);const js=s=>win.webContents.executeJavaScript(s,true);
 if(routing){
  await wait(350);assert.equal(trayCalls,1);assert.equal(showCalls,routing==='tray'?0:1);assert.equal(win.isVisible(),false);assert.equal(writes,0);
  const before=showCalls;app.emit('second-instance',{},['farm.exe','--start-in-tray'],'',{});assert.equal(showCalls,before);
  app.emit('second-instance',{},['farm.exe'],'',{});assert.equal(showCalls,before+1);assert.equal(win.isVisible(),false);
  console.log('PASS: actual nonheadless main '+routing+' route: initial show requested '+before+', duplicate login stays quiet, manual duplicate requests restore; OS window/tray/monitor effects intercepted');clearTimeout(deadline);app.exit(0);return;
 }
 assert.equal(writes,0);assert.equal(win.isVisible(),false);
 const invoke=await js('window.focusApi.startupStatus()');assert.equal(invoke.enabled,false);
 await assert.rejects(js("window.focusApi.startupSet('true')"));assert.equal(writes,0);
 await js("document.querySelector('.win-controls button[aria-label=设置]').click()");await wait(80);
 assert.equal(await js("document.querySelector('.s-startup [role=switch]').getAttribute('aria-checked')"),'false');
 await js("document.querySelector('.s-startup [role=switch]').click()");await wait(80);assert.equal(writes,1);assert.equal(await js("document.querySelector('.s-startup [role=switch]').getAttribute('aria-checked')"),'true');assert.equal(managed[0].args[0],'--start-in-tray');
 const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await loaded;await wait(160);await js("document.querySelector('.win-controls button[aria-label=设置]').click()");await wait(80);assert.equal(await js("document.querySelector('.s-startup [role=switch]').getAttribute('aria-checked')"),'true');assert.equal(writes,1);
 await js("document.querySelector('.s-startup [role=switch]').click()");await wait(80);assert.equal(managed.length,0);assert.equal(writes,2);
 // Observe would-show events while remaining hidden. A login duplicate must not call show.
 let focuses=0;win.show=()=>{focuses++;};win.focus=()=>{};
 app.emit('second-instance',{},['farm.exe','--start-in-tray'],'',{});assert.equal(focuses,0);
 // show() is deliberately suppressed in headless mode; manual restore coverage
 // remains in the normal desktop suite, and startup routing is checked in source.
 assert.equal(win.isVisible(),false);
 for(const [w,h] of [[1080,1600],[1440,900]]){win.setSize(w,h);await wait(40);assert.equal(await js('document.documentElement.scrollWidth <= window.innerWidth'),true);}
 assert.equal(await js("localStorage.getItem('pomatez-focus-preferences-v1')"),null);
 console.log('PASS: real main/preload/StartupSettings UI; explicit on/off persists native-read across reload; invalid IPC refused; no automatic registration, no visible startup, no preference sync entry; portrait/landscape');clearTimeout(deadline);app.exit(0);
}).catch(e=>{console.error(e.stack);clearTimeout(deadline);app.exit(1);});
