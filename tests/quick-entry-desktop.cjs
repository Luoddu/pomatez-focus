// Hidden real Electron/main/preload/renderer with synthetic Feishu, no live writes.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  __dirname,
  "../artifacts/test-profiles",
  randomUUID()
);
const tasks = [1, 2].map((n) => ({
  id: `p${n}`,
  planId: `p${n}`,
  taskId: "t1",
  title: `Synthetic task · 第 ${n} 个番茄`,
  source: "feishu",
  sourceKey: "synthetic",
  quadrant: "iu",
}));
let shared = [],
  releaseSync,
  releaseRefresh,
  holdRefresh = false,
  creates = 0,
  corrected = 0;
let releaseCreate;
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: "synthetic",
});
FocusService.prototype.today = async () => {
  if (holdRefresh)
    await new Promise((r) => {
      releaseRefresh = r;
    });
  return structuredClone(tasks);
};
FocusService.prototype.history = async () => ({
  sourceKey: "synthetic",
  records: shared,
  missing: 0,
});
FocusService.prototype.sync = async () => {
  await new Promise((r) => {
    releaseSync = r;
  });
  return { synced: true, planId: "p1" };
};
FocusService.prototype.archiveHistory = async (r) => {
  const result = { ...r, sync: "synced", cloudSynced: true };
  shared = [result];
  return result;
};
FocusService.prototype.correctRecord = async ({ before, after }) => {
  corrected++;
  assert.equal(before.completedCount, 2);
  assert.equal(after.completedCount, 1);
  assert.equal(after.revision, 1);
  assert.equal(before.id, shared[0].id);
  assert.equal(after.id, before.id);
  assert.equal(before.task.id, "p1");
  assert.equal(after.task.id, "p2");
  const record = {
    ...after,
    previousTasks: [before.task],
    cloudSynced: true,
  };
  shared = [record];
  return { record };
};
let intent;
FocusService.prototype.createQuickTask = async (value) => {
  creates++;
  if (!intent) intent = value.id;
  else assert.equal(value.id, intent);
  if (creates === 1) {
    await new Promise((r) => {
      releaseCreate = r;
    });
    throw Error("Synthetic quick task offline");
  }
  assert.equal(value.quadrant, "inu");
  assert.equal(value.count, 2);
  const rows = [1, 2].map((n) => ({
    id: "quick" + n,
    planId: "quick" + n,
    taskId: "quick",
    title: `${value.title} · 第 ${n} 个番茄`,
    source: "feishu",
    sourceKey: "synthetic",
    quadrant: value.quadrant,
  }));
  tasks.push(...rows);
  return { created: true, taskId: "quick", tasks: rows };
};
require("../app/electron/build/main.js");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 60000);
app.whenReady().then(async () => {
  try {
    let win;
    for (let n = 0; n < 200; n++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await delay(50);
    }
    const js = (s) => win.webContents.executeJavaScript(s, true);
    const until = async (check) => {
      for (let n = 0; n < 200; n++) {
        if (await check()) return;
        await delay(30);
      }
      throw Error("UI timed out: " + String(check));
    };
    const click = (name) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(
          name
        )}||b.textContent.trim()===${JSON.stringify(
          name
        )});if(!b)throw Error('Missing '+${JSON.stringify(
          name
        )});b.click()})()`
      );
    const set = (selector, value) =>
      js(
        `(()=>{const e=document.querySelector(${JSON.stringify(
          selector
        )});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(
          String(value)
        )});e.dispatchEvent(new Event('input',{bubbles:true}));})()`
      );
    const stored = () =>
      js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
    const outbox = () =>
      js(
        "JSON.parse(localStorage.getItem('pomatez-quick-edit-outbox-v1')||'[]')"
      );
    await until(() =>
      js(
        "!!document.querySelector('[data-plan-id=\"p1\"]') || document.querySelectorAll('.chips .chip').length===2"
      )
    );
    await click("补记");
    await set('[aria-label="补记番茄数"]', 2);
    assert.equal(
      await js("document.querySelector('#manual-minutes').value"),
      "50"
    );
    assert.ok(
      Math.abs(
        (await js(
          "Date.now()-new Date(document.querySelector('#manual-when').value).getTime()"
        )) - 3000000
      ) < 61000
    );
    await set("#manual-minutes", 40);
    assert.equal(
      await js(
        "document.querySelector('[aria-label=\"补记番茄数\"]').value"
      ),
      "2"
    );
    assert.ok(
      Math.abs(
        (await js(
          "Date.now()-new Date(document.querySelector('#manual-when').value).getTime()"
        )) - 2400000
      ) < 61000
    );
    const d = new Date(Date.now() - 7200000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const when = d.toISOString().slice(0, 16);
    await set("#manual-when", when);
    await js(
      "(()=>{const e=document.querySelector('#manual-task');e.value='p1';e.dispatchEvent(new Event('change',{bubbles:true}));})()"
    );
    assert.equal(
      await js("document.querySelector('#manual-when').value"),
      when
    );
    await click("保存补记");
    await until(() => !!releaseSync);
    const originalId = (await stored()).records[0].id;
    await js(
      "(()=>{const b=[...document.querySelectorAll('.chips .chip')].find(b=>b.textContent.trim()==='2');if(!b.classList.contains('selected'))b.click()})()"
    );
    assert.equal(
      await js(
        "document.querySelector('[aria-label=\"开始专注\"]').disabled"
      ),
      false
    );
    await click("开始专注");
    await until(async () => (await stored()).active?.task.id === "p2");
    await click("修改记录 " + originalId);
    assert.equal(
      await js("document.querySelector('#manual-task').disabled"),
      false
    );
    await js(
      "(()=>{const e=document.querySelector('#manual-task'); e.value='p2'; e.dispatchEvent(new Event('change',{bubbles:true}));})()"
    );
    await set('[aria-label="补记番茄数"]', 1);
    await click("保存修改");
    assert.equal((await outbox())[0].kind, "edit");
    assert.equal(corrected, 0);
    releaseSync();
    await until(async () => (await stored()).records[0].revision === 1);
    await until(async () => (await outbox()).length === 0);
    assert.equal((await stored()).records.length, 1);
    assert.equal((await stored()).active.task.id, "p2");
    assert.equal((await stored()).records[0].completedCount, 1);
    assert.equal((await stored()).records[0].task.id, "p2");
    // Return to board without recording synthetic active focus.
    await click("结束");
    await click("确认结束");
    await until(() =>
      js(
        "!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('放弃'))"
      )
    );
    await js(
      "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('放弃')).click()"
    );
    await click("在重要不紧急新增任务");
    await set('[aria-label="新增任务名称"]', "Synthetic quick task");
    await set('[aria-label="新增任务番茄数"]', 2);
    await click("添加");
    await until(() => !!releaseCreate);
    assert.equal(
      await js(
        "[...document.querySelectorAll('.task')].find(t=>t.textContent.includes('Synthetic quick task')).querySelectorAll('.chip').length"
      ),
      2
    );
    await js(
      "[...document.querySelectorAll('.task')].find(t=>t.textContent.includes('Synthetic quick task')).querySelectorAll('.chip')[1].click()"
    );
    await click("开始专注");
    await until(
      async () =>
        (await stored()).active?.task.quickTask?.sequence === 2
    );
    const startedId = (await stored()).active.id;
    releaseCreate();
    await until(async () => (await outbox())[0]?.state === "failed");
    // Renderer reload preserves failed intention and does not automatically repeat it.
    await new Promise((resolve) => {
      win.webContents.once("did-finish-load", resolve);
      win.webContents.reload();
    });
    await until(() =>
      js(
        "!![...document.querySelectorAll('button')].find(b=>b.textContent==='重试修改与新增任务')"
      )
    );
    assert.equal(creates, 1);
    await until(
      async () => (await stored()).active?.status === "paused"
    );
    await click("重试修改与新增任务");
    await until(async () => (await outbox()).length === 0);
    assert.equal(creates, 2);
    assert.equal((await stored()).active.id, startedId);
    assert.equal((await stored()).active.task.planId, "quick2");
    assert.equal((await stored()).active.task.quickTask, undefined);
    await click("结束");
    await click("确认结束");
    await until(() =>
      js(
        "!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('放弃'))"
      )
    );
    await js(
      "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('放弃')).click()"
    );
    holdRefresh = true;
    await click("刷新今日番茄");
    await until(() => !!releaseRefresh);
    await js(
      "(()=>{const b=[...document.querySelectorAll('.chips .chip')].find(b=>b.textContent.trim()==='2');if(!b.classList.contains('selected'))b.click()})()"
    );
    assert.equal(
      await js(
        "document.querySelector('[aria-label=\"开始专注\"]').disabled"
      ),
      false
    );
    await click("开始专注");
    await until(async () => (await stored()).active?.task.id === "p2");
    holdRefresh = false;
    releaseRefresh();
    assert.equal(win.isVisible(), false);
    const result = {
      passed: 12,
      checks: [
        "count presets duration/start",
        "duration never changes count",
        "manual start preserved",
        "start while uploading",
        "edit queued while upload and applied once without interrupting active timer",
        "quick task retries same intent",
        "pending quick task survives renderer reload",
        "start selected tomato during task refresh",
        "record task selector changes assignment while another focus continues",
        "quick task has all chips before network acknowledgment",
        "unresolved task starts focus immediately",
        "real renderer reload and retry bind same active session to actual row",
      ],
    };
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/quick-entry-desktop.json"),
      JSON.stringify(result, null, 2)
    );
    console.log(JSON.stringify(result));
    clearTimeout(timeout);
    app.exit(0);
  } catch (e) {
    console.error(e.stack);
    clearTimeout(timeout);
    app.exit(1);
  }
});
