const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
if(process.env.POMATEZ_HEADLESS!=='1'||!process.env.POMATEZ_PROFILE)throw Error('isolated silent profile required');
const {FocusService}=require('../app/electron/build/focus/service');
FocusService.prototype.status=()=>({configured:false});FocusService.prototype.today=async()=>[];FocusService.prototype.history=async()=>({records:[],missing:0});FocusService.prototype.dailyReviews=async()=>({reviews:{}});
const main=require('../app/electron/build/main'),{call}=require('../app/electron/src/assets/sleep-client.cjs'),journey=require('../app/electron/src/assets/journey-client.cjs');
const timer=setTimeout(()=>app.exit(2),55000),wait=ms=>new Promise(r=>setTimeout(r,ms));
const req=(op,extra={})=>({protocol:1,requestId:randomUUID(),op,...extra});
const check=r=>{assert.equal(r.error,undefined,JSON.stringify(r));return r;};
app.whenReady().then(async()=>{try{
 const ready=()=>{try{return JSON.parse(fs.readFileSync(path.join(main.journeyGateway.directory,'status.json'),'utf8')).instance===main.journeyGateway.instance;}catch(_){return false;}};
 for(let i=0;i<150&&!ready();i++)await wait(50);assert.ok(ready(),'current App instance ready');
 const profile=process.env.POMATEZ_PROFILE;
 if(process.env.P094_RESTART==='1'){const fixture=JSON.parse(fs.readFileSync(path.join(profile,'p094-test-request.json'),'utf8'));const r=check(await call(fixture.request,profile));assert.equal(r.replayed,true);assert.equal(r.entry.revision,fixture.revision);console.log(JSON.stringify({passed:1,checks:['real App restart preserves receipt and corrected record']}));clearTimeout(timer);app.exit(0);return;}
 const b=req('check_in',{kind:'bedtime',at:'2026-01-01T23:30:00+08:00',expectedRevision:null});
 const concurrent=await Promise.all([call(b,profile),call(b,profile)]);concurrent.forEach(check);assert.equal(concurrent.filter(r=>r.replayed).length,1);
 const old=check(concurrent[0]).entry;
 const w=req('check_in',{kind:'wake',at:'2026-01-02T07:50:00+08:00',expectedRevision:old.revision});const saved=check(await call(w,profile));assert.equal(saved.entry.reportedRestMinutes,500);
 assert.equal((await call({...w,requestId:randomUUID()},profile)).error.code,'CONFLICT');
 const corrected=check(await call(req('correct',{day:old.day,wakeAt:'2026-01-02T08:01:00+08:00',expectedRevision:saved.entry.revision}),profile));assert.equal(corrected.entry.wakeOnTarget,false);
 const replay=check(await call(w,profile));assert.equal(replay.replayed,true);assert.equal(replay.entry.revision,corrected.entry.revision);
 const stats=check(await call(req('stats',{through:old.day,days:2}),profile));assert.equal(stats.summary.completeNights,1);
 const data=JSON.parse(fs.readFileSync(main.sleepStore.file,'utf8'));assert.equal(Object.keys(data.entries).length,1);assert.equal(Object.keys(data.receipts).length,3);
 fs.writeFileSync(path.join(profile,'p094-test-request.json'),JSON.stringify({request:w,revision:corrected.entry.revision}));
 const before=fs.readFileSync(main.sleepStore.file,'utf8');
 // Real source stdio entry, not just an imported helper, using the same isolated profile.
 const {spawn}=require('node:child_process');const env={...process.env,ELECTRON_RUN_AS_NODE:'1',APPDATA:path.dirname(profile)};
 // Default client deliberately has no arbitrary CLI profile; the fixture profile is named pomatez-focus.
 const cli=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.resolve('scripts/sleep-client.cjs')],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',c=>out+=c);p.stderr.on('data',c=>err+=c);p.on('error',reject);p.on('exit',code=>{try{assert.equal(code,0,err+out);resolve(JSON.parse(out));}catch(e){reject(e);}});p.stdin.end(JSON.stringify(req('read',{day:old.day})));});assert.equal(check(cli).entry.revision,corrected.entry.revision);
 assert.equal(fs.readFileSync(main.sleepStore.file,'utf8'),before);
 const farm=BrowserWindow.getAllWindows()[0];assert.equal(farm.isVisible(),false);assert.equal(farm.webContents.isAudioMuted(),true);
 // Existing journey request still routes to renderer and never changes sleep data.
 const day=new Date(Date.now()+8*3600000).toISOString().slice(0,10);const j=await journey.call(req('read',{day}),profile);check(j);assert.equal(fs.readFileSync(main.sleepStore.file,'utf8'),before);
 console.log(JSON.stringify({passed:9,checks:['real concurrent native transport idempotence','bed/wake pair','stale revision rejection','explicit correction','retry returns current record','stats','persistent receipt count','real stdin/stdout CLI read','existing Journey route and silent window'],profile:'synthetic',ports:0}));clearTimeout(timer);app.exit(0);
 }catch(e){console.error(e);clearTimeout(timer);app.exit(1)}});
