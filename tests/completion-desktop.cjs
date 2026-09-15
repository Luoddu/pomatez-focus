// Real Electron/preload/renderer and Feishu completion adapter; synthetic HTTP only.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict"),
  path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
const {
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const { harness, config } = require("./plan-fixture.cjs");
const { state, client } = harness();
state.plans.push({
  ...structuredClone(state.plans[1]),
  record_id: "p3",
  fields: { ...structuredClone(state.plans[1].fields), 番茄: "3" },
});
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  __dirname,
  "../artifacts/test-profiles",
  randomUUID()
);
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: connectionKey(config),
});
FocusService.prototype.today = () => client.today();
FocusService.prototype.history = () => client.history();
FocusService.prototype.archiveHistory = (v) => client.archiveHistory(v);
let release,
  fail = true;
const gate = new Promise((r) => (release = r)),
  calls = [];
FocusService.prototype.completeToday = async ({ planId }) => {
  calls.push(planId);
  if (planId === "p1") await gate;
  if (planId === "p2" && fail) throw Error("Synthetic offline");
  return client.completePlan(planId);
};
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = setTimeout(() => app.exit(2), 40000);
app.whenReady().then(async () => {
  try {
    let win;
    for (let i = 0; i < 150; i++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await wait(50);
    }
    assert.equal(win.isVisible(), false);
    const js = (s) => win.webContents.executeJavaScript(s, true);
    const until = async (fn) => {
      for (let i = 0; i < 150; i++) {
        if (await fn()) return;
        await wait(30);
      }
      throw Error("condition timeout");
    };
    await until(() =>
      js('document.querySelectorAll(".chip").length===3')
    );
    const complete = async () => {
      await js(
        `(()=>{const c=document.querySelector('.chip');c.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:200,clientY:200}))})()`
      );
      await until(() => js('!!document.querySelector(".ctx-item")'));
      await js('document.querySelector(".ctx-item").click()');
    };
    await complete();
    await until(() =>
      js('document.querySelectorAll(".chip").length===2')
    );
    await complete();
    await until(() =>
      js('document.querySelectorAll(".chip").length===1')
    );
    await complete();
    await until(() =>
      js('document.querySelectorAll(".chip").length===0')
    );
    assert.deepEqual(calls, ["p1"]);
    assert.equal(
      await js(
        `JSON.parse(localStorage.getItem('pomatez-completion-queue-v1')).length`
      ),
      3
    );
    assert.match(
      await js(
        'document.querySelector(".completion-status").textContent'
      ),
      /3 个待同步/
    );
    require("node:fs").writeFileSync(path.join(__dirname,"../artifacts/completion-queue.png"),(await win.webContents.capturePage()).toPNG());
    // Refresh returns all three still-pending remote rows: none may reappear.
    await js(
      `document.querySelector('[aria-label="刷新今日番茄"]').click()`
    );
    await until(() =>
      js(
        `!document.querySelector('[aria-label="刷新今日番茄"]').disabled`
      )
    );
    assert.equal(
      await js('document.querySelectorAll(".chip").length'),
      0
    );
    release();
    await until(() =>
      js('!!document.querySelector(".completion-status button")')
    );
    await until(() => calls.length === 3);
    assert.deepEqual(calls, ["p1", "p2", "p3"]);
    assert.equal(
      state.plans.filter((p) => p.fields["已完成"]).length,
      2
    );
    assert.equal(
      await js('document.querySelectorAll(".chip").length'),
      0
    );
    // Failed intent persists across renderer restart; it is not silently replayed.
    win.webContents.reload();
    await until(() =>
      js('!!document.querySelector(".completion-status button")')
    );
    await wait(300);
    assert.equal(calls.length, 3);
    fail = false;
    await js(
      'document.querySelector(".completion-status button").click()'
    );
    await until(() =>
      state.plans.every((p) => p.fields["已完成"] === true)
    );
    await until(() =>
      js('!document.querySelector(".completion-status")')
    );
    assert.deepEqual(calls, ["p1", "p2", "p3", "p2"]);
    assert.ok(state.plans.every((p) => p.fields["实际分钟"] == null));
    console.log(
      "PASS: rapid triple completion before first reply; durable queue; isolated failure; restart; retry only failure; no focus minutes"
    );
    clearTimeout(deadline);
    app.exit(0);
  } catch (e) {
    console.error(e);
    clearTimeout(deadline);
    app.exit(1);
  }
});
