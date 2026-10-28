const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {BrowserControl}=require('../app/electron/build/focus/browserControl'),{decide}=require('../app/electron/src/assets/browser-control/background');
const build=path.resolve(__dirname,'../app/electron/build'),base=new Date(2026,9,28,12).getTime();
const state=(now,delay=0)=>({status:'recording',settings:{supervise:true,pomodoroGoal:12,quotaMinutes:60},progress:{day:'2026-10-28',completedCount:9,effectiveCount:9},usage:{day:'2026-10-28',totalSeconds:0},live:{checkedAt:now-delay,expiresAt:now-delay+7000,site:'bilibili'}});
const fixture=()=>{let now=base;const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pomo-lease-')),c=new BrowserControl(dir,build,()=>now);return {dir,c,at:t=>now=t,read:()=>JSON.parse(fs.readFileSync(path.join(dir,'browser-control-projection.json'))),receipt:(at,cap=true)=>fs.writeFileSync(path.join(dir,'browser-control-receipt.json'),JSON.stringify({owner:'pomatez-browser-control-v1',connected:true,checkedAt:at,focusLockCapable:true,leaseCapable:cap}))}};

test('control lease covers every five-second poll phase and bounded query delay without a 9/12 release gap',()=>{
 for(const phase of [0,1000,2000,3000,4000])for(const delay of [0,2000,6000]){
  const f=fixture();f.c.focusLock.configure({enabled:true,releaseMinutes:15},state(base));f.receipt(base);
  let next=delay,current={day:'',key:'',until:0},delivered=false;
  for(let t=0;t<=120000;t+=100){const at=base+t;f.at(at);
   if(t>=next){f.c.publish(state(at,delay));assert.equal(f.read().leaseVersion,2);next+=5000+delay;}
   if(t>=phase&&(t-phase)%5000===0){f.receipt(at);if(t>=delay){current=decide(f.read(),current,at);delivered=true;}}
   if(delivered)assert.ok(at<current.control.blockedUntil&&at<current.control.expiresAt,`gap phase=${phase} delay=${delay} t=${t}`);
  }
 }
});

test('fresh capability selects v2; old, stale and foreign receipts stay v1; AW interruption and midnight still release',()=>{
 const f=fixture();f.c.publish(state(base));assert.equal(f.read().leaseVersion,1);assert.equal(f.read().expiresAt,base+7000);
 f.receipt(base);f.c.publish(state(base));assert.equal(f.read().leaseVersion,2);assert.equal(f.read().expiresAt,base+20000);
 f.receipt(base-13000);f.c.publish(state(base));assert.equal(f.read().leaseVersion,1);
 f.receipt(base);fs.writeFileSync(path.join(f.dir,'browser-control-receipt.json'),JSON.stringify({owner:'foreign',connected:true,checkedAt:base,leaseCapable:true}));f.c.publish(state(base));assert.equal(f.read().leaseVersion,1);
 f.receipt(base);f.c.publish({...state(base),status:'interrupted',live:null});assert.equal(f.read().ready,false);assert.equal(f.read().expiresAt,0);
 const late=new Date(2026,9,28,23,59,58).getTime();f.at(late);f.receipt(late);f.c.publish(state(late));assert.equal(f.read().expiresAt,new Date(2026,9,29).getTime());
 f.c.close();assert.equal(f.read().ready,false);
});

test('worker rejects overlong or unknown leases and never renews stale control from cached state',()=>{
 const policy={v:1,ready:true,supervise:true,mode:'pause',day:'2026-10-28',reminderKey:'',leaseVersion:2,expiresAt:base+20000,focusLock:{blocked:true,count:9,goal:12,quotaSpent:false}};
 const locked=decide(policy,{day:'',key:'',until:0},base);assert.equal(locked.control.reason,'每日专注锁');
 for(const bad of [{...policy,expiresAt:base+20001},{...policy,leaseVersion:3},{...policy,leaseVersion:1},{...policy,expiresAt:NaN},{...policy,ready:false}])assert.equal(decide(bad,locked,base).control.expiresAt,0);
 assert.equal(decide(policy,locked,base+20001).control.expiresAt,0);
 const released=decide({...policy,focusLock:{...policy.focusLock,blocked:false,count:12}},locked,base);assert.equal(released.control.blockedUntil,0);
});
