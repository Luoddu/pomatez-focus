// Runs the real Electron main/preload/production renderer, always hidden.
const { app, BrowserWindow, powerMonitor } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
if (
  process.env.POMATEZ_HEADLESS !== "1" ||
  !process.env.POMATEZ_PROFILE
)
  throw Error("Hidden isolated profile required");
const root = path.resolve(__dirname, ".."),
  artifacts = path.join(root, "artifacts");
fs.mkdirSync(artifacts, { recursive: true });
const downloads = path.join(artifacts, "test-downloads", randomUUID());
fs.mkdirSync(downloads, { recursive: true });
app.setPath("downloads", downloads);
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const errors = [];
const check = (name, fn) => {
  fn();
  checks.push(name);
};
const deadline = setTimeout(() => {
  console.error("Hidden desktop test timed out");
  app.exit(2);
}, 45000);
app
  .whenReady()
  .then(async () => {
    let win;
    for (let n = 0; n < 100; n++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await wait(100);
    }
    assert.ok(win);
    win.on("show", () => errors.push("Unexpected visible window"));
    win.webContents.on("console-message", (_event, level, message) => {
      if (level >= 3) errors.push(message);
    });
    const js = (code) => win.webContents.executeJavaScript(code, true);
    const click = (text) =>
      js(
        `(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(
          text
        )});if(!e)throw Error('Missing button');e.click()})()`
      );
    const stored = () =>
      js(`JSON.parse(localStorage.getItem('pomatez-focus-v1'))`);
    const reload = async () => {
      const done = new Promise((r) =>
        win.webContents.once("did-finish-load", r)
      );
      win.webContents.reload();
      await done;
      await wait(350);
    };
    await wait(500);
    check(
      "expanded window starts hidden and does not cover other applications",
      () => {
        assert.equal(win.isVisible(), false);
        assert.equal(win.isAlwaysOnTop(), false);
      }
    );
    const requestedExpandedPin = await js(
      `window.focusApi.windowMode({compact:false,pinned:true})`
    );
    assert.deepEqual(requestedExpandedPin, {
      compact: false,
      pinned: false,
    });
    const peer = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
    assert.equal(peer.isAlwaysOnTop(), false);
    assert.equal(win.isAlwaysOnTop(), false);
    peer.destroy();
    checks.push(
      "expanded pin requests stay normal alongside another ordinary window"
    );
    const focusCalls = [];
    for (const name of ["focus", "show", "showInactive"]) {
      const original = win[name].bind(win);
      win[name] = (...args) => {
        focusCalls.push(name);
        return original(...args);
      };
    }
    check(
      "native frame provides minimize/maximize and content insets",
      () => {
        assert.equal(win.isMinimizable(), true);
        assert.equal(win.isMaximizable(), true);
        assert.ok(win.getSize()[1] > win.getContentSize()[1]);
      }
    );
    const boundary = await js(
      `({node:typeof window.require,oldBridge:typeof window.electron,api:typeof window.focusApi.today})`
    );
    check("renderer is isolated with narrow bridge", () =>
      assert.deepEqual(boundary, {
        node: "undefined",
        oldBridge: "undefined",
        api: "function",
      })
    );
    await click("开始专注");
    await wait(1000);
    await click("暂停");
    await wait(80);
    const paused = await stored();
    await wait(650);
    assert.ok(paused.active.elapsedSeconds > 0.5);
    assert.equal(
      (await stored()).active.elapsedSeconds,
      paused.active.elapsedSeconds
    );
    checks.push("real interval advances; pause does not accumulate");
    await click("继续专注");
    await wait(650);
    await click("结束");
    await wait(120);
    assert.equal((await stored()).active.status, "review");
    checks.push("early end opens inline review");
    assert.equal(
      await js(`Boolean(document.querySelector('.review .discard'))`),
      true
    );
    await click("保存专注记录");
    await wait(120);
    const saved = await stored();
    check("early focus saved with manual zero completion", () => {
      assert.equal(saved.records.length, 1);
      assert.equal(saved.records[0].completedCount, 0);
      assert.ok(saved.records[0].acceptedSeconds >= 1);
      assert.equal(saved.active, null);
    });
    // Discard only an unconfirmed session. Previously saved focus survives,
    // no pending item exists to be picked up by the Feishu sync effect.
    await click("开始专注");
    await wait(300);
    await click("结束");
    await wait(100);
    await click("放弃本次记录");
    await wait(100);
    const discarded = await stored();
    assert.equal(discarded.active, null);
    assert.deepEqual(discarded.records, saved.records);
    await reload();
    assert.deepEqual(await stored(), discarded);
    checks.push(
      "discard creates no record or sync item, preserves history after reload"
    );
    const seed = {
      id: randomUUID(),
      task: {
        id: "synthetic",
        title: "整理阅读笔记 · 第 1 个番茄",
        source: "local",
      },
      startedAt: Date.now() - 25 * 60 * 60 * 1000,
      plannedSeconds: 1500,
      elapsedSeconds: 1499,
      status: "active",
      sync: "local",
    };
    // Seed before React mounts, after the old page's legitimate beforeunload persistence.
    win.webContents.debugger.attach("1.3");
    await win.webContents.debugger.sendCommand("Page.enable");
    const script = await win.webContents.debugger.sendCommand(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source: `localStorage.setItem('pomatez-focus-v1',${JSON.stringify(
          JSON.stringify({ active: seed, records: saved.records })
        )})`,
      }
    );
    await reload();
    await win.webContents.debugger.sendCommand(
      "Page.removeScriptToEvaluateOnNewDocument",
      { identifier: script.identifier }
    );
    win.webContents.debugger.detach();
    assert.equal((await stored()).active.status, "paused");
    assert.equal((await stored()).active.elapsedSeconds, 1499);
    assert.equal(
      await js(
        `document.querySelector('[aria-label="选择番茄"]').selectedOptions[0].textContent`
      ),
      seed.task.title
    );
    checks.push(
      "reload restores paused without adding shutdown gap and retains the active task title"
    );
    await click("继续专注");
    await wait(2200);
    const overtime = await stored();
    check("expiry stays active and measures overtime", () => {
      assert.equal(overtime.active.status, "active");
      assert.ok(overtime.active.elapsedSeconds > 1500);
    });
    await click("结束");
    await wait(100);
    await click("额外时间也计入");
    await js(
      `(()=>{const input=document.querySelector('[aria-label="完成番茄数"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'1');input.dispatchEvent(new Event('input',{bubbles:true}))})()`
    );
    await click("保存专注记录");
    await wait(150);
    const all = await stored();
    check("overtime selection/count saved once", () => {
      assert.equal(all.records.length, 2);
      assert.equal(all.records[0].completedCount, 1);
      assert.ok(all.records[0].acceptedSeconds > 1500);
    });
    const expandedSize = win.getSize();
    await js(
      `document.querySelector('[aria-label="切换小窗"]').click()`
    );
    await wait(150);
    check(
      "compact native window uses 360 by 220 within two DIP native-frame rounding without showing",
      () => {
        assert.ok(
          win
            .getSize()
            .every((v, i) => Math.abs(v - [360, 220][i]) <= 2),
          JSON.stringify({
            outer: win.getSize(),
            content: win.getContentSize(),
            minimum: win.getMinimumSize(),
          })
        );
        assert.equal(win.isVisible(), false);
        assert.equal(win.isAlwaysOnTop(), true);
      }
    );
    fs.writeFileSync(
      path.join(artifacts, "compact.png"),
      (await win.capturePage()).toPNG()
    );
    await js(`document.querySelector('[aria-label="置顶"]').click()`);
    await wait(100);
    assert.equal(win.isAlwaysOnTop(), false);
    await js(`document.querySelector('[aria-label="置顶"]').click()`);
    await wait(100);
    assert.equal(win.isAlwaysOnTop(), true);
    await reload();
    assert.equal(
      await js(
        `document.querySelector('.focus-app').classList.contains('compact')`
      ),
      true
    );
    assert.equal(
      await js(
        `document.querySelector('[aria-label="置顶"]').getAttribute('aria-pressed')`
      ),
      "true"
    );
    checks.push(
      "compact reload reads actual native window mode and pin state"
    );
    await js(
      `document.querySelector('[aria-label="切换小窗"]').click()`
    );
    await wait(150);
    check("expanding restores bounds and releases topmost", () => {
      assert.ok(
        win
          .getSize()
          .every((v, i) => Math.abs(v - expandedSize[i]) <= 2),
        JSON.stringify({
          expected: expandedSize,
          actual: win.getSize(),
          bounds: win.getBounds(),
          normal: win.getNormalBounds(),
          minimum: win.getMinimumSize(),
          maximum: win.getMaximumSize(),
        })
      );
      assert.equal(win.isAlwaysOnTop(), false);
    });
    win.setSize(900, 700);
    await wait(100);
    const resized = win.getSize();
    await js(`window.focusApi.windowMode({compact:false,pinned:true})`);
    await wait(100);
    assert.deepEqual(win.getSize(), resized);
    checks.push(
      "expanded pin normalization preserves resized window dimensions"
    );
    win.setSize(760, 580);
    await wait(150);
    assert.equal(
      await js(
        `document.querySelector('.content').scrollWidth <= document.querySelector('.content').clientWidth`
      ),
      true
    );
    checks.push(
      "minimum full window keeps both panels without horizontal clipping"
    );
    win.setSize(...expandedSize);
    await wait(150);
    const layout = await js(`(()=>{
      const a=document.querySelector('.timer-page').getBoundingClientRect();
      const b=document.querySelector('.history-panel').getBoundingClientRect();
      return {sideBySide:a.right<=b.left,rows:document.querySelectorAll('.records li').length,
        total:document.querySelector('[data-stat="总番茄"] strong').textContent,
        today:document.querySelector('[data-stat="今日番茄"] strong').textContent,
        groups:document.querySelectorAll('.record-day').length};
    })()`);
    assert.deepEqual(layout, {
      sideBySide: true,
      rows: 2,
      total: "1",
      today: "0",
      groups: 2,
    });
    checks.push(
      "timer/history visible together with correct achievement totals"
    );
    fs.writeFileSync(
      path.join(artifacts, "desktop-preview.png"),
      (await win.capturePage()).toPNG()
    );
    await wait(120);
    fs.writeFileSync(
      path.join(artifacts, "records.png"),
      (await win.capturePage()).toPNG()
    );
    await click("导出");
    await wait(500);
    const exports = fs.readdirSync(downloads);
    assert.equal(exports.length, 1);
    assert.equal(
      JSON.parse(
        fs.readFileSync(path.join(downloads, exports[0]), "utf8")
      ).records.length,
      2
    );
    checks.push("JSON export saves records without a dialog");
    await click("番茄专注");
    await click("开始专注");
    await wait(300);
    powerMonitor.emit("suspend");
    await wait(150);
    assert.equal((await stored()).active.status, "paused");
    powerMonitor.emit("resume");
    await wait(150);
    assert.equal((await stored()).active.status, "paused");
    checks.push("native suspend/resume events leave focus paused");
    const limits = await js(
      `Promise.all([window.focusApi.windowMode({compact:'invalid',pinned:true}).then(()=>false,()=>true),window.focusApi.sync({}).then(()=>false,()=>true)])`
    );
    assert.deepEqual(limits, [true, true]);
    checks.push(
      "invalid bridge inputs rejected while normal window operations work"
    );
    check("no visible test window or renderer errors", () => {
      assert.equal(win.isVisible(), false);
      assert.deepEqual(errors, []);
      assert.deepEqual(focusCalls, []);
    });
    fs.writeFileSync(
      path.join(artifacts, "desktop-test.json"),
      JSON.stringify({ passed: checks.length, checks }, null, 2)
    );
    console.log(JSON.stringify({ passed: checks.length, checks }));
    clearTimeout(deadline);
    app.quit();
  })
  .catch((e) => {
    console.error(e.stack);
    clearTimeout(deadline);
    app.exit(1);
  });
