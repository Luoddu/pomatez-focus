// Portrait display layout test: real Electron main/preload/production
// renderer, always hidden. Resizes the real window across the orientation
// boundary and asserts the CSS media-query layout switches both ways.
const { app, BrowserWindow } = require("electron");
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
  console.error("Portrait desktop test timed out");
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
    await wait(500);
    // Programmatic resize may exceed the host work area; content size is what
    // media queries see, so drive the viewport directly.
    win.setContentSize(900, 1600);
    await wait(250);
    const portrait = await js(`(()=>{
      const cs=getComputedStyle(document.querySelector('.content'));
      const grid=getComputedStyle(document.querySelector('.stat-grid'));
      const farm=document.querySelector('.farm-field').getBoundingClientRect();
      const bar=getComputedStyle(document.querySelector('.action-bar'));
      return {direction:cs.flexDirection,
        columns:grid.gridTemplateColumns.split(' ').length,
        farmHeight:farm.height,barPosition:bar.position,
        scrollable:document.querySelector('.content').scrollHeight>document.querySelector('.content').clientHeight};
    })()`);
    check("portrait stacks panels in one column with four-up stats", () => {
      assert.equal(portrait.direction, "column");
      assert.equal(portrait.columns, 4);
    });
    check("portrait keeps the farm visible and the action bar sticky", () => {
      assert.ok(portrait.farmHeight >= 200, JSON.stringify(portrait));
      assert.equal(portrait.barPosition, "sticky");
    });
    fs.writeFileSync(
      path.join(artifacts, "portrait-preview.png"),
      (await win.capturePage()).toPNG()
    );
    win.setContentSize(1600, 900);
    await wait(250);
    const landscape = await js(`(()=>{
      const cs=getComputedStyle(document.querySelector('.content'));
      const grid=getComputedStyle(document.querySelector('.stat-grid'));
      const a=document.querySelector('.left-col').getBoundingClientRect();
      const b=document.querySelector('.right-col').getBoundingClientRect();
      return {direction:cs.flexDirection,
        columns:grid.gridTemplateColumns.split(' ').length,
        sideBySide:a.right<=b.left,rightWidth:b.width};
    })()`);
    check("landscape keeps the original side-by-side layout", () => {
      assert.equal(landscape.direction, "row");
      assert.equal(landscape.columns, 2);
      assert.equal(landscape.sideBySide, true);
      assert.ok(Math.abs(landscape.rightWidth - 380) <= 2, JSON.stringify(landscape));
    });
    fs.writeFileSync(
      path.join(artifacts, "landscape-preview.png"),
      (await win.capturePage()).toPNG()
    );
    check("no visible test window or renderer errors", () => {
      assert.equal(win.isVisible(), false);
      assert.deepEqual(errors, []);
    });
    fs.writeFileSync(
      path.join(artifacts, "portrait-test.json"),
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
