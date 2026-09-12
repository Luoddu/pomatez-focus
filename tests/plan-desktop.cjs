// Real main/preload/renderer and Feishu adapter; only HTTP transport is synthetic.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
const {
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const { harness, record, config } = require("./plan-fixture.cjs");
const { state, client } = harness();
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
FocusService.prototype.sync = (value) => client.sync(value);
FocusService.prototype.setup = () => client.setupPlans();
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = setTimeout(() => app.exit(2), 35000);
app.whenReady().then(async () => {
  try {
    let win;
    for (let n = 0; n < 150; n++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await wait(50);
    }
    assert.ok(win);
    assert.equal(win.isVisible(), false);
    const js = (s) => win.webContents.executeJavaScript(s, true);
    const stored = () =>
      js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
    const click = (t) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(
          t
        )}||b.textContent===${JSON.stringify(
          t
        )});if(!b||b.disabled)throw Error('Unavailable '+${JSON.stringify(
          t
        )});b.click()})()`
      );
    // 「结束」需二次确认：第一次进入确认态，再点「确认结束」才真正结束
    const finish2 = async () => {
      await click("结束");
      await wait(120);
      await click("确认结束");
    };
    const until = async (fn) => {

      for (let n = 0; n < 100; n++) {
        if (await fn()) return;
        await wait(40);
      }
      throw Error("Condition timed out");
    };
    const seed = async (active) => {
      const previous = await stored();
      win.webContents.debugger.attach("1.3");
      await win.webContents.debugger.sendCommand("Page.enable");
      const script = await win.webContents.debugger.sendCommand(
        "Page.addScriptToEvaluateOnNewDocument",
        {
          source: `localStorage.setItem('pomatez-focus-v1',${JSON.stringify(
            JSON.stringify({ active, records: previous?.records || [] })
          )})`,
        }
      );
      const done = new Promise((r) =>
        win.webContents.once("did-finish-load", r)
      );
      win.webContents.reload();
      await done;
      await win.webContents.debugger.sendCommand(
        "Page.removeScriptToEvaluateOnNewDocument",
        { identifier: script.identifier }
      );
      win.webContents.debugger.detach();
      await until(() =>
        js("Boolean(document.querySelector('.review-card'))")
      );
      await wait(100);
    };
    const checks = [];
    await until(() =>
      js("document.querySelectorAll('.chip').length===2")
    );
    assert.equal(
      await js("document.querySelectorAll('.chip.selected').length"),
      0
    );
    await click("开始专注");
    await wait(600);
    await click("暂停");
    const paused = (await stored()).active;
    assert.equal(paused.task.title, "自由番茄");
    assert.equal(paused.task.source, "feishu");
    assert.equal(paused.syncTarget, "plan");
    await wait(300);
    assert.equal(
      (await stored()).active.elapsedSeconds,
      paused.elapsedSeconds
    );
    await click("继续");
    await wait(600);
    await finish2();
    await wait(100);
    assert.equal((await stored()).active.segments.length, 2);
    assert.equal(state.writes.length, 0);
    await click("放弃本次");
    await wait(120);
    assert.equal((await stored()).records.length, 0);
    assert.equal(state.writes.length, 0);
    checks.push(
      "unselected free focus runs with pause-separated spans; discard never writes"
    );
    const first = record(720, { status: "review" });
    await seed(first);
    assert.equal(
      await js(
        "Boolean(document.querySelector('[aria-label=\"完成番茄数\"]'))"
      ),
      false
    );
    await click("记录番茄");
    await until(
      async () => (await stored()).records[0]?.sync === "synced"
    );
    assert.equal(state.plans[0].fields["实际分钟"], 12);
    assert.notEqual(state.plans[0].fields["已完成"], true);
    const task = (await client.today()).find((t) => t.planId === "p1");
    assert.equal(task.creditedSeconds, 720);
    const second = record(780, { status: "review", task });
    await seed(second);
    await click("记录番茄");
    await until(
      async () => (await stored()).records[0]?.sync === "synced"
    );
    assert.equal(state.plans[0].fields["实际分钟"], 25);
    assert.equal(state.plans[0].fields["已完成"], true);
    assert.equal(state.plans[1].fields["已完成"], undefined);
    assert.deepEqual(
      (await stored()).records.map((r) => r.completedCount),
      [1, 0]
    );
    await until(() =>
      js("document.querySelectorAll('.chip').length===1")
    );
    checks.push(
      "12 plus 13 minutes through review and IPC completes only selected original row and refreshes board"
    );
    const free = record(1500, {
      status: "review",
      task: {
        id: randomUUID(),
        title: "自由番茄",
        kind: "free",
        source: "feishu",
        sourceKey: connectionKey(config),
      },
    });
    await seed(free);
    state.fail = true;
    await click("记录番茄");
    await until(() =>
      js("document.body.textContent.includes('待同步')")
    );
    assert.equal((await stored()).records[0].sync, "pending");
    assert.equal(state.plans.length, 2);
    state.fail = false;
    await click("设置");
    await wait(100);
    await click("立即重试");
    await until(
      async () => (await stored()).records[0].sync === "synced"
    );
    assert.equal(state.plans.length, 3);
    assert.equal(state.plans[2].fields["番茄"], "自由番茄");
    assert.equal(state.plans[2].fields["实际分钟"], 25);
    assert.equal(state.tasks[1].fields["任务名称"], "自由番茄");
    const before = state.writes.length;
    await client.sync((await stored()).records[0]);
    assert.equal(state.writes.length, before);
    checks.push(
      "offline free focus stays local pending; explicit retry creates one same-table linked row"
    );
    await click("设置");
    await wait(100);
    assert.equal(win.isVisible(), false);
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/plan-desktop.png"),
      (await win.capturePage()).toPNG()
    );
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/plan-desktop-test.json"),
      JSON.stringify({ passed: checks.length, checks }, null, 2)
    );
    console.log(JSON.stringify({ passed: checks.length, checks }));
    clearTimeout(deadline);
    app.exit(0);
  } catch (e) {
    console.error(e.stack);
    clearTimeout(deadline);
    app.exit(1);
  }
});
