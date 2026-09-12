// Three sequential real Electron processes: computer A, computer B, then A again.
// Each computer has its own profile; both use the same synthetic Feishu state.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
if (!process.versions.electron) {
  const root = path.resolve(__dirname, ".."),
    run = path.join(root, "artifacts/test-profiles", randomUUID());
  fs.mkdirSync(run, { recursive: true });
  const { spawnSync } = require("node:child_process");
  for (const phase of ["A", "B", "A-return"]) {
    const env = {
      ...process.env,
      CLOUD_TEST_RUN: run,
      CLOUD_TEST_PHASE: phase,
    };
    delete env.ELECTRON_RUN_AS_NODE;
    const result = spawnSync(require("electron"), [__filename], {
      env,
      windowsHide: true,
      stdio: "inherit",
      timeout: 45000,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  console.log(
    "Three-process A/B/A cloud history and active-timer isolation passed"
  );
  process.exit(0);
}
const { app, BrowserWindow } = require("electron");
const { harness, record, config } = require("./plan-fixture.cjs");
const {
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
const run = process.env.CLOUD_TEST_RUN,
  phase = process.env.CLOUD_TEST_PHASE;
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  run,
  phase === "B" ? "computer-B" : "computer-A"
);
const fixture = harness(),
  store = path.join(run, "synthetic-cloud.json");
if (fs.existsSync(store))
  Object.assign(
    fixture.state,
    JSON.parse(fs.readFileSync(store, "utf8"))
  );
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: connectionKey(config),
});
FocusService.prototype.today = () => fixture.client.today();
FocusService.prototype.sync = (r) => fixture.client.sync(r);
FocusService.prototype.history = () => fixture.client.history();
FocusService.prototype.archiveHistory = (r) =>
  fixture.client.archiveHistory(r);
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = setTimeout(() => app.exit(2), 35000);
app.whenReady().then(async () => {
  try {
    let win;
    for (let i = 0; i < 200; i++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await wait(25);
    }
    const js = (s) => win.webContents.executeJavaScript(s, true);
    const until = async (f, label) => {
      for (let i = 0; i < 250; i++) {
        if (await f()) return;
        await wait(30);
      }
      throw Error("Timed out: " + label);
    };
    const stored = () =>
      js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
    const idle = () =>
      js(
        "document.querySelector('[aria-label=\"手动同步\"]')?.disabled===false"
      );
    const click = (t) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(
          t
        )}||b.textContent===${JSON.stringify(
          t
        )});if(!b)throw Error('Missing '+${JSON.stringify(
          t
        )});b.click()})()`
      );
    const manual = async (task, minutes) => {
      await click("补记");
      await js(
        `(()=>{const s=document.querySelector('#manual-task');s.value=${JSON.stringify(
          task
        )};s.dispatchEvent(new Event('change',{bubbles:true}));const set=(id,value)=>{const n=document.querySelector(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,value);n.dispatchEvent(new Event('input',{bubbles:true}))};const d=new Date(Date.now()-3*3600000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());set('#manual-when',d.toISOString().slice(0,16));set('#manual-minutes',${JSON.stringify(
          String(minutes)
        )})})()`
      );
      await js(
        "[...document.querySelectorAll('.manual-form button')].find(b=>b.textContent.includes('保存')).click()"
      );
    };
    await until(idle, "initial history pull");
    if (phase === "A") {
      await manual("p1", 50);
      await until(async () => {
        const d = await stored();
        return d?.records.length === 1 && d.records[0].cloudSynced;
      }, "A saved and archived");
      assert.equal((await stored()).records[0].completedCount, 2);
      assert.ok(
        fs.existsSync(
          path.join(
            process.env.POMATEZ_PROFILE,
            "backups/before-cloud-history-v1.json"
          )
        )
      );
    } else if (phase === "B") {
      assert.equal((await stored()).records.length, 1);
      assert.equal((await stored()).records[0].completedCount, 2);
      await js(
        "document.querySelector('.start-focus-btn').click()"
      ).catch(() =>
        js(
          "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('开始自由专注')).click()"
        )
      );
      await until(
        async () => !!(await stored())?.active,
        "B timer start"
      );
      const active = (await stored()).active;
      const incoming = record(1500, { completedCount: 1 });
      const receipt = await fixture.client.sync(incoming);
      await fixture.client.archiveHistory({
        ...incoming,
        sync: "synced",
        syncedPlanId: receipt.planId,
      });
      await click("手动同步");
      await until(
        async () => (await stored()).records.length === 2,
        "pull while active"
      );
      assert.equal((await stored()).active.id, active.id);
      assert.equal((await stored()).active.status, "active");
      await click("结束");
      await click("确认结束");
      await until(
        () => js("document.body.textContent.includes('放弃本次')"),
        "review"
      );
      await js(
        "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('放弃本次')).click()"
      );
      await until(idle, "after discard");
      await manual("free", 25);
      await until(async () => {
        const d = await stored();
        return (
          d.records.length === 3 &&
          d.records.every((r) => r.cloudSynced)
        );
      }, "B free history upload");
    } else {
      await until(
        async () => (await stored()).records.length === 3,
        "A sees B"
      );
      const before = await stored();
      await click("手动同步");
      await until(idle, "repeat pull");
      const after = await stored();
      assert.equal(after.records.length, 3);
      assert.equal(
        after.records.reduce((n, r) => n + r.completedCount, 0),
        4
      );
      assert.deepEqual(after.records, before.records);
      assert.equal(after.active, null);
    }
    await until(idle, "final sync");
    assert.equal(win.isVisible(), false);
    fs.writeFileSync(store, JSON.stringify(fixture.state));
    console.log(
      JSON.stringify({
        phase,
        records: (await stored()).records.length,
        hidden: true,
      })
    );
    clearTimeout(deadline);
    app.exit(0);
  } catch (e) {
    console.error(e.stack);
    clearTimeout(deadline);
    app.exit(1);
  }
});
