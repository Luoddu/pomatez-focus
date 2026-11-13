const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DailyFocusLock}=require('../app/electron/build/focus/dailyFocusLock');
const {StrictSettings}=require('../app/electron/build/focus/strict-supervision/settings');
const {BedtimeReminder}=require('../app/electron/build/focus/strict-supervision/bedtime');
const {decide}=require('../app/electron/src/assets/browser-control/background');
const {dayKey}=require('../app/electron/build/focus/activitywatch');
const {GameGuard}=require('../app/electron/build/focus/strict-supervision/gameGuard');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pomo-strict-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let now=new Date(2026,10,13,12).getTime();const cfg=new StrictSettings(dir);cfg.enable();const state={settings:{quotaMinutes:15,supervise:true,pomodoroGoal:12,reminderMinutes:5},progress:{day:dayKey(now),completedCount:12,effectiveCount:12},usage:{day:dayKey(now),end:now,totalSeconds:0},usageVerifiedThrough:now,status:'recording',live:{checkedAt:now,expiresAt:now+7000}};const lock=new DailyFocusLock(dir,()=>now,()=>cfg.enabled);return {dir,cfg,state,lock,now:()=>now,set:n=>now=n};}
test('strict weekdays lock changes after target and release cumulative quota until midnight, restart does not refill',t=>{
 const f=fixture(t);assert.equal(f.lock.snapshot(f.state).strict,true);assert.equal(f.lock.snapshot(f.state).lockedForChanges,true);
 assert.throws(()=>f.lock.guardSettings({...f.state.settings,supervise:false},f.state),/不能关闭/);
 assert.throws(()=>f.lock.guardSettings({...f.state.settings,quotaMinutes:60},f.state),/额度/);
 assert.throws(()=>f.lock.configure({enabled:false,releaseMinutes:15},f.state),/不可/);
 assert.doesNotThrow(()=>f.lock.guardSettings({...f.state.settings,reminderMinutes:1},f.state));
 const s=f.lock.release(f.state);assert.equal(s.releasing,true);assert.equal(new Date(s.until).getHours(),0);assert.ok(s.until-f.now()>15*60000);
 f.state.usage.totalSeconds=899;assert.equal(f.lock.snapshot(f.state).permitUntil,f.now()+1000);
 const reloaded=new DailyFocusLock(f.dir,f.now,()=>new StrictSettings(f.dir).enabled);assert.equal(reloaded.snapshot(f.state).releasing,true);
 f.state.usage.totalSeconds=900;assert.equal(reloaded.snapshot(f.state).blocked,true);assert.throws(()=>reloaded.release(f.state),/额度/);
});
test('unknown or stale usage denies release; missing tail consumes conservative permit without a second counter',t=>{
 const f=fixture(t);f.state.progress.effectiveCount=11.5;assert.throws(()=>f.lock.release(f.state),/先完成/);
 f.state.progress.effectiveCount=12;f.lock.release(f.state);f.state.usage.totalSeconds=895;f.state.usageVerifiedThrough=f.now()-6000;
 assert.equal(f.lock.snapshot(f.state).blocked,true);f.state.usageVerifiedThrough=f.now();assert.equal(f.lock.snapshot(f.state).releasing,true);
 f.state.status='interrupted';assert.equal(f.lock.snapshot(f.state).blocked,true);assert.throws(()=>f.lock.release(f.state),/未确认/);
});
test('strict weekday overlay fails closed after stale projection/disconnect; legacy and weekend behavior still work',()=>{
 const now=new Date(2026,10,13,12).getTime(),s={v:1,strict:true,ready:true,supervise:true,leaseVersion:2,expiresAt:now+1000,focusLock:{blocked:false,goal:12,count:12,quotaSpent:false}};
 const d=decide(s,{},now);assert.equal(d.control.strictAllowedUntil,now+1000);
 assert.equal(decide(s,d,now+1001).control.strictAllowedUntil,0);
 assert.equal(decide({ready:false},d,now).control.strictAllowedUntil,0);
 assert.equal(decide({ready:false},{},now).control.blockedUntil,0);
 assert.equal(decide({ready:false},d,new Date(2026,10,14,12).getTime()).control.blockedUntil,0);
});
test('weekend legacy settings preserved; next Monday strict gate returns',t=>{
 const f=fixture(t);f.lock.snapshot(f.state);f.set(new Date(2026,10,14,12).getTime());assert.equal(f.lock.snapshot(f.state).strict,false);assert.equal(f.lock.snapshot(f.state).enabled,false);
 f.set(new Date(2026,10,16,12).getTime());assert.equal(f.lock.snapshot(f.state).strict,true);assert.equal(f.lock.snapshot(f.state).blocked,true);
});
test('bedtime at 22:59 once, later startup catches up, tomorrow repeats; no work processes touched',async t=>{
 const f=fixture(t);let shown=0;const make=()=>new BedtimeReminder(f.dir,()=>true,async()=>{shown++},f.now);
 const b=make();f.set(new Date(2026,10,13,22,58,59).getTime());await b.tick();assert.equal(shown,0);
 f.set(f.now()+1000);await b.tick();await b.tick();await make().tick();assert.equal(shown,1);
 f.set(new Date(2026,10,14,23,10).getTime());await make().tick();assert.equal(shown,2);
});
test('corrupt strict setting retains restriction and refuses overwrite',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.dir,'strict-supervision.json'),'{');const s=new StrictSettings(f.dir);assert.equal(s.enabled,true);assert.ok(s.error);assert.throws(()=>s.enable());
});
test('explicit game directory persists; broad user roots and protected application subtrees are rejected',t=>{
 const f=fixture(t),game=path.join(f.dir,'game'),protectedTree=path.join(f.dir,'protected'),child=path.join(protectedTree,'child');fs.mkdirSync(game);fs.mkdirSync(child,{recursive:true});
 assert.throws(()=>f.cfg.addDirectory(f.dir,[f.dir]),/具体游戏目录/);
 assert.throws(()=>f.cfg.addDirectory(child,[],[protectedTree]),/自身/);
 assert.equal(f.cfg.addDirectory(game,[f.dir],[protectedTree]),fs.realpathSync(game));assert.equal(new StrictSettings(f.dir).directories.length,1);
 f.cfg.addDirectory(game,[f.dir]);assert.equal(f.cfg.directories.length,1);
});
test('failed termination remains visible on subsequent ticks until confirmed gone',async()=>{
 let now=0,present=true,actions=0;const p={pid:100,name:'game.exe',executable:'C:\\Games\\game.exe',startedAt:'1'};
 const g=new GameGuard(()=>true,{executables:['game.exe'],directories:[]},async request=>request.mode==='list'?{items:present?[p]:[],denied:0}:{results:request.actions.map(a=>{actions++;return {pid:100,kind:a.kind,ok:a.kind==='ask'}})},()=>now);
 g.stopped=false;await g.tick();now=30000;await g.tick();assert.match(g.status.error,/未确认/);await g.tick();assert.match(g.status.error,/未确认/);assert.equal(actions,2);
 present=false;await g.tick();assert.equal(g.status.error,'');g.close();
});
test('real worker defers getControl until strict storage restored, then stays blocked when native unavailable',async()=>{
 const vm=require('node:vm'),callbacks={},event=name=>({addListener:f=>callbacks[name]=f});let resolveLocal,reply,rules=0;
 const chrome={runtime:{onMessage:event('request'),onStartup:event('startup'),onInstalled:event('installed'),connectNative:()=>{throw Error('synthetic host unavailable')}},tabs:{query:async()=>[{id:1,url:'https://www.bilibili.com/'}],sendMessage:async()=>({pausedCount:0}),onUpdated:event('updated'),onActivated:event('activated'),onRemoved:event('removed')},storage:{session:{get:async()=>({}),set:async()=>{}},local:{get:()=>new Promise(r=>resolveLocal=r),set:async()=>{}}},declarativeNetRequest:{updateDynamicRules:async()=>{rules++}}};
 const when=new Date(2026,10,13,12).getTime();class Clock extends Date{constructor(v=when){super(v)}static now(){return when}}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/electron/src/assets/browser-control/background.js'),'utf8'),{chrome,Date:Clock,URL,Promise,console,setTimeout,clearTimeout,setInterval,clearInterval});
 assert.equal(callbacks.request({type:'getControl'},{tab:{url:'https://www.bilibili.com/'}},v=>reply=v),true);assert.equal(reply,undefined);
 resolveLocal({strict:true});await new Promise(r=>setImmediate(r));assert.equal(reply.strict,true);assert.equal(reply.strictAllowedUntil,0);assert.equal(rules,1);
 let again;callbacks.request({type:'getControl'},{tab:{url:'https://www.bilibili.com/'}},v=>again=v);await new Promise(r=>setImmediate(r));assert.equal(again.strict,true);assert.equal(again.strictAllowedUntil,0);
});
for(const failure of ['storage','dnr'])test(`first strict activation ${failure} failure stays locked; repaired connection can permit again`,async()=>{
 const vm=require('node:vm'),callbacks={},event=name=>({addListener:f=>callbacks[name]=f});let broken=true;
 const chrome={runtime:{onMessage:event('request'),onStartup:event('startup'),onInstalled:event('installed'),connectNative:()=>({onMessage:event('native'),onDisconnect:event('disconnect'),postMessage:()=>{},disconnect:()=>{}})},tabs:{query:async()=>[{id:1,url:'https://www.bilibili.com/'}],sendMessage:async()=>({pausedCount:0}),onUpdated:event('updated'),onActivated:event('activated'),onRemoved:event('removed')},storage:{session:{get:async()=>({}),set:async()=>{}},local:{get:async()=>({}),set:async()=>{if(broken&&failure==='storage')throw Error('synthetic storage failure')}}},declarativeNetRequest:{updateDynamicRules:async()=>{if(broken&&failure==='dnr')throw Error('synthetic rule failure')}}};
 const when=new Date(2026,10,13,12).getTime();class Clock extends Date{constructor(v=when){super(v)}static now(){return when}}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/electron/src/assets/browser-control/background.js'),'utf8'),{chrome,Date:Clock,URL,Promise,console,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{}});
 const flush=()=>new Promise(r=>setImmediate(r));await flush();const message={v:1,strict:true,ready:true,supervise:true,leaseVersion:2,expiresAt:when+1000,focusLock:{blocked:false,goal:12,count:12,quotaSpent:false}};
 callbacks.native(message);await flush();await flush();let reply;callbacks.request({type:'getControl'},{tab:{url:'https://www.bilibili.com/'}},v=>reply=v);await flush();assert.equal(reply.strict,true);assert.equal(reply.strictAllowedUntil,0);
 broken=false;callbacks.activated();await flush();callbacks.native(message);await flush();callbacks.request({type:'getControl'},{tab:{url:'https://www.bilibili.com/'}},v=>reply=v);await flush();assert.equal(reply.strictAllowedUntil,when+1000);
});
