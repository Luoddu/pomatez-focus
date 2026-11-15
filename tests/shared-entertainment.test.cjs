const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),https=require('node:https'),Module=require('node:module');
const {Authority,createServer}=require('../services/shared-entertainment/server.cjs');
const {decide}=require('../app/electron/src/assets/browser-control/background.js');
// Test codec, scoped to the module load. Real safeStorage is checked by desktop test.
const encryptionKey=crypto.randomBytes(32),nonce=crypto.randomBytes(16);
const codec={isEncryptionAvailable:()=>true,encryptString:s=>{const c=crypto.createCipheriv('aes-256-cbc',encryptionKey,nonce);return Buffer.concat([c.update(s),c.final()]);},decryptString:b=>{const d=crypto.createDecipheriv('aes-256-cbc',encryptionKey,nonce);return Buffer.concat([d.update(b),d.final()]).toString();}};
const old=Module._load;Module._load=function(name,...args){return name==='electron'?{safeStorage:codec}:old.call(this,name,...args);};
const {SharedEntertainment}=require('../app/electron/build/focus/sharedEntertainment');Module._load=old;
test('actual HTTPS two desktop clients share permits, encrypted configuration reload, outage expires lease',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p095-client-'));let now=Date.now(),mono=0;
 const a=new Authority(path.join(dir,'test.sqlite'),{now:()=>now});
 const token1=crypto.randomBytes(32).toString('hex'),token2=crypto.randomBytes(32).toString('hex');
 const httpServer=createServer(a,{[token1]:'one',[token2]:'two'});
 const cert=require('selfsigned').generate([{name:'commonName',value:'localhost'}],{days:1,keySize:2048,extensions:[{name:'subjectAltName',altNames:[{type:7,ip:'127.0.0.1'}]}]});
 const server=https.createServer({key:cert.private,cert:cert.cert},httpServer.listeners('request')[0]);
 const oldCa=https.globalAgent.options.ca;https.globalAgent.options.ca=cert.cert;
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='https://127.0.0.1:'+server.address().port;
 t.after(async()=>{https.globalAgent.options.ca=oldCa;await new Promise(r=>{server.closeAllConnections();server.close(r);});a.close();fs.rmSync(dir,{recursive:true,force:true});});
 const one=new SharedEntertainment(path.join(dir,'one'),()=>mono),two=new SharedEntertainment(path.join(dir,'two'),()=>mono);
 await one.configure({url,token:token1});await two.configure({url,token:token2});
 assert.equal(fs.readFileSync(path.join(dir,'one/shared-entertainment.enc')).includes(token1),false);
 assert.equal(one.snapshot().allowedMs,0);await one.action('release');
 const state={status:'recording',live:{site:'bilibili',expiresAt:Date.now()+60000},usage:null};
 await Promise.all([one.tick(state,true,false),two.tick(state,true,false)]);
 assert.equal(one.snapshot().reservedMs,20000);assert.equal(two.snapshot().reservedMs,20000);assert.equal(one.snapshot().allowedMs,20000);
 const restored=new SharedEntertainment(path.join(dir,'one'),()=>mono);assert.equal(restored.snapshot().enabled,true);assert.equal(restored.snapshot().allowedMs,0);
 await restored.tick(state,true,false);assert.equal(restored.snapshot().reservedMs,20000);
 await assert.rejects(restored.configure({url,token:token1}),/已绑定/);
 const release=one.snapshot().releaseMs;mono+=5000;now+=5000;await two.action('release');assert.equal(two.snapshot().releaseMs,release-5000);
 await new Promise(r=>{server.closeAllConnections();server.close(r);});mono+=5000;now+=5000;
 await one.tick(state,true,false);assert.match(one.snapshot().error,/不发新额度/);assert.ok(one.snapshot().allowedMs<=10000);
 mono+=20000;assert.equal(one.snapshot().allowedMs,0);assert.ok(one.snapshot().releaseMs>0);
});
test('invalid config never enables sharing; enabled corrupt file stays fail closed',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p095-invalid-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const c=new SharedEntertainment(dir);await assert.rejects(c.configure({url:'http://localhost',token:'a'.repeat(64)}),/HTTPS/);assert.equal(c.snapshot().enabled,false);
 fs.writeFileSync(path.join(dir,'shared-entertainment.enc'),'bad');const broken=new SharedEntertainment(dir);await broken.tick({},true,false);assert.equal(broken.snapshot().enabled,true);assert.equal(broken.snapshot().allowedMs,0);assert.match(broken.snapshot().error,/读取失败/);
});
test('extension shared gate applies every day, disconnected fails closed, ordinary local behavior preserved',()=>{
 const now=new Date(2026,10,15,12).getTime(); // Sunday: strict alone would not block.
 const s={v:1,ready:true,supervise:true,leaseVersion:2,expiresAt:now+15000,mode:'mirror',day:'2026-11-15',cooldownMinutes:2,shared:{enabled:true,allowedUntil:now+10000,cooldownUntil:0}};
 const allowed=decide(s,{},now);assert.equal(allowed.control.sharedAllowedUntil,now+10000);assert.equal(allowed.control.pause,false);
 const offline=decide({ready:false},allowed,now);assert.equal(offline.shared,true);assert.equal(offline.control.sharedAllowedUntil,0);assert.equal(offline.control.pause,true);
 assert.equal(decide({...s,shared:{...s.shared,cooldownUntil:now+2000}},allowed,now).control.sharedAllowedUntil,0);
 assert.equal(decide({...s,shared:undefined},{},now).control.shared,undefined);
});
