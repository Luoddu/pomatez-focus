import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sleepMinute,sleepClock,clockMinute,sleepPlot,sleepSegments} from '../app/renderer/src/focus/sleepChart.js';
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
