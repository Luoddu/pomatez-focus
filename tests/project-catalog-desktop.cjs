// Production main/preload/renderer in a hidden synthetic profile.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(__dirname, "../artifacts/test-profiles", randomUUID());

const { FocusService } = require("../app/electron/build/focus/service.js");
const sourceKey = "synthetic";
const projects = [
  {id: "research", name: "Research", projectType: "research"},
  {id: "delivery", name: "Delivery", projectType: "delivery"},
];
const tasks = [
  {id: "plan1", planId: "plan1", taskId: "task1", title: "Existing · 第 1 个番茄", plannedToday: 1},
  {id: "done-task2", planId: "", taskId: "task2", title: "Completed", kind: "done", plannedToday: 1, doneToday: 1},
].map(task => ({...task, source: "feishu", sourceKey, projectEditable: true, quadrant: "iu", projectType: "research"}));
let pending=[], projectReads=0;
FocusService.prototype.status = () => ({configured: true, sourceKey});
FocusService.prototype.today = async () => structuredClone(tasks);
FocusService.prototype.generateToday = async () => ({created: 0});
FocusService.prototype.history = async () => ({sourceKey, records: [], missing: 0});
FocusService.prototype.dailyReviews = async () => ({sourceKey, summaries: {}});
FocusService.prototype.projects = () => {
  projectReads++;
  return new Promise((resolve,reject)=>pending.push({resolve,reject}));
};
FocusService.prototype.createQuickTask=async()=>{throw Error("No live writes in catalog test");};
require("../app/electron/build/main.js");
const timer = setTimeout(() => app.exit(2), 50000);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    let win;
    const until = async (test) => {
      for (let i = 0; i < 240; i++) {
        if (await test()) return;
        await delay(25);
      }
      throw Error("Timed out " + test);
    };
    await until(() => {
      win = BrowserWindow.getAllWindows()[0];
      return win && !win.webContents.isLoadingMainFrame() && win.webContents.getURL().startsWith("file:");
    });
    const js = code => win.webContents.executeJavaScript(code, true);
    const click = label => js("Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === " + JSON.stringify(label) + ").click()");
    const select = (selector, value) => js("(()=>{const e=document.querySelector(" + JSON.stringify(selector) + "); e.value=" + JSON.stringify(value) + "; e.dispatchEvent(new Event('change',{bubbles:true}));})()");
    const context = selector => js("document.querySelector(" + JSON.stringify(selector) + ").dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:70,clientY:70}))");
    const queueKey = "pomatez-quick-edit-outbox-v1";
    const captures = [1,2].map(n=>({id:randomUUID(),sourceKey,title:'Catalog test '+n,count:1,quadrant:'unu',day:new Date().setHours(0,0,0,0),capture:true}));
    await js("localStorage.setItem("+JSON.stringify(queueKey)+","+JSON.stringify(JSON.stringify(captures.map(payload=>({id:payload.id,sourceKey,kind:'task',state:'pending',payload}))))+")");
    win.reload();
    await until(()=>js("document.querySelectorAll('.capture-item').length===2"));
    const reads=projectReads;
    await click("整理");
    assert.equal(await js("document.querySelector('.quick-task-form button[type=submit]').disabled"),false);
    await click("暂不归属，确认整理");
    await until(()=>js("document.querySelectorAll('.capture-item').length===1"));
    let queued=await js("JSON.parse(localStorage.getItem('"+queueKey+"'))");
    assert.equal(queued.find(e=>e.id===captures[0].id).payload.projectId,undefined);
    assert.equal(queued.find(e=>e.id===captures[0].id).payload.capture,undefined);
    await click("整理");assert.equal(projectReads,reads);
    for(const p of pending.splice(0))p.resolve({sourceKey,projects});
    await until(()=>js("!!document.querySelector('option[value=delivery]')"));
    await select('[aria-label="新增任务所属项目"]','delivery');
    await click('取消');await click('整理');
    await until(()=>js("!!document.querySelector('option[value=delivery]')"));
    assert.equal(projectReads,reads);
    await select('[aria-label="新增任务所属项目"]','delivery');
    await click('刷新项目');await until(()=>pending.length===1);
    assert.equal(await js("document.querySelector('[aria-label=\"新增任务所属项目\"]').disabled"),false);
    assert.equal(await js("document.querySelector('[aria-label=\"新增任务所属项目\"]').value"),'delivery');
    pending.shift().reject(Error('Synthetic refresh offline'));
    await until(()=>js("document.body.textContent.includes('Synthetic refresh offline')"));
    assert.equal(await js("document.querySelector('[aria-label=\"新增任务所属项目\"]').value"),'delivery');
    await click('重试项目');await until(()=>pending.length===1);
    pending.shift().resolve({sourceKey,projects:[projects[0]]});
    await until(()=>js("document.body.textContent.includes('原项目已不可用')"));
    await click('确认整理');
    assert.ok(await js("!!document.querySelector('.quick-task-form [role=alert]')"));
    await click('刷新项目');await until(()=>pending.length===1);
    pending.shift().resolve({sourceKey,projects:[]});
    await until(()=>js("!document.querySelector('option[value=research]')"));
    assert.equal(await js("document.querySelector('[aria-label=\"新增任务所属项目\"]').disabled"),false);
    await select('[aria-label="新增任务所属项目"]','');
    await click('刷新项目');await until(()=>pending.length===1);
    pending.shift().resolve({sourceKey,projects});
    await until(()=>js("!!document.querySelector('option[value=research]')"));
    await select('[aria-label="新增任务所属项目"]','research');await click('确认整理');
    await until(()=>js("document.querySelectorAll('.capture-item').length===0"));
    queued=await js("JSON.parse(localStorage.getItem('"+queueKey+"'))");
    const selected=queued.find(e=>e.id===captures[1].id).payload;
    assert.equal(selected.projectId,'research');assert.equal(selected.projectType,'research');
    assert.equal(win.isVisible(),false);
    console.log(JSON.stringify({PASS:true,projectReads,reusedOnReopen:true,initialPendingCanOrganize:true,refreshKeepsSelection:true,removedSelectionBlocked:true,liveCloudWrites:0}));
    clearTimeout(timer);app.exit(0);
  }catch(error){console.error(error);clearTimeout(timer);app.exit(1);}
});
