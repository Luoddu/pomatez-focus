const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process');
if(!process.versions.electron){
 const env={...process.env,POMATEZ_HEADLESS:'1',POMATEZ_PROFILE:fs.mkdtempSync(path.join(os.tmpdir(),'pomo-preference-bridge-'))};delete env.ELECTRON_RUN_AS_NODE;
 const r=spawnSync(require('electron'),[__filename],{env,cwd:path.resolve(__dirname,'..'),windowsHide:true,stdio:'inherit',timeout:60000});if(r.error)throw r.error;process.exit(r.status??1);
}
assert.equal(process.env.POMATEZ_HEADLESS,'1');assert.ok(process.env.POMATEZ_PROFILE);
const {app,BrowserWindow,session}=require('electron');
const {FocusService}=require('../app/electron/build/focus/service');
const {Feishu,connectionKey}=require('../app/electron/build/focus/feishu');
const {PREFERENCE_FIELDS}=require('../app/electron/build/focus/preferences');
const config={appId:'synthetic',appSecret:'synthetic',appToken:'demo',baseUrl:'https://example.feishu.cn/base/demo',planTable:'专注记录',dateField:'计划日',taskField:'任务',completedField:'已完成'};
const sourceKey=connectionKey(config),rates={research:1,delivery:1,longterm:1,software:1,personal:1,misc:.6,unclassified:1};
const entry=(key,value)=>({version:1,id:randomUUID(),key,value,parents:[],at:Date.now()});
const entries=[entry('weights',rates),entry('timer',{focusMinutes:30,restMinutes:10})],rows=entries.map((e,i)=>({record_id:'fixture'+i,fields:{'偏好ID':e.id,'设置项':e.key,'版本内容':JSON.stringify(e)}}));
const client=new Feishu(config,async(method,route,body)=>{
 if(route.startsWith('auth/'))return {tenant_access_token:'synthetic',expire:7200};
 const url=route.split('?')[0],list=items=>({data:{items:structuredClone(items),has_more:false}});
 if(method==='GET' && url.endsWith('/tables'))return list([{name:'农场偏好',table_id:'preferences'}]);
 if(method==='GET' && url.endsWith('/fields'))return list(PREFERENCE_FIELDS);
 if(method==='GET' && url.endsWith('/records'))return list(rows);
 if(method==='POST' && url.endsWith('/records')){rows.push({record_id:'fixture'+rows.length,fields:structuredClone(body.fields)});return {data:{}};}
 throw Error('unexpected fixture route');
});
// Inject only the synthetic connection/transport. Real FocusService prefs,
// repository, trusted main/preload IPC and native settings persistence still run.
Object.defineProperty(FocusService.prototype,'client',{get:()=>client,set:()=>{throw Error('real configure forbidden in fixture');}});
FocusService.prototype.status=()=>({configured:true,quadrantField:null,sourceKey});
FocusService.prototype.today=async()=>[];FocusService.prototype.history=async()=>({sourceKey,records:[],missing:0});FocusService.prototype.dailyReviews=async()=>({sourceKey,summaries:[]});
require('../app/electron/build/main');
const wait=ms=>new Promise(r=>setTimeout(r,ms)),deadline=setTimeout(()=>app.exit(2),50000);
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 let win;for(let i=0;i<100;i++){win=BrowserWindow.getAllWindows()[0];if(win&&!win.webContents.isLoadingMainFrame())break;await wait(100);}assert.ok(win);assert.equal(win.isVisible(),false);
 const js=s=>win.webContents.executeJavaScript(s,true);
 const today=new Date();today.setHours(0,0,0,0);
 const record=(id,count,type)=>({id,task:{id,title:'Synthetic',source:'local',projectType:type},startedAt:+today+3600000,endedAt:+today+3600000+count*1500000,plannedSeconds:1500,elapsedSeconds:count*1500,acceptedSeconds:count*1500,completedCount:count,status:'saved',sync:'local'});
 const records=[record('synthetic-research',8,'research'),record('synthetic-misc',10,'misc')];
 const active={id:randomUUID(),task:{id:'active-synthetic',title:'Active fixture',source:'local'},startedAt:+today+7200000,elapsedSeconds:123,plannedSeconds:1500,status:'paused',sync:'local',segmentOpen:false};
 win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Page.enable');
 const seed=await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.clear();localStorage.setItem('pomatez-focus-v1',${JSON.stringify(JSON.stringify({active,records}))})`});
 const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await loaded;await win.webContents.debugger.sendCommand('Page.removeScriptToEvaluateOnNewDocument',{identifier:seed.identifier});await wait(700);
 assert.equal(await js("document.querySelector('[data-stat=\"今日番茄\"] strong').textContent"),'18');
 assert.equal(await js("document.querySelector('.outbox-status').textContent.includes('全局偏好')"),true);
 await js("document.querySelector('.win-controls button[aria-label=设置]').click()");await wait(100);
 assert.equal(await js("document.querySelectorAll('.preference-conflict').length"),2);
 const differences=await js("[...document.querySelectorAll('.preference-conflict')].map(e=>({text:e.textContent,fields:[...e.querySelectorAll('.preference-difference > strong')].map(x=>x.textContent)}))");
 assert.deepEqual(differences[0].fields,['其他杂事']);assert.deepEqual(differences[1].fields,['默认番茄时长','休息时长']);assert.ok(differences[0].text.includes('1 倍（100%）'));assert.ok(differences[0].text.includes('0.6 倍（60%）'));assert.ok(differences.every(e=>!e.text.includes('"misc"')&&!e.text.includes('focusMinutes')));
 for(const [w,h] of [[1080,1600],[480,800]]){win.setSize(w,h);await wait(80);assert.equal(await js("document.documentElement.scrollWidth <= window.innerWidth"),true);await js("document.querySelector('.preference-conflict').scrollIntoView({block:'center'})");await wait(30);const shot=await win.webContents.capturePage();fs.writeFileSync(path.resolve(`artifacts/p063-preference-differences-${w}.png`),shot.toPNG());}
 await js("document.querySelector('.preference-conflict .sync-row button:nth-of-type(2)').click()");await wait(350);
 assert.equal(await js("JSON.parse(localStorage.getItem('pomatez-focus-tomato-weights-v1')).weights.misc"),.6);
 await js("document.querySelector('.preference-conflict .sync-row button:nth-of-type(2)').click()");await wait(350);
 assert.deepEqual(await js("JSON.parse(localStorage.getItem('pomatez-focus-timer-preferences-v1'))"),{focusMinutes:30,restMinutes:10});
 assert.equal(await js("document.querySelectorAll('.preference-conflict').length"),0);
 // Same values but an obsolete parent ID: reproduce the reported pending conflict
 // across a real renderer reload, with the real adapter and durable cache.
 const beforeMerge=rows.length,queued={version:1,id:randomUUID(),key:'weights',parents:[entries[0].id],value:rates,at:Date.now()};
 await js(`(()=>{const k='pomatez-focus-preference-sync-v1:'+${JSON.stringify(sourceKey)},v=JSON.parse(localStorage.getItem(k));v.pending.weights=${JSON.stringify(queued)};localStorage.setItem(k,JSON.stringify(v));})()`);
 const refreshed=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await refreshed;await wait(700);
 await js("document.querySelector('.win-controls button[aria-label=设置]').click()");await wait(80);
 assert.equal(await js("document.querySelectorAll('.preference-conflict').length"),0);assert.equal(rows.length,beforeMerge);
 assert.deepEqual(await js(`JSON.parse(localStorage.getItem('pomatez-focus-preference-sync-v1:'+${JSON.stringify(sourceKey)})).pending`),{});
 assert.equal(await js("document.querySelector('.s-preferences').textContent.includes('偏好已与飞书同步')"),true);
 for(const size of [{width:1080,height:1600},{width:1440,height:900}]){
  win.setSize(size.width,size.height);await wait(80);assert.equal(await js("document.documentElement.scrollWidth <= window.innerWidth"),true);
 }
 const state=await js('window.focusApi.restState()');assert.equal(state.progress.effectiveCount,14);
 const newRest={...state.settings,quotaMinutes:90};
 await js(`window.focusApi.applyDevicePreference(${JSON.stringify({sourceKey,key:'rest',value:newRest,expected:state.settings})})`);
 assert.equal((await js('window.focusApi.restState()')).settings.quotaMinutes,90);
 await assert.rejects(js(`window.focusApi.applyDevicePreference(${JSON.stringify({sourceKey,key:'rest',value:state.settings,expected:state.settings})})`));
 await assert.rejects(js("window.focusApi.readPreferences({sourceKey:'wrong-base'})"));
 await assert.rejects(js(`window.focusApi.savePreference(${JSON.stringify({sourceKey,entry:entry('timer',{focusMinutes:0,restMinutes:5})})})`));
 const actualRecords=await js("JSON.parse(localStorage.getItem('pomatez-focus-v1')).records");assert.deepEqual(actualRecords.sort((a,b)=>a.id.localeCompare(b.id)),records.slice().sort((a,b)=>a.id.localeCompare(b.id)));
 const afterActive=await js("JSON.parse(localStorage.getItem('pomatez-focus-v1')).active");for(const k of ['id','startedAt','elapsedSeconds','plannedSeconds'])assert.equal(afterActive[k],active[k]);
 const screenshot=await win.webContents.capturePage();fs.writeFileSync(path.resolve('artifacts/preference-settings.png'),screenshot.toPNG());
 assert.equal(win.isVisible(),false);
 console.log('PASS: production main/preload/App + Feishu adapter synthetic transport; Chinese actual field differences; equal stale-parent pending auto-clears across reload without cloud write; explicit cloud choices 18→14; timer30/rest10; real native persistence/CAS; scope/invalid negatives; raw records unchanged; portrait/landscape; no actual profile/network');
 clearTimeout(deadline);app.exit(0);
}).catch(e=>{console.error(e.stack);clearTimeout(deadline);app.exit(1);});
