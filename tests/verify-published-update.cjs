// Read-only verification using the actual previously installed updater bundle.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
if(!process.versions.electron){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const r=require('node:child_process').spawnSync(require('electron'),[__filename],{env,stdio:'inherit',windowsHide:true,timeout:70000});
  if(r.error)throw r.error;process.exit(r.status??1);
}
const {app}=require('electron');
const asar=process.env.POMATEZ_PREVIOUS_ASAR,expected=process.env.POMATEZ_EXPECTED_UPDATE;
if(!asar||!/^0\.1\.0-preview\.\d+$/.test(expected||''))throw Error('Explicit previous package and expected version required');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pomo-release-check-'));app.setPath('userData',dir);
const proxy=process.env.HTTPS_PROXY;
if(proxy){const u=new URL(proxy);if(u.hostname!=='127.0.0.1'||u.username||u.password)throw Error('Only the existing local proxy is supported');app.commandLine.appendSwitch('proxy-server',u.host);}
const deadline=setTimeout(()=>app.exit(2),60000);
app.whenReady().then(async()=>{try{
 const archive=require('@electron/asar');
 const previous=JSON.parse(archive.extractFile(asar,'package.json').toString());
 const provenance=JSON.parse(archive.extractFile(asar,path.join('build','source-version.json')).toString());
 assert.equal(previous.version,provenance.version);assert.equal(provenance.dirty,false);
 const source=archive.extractFile(asar,path.join('build','focus','updater.js'));
 const file=path.join(dir,'previous-updater.cjs');fs.writeFileSync(file,source);
 app.getVersion=()=>previous.version;
 const {FocusUpdater}=require(file);const states=[];
 const wrapper=new FocusUpdater(s=>states.push(s),async()=>{throw Error('No download/install allowed')},undefined,previous.version);
 const real=wrapper.updater;real.forceDevUpdateConfig=true;
 const config=path.join(dir,'dev-app-update.yml');fs.writeFileSync(config,JSON.stringify({provider:'github',owner:'Luoddu',repo:'pomatez-focus',channel:'preview',updaterCacheDirName:path.basename(dir)}));real.updateConfigPath=config;
 let info=null,downloads=0;const errors=[];
 real.on('update-available',x=>info=x);real.on('update-not-available',x=>info=x);real.on('download-progress',()=>downloads++);real.on('error',e=>errors.push(e.message));
 const result=await wrapper.check();
 assert.equal(result.phase,previous.version===expected?'current':'available',errors.join(' | '));if(previous.version!==expected)assert.equal(result.version,expected);assert.equal(info.version,expected);
 assert(info.files.some(f=>f.url===`Pomatez-Focus-v${expected}-win-x64-setup.exe`));
 assert.equal(real.autoDownload,false);assert.equal(real.autoInstallOnAppQuit,false);assert.equal(downloads,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({previousVersion:previous.version,previousSource:provenance.head,updaterSHA256:require('node:crypto').createHash('sha256').update(source).digest('hex'),detected:result,files:info.files,errors,downloads,autoDownload:real.autoDownload,autoInstallOnAppQuit:real.autoInstallOnAppQuit},null,2));
 clearTimeout(deadline);app.exit(0);
}catch(e){console.error(e.stack);clearTimeout(deadline);app.exit(1);}});
