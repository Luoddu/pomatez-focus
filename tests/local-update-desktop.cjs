const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'artifacts/test-profiles',crypto.randomUUID());fs.mkdirSync(dir,{recursive:true});process.env.POMATEZ_HEADLESS='1';process.env.POMATEZ_PROFILE=dir;app.getVersion=()=> '0.1.0-preview.103';
const {FocusService}=require('../app/electron/build/focus/service');FocusService.prototype.status=()=>({configured:false});FocusService.prototype.today=async()=>[];
const modulePath=require.resolve('../app/electron/build/focus/updater'),original=require(modulePath);let controller,installs=0,relaunches=0,quits=0;
app.relaunch=()=>{relaunches++};app.quit=()=>{quits++};
require.cache[modulePath].exports={...original,FocusUpdater:class extends original.FocusUpdater{
 constructor(publish,ready){const {NsisUpdater}=require('electron-updater'),real=new NsisUpdater({provider:'github',owner:'Luoddu',repo:'pomatez-focus',channel:'preview'});real.forceDevUpdateConfig=true;const config=path.join(dir,'dev-update.json');fs.writeFileSync(config,JSON.stringify({provider:'github',owner:'Luoddu',repo:'pomatez-focus',channel:'preview',updaterCacheDirName:'p067-'+path.basename(dir)}));real.updateConfigPath=config;super(publish,ready,real,'0.1.0-preview.103');controller=this;}
 install(){installs++;assert.equal(this.status().phase,'downloaded');assert.equal(this.status().local,true);}
}};
require('../app/electron/build/main');const wait=ms=>new Promise(r=>setTimeout(r,ms)),deadline=setTimeout(()=>app.exit(2),55000);
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['https://*/*']},(_,cb)=>cb({cancel:true}));let farm;const until=async f=>{for(let n=0;n<180;n++){if(await f())return;await wait(35);}throw Error('wait timeout');};await until(()=>{farm=BrowserWindow.getAllWindows()[0];return farm&&!farm.webContents.isLoadingMainFrame()});const js=s=>farm.webContents.executeJavaScript(s,true),click=t=>js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(t)}||b.textContent.trim()===${JSON.stringify(t)});if(!b||b.disabled)throw Error('Unavailable '+${JSON.stringify(t)});b.click();return true})()`);
 await until(()=>js("!!document.querySelector('[aria-label=设置]')"));await click('设置');await until(()=>js("!!document.querySelector('[aria-label=软件更新]')"));
 const before=await js("JSON.parse(localStorage.getItem('pomatez-focus-v1')||'{\"active\":null,\"records\":[]}')"),write=fs.writeFileSync;
 try{fs.writeFileSync=(file,...args)=>{if(String(file).includes('before-restart-'))throw Error('synthetic backup failure');return write(file,...args)};await assert.rejects(js('window.focusApi.restartApp()'),/synthetic backup failure/);}finally{fs.writeFileSync=write;}
 assert.equal(relaunches,0);assert.equal(quits,0);assert.equal(await js('document.documentElement.inert'),false);
 await js('window.focusApi.restartApp()');assert.equal(relaunches,1);assert.equal(quits,1);const backup=fs.readdirSync(path.join(dir,'backups')).find(n=>n.startsWith('before-restart-'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'backups',backup))),before);
 // A fresh renderer/main owner is needed after a successful restart request,
 // whose production single-flight latch intentionally never opens again.
 const evidence={normalRestart:true,backupFailureRefusesQuit:true,singleFlight:true,silent:true,localInstallerTest:'covered by isolated installed fixture'};
 await js('window.focusApi.restartApp()');assert.equal(relaunches,1);assert.equal(quits,1);assert.equal(installs,0);assert.equal(farm.isVisible(),false);assert.equal(farm.webContents.isAudioMuted(),true);
 fs.writeFileSync(path.join(root,'artifacts/p067-restart-desktop.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));clearTimeout(deadline);app.exit(0);
 }catch(e){console.error(e);clearTimeout(deadline);app.exit(1);}});
