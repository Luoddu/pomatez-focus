const test=require('node:test'),assert=require('node:assert/strict'),esbuild=require('esbuild'),Module=require('node:module'),path=require('node:path');
const bundle=esbuild.buildSync({entryPoints:[path.resolve(__dirname,'../app/renderer/src/focus/preferenceDiff.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,m=new Module(__filename+'.bundle',module);m._compile(bundle,__filename+'.bundle');const {preferenceDifferences:diff}=m.exports;
test('equal weights including reordered keys have no visible differences',()=>assert.deepEqual(diff('weights',[{research:1,misc:.6},{misc:.6,research:1}]),[]));
test('only actual changed fields use Chinese categories and ratios',()=>assert.deepEqual(diff('weights',[{research:1,misc:.6},{research:1,misc:.8}]),[{field:'misc',label:'其他杂事',values:['0.6 倍（60%）','0.8 倍（80%）']}]));
test('timers and rules show Chinese units, toggles and browser modes',()=>{
 assert.deepEqual(diff('timer',[{focusMinutes:25,restMinutes:5},{focusMinutes:30,restMinutes:5}])[0],{field:'focusMinutes',label:'默认番茄时长',values:['25 分钟','30 分钟']});
 assert.deepEqual(diff('rest',[{supervise:true},{supervise:false}])[0].values,['开启','关闭']);
 assert.deepEqual(diff('browser',[{mode:'pause',autoRaise:true},{mode:'cooldown',autoRaise:false}]).map(x=>x.values),[['开启','关闭'],['暂停挡','冷静挡']]);
});
test('weekly goals show dates, effective counts and absence without internal keys',()=>{
 const rows=diff('weekGoals',[{'2026-10-19':60},{'2026-10-26':15}]);assert.equal(rows.length,2);assert.equal(rows[0].label,'2026年10月19日当周目标');assert.deepEqual(rows[0].values,['60 个有效番茄','未设置']);
});
test('a distinct queued adoption remains visible even if both current sides agree',()=>assert.deepEqual(diff('weights',[{misc:1},{misc:.6},{misc:1}])[0].values,['1 倍（100%）','0.6 倍（60%）','1 倍（100%）']));
