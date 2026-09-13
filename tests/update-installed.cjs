// Opt-in Windows integration: actual NSIS download/install/restart with the real app.
// Unique package identity, profile and install directory; no user data or cloud access.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {spawn} = require('node:child_process');
const {randomUUID, createHash} = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
if (process.platform !== 'win32' || process.env.POMATEZ_INSTALL_TEST !== '1') throw Error('Explicit Windows installer test required');
const startPortable = process.env.POMATEZ_TEST_START_PORTABLE === '1';
const dir = path.join(root, 'artifacts', 'update-installed', randomUUID());
fs.mkdirSync(dir, {recursive:true});
const profile = path.join(dir, 'profile'), install = path.join(dir, 'installed');
const wait = ms => new Promise(r=>setTimeout(r,ms));
const run = (exe,args,env={}) => new Promise((resolve,reject)=>{
  const out=fs.openSync(path.join(dir,'process.log'),'a');
  const childEnv={...process.env,...env};delete childEnv.ELECTRON_RUN_AS_NODE;
  const child=spawn(exe,args,{windowsHide:true,stdio:['ignore',out,out],env:childEnv});
  child.on('error',reject); child.on('exit',code=>{fs.closeSync(out);code===0?resolve():reject(Error('Process exit '+code));});
});
let payload, metadata, requestCount=0;
const server=http.createServer((req,res)=>{
  requestCount++;
  if(req.url.split('?')[0].endsWith('.yml')) {res.end(metadata);return;}
  if(req.url.split('?')[0]!=='/update.exe') {res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Length':payload.length,'Content-Type':'application/octet-stream'});
  let offset=0;
  // Real streaming ensures intermediate progress, not merely a final 100% event.
  const tick=setInterval(()=>{if(offset>=payload.length){clearInterval(tick);res.end();return;}res.write(payload.subarray(offset,offset+524288));offset+=524288;},15);
  res.on('close',()=>clearInterval(tick));
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const feed=`http://127.0.0.1:${server.address().port}`;
  const fixture = path.join(dir,'app');fs.mkdirSync(fixture);
  fs.cpSync(path.join(root,'app/electron/build'),path.join(fixture,'build'),{recursive:true});
  const wrapper = `
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.POMATEZ_HEADLESS='1';process.env.POMATEZ_PROFILE=${JSON.stringify(profile)};
const folder=${JSON.stringify(dir)},wait=ms=>new Promise(r=>setTimeout(r,ms));
const updaterModule=require.resolve('./build/focus/updater');const original=require(updaterModule);
const {NsisUpdater}=require(${JSON.stringify(path.join(root,'node_modules/electron-updater'))});
let controller;const events=[];
require.cache[updaterModule].exports={...original,FocusUpdater:class extends original.FocusUpdater{
 constructor(publish,ready){const updater=new NsisUpdater({provider:'generic',url:${JSON.stringify(feed)},channel:'preview'});updater.on('error',e=>fs.writeFileSync(path.join(folder,'updater-error.txt'),e.stack));if(${startPortable})updater.installDirectory=${JSON.stringify(install)};super(s=>{events.push(s);publish(s)},ready,updater);controller=this;}
}};
require('./build/main');
const deadline=setTimeout(()=>{fs.writeFileSync(path.join(folder,'failed.txt'),'timeout');app.exit(2)},90000);
app.whenReady().then(async()=>{
 let w;for(let i=0;i<200;i++){w=BrowserWindow.getAllWindows()[0];if(w&&!w.webContents.isLoadingMainFrame()&&w.webContents.getURL().startsWith('file:'))break;await wait(100)}
 const js=code=>w.webContents.executeJavaScript(code,true).catch(e=>{throw Error(code+': '+e.message)});
 const click=text=>js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==='+JSON.stringify(text)+'||b.textContent==='+JSON.stringify(text)+');if(!b)throw Error("Missing button "+'+JSON.stringify(text)+');b.click()})()');
 await wait(500);assert.equal(w.isVisible(),false);
 if(app.getVersion()==='0.1.0-preview.20'){
  const actual=await js('JSON.parse(localStorage.getItem("pomatez-focus-v1"))');
  const expected=JSON.parse(fs.readFileSync(path.join(folder,'before.json')));
  assert.deepEqual(actual.records,expected.records);assert.equal(actual.active,null);
  assert.ok(fs.readdirSync(path.join(${JSON.stringify(profile)},'backups')).some(n=>n.startsWith('before-update-')));
  fs.writeFileSync(path.join(folder,'restarted.json'),JSON.stringify({version:app.getVersion(),records:actual.records.length,preserved:true,hidden:!w.isVisible()}));clearTimeout(deadline);app.exit(0);return;
 }
 assert.equal(controller.status().phase,'idle');await wait(400);
 await click('开始专注');await wait(1100);await click('暂停');await wait(100);
 await click('设置');await wait(150);
 assert.ok(await js('!!document.querySelector("[aria-label=软件更新]")'));
 await click('检查更新');for(let i=0;i<200&&controller.status().phase==='checking';i++)await wait(50);
 assert.equal(controller.status().phase,'available');
 // Do not click any download button during check; the server receipt confirms no payload.
 fs.writeFileSync(path.join(folder,'checked.json'),JSON.stringify(controller.status()));
 await click('下载更新并重启');
 let visibleProgress=false;
 for(let i=0;i<1000&&!['downloaded','error'].includes(controller.status().phase);i++){
  if(await js('!!document.querySelector("progress[aria-label=更新下载进度]")'))visibleProgress=true;
  await wait(50);
 }
 assert.equal(controller.status().phase,'downloaded');assert.ok(visibleProgress);assert.ok(events.some(e=>e.phase==='downloading'&&e.percent>0&&e.percent<100));
 assert.ok(controller.status().message.includes('先结束'));
 const active=await js('JSON.parse(localStorage.getItem("pomatez-focus-v1")).active');assert.equal(active.status,'paused');
 // Active/paused/review all prevent install, while the app remains usable.
 for(const status of ['active','paused','review']){
  await js('(()=>{const s=JSON.parse(localStorage.getItem("pomatez-focus-v1"));s.active.status='+JSON.stringify(status)+';localStorage.setItem("pomatez-focus-v1",JSON.stringify(s));})()');
  await js('window.focusApi.installUpdate()');assert.equal(controller.status().phase,'downloaded');
 }
 await click('设置');await wait(100);await click('结束');await wait(100);await click('确认结束');await wait(100);await click('记录番茄');await wait(200);
 const before=await js('JSON.parse(localStorage.getItem("pomatez-focus-v1"))');assert.equal(before.active,null);assert.equal(before.records.length,1);
 fs.writeFileSync(path.join(folder,'before.json'),JSON.stringify(before));
 fs.writeFileSync(path.join(folder,'downloaded.json'),JSON.stringify({progress:visibleProgress,intermediate:events.filter(e=>e.phase==='downloading').length,activeGuards:3}));
 await js('window.focusApi.installUpdate()');
}).catch(e=>{fs.writeFileSync(path.join(folder,'failed.txt'),e.stack);app.exit(1)});
`;
  fs.writeFileSync(path.join(fixture,'fixture.cjs'),wrapper);
  const identity='pomatez-update-fixture-'+path.basename(dir).slice(0,8);
  const product='PomatezUpdateFixture-'+path.basename(dir).slice(0,8);
  for(const version of ['0.1.0-preview.19','0.1.0-preview.20']){
    const out=path.join(dir,version);
    fs.writeFileSync(path.join(fixture,'package.json'),JSON.stringify({name:identity,version,main:'fixture.cjs',author:'test',description:'Isolated updater verification',dependencies:{}}));
    // Match production's portable+NSIS target set: it embeds app-update.yml
    // before packaging both artifacts. A portable-only build omits that file.
    const config={appId:'io.github.luoddu.'+identity,productName:product,electronVersion:'34.5.8',electronDist:path.join(root,'node_modules/electron/dist'),npmRebuild:false,compression:'store',directories:{app:fixture,output:out},files:['build','fixture.cjs'],win:{target:startPortable&&version.endsWith('.19')?['portable','nsis']:'nsis'},portable:{artifactName:'portable.exe'},nsis:{artifactName:'update.exe',oneClick:true,perMachine:false,createDesktopShortcut:false,createStartMenuShortcut:false,deleteAppDataOnUninstall:false},publish:{provider:'generic',url:feed,channel:'preview'}};
    const conf=path.join(dir,'builder.json');fs.writeFileSync(conf,JSON.stringify(config));
    await run(process.execPath,[path.join(root,'node_modules/electron-builder/out/cli/cli.js'),'--config',conf,'--win','--x64','--publish','never'],{CSC_IDENTITY_AUTO_DISCOVERY:'false'});
    console.log('Built isolated '+version);
  }
  payload=fs.readFileSync(path.join(dir,'0.1.0-preview.20/update.exe'));
  const hash=createHash('sha512').update(payload).digest('base64');
  metadata=JSON.stringify({version:'0.1.0-preview.20',files:[{url:'update.exe',sha512:hash,size:payload.length}],path:'update.exe',sha512:hash});
  await run(path.join(dir,'0.1.0-preview.19',startPortable?'portable.exe':'update.exe'),startPortable?[]:['/S','--force-run','/D='+install],{ELECTRON_RUN_AS_NODE:'',POMATEZ_HEADLESS:'1',POMATEZ_PROFILE:profile});
  for(let i=0;i<160;i++){
    if(fs.existsSync(path.join(dir,'failed.txt')))throw Error(fs.readFileSync(path.join(dir,'failed.txt'),'utf8'));
    if(fs.existsSync(path.join(dir,'restarted.json')))break;
    await wait(1000);
  }
  const restarted=JSON.parse(fs.readFileSync(path.join(dir,'restarted.json')));
  const downloaded=JSON.parse(fs.readFileSync(path.join(dir,'downloaded.json')));
  assert.equal(restarted.version,'0.1.0-preview.20');
  const result={...restarted,...downloaded,requests:requestCount,actualNsis:true,startPortable,sha512:hash};
  fs.writeFileSync(path.join(root,'artifacts',startPortable?'update-portable-result.json':'update-installed-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  // NSIS' own uninstaller removes only this uniquely named fixture registration/files.
  const uninstaller=fs.readdirSync(install).find(n=>n.startsWith('Uninstall ')&&n.endsWith('.exe'));
  if(uninstaller)await run(path.join(install,uninstaller),['/S']);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
