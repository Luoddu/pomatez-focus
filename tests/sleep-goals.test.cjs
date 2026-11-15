const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {SleepStore}=require('../app/electron/build/focus/sleep');
const q=(op,x={})=>({protocol:1,scope:'sleep',requestId:randomUUID(),op,...x});
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p097-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {dir,s:new SleepStore(dir,()=>Date.parse('2026-11-15T20:00:00+08:00'))};}
test('midnight-aware mean ignores missing independently and custom goals persist without rewriting checkins',t=>{
 const {s,dir}=setup(t);
 for(const [day,bed,wake] of [['2026-11-14','2026-11-13T23:30:00+08:00','2026-11-14T07:30:00+08:00'],['2026-11-15','2026-11-15T00:30:00+08:00',null]]) assert.ok(!s.handle(q('correct',{day,bedtimeAt:bed,wakeAt:wake,expectedRevision:null})).error);
 const before=fs.readFileSync(s.file,'utf8'), stats=s.handle(q('stats',{days:7}));
 assert.equal(stats.summary.meanBedtimeMinutes,0);assert.equal(stats.summary.meanWakeMinutes,450);assert.equal(stats.summary.bedtimeSamples,2);assert.equal(stats.summary.wakeSamples,1);
 assert.ok(!s.handle(q('set_goals',{bedtime:'00:45',wakeBy:'07:30'})).error);
 const restored=new SleepStore(dir,()=>Date.parse('2026-11-15T20:00:00+08:00'));
 assert.equal(restored.handle(q('goals')).goals.bedtime,'00:45');assert.equal(restored.handle(q('stats',{days:7})).summary.bedtimeTargetDays,2);assert.equal(fs.readFileSync(s.file,'utf8'),before);
 assert.equal(s.handle(q('set_goals',{bedtime:'24:10',wakeBy:'08:00'})).error.code,'INVALID');assert.equal(restored.handle(q('goals')).goals.bedtime,'00:45');
});
test('corrupt goals preserve bytes and do not silently replace existing policy',t=>{const {dir,s}=setup(t),p=path.join(dir,'sleep-goals-v1.json');fs.writeFileSync(p,'broken');assert.equal(s.handle(q('set_goals',{bedtime:'23:00',wakeBy:'08:00'})).error.code,'CORRUPT');assert.equal(fs.readFileSync(p,'utf8'),'broken');});
