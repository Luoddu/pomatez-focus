// Complete original NSIS path, under an unrelated UUID product/profile only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
if(process.platform!=='win32'||process.env.POMATEZ_INSTALL_TEST!=='1')throw Error('Explicit isolated Windows install test required');
const root=path.resolve(__dirname,'..'),id=crypto.randomUUID(),dir=path.join(root,'artifacts/lu',id.slice(0,8)),profile=path.join(dir,'profile'),install=path.join(dir,'installed'),fixture=path.join(dir,'app'),wait=ms=>new Promise(r=>setTimeout(r,ms));fs.mkdirSync(fixture,{recursive:true});
const run=(exe,args,env={})=>new Promise((resolve,reject)=>{const fd=fs.openSync(path.join(dir,'process.log'),'a'),childEnv={...process.env,...env};delete childEnv.ELECTRON_RUN_AS_NODE;const p=spawn(exe,args,{windowsHide:true,stdio:['ignore',fd,fd],env:childEnv});p.on('error',reject);p.on('exit',code=>{fs.closeSync(fd);code===0?resolve():reject(Error('fixture process exit '+code));});});
(async()=>{
 fs.cpSync(path.join(root,'app/electron/build'),path.join(fixture,'build'),{recursive:true});
 const wrapper=`
const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const folder=${JSON.stringify(dir)},wait=ms=>new Promise(r=>setTimeout(r,ms));
fs.writeFileSync(path.join(folder,'boot-'+app.getVersion()+'.json'),JSON.stringify({incomingProfileMatches:process.env.POMATEZ_PROFILE===${JSON.stringify(profile)},forcedIsolation:true}));
process.env.POMATEZ_PROFILE=${JSON.stringify(profile)};process.env.POMATEZ_HEADLESS='1';
const {FocusService}=require('./build/focus/service');FocusService.prototype.status=()=>({configured:false});FocusService.prototype.today=async()=>[];
require('./build/main');const deadline=setTimeout(()=>{fs.writeFileSync(path.join(folder,'failed.txt'),'app fixture deadline');app.exit(2)},60000);
app.whenReady().then(async()=>{try{
 let farm;const until=async f=>{for(let n=0;n<250;n++){if(await f())return;await wait(35)}throw Error('fixture wait timeout')};await until(()=>{farm=BrowserWindow.getAllWindows()[0];return farm&&!farm.webContents.isLoadingMainFrame()});const js=s=>farm.webContents.executeJavaScript(s,true),click=t=>js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==='+JSON.stringify(t)+'||b.textContent.trim()==='+JSON.stringify(t)+');if(!b||b.disabled)throw Error("missing button "+'+JSON.stringify(t)+');b.click();return true})()');
 assert.equal(farm.isVisible(),false);assert.equal(farm.webContents.isAudioMuted(),true);
 if(app.getVersion()==='0.1.0-preview.2'){
  await until(()=>js("!!JSON.parse(localStorage.getItem('pomatez-focus-v1')||'{}').active"));const actual=await js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))"),before=JSON.parse(fs.readFileSync(path.join(folder,'before.json')));
  assert.deepEqual(actual.records,before.records);assert.deepEqual(actual.active,before.active);assert.equal(actual.active.status,'paused');assert.equal(actual.active.task.creditedSeconds,860);assert.equal(Math.floor(actual.active.elapsedSeconds),100);
  const backups=fs.readdirSync(path.join(process.env.POMATEZ_PROFILE,'backups')).filter(n=>n.startsWith('before-restart-'));assert.equal(backups.length,1);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(process.env.POMATEZ_PROFILE,'backups',backups[0]))),before);
  fs.writeFileSync(path.join(folder,'restarted.json'),JSON.stringify({version:app.getVersion(),preserved:true,paused:true,partialSeconds:860,currentSegmentSeconds:100,records:actual.records.length,backups:backups.length,hidden:true,muted:true,actualNsis:true,localTransfer:true}));clearTimeout(deadline);app.exit(0);return;
 }
 const now=Date.now(),task={id:'synthetic-local',source:'local',title:'Synthetic partial',goalSeconds:1500},record={id:'synthetic-piece',task,startedAt:now-1000000,endedAt:now-140000,plannedSeconds:1500,elapsedSeconds:860,acceptedSeconds:860,completedCount:0,status:'saved',sync:'local',syncTarget:'plan',segments:[{start:now-1000000,end:now-140000}]},active={id:'synthetic-active',task:{...task,creditedSeconds:860},startedAt:now-100000,plannedSeconds:1500,elapsedSeconds:100,status:'paused',sync:'local',syncTarget:'plan',segments:[{start:now-100000,end:now}],segmentOpen:false,recovered:true};
 farm.webContents.debugger.attach('1.3');await farm.webContents.debugger.sendCommand('Page.enable');const seeded=await farm.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("pomatez-focus-v1",'+JSON.stringify(JSON.stringify({active,records:[record]}))+');true'});const loaded=new Promise(r=>farm.webContents.once('did-finish-load',r));farm.webContents.reload();await loaded;await farm.webContents.debugger.sendCommand('Page.removeScriptToEvaluateOnNewDocument',{identifier:seeded.identifier});farm.webContents.debugger.detach();await until(()=>js("!!document.querySelector('.timing-buttons')"));
 const before=await js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");fs.writeFileSync(path.join(folder,'before.json'),JSON.stringify(before));await click('设置');await until(()=>js("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='重启以加载更新')"));
 await click('重启以加载更新');
 }catch(e){fs.writeFileSync(path.join(folder,'failed.txt'),e.stack);clearTimeout(deadline);app.exit(1);}});
`;
 fs.writeFileSync(path.join(fixture,'fixture.cjs'),wrapper);
 const product='PomatezLocalFixture-'+id.slice(0,8);
 for(const n of [1,2]){
  const version='0.1.0-preview.'+n,out=path.join(dir,'v'+n);
  fs.writeFileSync(path.join(fixture,'package.json'),JSON.stringify({name:'p067-'+id.slice(0,8),version,main:'fixture.cjs',description:'Isolated local updater acceptance',author:'test',dependencies:{}}));
  const config={appId:'io.github.luoddu.localtest.'+id,productName:product,electronVersion:'34.5.8',electronDist:path.join(root,'node_modules/electron/dist'),npmRebuild:false,compression:'normal',directories:{app:fixture,output:out},files:['build','fixture.cjs'],win:{target:'nsis'},nsis:{artifactName:'Pomatez-Focus-v'+version+'-win-x64-setup.exe',oneClick:true,perMachine:false,createDesktopShortcut:false,createStartMenuShortcut:false,deleteAppDataOnUninstall:false},publish:{provider:'generic',url:'http://127.0.0.1:9',channel:'preview'}};
  const configFile=path.join(dir,'builder.json');fs.writeFileSync(configFile,JSON.stringify(config));await run(process.execPath,[path.join(root,'node_modules/electron-builder/out/cli/cli.js'),'--config',configFile,'--win','--x64','--publish','never'],{CSC_IDENTITY_AUTO_DISCOVERY:'false'});console.log('Built isolated local fixture '+version);
 }
 const source={head:'a'.repeat(40),dirty:false,version:'0.1.0-preview.2'};fs.writeFileSync(path.join(dir,'v2/source-version.json'),JSON.stringify(source));require('../scripts/stage-local-update.cjs').stage(path.join(dir,'v2'),profile);
 await run(path.join(dir,'v1/Pomatez-Focus-v0.1.0-preview.1-win-x64-setup.exe'),['/S','--force-run','/D='+install],{POMATEZ_HEADLESS:'1',POMATEZ_PROFILE:profile});
 for(let n=0;n<100;n++){if(fs.existsSync(path.join(dir,'failed.txt')))throw Error(fs.readFileSync(path.join(dir,'failed.txt'),'utf8'));if(fs.existsSync(path.join(dir,'restarted.json')))break;await wait(700);}
 const result=JSON.parse(fs.readFileSync(path.join(dir,'restarted.json')));assert.equal(result.version,'0.1.0-preview.2');fs.writeFileSync(path.join(root,'artifacts/p067-installed-update.json'),JSON.stringify({...result,fixtureId:id,personalAppTouched:false,realCloudWrites:0},null,2));console.log(JSON.stringify(result));
 const uninstaller=fs.readdirSync(install).find(n=>n.startsWith('Uninstall ')&&n.endsWith('.exe'));if(uninstaller)await run(path.join(install,uninstaller),['/S']);console.log('Isolated fixture uninstalled');
})().catch(e=>{console.error(e);process.exitCode=1});
