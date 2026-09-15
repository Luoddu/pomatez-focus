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
let adjustCalls = 0;
FocusService.prototype.adjustToday = () => { adjustCalls++; throw Error("should not adjust queued task"); };
FocusService.prototype.today = () => client.today();
FocusService.prototype.history = () => client.history();
FocusService.prototype.archiveHistory = (v) => client.archiveHistory(v);
let release,
  fail = true;
let gate = new Promise((r) => (release = r)),
  blockId = "p1";
const calls = [];
FocusService.prototype.completeToday = async ({ planId }) => {
  calls.push(planId);
  if (planId === blockId) await gate;
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
    const js = (s) => win.webContents.executeJavaScript(s, true).catch(e => { throw Error(s + "\n" + e.message); });
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
    // Windows fractional DPI can put the bottom a fraction of a DIP beyond innerHeight.
    assert.equal(
      await js(
        `(()=>{const r=document.querySelector('.completion-status').getBoundingClientRect();return r.height>0 && r.top>=0 && r.bottom<=innerHeight+1})()`
      ),
      true
    );
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
    // A marked next tomato must not be offered from the review screen while
    // the network write is still blocked.
    state.plans.forEach((p) => (p.fields["已完成"] = false));
    await js(
      `document.querySelector('[aria-label="刷新今日番茄"]').click()`
    );
    await until(() =>
      js('document.querySelectorAll(".chip").length===3')
    );
    blockId = "p2";
    gate = new Promise((r) => (release = r));
    await js(
      `document.querySelectorAll('.chip')[1].dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:200,clientY:200}))`
    );
    await until(() => js('!!document.querySelector(".ctx-item")'));
    await js('document.querySelector(".ctx-item").click()');
    await until(() =>
      js('document.querySelectorAll(".chip").length===2')
    );
    await js(`document.querySelector('.task').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`);
    await until(()=>js('!!document.querySelector(".adjust-btn")'));
    await js('document.querySelector(".adjust-btn").click()');
    assert.equal(adjustCalls,0);
    assert.equal(await js('document.querySelectorAll(".chip").length'),2);
    await js('document.querySelector(".chip").click()');
    const clickText = async (text) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(
          text
        )});if(!b||b.disabled)throw Error('button unavailable');b.click()})()`
      );
    await until(() =>
      js(`!document.querySelector('[aria-label="开始专注"]').disabled`)
    );
    await js(
      `document.querySelector('[aria-label="开始专注"]').click()`
    );
    await until(() =>
      js(
        '!!document.querySelector(".timer-controls") || [...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="结束")'
      )
    );
    await clickText("结束");
    await until(()=>js(`[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='确认结束' && !b.disabled)`));
    await clickText("确认结束");
    await until(() => js('!!document.querySelector(".review-card")'));
    assert.equal(
      await js(
        `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='保存并开始下一个').disabled`
      ),
      true
    );
    await clickText("放弃本次");
    release();
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
