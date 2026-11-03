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
let rejectCatalog;
const delayedCatalog = new Promise((_, reject) => { rejectCatalog = reject; });
let offline = true, writes = [], projectReads = 0;
FocusService.prototype.status = () => ({configured: true, sourceKey});
FocusService.prototype.today = async () => structuredClone(tasks);
FocusService.prototype.generateToday = async () => ({created: 0});
FocusService.prototype.history = async () => ({sourceKey, records: [], missing: 0});
FocusService.prototype.dailyReviews = async () => ({sourceKey, summaries: {}});
FocusService.prototype.projects = async () => {
  projectReads++;
  if (offline) await delayedCatalog;
  return {sourceKey, projects};
};
FocusService.prototype.taskProjects = async ({sourceKey: source, taskId}) => {
  assert.equal(source, sourceKey);
  assert.ok(tasks.some(task => task.taskId === taskId));
  return {sourceKey, taskTable: "tasks", projectTable: "projects", projects, currentIds: ["research"]};
};
FocusService.prototype.updateTaskProject = async input => {
  writes.push(input);
  if (writes.length === 1) throw Error("Synthetic conflict");
  tasks.find(task => task.taskId === input.taskId).projectType = "delivery";
  return {sourceKey, taskId: input.taskId, projectType: "delivery"};
};
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
    const capture = {id: randomUUID(), sourceKey, title: "Captured task", count: 1,
      quadrant: "unu", day: new Date().setHours(0,0,0,0), capture: true};
    await js("localStorage.setItem(" + JSON.stringify(queueKey) + "," +
      JSON.stringify(JSON.stringify([{id: capture.id, sourceKey, kind: "task", state: "pending", payload: capture}])) + ")");
    win.reload();
    await until(() => js("!!document.querySelector('.capture-item')"));
    await click("整理");
    await until(() => js("!!document.querySelector('.capture-editor select[aria-label=\"新增任务所属项目\"]:disabled')"));
    assert.ok(await js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='确认整理').disabled"));
    assert.ok(projectReads > 0);
    rejectCatalog(Error("Synthetic directory unavailable"));
    await until(() => js("document.body.textContent.includes('Synthetic directory unavailable')"));
    const beforeRetry = projectReads;
    offline = false;
    await click("重试项目");
    await until(() => js("!!document.querySelector('[aria-label=\"新增任务所属项目\"] option[value=delivery]')"));
    assert.equal(projectReads, beforeRetry + 1);
    await select('[aria-label="新增任务所属项目"]', "delivery");
    await click("确认整理");
    await until(() => js("JSON.parse(localStorage.getItem('" + queueKey + "'))[0]?.payload?.projectId === 'delivery'"));
    assert.equal(await js("JSON.parse(localStorage.getItem('" + queueKey + "'))[0].id"), capture.id);

    await context('[data-task-group=task1] .chip');
    assert.ok(await js("document.querySelector('.ctx-menu').textContent.includes('标记完成')"));
    await click("修改所属项目");
    await until(() => js("document.querySelector('[role=dialog] select')?.value === 'research'"));
    await select('[role=dialog] select', "delivery");
    await click("保存项目");
    await until(() => js("document.querySelector('[role=dialog] [role=alert]')?.textContent.includes('Synthetic conflict')"));
    await click("重新读取项目");
    await until(() => js("document.querySelector('[role=dialog] select')?.value === 'research'"));
    await select('[role=dialog] select', "delivery");
    await click("保存项目");
    await until(() => js("!document.querySelector('[role=dialog]') && !document.querySelector('[data-task-group=task1]').classList.contains('is-research')"));
    assert.deepEqual(writes[1], {sourceKey, taskId: "task1", taskTable: "tasks",
      projectTable: "projects", currentIds: ["research"], projectId: "delivery"});
    await context('[data-task-group=task2] .task-name');
    await click("修改所属项目");
    await until(() => js("document.querySelector('[role=dialog] select')?.value === 'research'"));
    assert.equal(writes.length, 2);
    assert.equal(win.isVisible(), false);
    assert.equal(win.webContents.isAudioMuted(), true);
    console.log("PASS: capture wait, failure and retry; chosen project on original intent; chip and completed task menus; conflict and verified save; hidden and muted.");
    clearTimeout(timer);
    app.exit(0);
  } catch (error) {
    console.error(error);
    clearTimeout(timer);
    app.exit(1);
  }
});
