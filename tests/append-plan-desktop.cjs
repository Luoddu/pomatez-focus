// Cold-process test: real Electron/main/preload/renderer, synthetic Feishu only.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict"),
  path = require("node:path");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
process.env.POMATEZ_HEADLESS = "1";
app.commandLine.appendSwitch("mute-audio");
const seed = process.argv.includes("seed");
const historyMode = process.argv.includes("history");
let release,
  uploads = 0,
  requests = [],
  shared = [];
const gate = new Promise((r) => (release = r));
const tasks = ["iu", "inu", "uni", "unu"].map((quadrant) => ({
  id: `p-${quadrant}`,
  planId: `p-${quadrant}`,
  taskId: `t-${quadrant}`,
  title: `Synthetic ${quadrant} · 第 1 个番茄`,
  source: "feishu",
  sourceKey: "synthetic",
  quadrant,
  description: `Details ${quadrant}`,
  plannedToday: quadrant === "iu" ? 3 : 1,
  doneToday: quadrant === "iu" ? 3 : 0,
  ...(quadrant === "iu" ? { kind: "done" } : {}),
}));
if (historyMode) {
  const now = Date.now(), today = new Date().setHours(0, 0, 0, 0);
  shared = [
    { ...tasks[0] },
    { ...tasks[0], id: "old-plan", planId: "old-plan", taskId: "t-old", title: "Past task · 第 9 个番茄", plannedToday: 9, doneToday: 9, quadrant: "uni", projectType: "delivery" },
    { ...tasks[0], id: "free", taskId: "free", title: "Free", kind: "free" },
    { ...tasks[0], id: "quick", taskId: "quick-unbound", title: "Unbound", quickTask: { id: "unbound", sequence: 1 } },
  ].map((task, i) => ({ id: `history-${i}`, task,
    startedAt: i === 1 ? today - 3600000 : now - 1800000 - i * 60000,
    endedAt: i === 1 ? today - 1800000 : now - 300000 - i * 60000,
    plannedSeconds: 1500, elapsedSeconds: 1500, acceptedSeconds: 1500,
    completedCount: 1, status: "saved", sync: "synced", cloudSynced: true }));
}
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: "synthetic",
});
FocusService.prototype.today = async () => structuredClone(tasks);
FocusService.prototype.generateToday = async () => ({ created: 0 });
FocusService.prototype.history = async () => ({
  sourceKey: "synthetic",
  records: shared,
  missing: 0,
});
FocusService.prototype.createQuickTask = async (q) => {
  requests.push(q);
  await gate;
  if (seed) throw Error("Synthetic offline");
  assert.ok(q.append);
  assert.equal(q.count, 1);
  const id = `real-${q.quadrant}-${q.append.sequence}`;
  const row = {
    id,
    planId: id,
    taskId: q.append.taskId,
    title: `${q.title} · 第 ${q.append.sequence} 个番茄`,
    source: "feishu",
    sourceKey: q.sourceKey,
    quadrant: q.quadrant,
    description: q.append.description,
    plannedToday: q.append.plannedToday,
    doneToday: q.append.doneToday,
  };
  tasks.push(row);
  return { tasks: [row] };
};
FocusService.prototype.sync = async (r) => {
  assert.ok(!r.task.quickTask);
  assert.equal(r.task.planId, "real-iu-4");
  uploads++;
  return { synced: true, planId: r.task.planId };
};
FocusService.prototype.archiveHistory = async (r) => {
  const result = { ...r, sync: "synced", cloudSynced: true };
  shared = [result];
  return result;
};
require("../app/electron/build/main.js");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 45000);
app.whenReady().then(async () => {
  try {
    let win;
    const until = async (f) => {
      for (let i = 0; i < 250; i++) {
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
    const stored = () =>
      js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
    const queue = () =>
      js(
        "JSON.parse(localStorage.getItem('pomatez-quick-edit-outbox-v1')||'[]')"
      );
    if (historyMode) {
      await until(() => js("document.querySelectorAll('.task').length===4"));
      await until(() => js("!!document.querySelector('[aria-label=\"手动同步\"]')&&!document.querySelector('[aria-label=\"手动同步\"]').disabled"));
      await click("手动同步");
      await until(async () => (await stored())?.records?.some(r => r.id === "history-1"));
      await js("document.querySelectorAll('.day-glass').forEach(b=>b.click())");
      await until(() => js("document.querySelectorAll('.record-append').length===2"));
      assert.equal(await js("document.querySelector('.record-append').previousElementSibling.classList.contains('record-edit')"), true);
      assert.equal(await js("getComputedStyle(document.querySelector('.record-append')).opacity"), "0");
      // Hidden windows do not advance compositor transitions reliably. Inspect
      // the final focus rule with transitions disabled only in this fixture.
      await js("document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'.record-append{transition:none!important}'}));document.querySelector('.record-append').focus()");
      assert.equal(await js("document.activeElement===document.querySelector('.record-append')"), true);
      assert.equal(await js("getComputedStyle(document.querySelector('.record-append')).opacity"), "1");
      assert.equal(await js("getComputedStyle(document.querySelector('.record-append')).borderRadius"), "50%");
      await js("document.querySelector('.quad-inu .chip').click()");
      await click("开始专注"); await click("暂停");
      const before = await stored();
      await js("(()=>{const b=document.querySelector('.record-append[aria-label=\"增加番茄：Synthetic iu\"]');b.click();b.click()})()");
      await js("(()=>{const b=document.querySelector('.record-append[aria-label=\"增加番茄：Past task\"]');b.click();b.click()})()");
      const queued = await queue();
      assert.equal(queued.length, 4);
      assert.deepEqual(queued.filter(e=>e.payload.append.taskId==='t-iu').map(e=>e.payload.append.sequence), [4,5]);
      const past = queued.filter(e=>e.payload.append.taskId==='t-old');
      assert.deepEqual(past.map(e=>e.payload.append.sequence), [1,2]);
      assert.ok(past.every(e=>e.payload.quadrant==='uni'&&e.payload.projectType==='delivery'&&e.payload.day===new Date().setHours(0,0,0,0)));
      assert.deepEqual((await stored()).active, before.active);
      assert.deepEqual((await stored()).records, before.records);
      await click("修改记录 history-0");
      assert.equal(await js("!!document.querySelector('#manual-task')"), true);
      await click("取消");
      release(); await until(async ()=>(await queue()).length===0);
      assert.equal(uploads, 0);
      assert.deepEqual((await stored()).active, before.active);
      assert.deepEqual((await stored()).records, before.records);
      assert.equal(requests.filter(q=>q.append.taskId==='t-old').length,2);
      console.log("PASS history circle plus/focus beside edit, stable IDs, today sequences, past-day reset, free/unbound excluded, active/history unchanged, synthetic receipts");
    } else if (seed) {
      await until(() =>
        js("document.querySelectorAll('.task').length===4")
      );
      const add = async (quad) => {
        await js(
          `document.querySelector('.quad-${quad} .task').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`
        );
        await click(`增加番茄：Synthetic ${quad}`);
      };
      await js(
        "document.querySelector('.quad-iu .task').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))"
      );
      await js(
        "(()=>{const b=document.querySelector('[aria-label=\"增加番茄：Synthetic iu\"]');b.click();b.click()})()"
      );
      await until(() => requests.length === 1);
      for (const quadrant of ["inu", "uni", "unu"]) await add(quadrant);
      assert.equal((await queue()).length, 5);
      assert.deepEqual(
        (await queue())
          .filter((e) => e.payload.quadrant === "iu")
          .map((e) => e.payload.append.sequence),
        [4, 5]
      );
      for (const quadrant of ["iu", "inu", "uni", "unu"]) {
        assert.equal(
          await js(
            `document.querySelector('.quad-${quadrant} .chip.selected')?.disabled||false`
          ),
          false
        );
        assert.equal(
          await js(
            `document.querySelectorAll('.quad-${quadrant} .chip').length`
          ),
          2
        );
      }
      assert.equal(
        await js(
          "document.querySelector('.quad-iu .harvest-mini').textContent.trim()"
        ),
        "已收 3/5"
      );
      assert.equal(
        await js(
          "[...document.querySelectorAll('.chip')].some(e=>e.disabled)"
        ),
        false
      );
      await click("生成今日番茄");
      await delay(350);
      assert.equal(
        await js("document.querySelectorAll('.chip').length"),
        8
      );
      await click("补记");
      await js(
        "(()=>{const s=document.querySelector('#manual-task');s.value=[...s.options].find(o=>o.textContent.includes('Synthetic iu')).value;s.dispatchEvent(new Event('change',{bubbles:true}))})()"
      );
      await click("保存补记");
      await js(
        "[...document.querySelectorAll('.quad-iu .chip')].find(e=>e.textContent.trim()==='4').click()"
      );
      await click("开始专注");
      await delay(1200);
      await click("暂停");
      assert.equal((await stored()).active.task.quickTask.sequence, 1);
      assert.match((await stored()).active.task.title, /第 4 个/);
      assert.equal((await stored()).active.task.quadrant, "iu");
      release();
      await until(async () =>
        (await queue()).every((e) => e.state === "failed")
      );
      assert.equal((await queue()).length, 5);
      assert.equal(uploads, 0);
      console.log(
        "PASS all quadrants, completed task, repeated adds, stale refresh, start before reply, offline preservation"
      );
    } else {
      await until(
        async () => !!(await stored())?.active?.task.quickTask
      );
      const before = await stored();
      assert.equal(before.active.status, "paused");
      assert.equal((await queue()).length, 5);
      await until(() =>
        js(
          "!!document.querySelector('[aria-label=\"手动同步\"]')&&!document.querySelector('[aria-label=\"手动同步\"]').disabled"
        )
      );
      await click("手动同步");
      await until(() => requests.length > 0);
      release();
      await until(async () => (await queue()).length === 0);
      await until(() => uploads === 1);
      const after = await stored();
      assert.equal(after.active.id, before.active.id);
      assert.equal(
        after.active.elapsedSeconds,
        before.active.elapsedSeconds
      );
      assert.equal(after.active.task.planId, "real-iu-4");
      assert.equal(after.active.task.description, "Details iu");
      assert.equal(after.records[0].id, before.records[0].id);
      assert.equal(after.records[0].task.planId, "real-iu-4");
      await click("结束");
      await click("确认结束");
      await click("放弃本次");
      await until(() =>
        js("!!document.querySelector('.quad-inu .chip')")
      );
      assert.equal(
        await js("document.querySelectorAll('.quad-inu .chip').length"),
        2
      );
      assert.equal(
        await js("document.querySelectorAll('.quad-uni .chip').length"),
        2
      );
      assert.equal(
        await js("document.querySelectorAll('.quad-unu .chip').length"),
        2
      );
      console.log(
        "PASS cold restart/retry binds same active + saved sessions, syncs once and keeps sibling plans"
      );
    }
    assert.equal(win.isVisible(), false);
    clearTimeout(timeout);
    app.exit(0);
  } catch (e) {
    console.error(e);
    clearTimeout(timeout);
    app.exit(1);
  }
});
