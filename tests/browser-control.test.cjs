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
test('full worker lifecycle: delayed old storage/clear cannot receipt or release new B; live native host accepts B receipt',async()=>{
 const vm=require('node:vm'),callbacks={},messages=[],receipts=[],stores=[],ports=[];let n=0;
 const event=name=>({addListener:f=>callbacks[name]=f}),list=[{id:1,url:'https://www.bilibili.com/synthetic',active:true}];
 const chrome={runtime:{lastError:null,onMessage:event('request'),onStartup:event('startup'),onInstalled:event('installed'),connectNative:()=>{const k=++n,p={onMessage:event('message'+k),onDisconnect:event('disconnect'+k),postMessage:v=>{if(v.type==='receipt')receipts.push({port:k,...v})},disconnect:()=>{}};ports.push(p);return p;}},tabs:{query:async()=>list,sendMessage:async(_id,v)=>{messages.push(v);return {pausedCount:v.pause?1:0}},onUpdated:event('updated'),onActivated:event('activated'),onRemoved:event('removed')},storage:{session:{get:async()=>({}),set:()=>new Promise(r=>stores.push(r))}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'app/electron/src/assets/browser-control/background.js'),'utf8'),{chrome,URL,Date,Promise,setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1,clearTimeout:()=>{}});
 const flush=()=>new Promise(r=>setImmediate(r)),now=Date.now(),a={v:1,ready:true,supervise:true,expiresAt:now+7000,day:state(now).usage.day,mode:'pause',cooldownMinutes:2,reminderKey:'old/A'};
 await flush();callbacks.message1(a);await flush();assert.equal(stores.length,1);
 callbacks.disconnect1();callbacks.activated();await flush();assert.equal(n,2);callbacks.message2({...a,reminderKey:'new/B'});await flush();
 stores.shift()();await flush();while(stores.length){stores.shift()();await flush()}
 assert.deepEqual(receipts,[{port:2,type:'receipt',key:'new/B',pausedCount:1}]);assert.equal(messages.filter(v=>!v.pause&&v.expiresAt===0).length,0);
 let displayed;callbacks.request({type:'getControl'},{tab:list[0]},v=>displayed=v);assert.equal(displayed.expiresAt,a.expiresAt);
 const dir=temp(),control=new BrowserControl(dir,build),s=state(now);s.reminder.key='new/B';control.publish(s);
 const child=host(dir,'chrome-extension://'+'a'.repeat(32)+'/'),exit=new Promise(r=>child.on('exit',r)),reply=new Promise(r=>child.stdout.once('data',r)),body=Buffer.from(JSON.stringify({type:'receipt',key:receipts[0].key,pausedCount:receipts[0].pausedCount})),header=Buffer.alloc(4);header.writeUInt32LE(body.length);child.stdin.write(Buffer.concat([header,body]));const bytes=await reply,paused=control.snapshot().pausedCount;child.stdin.end();assert.equal(await exit,0);assert.equal(JSON.parse(bytes.subarray(4)).ready,true,bytes.subarray(4).toString());assert.equal(paused,1);
 callbacks.disconnect2();await flush();while(stores.length){stores.shift()();await flush()}callbacks.request({type:'getControl'},{tab:list[0]},v=>displayed=v);assert.equal(displayed.expiresAt,0);
});
test('four intervention modes clear on expiry/off/day; normal pause and cooldown allow correct continuation',()=>{
 const now=Date.now(),base={v:1,ready:true,supervise:true,expiresAt:now+7000,day:'2026-10-12',mode:'pause',cooldownMinutes:2,reminderKey:'test/5',quotaSpent:false},old={day:'',key:'',until:0};
 const p=decide(base,old,now);assert.equal(p.control.pause,true);assert.equal(p.control.blockedUntil,0);assert.equal(decide(base,p,now+1000).control.pause,false);
 assert.equal(decide({...base,mode:'mirror'},old,now).control.pause,false);
 const c=decide({...base,mode:'cooldown'},old,now);assert.equal(c.control.blockedUntil,now+120000);assert.equal(decide({...base,ready:false},c,now).control.blockedUntil,0);
 assert.equal(decide({...base,supervise:false},c,now).control.blockedUntil,0);
 const q=decide({...base,mode:'quota',quotaSpent:true},old,now);assert.ok(q.control.blockedUntil>now);
 assert.equal(decide({...base,mode:'quota',day:'2026-10-13'},q,now).control.blockedUntil,0);
 assert.equal(target('https://www.bilibili.com/video/synthetic'),true);assert.equal(target('https://bilibili.com.evil/'),false);assert.equal(target('https://example.com/'),false);
});
test('cooldown resumes its original deadline after supervision off or stale lease, never replays an expired reminder',()=>{
 const now=Date.now(),base={v:1,ready:true,supervise:true,expiresAt:now+7000,day:'2026-10-25',mode:'cooldown',cooldownMinutes:5,reminderKey:'same/5',quotaSpent:false};
 const first=decide(base,{day:'',key:'',until:0},now),end=now+300000;
 for(const disabled of [{supervise:false},{ready:false},{expiresAt:now-1}]) {
  const off=decide({...base,...disabled},first,now+1000);assert.equal(off.control.blockedUntil,0);assert.equal(off.control.pause,false);
  const resumed=decide({...base,expiresAt:now+9000},off,now+2000);assert.equal(resumed.control.blockedUntil,end);assert.equal(resumed.control.pause,true);
  const repeated=decide({...base,expiresAt:now+10000},resumed,now+3000);assert.equal(repeated.until,end);assert.equal(repeated.control.pause,false);
  const expired=decide({...base,expiresAt:end+7000},off,end+1);assert.ok(expired.control.blockedUntil<=end);assert.equal(expired.control.pause,false);
  const next=decide({...base,reminderKey:'next/10',expiresAt:end+7000},expired,end+2);assert.equal(next.control.blockedUntil,end+2+300000);assert.equal(next.control.pause,true);
 }
 const cleared=decide({...base,supervise:false,reminderKey:''},first,now+1000);
 assert.equal(decide({...base,reminderKey:'',expiresAt:now+9000},cleared,now+2000).until,end,'configuration may clear pending reminder without cancelling existing deadline');
 const tomorrow=decide({...base,day:'2026-10-26',reminderKey:''},cleared,now+2000);assert.equal(tomorrow.until,0);
 const quota=decide({...base,mode:'quota',quotaSpent:true},{day:'',key:'',until:0},now);
 assert.equal(decide(base,quota,now+1000).until,0,'quota deadline must not leak into cooldown');
 const mirror=decide({...base,mode:'mirror'},first,now+1000);assert.equal(mirror.until,0);assert.equal(mirror.control.pause,false);
 assert.equal(decide(base,mirror,now+2000).until,0,'explicit mode change cancels old cooldown');
});
test('real worker reconnect and session restart restore remaining cooldown without another timer or repeated penalty',async()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.join(root,'app/electron/src/assets/browser-control/background.js'),'utf8');
 let now=Date.now(),saved={},nativeCalls=0;const timers=new Set();
 const boot=()=>{const callbacks={},messages=[],receipts=[];let timerId=0;
  const event=name=>({addListener:f=>callbacks[name]=f});
  const chrome={runtime:{lastError:null,onMessage:event('request'),onStartup:event('startup'),onInstalled:event('installed'),connectNative:()=>{const k=++nativeCalls;return {onMessage:event('message'+k),onDisconnect:event('disconnect'+k),postMessage:v=>{if(v.type==='receipt')receipts.push(v)},disconnect:()=>{}}}},tabs:{query:async()=>[{id:1,url:'https://www.bilibili.com/synthetic',active:true}],sendMessage:async(_id,v)=>{messages.push(v);return {pausedCount:v.blockedUntil>now?1:0}},onUpdated:event('updated'),onActivated:event('activated'),onRemoved:event('removed')},storage:{session:{get:async()=>saved,set:async v=>saved=structuredClone(v)}}};
  vm.runInNewContext(source,{chrome,URL,Date:{now:()=>now},Promise,setInterval:()=>{const id=++timerId;timers.add(id);return id},clearInterval:id=>timers.delete(id),setTimeout:()=>0,clearTimeout:()=>{}});
  return {callbacks,messages,receipts};
 };
 const flush=()=>new Promise(r=>setImmediate(r)),base={v:1,ready:true,supervise:true,expiresAt:now+7000,day:'2026-10-25',mode:'cooldown',cooldownMinutes:5,reminderKey:'resume/key'};
 const first=boot();await flush();first.callbacks.message1(base);await flush();const end=now+300000;assert.equal(saved.control.until,end);
 first.callbacks.message1({...base,supervise:false});await flush();assert.equal(first.messages.at(-1).blockedUntil,0);
 now+=1000;first.callbacks.message1({...base,expiresAt:now+7000});await flush();assert.equal(first.messages.at(-1).blockedUntil,end);
 first.callbacks.disconnect1();await flush();assert.equal(first.messages.at(-1).blockedUntil,0);assert.equal(timers.size,0);
 first.callbacks.activated();await flush();assert.equal(nativeCalls,2);first.callbacks.message2({...base,expiresAt:now+7000});await flush();assert.equal(first.messages.at(-1).blockedUntil,end);assert.equal(first.receipts.at(-1).key,base.reminderKey);assert.equal(timers.size,1);
 first.callbacks.disconnect2();await flush();assert.equal(timers.size,0);
 const restarted=boot();await flush();restarted.callbacks.message3({...base,expiresAt:now+7000});await flush();assert.equal(restarted.messages.at(-1).blockedUntil,end);assert.equal(timers.size,1);
 now=end+1;restarted.callbacks.message3({...base,expiresAt:now+7000});await flush();assert.ok(restarted.messages.at(-1).blockedUntil<=end);assert.equal(restarted.messages.at(-1).pause,false);
 restarted.callbacks.message3({...base,reminderKey:'next/key',expiresAt:now+7000});await flush();assert.equal(restarted.messages.at(-1).blockedUntil,now+300000);
 restarted.callbacks.disconnect3();await flush();assert.equal(timers.size,0);
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
