// Actual process exit/restart, real main/preload/renderer, synthetic offline API.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
process.env.POMATEZ_HEADLESS = "1";
const seed = process.argv.includes("seed");
let source = "synthetic",
  mode = seed ? "fresh" : "hold",
  calls = 0;
let pending = [];
const row = {
  id: "p1",
  planId: "p1",
  taskId: "t1",
  title: "Cached synthetic task · 第 1 个番茄",
  source: "feishu",
  sourceKey: "synthetic",
  quadrant: "iu",
};
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: source,
});
FocusService.prototype.today = async () => {
  calls++;
  if (mode === "hold")
    return new Promise((resolve, reject) =>
      pending.push({ resolve, reject })
    );
  return mode === "empty" ? [] : [row];
};
// Hold history, too; no network-dependent boot operation can finish in restart phase.
FocusService.prototype.history = () => new Promise(() => {});
require("../app/electron/build/main.js");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 40000);
app.whenReady().then(async () => {
  try {
    let win;
    const until = async (f) => {
      for (let i = 0; i < 150; i++) {
        if (await f()) return;
        await delay(30);
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
    const js = async (s) => {
      try {
        return await win.webContents.executeJavaScript(s, true);
      } catch (e) {
        throw Error(s + "\n" + e.message);
      }
    };
    const key = "pomatez-task-snapshot-v1";
    const chip = () => js("!!document.querySelector('.chips .chip')");
    const click = (label) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(
          label
        )}||b.textContent.trim()===${JSON.stringify(
          label
        )});if(!b)throw Error('Missing button');b.click()})()`
      );
    const reload = async () => {
      // Renderer navigation is intentionally blocked by main's will-navigate.
      // Drive a real reload from Electron, rather than a no-op location.reload().
      const count = calls;
      win.webContents.reload();
      try {
        await until(() => calls > count);
      } catch (e) {
        console.error("RELOAD DIAGNOSTIC", {
          calls,
          count,
          loading: win.webContents.isLoadingMainFrame(),
          url: win.webContents.getURL(),
        });
        console.error(await js("document.body.innerText"));
        throw e;
      }
    };
    const discard = async () => {
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
      await until(() =>
        js(
          "!JSON.parse(localStorage.getItem('pomatez-focus-v1')).active"
        )
      );
    };
    if (seed) {
      await until(chip);
      await until(() => js(`!!localStorage.getItem('${key}')`));
      await win.webContents.session.flushStorageData();
      console.log(
        "PASS seed task snapshot from authoritative read, then process exit"
      );
    } else {
      await until(() => pending.length > 0);
      await until(chip);
      assert.equal(
        await js(
          "document.querySelector('[aria-label=\"开始专注\"]').disabled"
        ),
        false
      );
      await js("document.querySelector('.chips .chip').click()");
      await click("开始专注");
      await until(() =>
        js(
          "JSON.parse(localStorage.getItem('pomatez-focus-v1')).active?.task.id==='p1'"
        )
      );
      console.log(
        "PASS cold restart starts cached task with ALL remote reads held"
      );
      await discard();
      await reload();
      await until(chip);
      for (const p of pending.splice(0))
        p.reject(Error("Synthetic offline"));
      await until(() =>
        js("document.body.textContent.includes('Synthetic offline')")
      );
      assert.equal(await chip(), true);
      assert.equal(
        await js(
          "document.querySelector('[aria-label=\"开始专注\"]').disabled"
        ),
        false
      );
      console.log("PASS offline refresh keeps task snapshot usable");
      mode = "empty";
      await click("刷新今日番茄");
      await until(async () => !(await chip()));
      assert.deepEqual(
        await js(`JSON.parse(localStorage.getItem('${key}')).rows`),
        []
      );
      console.log("PASS successful empty read replaces stale tasks");
      mode = "hold";
      await js(
        `localStorage.setItem('${key}',JSON.stringify({version:1,sourceKey:'synthetic',day:'1999-1-1',rows:[${JSON.stringify(
          row
        )}]}))`
      );
      await reload();
      assert.equal(await chip(), false);
      assert.equal(
        await js(
          "document.querySelector('[aria-label=\"开始专注\"]').disabled"
        ),
        false
      );
      await click("开始专注");
      await until(() =>
        js(
          "JSON.parse(localStorage.getItem('pomatez-focus-v1')).active?.task.kind==='free'"
        )
      );
      assert.equal(
        await js(
          "JSON.parse(localStorage.getItem('pomatez-focus-v1')).active.task.sourceKey"
        ),
        "synthetic"
      );
      console.log(
        "PASS old-day cache excluded; free focus starts without remote read"
      );
      await discard();
      await js(
        `(()=>{let d=new Date();localStorage.setItem('${key}',JSON.stringify({version:1,sourceKey:'synthetic',day:d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(),rows:[${JSON.stringify(
          row
        )}]}))})()`
      );
      source = "other";
      await reload();
      assert.equal(await chip(), false);
      console.log(
        "PASS different connection never displays prior tasks"
      );
      source = "synthetic";
      await js(`localStorage.setItem('${key}','{')`);
      await reload();
      assert.equal(await chip(), false);
      assert.equal(
        await js(
          "document.querySelector('[aria-label=\"开始专注\"]').disabled"
        ),
        false
      );
      console.log("PASS corrupt cache does not block free focus");
      assert.equal(win.isVisible(), false);
    }
    clearTimeout(timeout);
    app.exit(0);
  } catch (e) {
    console.error(e);
    clearTimeout(timeout);
    app.exit(1);
  }
});
