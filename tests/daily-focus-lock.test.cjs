const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DailyFocusLock}=require('../app/electron/build/focus/dailyFocusLock'),{BrowserControl}=require('../app/electron/build/focus/browserControl'),{dayKey}=require('../app/electron/build/focus/activitywatch'),{decide}=require('../app/electron/src/assets/browser-control/background');
function fixture(){let now=new Date(2026,9,26,10).getTime();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pomo-daily-lock-'));const state={settings:{quotaMinutes:60,supervise:true,pomodoroGoal:12,reminderMinutes:5},progress:{day:dayKey(now),completedCount:11,effectiveCount:11},usage:{day:dayKey(now),totalSeconds:300},status:'recording',live:{checkedAt:now,expiresAt:now+7000},reminder:null};const lock=new DailyFocusLock(dir,()=>now);return {dir,state,lock,now:()=>now,advance:ms=>now+=ms,reload:()=>new DailyFocusLock(dir,()=>now)};}
test('opt-in commitment freezes target and gates changes while original saved progress remains the only counter',()=>{
 const f=fixture();assert.equal(f.lock.snapshot(f.state).enabled,false);assert.equal(fs.existsSync(path.join(f.dir,'daily-focus-lock.json')),false);
 f.lock.configure({enabled:true,releaseMinutes:15},f.state);let s=f.lock.snapshot(f.state);assert.equal(s.goal,12);assert.equal(s.count,11);assert.equal(s.blocked,true);assert.equal(s.lockedForChanges,true);
 assert.throws(()=>f.lock.configure({enabled:false,releaseMinutes:15},f.state),/尚未完成/);assert.throws(()=>f.lock.guardSettings({...f.state.settings,supervise:false},f.state),/不能关闭/);assert.throws(()=>f.lock.guardSettings({...f.state.settings,pomodoroGoal:1},f.state),/降低/);assert.throws(()=>f.lock.release(f.state),/先完成/);
 assert.doesNotThrow(()=>f.lock.guardSettings({...f.state.settings,reminderMinutes:.25},f.state));assert.equal(f.reload().snapshot(f.state).blocked,true);assert.equal(f.reload().snapshot(null).count,null);
 const raw=JSON.parse(fs.readFileSync(path.join(f.dir,'daily-focus-lock.json')));assert.equal(JSON.stringify(raw).includes('count'),false);
 f.state.progress.completedCount=20;f.state.progress.effectiveCount=11.5;assert.equal(f.lock.snapshot(f.state).reached,false);f.state.progress.effectiveCount=12;assert.equal(f.lock.snapshot(f.state).reached,true);
});
test('reached target needs explicit bounded pass; repeated request and restart do not extend; expiry and progress rollback relock',()=>{
 const f=fixture();f.lock.configure({enabled:true,releaseMinutes:15},f.state);f.state.progress.completedCount=12;f.state.progress.effectiveCount=12;assert.equal(f.lock.snapshot(f.state).blocked,true);
 const s=f.lock.release(f.state),end=f.now()+900000;assert.equal(s.until,end);assert.equal(s.blocked,false);f.advance(1000);assert.equal(f.lock.release(f.state).until,end);assert.equal(f.reload().snapshot(f.state).until,end);
 f.state.progress.effectiveCount=11;assert.equal(f.lock.snapshot(f.state).blocked,true);assert.throws(()=>f.lock.release(f.state));f.state.progress.effectiveCount=12;assert.equal(f.lock.snapshot(f.state).releasing,true);
 f.advance(900000);assert.equal(f.lock.snapshot(f.state).blocked,true);assert.equal(f.lock.snapshot(f.state).until,0);assert.ok(f.lock.release(f.state).until>end);f.lock.resume(f.state);assert.equal(f.lock.snapshot(f.state).blocked,true);
});
test('daily quota and unknown monitoring refuse pass, quota exhausted during pass relocks',()=>{
 const f=fixture();f.lock.configure({enabled:true,releaseMinutes:15},f.state);f.state.progress.completedCount=12;f.state.progress.effectiveCount=12;
 f.state.status='interrupted';assert.throws(()=>f.lock.release(f.state),/恢复监测/);f.state.status='recording';f.state.usage=null;assert.throws(()=>f.lock.release(f.state));f.state.usage={day:dayKey(f.now()),totalSeconds:300};f.lock.release(f.state);f.state.usage.totalSeconds=3600;assert.equal(f.lock.snapshot(f.state).blocked,true);assert.throws(()=>f.lock.release(f.state),/额度已用完/);
});
test('next day uses planned policy and new target, never yesterday progress or pass; unknown state cannot freeze wrong target',()=>{
 const f=fixture();f.lock.configure({enabled:true,releaseMinutes:15},f.state);f.state.progress.completedCount=12;f.state.progress.effectiveCount=12;f.lock.release(f.state);f.state.settings.pomodoroGoal=20;
 f.advance(86400000);const reload=f.reload();assert.equal(reload.snapshot(null).count,null);assert.equal(reload.snapshot(null).blocked,true);const s=reload.snapshot(f.state);assert.equal(s.day,dayKey(f.now()));assert.equal(s.goal,20);assert.equal(s.count,null);assert.equal(s.until,0);assert.equal(s.lockedForChanges,true);
 f.state.progress={day:dayKey(f.now()),completedCount:20,effectiveCount:20};reload.configure({enabled:false,releaseMinutes:30},f.state);assert.equal(reload.snapshot(f.state).enabled,true);assert.equal(reload.snapshot(f.state).plannedEnabled,false);f.advance(86400000);assert.equal(reload.snapshot(f.state).enabled,false);
});
test('save failure preserves prior policy, corrupt and foreign files are explicit and cannot claim enforcement',()=>{
 const f=fixture();f.lock.configure({enabled:true,releaseMinutes:15},f.state);const before=fs.readFileSync(path.join(f.dir,'daily-focus-lock.json'),'utf8'),write=fs.writeFileSync;
 f.state.progress.effectiveCount=12;let writes=0;
 try{fs.writeFileSync=()=>{writes++;throw Error('synthetic full disk')};assert.throws(()=>f.lock.configure({enabled:true,releaseMinutes:20},f.state),/synthetic full disk/);assert.equal(writes,1);assert.equal(f.lock.snapshot(f.state).plannedReleaseMinutes,15);}finally{fs.writeFileSync=write;}
 assert.equal(fs.readFileSync(path.join(f.dir,'daily-focus-lock.json'),'utf8'),before);
 fs.writeFileSync(path.join(f.dir,'daily-focus-lock.json'),'{bad');const bad=f.reload();assert.ok(bad.snapshot(f.state).error);assert.equal(bad.snapshot(f.state).enabled,false);bad.configure({enabled:true,releaseMinutes:15},f.state);assert.equal(bad.snapshot(f.state).enabled,true);
 fs.writeFileSync(path.join(f.dir,'daily-focus-lock.json'),JSON.stringify({owner:'foreign'}));const foreign=f.reload();assert.throws(()=>foreign.configure({enabled:true,releaseMinutes:15},f.state),/来源/);
});

test('today freezes quota and release separately from tomorrow plans, including restart and first enable',()=>{
 const f=fixture();f.lock.configure({enabled:true,releaseMinutes:15},f.state);f.state.progress.effectiveCount=12;
 f.state.settings.quotaMinutes=480;f.state.settings.pomodoroGoal=20;f.lock.configure({enabled:true,releaseMinutes:60},f.state);
 let s=f.reload().snapshot(f.state);assert.equal(s.goal,12);assert.equal(s.quotaMinutes,60);assert.equal(s.releaseMinutes,15);assert.equal(s.plannedReleaseMinutes,60);
 assert.equal(f.lock.release(f.state).until,f.now()+15*60000);f.state.usage.totalSeconds=3600;assert.equal(f.lock.snapshot(f.state).blocked,true);assert.throws(()=>f.lock.release(f.state),/额度已用完/);
 f.advance(86400000);f.state.progress={day:dayKey(f.now()),completedCount:20,effectiveCount:20};f.state.usage={day:dayKey(f.now()),totalSeconds:3600};const next=f.reload();s=next.snapshot(f.state);assert.equal(s.goal,20);assert.equal(s.quotaMinutes,480);assert.equal(s.releaseMinutes,60);assert.equal(s.quotaSpent,false);assert.equal(next.release(f.state).until,f.now()+60*60000);
 const g=fixture();g.state.settings.quotaMinutes=90;g.lock.configure({enabled:true,releaseMinutes:23},g.state);s=g.reload().snapshot(g.state);assert.equal(s.quotaMinutes,90);assert.equal(s.releaseMinutes,23);
});
test('projection and worker block before reminder, allow pass, enforce quota, fail-open on expiry, normal legacy modes unchanged',()=>{
 const f=fixture(),c=new BrowserControl(f.dir,path.resolve(__dirname,'../app/electron/build'),f.now);c.focusLock.configure({enabled:true,releaseMinutes:15},f.state);assert.throws(()=>c.configure({mode:'mirror',cooldownMinutes:2,autoRaise:true},f.state),/已锁定/);
 c.publish(f.state);const read=()=>{const v=JSON.parse(fs.readFileSync(path.join(f.dir,'browser-control-projection.json')));return {...v,ready:v.ready}};let p=read();assert.equal(p.focusLock.blocked,true);let d=decide(p,{day:'',key:'',until:0},f.now());assert.equal(d.control.reason,'每日专注锁');assert.equal(d.control.blockedUntil,p.expiresAt);assert.equal(d.control.pause,true);assert.match(d.control.message,/11\/12/);
 assert.equal(decide({...p,ready:false},d,f.now()).control.blockedUntil,0);assert.equal(decide(p,d,p.expiresAt+1).control.blockedUntil,0);
 f.state.progress.completedCount=12;f.state.progress.effectiveCount=12;c.focusLock.release(f.state);c.publish(f.state);p=read();d=decide(p,d,f.now());assert.equal(d.control.blockedUntil,0);assert.equal(d.control.pause,false);
 f.state.usage.totalSeconds=3600;c.publish(f.state);p=read();d=decide(p,d,f.now());assert.equal(d.control.reason,'今日额度已用完');assert.ok(d.control.blockedUntil>f.now());
 c.close();assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir,'browser-control-projection.json'))).ready,false);
});
