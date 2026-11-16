import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sleepMinute,sleepClock,clockMinute,sleepPlot,sleepSegments,sleepHomeRows,sleepGoalMarker} from '../app/renderer/src/focus/sleepChart.js';
test('goal markers preserve exact 20/50 minute boundaries and missing values',()=>{
 assert.deepEqual([-60,0,20,20.001,50,50.001].map(d=>sleepGoalMarker(480+d,480)),['check','check','check','late','late','very-late']);
 for(const value of [null,undefined,NaN])assert.equal(sleepGoalMarker(value,480),null);
 assert.equal(sleepGoalMarker(480,null),null);
 const actual=sleepMinute('2026-11-16','2026-11-16T00:20:00+08:00');
 assert.equal(sleepGoalMarker(actual,clockMinute('23:30',true)),'late');
 assert.equal(sleepGoalMarker(actual,clockMinute('00:00',true)),'check');
});
test('home window keeps today second-last and advances on Beijing midnight',()=>{
 const before=sleepHomeRows([],null,Date.parse('2026-11-15T23:59:59+08:00'));
 assert.deepEqual(before.map(r=>r.day),['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15','2026-11-16']);
 const next={day:'2026-11-16',bedtimeAt:'2026-11-15T23:30:00+08:00',wakeAt:null};
 const after=sleepHomeRows(before,next,Date.parse('2026-11-16T00:00:00+08:00'));
 assert.equal(after[5].day,'2026-11-16');assert.equal(after[5].bedtimeAt,next.bedtimeAt);assert.equal(after[6].day,'2026-11-17');assert.equal(after[6].bedtimeAt,null);
 assert.equal(before[5].day,'2026-11-15');
});
test('cross-midnight clocks share wake-day axis and mean midnight correctly',()=>{
 const a=sleepMinute('2026-11-16','2026-11-15T23:30:00+08:00'),b=sleepMinute('2026-11-16','2026-11-16T00:30:00+08:00');
 assert.equal(a,-30);assert.equal(b,30);assert.equal(sleepClock((a+b)/2),'00:00');assert.equal(sleepClock(-30),'23:30');
 assert.equal(sleepMinute('2026-11-16','2026-11-15T15:30:00Z'),-30);
});
test('missing samples remain absent and break connecting lines',()=>{
 const rows=[{day:'2026-11-14',bedtimeAt:'2026-11-13T23:00:00+08:00'},{day:'2026-11-15'},{day:'2026-11-16',bedtimeAt:'2026-11-16T01:00:00+08:00'}];
 const p=sleepPlot(rows);assert.equal(p.points[1].bed,null);assert.equal(p.points[0].wake,null);assert.equal(sleepClock(null),'—');
 assert.deepEqual(sleepSegments(p.points,'bed').map(s=>s.map(p=>p.index)),[[0],[2]]);
});
test('goals use same axis and plot extends to include late wake times',()=>{
 const p=sleepPlot([{day:'2026-11-16',bedtimeAt:'2026-11-15T21:30:00+08:00',wakeAt:'2026-11-16T12:30:00+08:00'}],{bedtime:'23:30',wakeBy:'08:00'});
 assert.equal(p.bedGoal,-30);assert.equal(p.wakeGoal,480);assert.ok(p.min<=-150);assert.ok(p.max>=750);assert.equal(clockMinute('25:00'),null);
 assert.equal(sleepClock(undefined),'—');assert.equal(sleepClock(1439.8),'00:00');
});
