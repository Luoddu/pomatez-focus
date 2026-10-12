const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {BrowserControl,FarmPresence,validBrowserPolicy}=require('../app/electron/build/focus/browserControl');
const {decide,target}=require('../app/electron/src/assets/browser-control/background');
const root=path.resolve(__dirname,'..'),build=path.join(root,'app/electron/build');
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'pomo-control-test-'));
test('real service-worker concurrent activation/connect is single-flight; disconnect clears one timer and healthy reconnect works',async()=>{
 const vm=require('node:vm'),callbacks={},waiters=[],ports=[],timers=new Set();let sequence=0,nativeCalls=0;
 const event=name=>({addListener:f=>callbacks[name]=f});
 const chrome={runtime:{lastError:null,onMessage:event('request'),onStartup:event('startup'),onInstalled:event('installed'),connectNative:()=>{nativeCalls++;const p={onMessage:event('message'+nativeCalls),onDisconnect:event('disconnect'+nativeCalls),postMessage:()=>{},disconnect:()=>{}};ports.push(p);return p;}},tabs:{query:()=>new Promise(r=>waiters.push(r)),sendMessage:async()=>({pausedCount:0}),onUpdated:event('updated'),onActivated:event('activated'),onRemoved:event('removed')},storage:{session:{get:async()=>({}),set:async()=>{}}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'app/electron/src/assets/browser-control/background.js'),'utf8'),{chrome,URL,Date,Promise,setInterval:()=>{const id=++sequence;timers.add(id);return id;},clearInterval:id=>timers.delete(id),setTimeout:()=>++sequence,clearTimeout:()=>{}});
 const flush=()=>new Promise(r=>setImmediate(r));await flush();callbacks.activated();callbacks.updated(1,{status:'complete'},{url:'https://www.bilibili.com/synthetic'});callbacks.installed();assert.equal(waiters.length,1);
 waiters.splice(0).forEach(r=>r([{id:1,url:'https://www.bilibili.com/synthetic',active:true}]));await flush();assert.equal(nativeCalls,1);assert.equal(timers.size,1);
 callbacks.disconnect1();assert.equal(timers.size,0);await flush();callbacks.activated();waiters.splice(0).forEach(r=>r([{id:1,url:'https://www.bilibili.com/synthetic',active:true}]));await flush();assert.equal(nativeCalls,2);assert.equal(timers.size,1);
 callbacks.message1({v:1,ready:true});await flush();assert.equal(nativeCalls,2);
});
function state(now){const d=new Date(now),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return {status:'recording',settings:{supervise:true,quotaMinutes:60},live:{checkedAt:now,expiresAt:now+7000,site:'bilibili'},usage:{day,totalSeconds:300},reminder:{key:'test/5'}};}
test('four intervention modes clear on expiry/off/day; normal pause and cooldown allow correct continuation',()=>{
 const now=Date.now(),base={v:1,ready:true,supervise:true,expiresAt:now+7000,day:'2026-10-12',mode:'pause',cooldownMinutes:2,reminderKey:'test/5',quotaSpent:false},old={day:'',key:'',until:0};
 const p=decide(base,old,now);assert.equal(p.control.pause,true);assert.equal(p.control.blockedUntil,0);assert.equal(decide(base,p,now+1000).control.pause,false);
 assert.equal(decide({...base,mode:'mirror'},old,now).control.pause,false);
 const c=decide({...base,mode:'cooldown'},old,now);assert.equal(c.control.blockedUntil,now+120000);assert.equal(decide({...base,ready:false},c,now).control.blockedUntil,0);
 assert.equal(decide({...base,supervise:false},c,now).until,0);
 const q=decide({...base,mode:'quota',quotaSpent:true},old,now);assert.ok(q.control.blockedUntil>now);
 assert.equal(decide({...base,mode:'quota',day:'2026-10-13'},q,now).control.blockedUntil,0);
 assert.equal(target('https://www.bilibili.com/video/synthetic'),true);assert.equal(target('https://bilibili.com.evil/'),false);assert.equal(target('https://example.com/'),false);
});
test('farm raise keeps bounds and focus untouched, restores original pin on leave and disabled policy',()=>{
 let pin=false,shows=0,moves=0,focus=0;const bounds={x:20,y:40,width:800,height:600},fake={isDestroyed:()=>false,isAlwaysOnTop:()=>pin,setAlwaysOnTop:v=>pin=v,isMinimized:()=>true,restore:()=>{throw Error('activating restore forbidden')},showInactive:()=>shows++,moveTop:()=>moves++,focus:()=>focus++};
 const now=Date.now(),presence=new FarmPresence(()=>fake,false),s=state(now),policy=validBrowserPolicy({mode:'pause',cooldownMinutes:2,autoRaise:true});
 presence.update(s,policy,now);presence.update(s,policy,now+500);assert.equal(pin,true);assert.equal(shows,1);assert.equal(moves,1);assert.equal(focus,0);assert.deepEqual(bounds,{x:20,y:40,width:800,height:600});
 presence.update({...s,live:{...s.live,site:null}},policy,now);assert.equal(pin,false);
 pin=true;presence.update(s,policy,now);presence.close();assert.equal(pin,true);
 assert.throws(()=>validBrowserPolicy({...policy,cooldownMinutes:0}));assert.deepEqual(validBrowserPolicy(policy),policy);
});
test('per-user setup refuses foreign registry/paths while legitimate setup copies fixed extension and reads registration receipt',()=>{
 const dir=temp(),c=new BrowserControl(dir,build),old=()=> 'C:\\foreign\\manifest.json';let writes=0;
 assert.throws(()=>c.install(process.execPath,{read:old,write:()=>writes++}),/其他来源/);assert.equal(writes,0);
 let registered=null;const r=c.install(process.execPath,{read:()=>registered,write:v=>registered=v});assert.match(r.extensionId,/^[a-p]{32}$/);assert.ok(fs.existsSync(path.join(r.directory,'manifest.json')));
 const manifest=JSON.parse(fs.readFileSync(registered));assert.deepEqual(manifest.allowed_origins,[`chrome-extension://${r.extensionId}/`]);
 const control=JSON.parse(fs.readFileSync(path.join(dir,'browser-control/host-config.json')));assert.equal(control.owner,'pomatez-browser-control-v1');
 assert.equal(c.snapshot().installed,true);c.configure({mode:'cooldown',cooldownMinutes:3,autoRaise:false});assert.equal(new BrowserControl(dir,build).policy.mode,'cooldown');
});
test('partial first install leaves no registry/foreign target; restored copy can retry successfully',()=>{
 const dir=temp(),c=new BrowserControl(dir,build);let registry=null,writes=0;const reg={read:()=>registry,write:v=>{registry=v;writes++}},copy=fs.copyFileSync;
 try {fs.copyFileSync=()=>{throw Error('synthetic disk failure')};assert.throws(()=>c.install(process.execPath,reg),/synthetic disk failure/)} finally {fs.copyFileSync=copy}
 assert.equal(writes,0);assert.equal(fs.existsSync(path.join(dir,'browser-control')),false);
 assert.ok(c.install(process.execPath,reg).extensionId);assert.equal(writes,1);
});
function host(dir,origin){const folder=path.join(dir,'browser-control');fs.mkdirSync(folder,{recursive:true});fs.copyFileSync(path.join(build,'focus/nativeBrowserHost.js'),path.join(folder,'nativeBrowserHost.js'));const config=path.join(folder,'host-config.json');fs.writeFileSync(config,JSON.stringify({owner:'pomatez-browser-control-v1',directory:dir,origin:'chrome-extension://'+'a'.repeat(32)+'/'}));const child=spawn(process.execPath,[path.join(folder,'nativeBrowserHost.js'),config,origin],{windowsHide:true,stdio:['pipe','pipe','pipe']});return child;}
test('real native binary framing accepts bounded normal status, strips private fields and refuses wrong origin/oversize',async()=>{
 const dir=temp(),now=Date.now(),c=new BrowserControl(dir,build,()=>now);c.publish(state(now));const file=path.join(dir,'browser-control-projection.json');const raw=JSON.parse(fs.readFileSync(file));raw.privateUrl='never-return';fs.writeFileSync(file,JSON.stringify(raw));
 const child=host(dir,'chrome-extension://'+'a'.repeat(32)+'/'),exit=new Promise(r=>child.on('exit',r)),reply=new Promise(r=>child.stdout.once('data',r));const body=Buffer.from(JSON.stringify({type:'status'})),h=Buffer.alloc(4);h.writeUInt32LE(body.length);child.stdin.write(h.subarray(0,2));child.stdin.write(Buffer.concat([h.subarray(2),body]));
 const bytes=await reply;const answer=JSON.parse(bytes.subarray(4,4+bytes.readUInt32LE(0)));assert.equal(answer.ready,true);assert.equal(answer.mode,'pause');assert.equal(answer.privateUrl,undefined);child.stdin.end();assert.equal(await exit,0);
 const before=fs.readFileSync(path.join(dir,'browser-control-receipt.json'),'utf8'),bad=host(dir,'chrome-extension://'+'b'.repeat(32)+'/');assert.equal(await new Promise(r=>bad.on('exit',r)),1);assert.equal(fs.readFileSync(path.join(dir,'browser-control-receipt.json'),'utf8'),before);
 const huge=host(dir,'chrome-extension://'+'a'.repeat(32)+'/');const hugeExit=new Promise(r=>huge.on('exit',r));const badHeader=Buffer.alloc(4);badHeader.writeUInt32LE(4097);huge.stdin.write(badHeader);assert.equal(await hugeExit,1);
});
