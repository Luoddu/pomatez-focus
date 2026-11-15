import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyUsage} from '../app/renderer/src/focus/dailyUsage.js';
const at=s=>new Date(s).getTime();
const usage=(sessions,extra={})=>({start:at('2026-11-01T00:00:00'),end:at('2026-11-07T23:59:59'),coverageStart:at('2026-11-03T12:00:00'),sessions,...extra});
test('daily bars split a viewing interval across midnight without losing seconds',()=>{const rows=dailyUsage(usage([{start:at('2026-11-03T23:50:00'),end:at('2026-11-04T00:20:00'),site:'bilibili'}]));assert.equal(rows.length,7);assert.equal(rows[2].bilibili,600);assert.equal(rows[3].bilibili,1200);assert.equal(rows.reduce((sum,r)=>sum+r.totalSeconds,0),1800);});
test('duplicate and overlapping intervals are counted once, ties deterministic across input order',()=>{const a={start:at('2026-11-03T10:00:00'),end:at('2026-11-03T10:30:00'),site:'bilibili'},b={...a,start:at('2026-11-03T10:20:00'),site:'xiaohongshu'};const left=dailyUsage(usage([a,a,b])),right=dailyUsage(usage([b,a,a]));assert.deepEqual(left,right);assert.equal(left[2].totalSeconds,1800);assert.equal(left[2].bilibili,1200);assert.equal(left[2].xiaohongshu,600);});
test('missing and unmonitored days remain unknown instead of claiming zero usage',()=>{const rows=dailyUsage(usage([]));assert.equal(rows[0].coverage,'unknown');assert.equal(rows[2].coverage,'partial');assert.equal(rows.every(r=>!r.hasRecords),true);assert.deepEqual(dailyUsage(null),[]);});
test('30 day range, clipped boundaries and invalid events remain bounded',()=>{const rows=dailyUsage(usage([{site:'bilibili',start:at('2026-10-01T23:00:00'),end:at('2026-10-02T00:05:00')},{site:'bad',start:at('2026-10-02T00:00:00'),end:at('2026-10-30T00:00:00')},{site:'bilibili',start:NaN,end:Infinity}],{start:at('2026-10-02T00:00:00'),end:at('2026-10-31T23:59:59')}));assert.equal(rows.length,30);assert.equal(rows[0].bilibili,300);assert.equal(rows.reduce((sum,r)=>sum+r.totalSeconds,0),300);});

test('shared chart uses authority UTC+8 day boundaries independent of local zone',()=>{
 const start=Date.parse('2026-11-15T15:50:00Z'),end=Date.parse('2026-11-15T16:10:00Z');
 const rows=dailyUsage({start,end,sessions:[{start,end,site:'bilibili'}]},480);
 assert.deepEqual(rows.map(r=>[r.day,r.bilibili]),[['2026-11-15',600],['2026-11-16',600]]);
});
