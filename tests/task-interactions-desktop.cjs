// Real main/preload/renderer, hidden and muted; all Feishu responses synthetic.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
process.env.POMATEZ_HEADLESS = "1";
const seed = process.argv.includes("seed");
let releaseRemove,
  releaseCreate,
  removalCalls = [],
  creationCalls = [];
const removalGate = new Promise((r) => (releaseRemove = r));
const creationGate = new Promise((r) => (releaseCreate = r));
let tasks = [
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `a${i + 1}`,
    taskId: "a",
    quadrant: "iu",
    plannedToday: 4,
    projectType: "research",
    creditedSeconds: i === 1 ? 60 : 0,
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `b${i + 1}`,
    taskId: "b",
    quadrant: "inu",
    plannedToday: 2,
    projectType: "delivery",
  })),
].map((t) => ({
  ...t,
  planId: t.id,
  source: "feishu",
  sourceKey: "synthetic",
  doneToday: 0,
  title: `Synthetic ${t.taskId} · 第 ${t.id.slice(1)} 个番茄`,
}));
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: "synthetic",
});
FocusService.prototype.today = async () => structuredClone(tasks);
FocusService.prototype.generateToday = async () => ({ created: 0 });
FocusService.prototype.history = async () => ({
  sourceKey: "synthetic",
  records: [],
  missing: 0,
});
FocusService.prototype.dailyReviews = async () => ({
  sourceKey: "synthetic",
  summaries: {},
});
FocusService.prototype.projects = async () => ({
  sourceKey: "synthetic",
  projects: [
    {
      id: "project-research",
      name: "Synthetic research project",
      projectType: "research",
    },
    {
      id: "project-delivery",
      name: "Synthetic delivery project",
      projectType: "delivery",
    },
  ],
});
FocusService.prototype.removePlan = async (q) => {
  removalCalls.push(q);
  if (seed) {
    await removalGate;
    throw Error("Synthetic offline");
  }
  tasks = tasks
    .filter((t) => t.id !== q.task.planId)
    .map((t) =>
      t.taskId === q.task.taskId
        ? { ...t, plannedToday: t.plannedToday - 1 }
        : t
    );
  return { action: "removed", recordId: q.task.planId };
};
FocusService.prototype.createQuickTask = async (q) => {
  creationCalls.push(q);
  if (!q.append) await creationGate;
  if (seed) throw Error("Synthetic offline");
  const rows = Array.from({ length: q.count }, (_, i) => ({
    id: q.append ? `a${q.append.sequence}` : `new${i + 1}`,
    planId: q.append ? `a${q.append.sequence}` : `new${i + 1}`,
    taskId: q.append?.taskId || "new",
    title: `${q.title} · 第 ${q.append?.sequence || i + 1} 个番茄`,
    source: "feishu",
    sourceKey: q.sourceKey,
    quadrant: q.quadrant,
    projectType: q.projectType,
    doneToday: 0,
    plannedToday: q.append ? q.append.plannedToday : q.count,
  }));
  tasks.push(...rows);
  tasks = tasks.map((t) =>
    t.taskId === rows[0].taskId
      ? { ...t, plannedToday: rows[0].plannedToday }
      : t
  );
  return { tasks: rows };
};
require("../app/electron/build/main.js");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 45000);
app.whenReady().then(async () => {
  try {
    let win;
    const until = async (f) => {
      for (let i = 0; i < 240; i++) {
        if (await f()) return;
        await delay(25);
      }
      throw Error("Timeout " + f);
    };
    await until(() => {
      win = BrowserWindow.getAllWindows()[0];
      return (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      );
    });
    const js = async (s) => {
      try {
        return await win.webContents.executeJavaScript(s, true);
      } catch (e) {
        throw Error(`${s}: ${e.message}`);
      }
    };
    const click = (name) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(
          name
        )}||e.textContent.trim()===${JSON.stringify(
          name
        )});if(!b||b.disabled)throw Error('Unavailable '+${JSON.stringify(
          name
        )});b.click()})()`
      );
    const queue = () =>
      js(
        "JSON.parse(localStorage.getItem('pomatez-quick-edit-outbox-v1')||'[]')"
      );
    const stored = () =>
      js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
    const hover = (quad) =>
      js(
        `document.querySelector('.quad-${quad} .task').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`
      );
    const chips = (quad) =>
      js(
        `[...document.querySelectorAll('.quad-${quad} .chip')].map(e=>e.textContent.trim())`
      );
    if (seed) {
      await until(async () => (await chips("iu")).length === 4);
      await hover("iu");
      await js(
        "(()=>{const b=document.querySelector('[aria-label=\"减少番茄：Synthetic a\"]');b.click();b.click()})()"
      );
      await until(() => removalCalls.length === 1);
      assert.deepEqual(await chips("iu"), ["1", "2"]);
      await hover("inu");
      await click("减少番茄：Synthetic b");
      assert.deepEqual(await chips("inu"), ["1"]);
      assert.deepEqual(
        (await queue()).map((e) => e.payload.task.id),
        ["a4", "a3", "b2"]
      );
      await hover("iu");
      await click("增加番茄：Synthetic a");
      assert.equal((await queue())[3].payload.append.sequence, 5);
      assert.equal(
        await js(
          "document.querySelector('.quad-iu .hm-text').textContent.trim()"
        ),
        "已收 0/3"
      );
      // Highest new local append can be reduced before its receipt arrives.
      await click("减少番茄：Synthetic a");
      assert.equal(
        (await queue())[4].payload.task.quickTask.sequence,
        1
      );
      await js("document.querySelector('.quad-iu .chip').click()");
      await click("开始专注");
      await until(
        async () => (await stored()).active?.task.id === "a1"
      );
      await click("结束");
      await click("确认结束");
      await click("放弃本次");
      releaseRemove();
      await until(async () =>
        (await queue()).every((e) => e.state === "failed")
      );
      assert.equal((await queue()).length, 5);
      console.log(
        "PASS immediate double-minus, cross-task, pending append/remove, start during sync, offline persistence"
      );
    } else {
      await until(async () => (await chips("iu")).join(",") === "1,2");
      assert.equal((await queue()).length, 5);
      await click("重试待同步操作");
      await until(async () => (await queue()).length === 0);
      assert.deepEqual(
        removalCalls.map((q) => q.task.planId),
        ["a4", "a3", "b2", "a5"]
      );
      assert.deepEqual(await chips("iu"), ["1", "2"]);
      assert.equal(
        await js(
          "document.querySelector('.quad-iu .hm-text').textContent.trim()"
        ),
        "已收 0/2"
      );
      await hover("iu");
      await click("减少番茄：Synthetic a");
      await until(async () => (await queue()).length === 0);
      assert.equal(removalCalls.at(-1).task.planId, "a1"); // a2's recorded minutes protected.
      assert.deepEqual(await chips("iu"), ["2"]);
      assert.equal(
        await js(
          "document.querySelector('[aria-label=\"减少番茄：Synthetic a\"]').disabled"
        ),
        true
      );
      await click("在重要不紧急新增任务");
      await until(() =>
        js(
          "document.querySelector('[aria-label=\"新增任务所属项目\"]').options.length===3"
        )
      );
      await js(
        "(()=>{const e=document.querySelector('[aria-label=\"新增任务所属项目\"]');e.value='project-research';e.dispatchEvent(new Event('change',{bubbles:true}))})()"
      );
      await js(
        "(()=>{const e=document.querySelector('[aria-label=\"新增任务名称\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Synthetic new research');e.dispatchEvent(new Event('input',{bubbles:true}))})()"
      );
      await delay(150); // Let the compositor paint the form before visual inspection.
      fs.mkdirSync(path.join(__dirname, "../artifacts"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(
          __dirname,
          "../artifacts/task-interactions-project.png"
        ),
        (await win.webContents.capturePage()).toPNG()
      );
      await click("添加");
      await until(() => creationCalls.length === 2);
      assert.equal(creationCalls[1].projectId, "project-research");
      assert.equal(creationCalls[1].projectType, "research");
      assert.equal(
        await js(
          "[...document.querySelectorAll('.quad-inu .task.is-research')].filter(e=>e.textContent.includes('Synthetic new research')).length"
        ),
        1
      );
      assert.ok((await queue())[0].payload.projectId);
      await js(
        "[...document.querySelectorAll('.quad-inu .task')].find(e=>e.textContent.includes('Synthetic new research')).querySelector('.chip').click()"
      );
      await click("开始专注");
      await until(
        async () => !!(await stored()).active?.task.quickTask
      );
      releaseCreate();
      await until(async () => (await queue()).length === 0);
      assert.equal((await stored()).active.task.planId, "new1");
      assert.equal(
        (await stored()).active.task.projectType,
        "research"
      );
      console.log(
        "PASS cold restart/exact-row retries, used-row guard, project selection/local color/start before upload and bound receipt"
      );
    }
    clearTimeout(timeout);
    app.exit(0);
  } catch (e) {
    console.error(e);
    clearTimeout(timeout);
    app.exit(1);
  }
});
