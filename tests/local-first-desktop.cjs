// Cold process lifecycle with held/offline creation, real main/preload/renderer.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
process.env.POMATEZ_HEADLESS = "1";
const seed = process.argv.includes("seed");
let release,
  received = [],
  shared = [],
  uploads = 0;
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: "synthetic",
});
FocusService.prototype.today = async () => received;
FocusService.prototype.history = async () => ({
  sourceKey: "synthetic",
  records: shared,
  missing: 0,
});
FocusService.prototype.createQuickTask = async (q) => {
  assert.equal(q.count, 2);
  await new Promise((r) => {
    release = r;
  });
  received = [1, 2].map((n) => ({
    id: `real${n}`,
    planId: `real${n}`,
    taskId: "real-task",
    title: `${q.title} · 第 ${n} 个番茄`,
    quadrant: q.quadrant,
    source: "feishu",
    sourceKey: q.sourceKey,
  }));
  return { tasks: received };
};
FocusService.prototype.sync = async (r) => {
  assert.equal(r.task.quickTask, undefined);
  assert.equal(r.task.planId, "real2");
  uploads++;
  return { planId: r.task.planId, synced: true };
};
FocusService.prototype.archiveHistory = async (r) => {
  const saved = { ...r, cloudSynced: true, sync: "synced" };
  shared = [saved];
  return saved;
};
require("../app/electron/build/main.js");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 40000);
app.whenReady().then(async () => {
  try {
    let win;
    const until = async (f) => {
      for (let i = 0; i < 200; i++) {
        if (await f()) return;
        await delay(25);
      }
      throw Error("Timed out: " + f);
    };
    await until(() => {
      win = BrowserWindow.getAllWindows()[0];
      return (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      );
    });
    const js = (s) => win.webContents.executeJavaScript(s, true);
    const click = (label) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(
          label
        )}||b.getAttribute('aria-label')===${JSON.stringify(
          label
        )});if(!b)throw Error('Missing button');b.click()})()`
      );
    const set = (selector, v) =>
      js(
        `(()=>{const e=document.querySelector(${JSON.stringify(
          selector
        )});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(
          String(v)
        )});e.dispatchEvent(new Event('input',{bubbles:true}));})()`
      );
    const stored = () =>
      js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
    const outbox = () =>
      js(
        "JSON.parse(localStorage.getItem('pomatez-quick-edit-outbox-v1')||'[]')"
      );
    if (seed) {
      await until(() =>
        js(
          "!document.querySelector('[aria-label=\"刷新今日番茄\"]').disabled"
        )
      );
      await click("在重要不紧急新增任务");
      await set('[aria-label="新增任务名称"]', "Cold synthetic task");
      await set('[aria-label="新增任务番茄数"]', 2);
      await click("添加");
      await until(() => !!release);
      assert.equal(
        await js("document.querySelectorAll('.chips .chip').length"),
        2
      );
      await click("补记");
      await js(
        "(()=>{const e=document.querySelector('#manual-task');e.selectedIndex=2;e.dispatchEvent(new Event('change',{bubbles:true}));})()"
      );
      await click("保存补记");
      await until(
        async () => !!(await stored())?.records[0]?.task.quickTask
      );
      await js("document.querySelector('.chips .chip').click()");
      await click("开始专注");
      await until(
        async () => !!(await stored())?.active?.task.quickTask
      );
      assert.equal(uploads, 0);
      assert.equal((await outbox()).length, 1);
      console.log(
        "PASS seed: local task, saved record and active focus persisted while remote create is held"
      );
    } else {
      await until(
        async () =>
          !!(await stored())?.active?.task.quickTask && !!release
      );
      const before = await stored();
      assert.equal(before.active.status, "paused");
      assert.equal(before.records[0].task.quickTask.sequence, 2);
      assert.equal(uploads, 0);
      release();
      await until(async () => !(await stored()).active.task.quickTask);
      await until(() => uploads === 1);
      await until(async () => (await outbox()).length === 0);
      const after = await stored();
      assert.equal(after.active.id, before.active.id);
      assert.equal(
        after.active.elapsedSeconds,
        before.active.elapsedSeconds
      );
      assert.equal(after.active.task.planId, "real1");
      assert.equal(after.records[0].id, before.records[0].id);
      assert.equal(after.records[0].task.planId, "real2");
      assert.equal(after.records[0].acceptedSeconds, 1500);
      fs.writeFileSync(
        path.join(__dirname, "../artifacts/local-first-desktop.json"),
        JSON.stringify(
          {
            passed: 6,
            checks: [
              "visible before create",
              "start before create",
              "saved record waits for identity",
              "cold restart preserves draft",
              "active identity binds without time reset",
              "saved draft uploads once to resolved row",
            ],
          },
          null,
          2
        )
      );
      console.log(
        "PASS restart: active focus and saved draft bind to verified rows, upload once without changing IDs or duration"
      );
    }
    assert.equal(win.isVisible(), false);
    clearTimeout(timeout);
    app.exit(0);
  } catch (e) {
    console.error(e.stack);
    clearTimeout(timeout);
    app.exit(1);
  }
});
