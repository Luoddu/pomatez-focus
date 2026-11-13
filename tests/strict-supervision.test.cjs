const {test}=require('node:test');
const assert=require('node:assert/strict');
const {matchesGame,matchesDomain,GameCloser,sameProcess}=require('../app/electron/build/focus/strict-supervision/focuserAdapter');
const proc=(pid=100,exe='C:\\Games\\Game\\play.exe',startedAt='start-1')=>({pid,name:exe.split('\\').at(-1),executable:exe,startedAt});
const rules={executables:['Steam.exe','Battle.net.exe','WeGame.exe','EpicGamesLauncher.exe'],directories:['C:\\Games\\Game']};
test('exact platform names and explicit game directory match; work and neighbouring paths remain allowed',()=>{
  for(const n of rules.executables)assert.equal(matchesGame(proc(100,'C:\\Apps\\'+n),rules,99),true);
  assert.equal(matchesGame(proc(),rules,99),true);
  for(const exe of ['C:\\Work\\word.exe','C:\\Work\\steam.exe.txt','C:\\Games\\Game-backup\\work.exe','C:\\Games\\Game\\..\\Work\\work.exe','C:\\Apps\\chrome.exe'])assert.equal(matchesGame(proc(100,exe),rules,99),false,exe);
  assert.equal(matchesGame(proc(),{executables:[],directories:['C:\\']},99),false);
});
test('system/self/unknown identity and ambiguous paths cannot be selected',()=>{
  for(const p of [proc(0),proc(4),proc(99),proc(100,'C:\\Games\\Game\\play.exe',''),proc(100,'\\\\server\\Games\\play.exe'),{...proc(),name:'word.exe'}])assert.equal(matchesGame(p,rules,99),false);
});
test('domain boundaries do not block work pages mentioning a gaming URL',()=>{
  for(const u of ['https://store.steampowered.com/a','https://www.steampowered.com./'])assert.equal(matchesDomain(u,['steampowered.com']),true);
  for(const u of ['https://notsteampowered.com','https://steampowered.com.example.org','https://example.org/?u=https://steampowered.com','file:///steampowered.com'])assert.equal(matchesDomain(u,['steampowered.com']),false);
  assert.equal(matchesDomain('https://steam.example',['steam']),false);
});
test('upstream graceful close then one terminate; disappearing processes clear their stage',()=>{
  const c=new GameCloser(),p=proc();
  assert.deepEqual(c.update([p],0).map(x=>x.kind),['ask']);
  assert.deepEqual(c.update([p],29999),[]);
  assert.deepEqual(c.update([p],30000).map(x=>x.kind),['terminate']);
  assert.deepEqual(c.update([p],60000),[]);
  assert.deepEqual(c.update([],60001),[]);
  assert.deepEqual(c.update([p],60002).map(x=>x.kind),['ask']);
});
test('PID reuse is a new process and stale close requests fail identity revalidation',()=>{
  const c=new GameCloser(),p=proc(),replacement=proc(100,p.executable,'start-2');
  c.update([p],0);
  assert.deepEqual(c.update([replacement],30000).map(x=>x.kind),['ask']);
  assert.equal(sameProcess(p,replacement),false);
  assert.equal(sameProcess(p,{...p,executable:'C:\\Work\\word.exe'}),false);
  assert.equal(sameProcess(p,null),false);
  assert.equal(sameProcess(p,{...p}),true);
});
test('separate game processes each get grace; backward clock does not force-close',()=>{
  const c=new GameCloser(),p=proc(); c.update([p],100);
  const second=proc(101);assert.deepEqual(c.update([p,second],30100).map(x=>x.kind),['terminate','ask']);
  assert.deepEqual(c.update([p,second],0),[]);
  assert.deepEqual(c.update([p,second],1).map(x=>x.kind),['ask','ask']);
  assert.deepEqual(c.update([p,second],30001).map(x=>x.kind),['terminate','terminate']);
  assert.deepEqual(c.update([p],NaN),[]);
  assert.deepEqual(c.update([p],30002).map(x=>x.kind),['ask']);
});
