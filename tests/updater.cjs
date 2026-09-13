const {EventEmitter}=require('node:events'),assert=require('node:assert/strict');
const {app}=require('electron');
app.whenReady().then(async()=>{try{
 const {FocusUpdater}=require('../app/electron/build/focus/updater.js');
 class Mock extends EventEmitter {
  async checkForUpdates(){this.checks=(this.checks||0)+1;this.emit('update-available',{version:'0.1.0-preview.21'})}
  async downloadUpdate(){this.downloads=(this.downloads||0)+1;this.emit('download-progress',{percent:50,transferred:5,total:10});if(this.fail)throw Error('hash mismatch');return ['verified.exe']}
  quitAndInstall(...args){this.installs=(this.installs||0)+1;assert.deepEqual(args,[true,true])}
 }
 const mock=new Mock(),states=[];let ready=0,active=true;
 const u=new FocusUpdater(s=>states.push(s),async()=>{ready++;if(active)u.defer();else u.install()},mock,'0.1.0-preview.20');
 assert.equal(mock.autoDownload,false);assert.equal(mock.autoInstallOnAppQuit,false);assert.equal(mock.allowDowngrade,false);
 await u.check();assert.equal(mock.downloads,undefined);assert.equal(u.status().phase,'available');
 await u.download();assert.equal(ready,1);assert.equal(mock.installs,undefined);assert.equal(u.status().phase,'downloaded');assert(states.some(s=>s.percent===50));
 active=false;u.install();assert.equal(mock.installs,1);assert.equal(u.status().phase,'installing');
 const bad=new Mock();bad.fail=true;const v=new FocusUpdater(()=>{},async()=>{throw Error('Must not install')},bad,'0.1.0-preview.20');
 await v.check();await v.download();assert.equal(v.status().phase,'error');assert.equal(bad.installs,undefined);
 const fresh=new Mock();fresh.checkForUpdates=async()=>fresh.emit('update-not-available');const w=new FocusUpdater(()=>{},async()=>{},fresh,'0.1.0-preview.20');
 await w.check();assert.equal(w.status().phase,'current');await w.download();assert.equal(fresh.downloads,undefined);
 const {NsisUpdater}=require('electron-updater'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{randomUUID}=require('node:crypto');
 const dir=path.join(__dirname,'../artifacts/test-profiles',randomUUID());fs.mkdirSync(dir,{recursive:true});
 app.setPath('userData',dir);
 let metadata=false,downloads=0;
 const server=http.createServer((req,res)=>{
  if(req.url.includes('.yml')){
   if(!metadata){res.writeHead(404);res.end();return}
   res.end(JSON.stringify({version:'99.0.0-preview.1',files:[{url:'update.exe',size:131072,sha512:Buffer.alloc(64).toString('base64')}]}));return;
  }
  downloads++;res.setHeader('Content-Length',131072);res.end(Buffer.alloc(131072,42));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const real=new NsisUpdater({provider:'generic',url:`http://127.0.0.1:${server.address().port}`,channel:'preview'});
  real.forceDevUpdateConfig=true;
  const config=path.join(dir,'dev-app-update.yml');fs.writeFileSync(config,JSON.stringify({provider:'generic',url:`http://127.0.0.1:${server.address().port}`,channel:'preview',updaterCacheDirName:`pomatez-negative-${path.basename(dir)}`}));real.updateConfigPath=config;
  const failures=[];real.on('error',e=>failures.push(e.message));
  let installs=0;const negative=new FocusUpdater(()=>{},async()=>{installs++},real);
  await negative.check();assert.equal(negative.status().phase,'error');assert.equal(downloads,0);
  metadata=true;await negative.check();assert.equal(negative.status().phase,'available',failures.join('\n'));assert.equal(downloads,0);
  await negative.download();assert.equal(negative.status().phase,'error');assert.equal(downloads,1);assert.equal(installs,0);
 }finally{await new Promise(r=>server.close(r))}
 console.log('Updater mock checks plus real HTTP 404 and SHA-512 rejection passed; no failed download installed');app.exit(0);
}catch(e){console.error(e.stack);app.exit(1)}});
