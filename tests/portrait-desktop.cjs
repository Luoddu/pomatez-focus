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
const dayMs = 24 * 60 * 60 * 1000;
const seedRecord = (daysAgo, hour, title, quadrant) => ({
  id: randomUUID(),
  task: { id: `synthetic-${title}`, title, source: "local", quadrant },
  startedAt: Date.now() - daysAgo * dayMs - hour * 3600000,
  endedAt: Date.now() - daysAgo * dayMs - hour * 3600000 + 1500000,
  plannedSeconds: 1500,
  elapsedSeconds: 1500,
  acceptedSeconds: 1500,
  completedCount: 1,
  status: "saved",
  sync: "local",
});
const seedRecords = [
  seedRecord(0, 2, "整理阅读笔记", "iu"),
  seedRecord(0, 1, "回复工作邮件", "inu"),
  seedRecord(1, 5, "规划下一周任务", "uni"),
  seedRecord(1, 3, "整理待办事项", "unu"),
  seedRecord(3, 6, "阅读学习资料", "uni"),
];
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
    // Seed saved records across three days before React mounts, so the
    // stats/heatmap/records panels render real content (same technique as
    // tests/desktop.cjs).
    win.webContents.debugger.attach("1.3");
    await win.webContents.debugger.sendCommand("Page.enable");
    const script = await win.webContents.debugger.sendCommand(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source: `localStorage.setItem('pomatez-focus-v1',${JSON.stringify(
          JSON.stringify({ active: null, records: seedRecords })
        )})`,
      }
    );
    const reloaded = new Promise((r) =>
      win.webContents.once("did-finish-load", r)
    );
    win.webContents.reload();
    await reloaded;
    await wait(500);
    await win.webContents.debugger.sendCommand(
      "Page.removeScriptToEvaluateOnNewDocument",
      { identifier: script.identifier }
    );
    win.webContents.debugger.detach();
    // Programmatic resize may exceed the host work area; content size is what
    // media queries see, so drive the viewport directly.
    win.setContentSize(900, 1600);
    await wait(250);
    const portrait = await js(`(()=>{
      const cs=getComputedStyle(document.querySelector('.content'));
      const grid=getComputedStyle(document.querySelector('.stat-grid'));
      const farm=document.querySelector('.farm-field').getBoundingClientRect();
      const bar=getComputedStyle(document.querySelector('.action-bar'));
      const stats=[...document.querySelectorAll('.stat')];
      const statHeights=stats.map(s=>Math.round(s.getBoundingClientRect().height));
      const statAlign=getComputedStyle(stats[0]).textAlign;
      const fonts=stats.map(s=>getComputedStyle(s.querySelector('strong')).fontSize);
      const cell=document.querySelector('.hm-cell').getBoundingClientRect();
      const hm=document.querySelector('.hm-grid').getBoundingClientRect();
      const sc=document.querySelector('.hm-scroll').getBoundingClientRect();
      const recs=getComputedStyle(document.querySelector('.records'));
      const rc=document.querySelector('.right-col');
      const sections=[...rc.querySelectorAll(':scope > .side-section')];
      const r=sections.map(s=>s.getBoundingClientRect());
      const rcRect=rc.getBoundingClientRect();
      return {direction:cs.flexDirection,
        columns:grid.gridTemplateColumns.split(' ').length,
        farmHeight:farm.height,barPosition:bar.position,
        statHeights,statAlign,fonts:[...new Set(fonts)],
        cellSize:Math.round(cell.width),
        hmMarginDelta:Math.abs((hm.left-sc.left)-(sc.right-hm.right)),
        recordColumns:recs.gridTemplateColumns.split(' ').length,
        recordDays:document.querySelectorAll('.record-day').length,
        rightDisplay:getComputedStyle(rc).display,
        sideBySide:Math.abs(r[0].top-r[1].top)<=2&&r[1].left>r[0].left+50,
        recordsFullWidth:Math.abs(r[2].width-rcRect.width)<=2&&r[2].top>r[0].top+50,
        taskFont:getComputedStyle(document.querySelector('.task-name')).fontSize,
        chipHeight:Math.round(document.querySelector('.chip').getBoundingClientRect().height)};
    })()`);
    check("portrait stacks panels in one column with paired overview and heatmap", () => {
      assert.equal(portrait.direction, "column");
      assert.equal(portrait.columns, 2);
      assert.equal(portrait.rightDisplay, "grid");
      assert.equal(portrait.sideBySide, true, JSON.stringify(portrait));
      assert.equal(portrait.recordsFullWidth, true, JSON.stringify(portrait));
    });
    check("portrait quadrants scale up for readability", () => {
      assert.equal(portrait.taskFont, "19px");
      assert.ok(portrait.chipHeight >= 40, JSON.stringify(portrait));
    });
    check("portrait keeps the farm visible and the action bar sticky", () => {
      assert.ok(portrait.farmHeight >= 200, JSON.stringify(portrait));
      assert.equal(portrait.barPosition, "sticky");
    });
    check("portrait stats are equal-height centered cards with one font tier", () => {
      assert.equal(new Set(portrait.statHeights).size, 1, JSON.stringify(portrait));
      assert.equal(portrait.statAlign, "center");
      assert.equal(portrait.fonts.length, 1, JSON.stringify(portrait.fonts));
    });
    check("portrait heatmap uses larger centered cells", () => {
      assert.ok(portrait.cellSize >= 14 && portrait.cellSize <= 18, JSON.stringify(portrait));
      assert.ok(portrait.hmMarginDelta <= 4, JSON.stringify(portrait));
    });
    check("portrait records flow into two day-card columns", () => {
      assert.equal(portrait.recordColumns, 2);
      assert.ok(portrait.recordDays >= 3, JSON.stringify(portrait));
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
      const cell=document.querySelector('.hm-cell').getBoundingClientRect();
      const recs=getComputedStyle(document.querySelector('.records'));
      const stats=[...document.querySelectorAll('.stat strong')];
      const rc=getComputedStyle(document.querySelector('.right-col'));
      const sections=[...document.querySelectorAll('.right-col > .side-section')].map(s=>s.getBoundingClientRect());
      return {direction:cs.flexDirection,
        columns:grid.gridTemplateColumns.split(' ').length,
        sideBySide:a.right<=b.left,rightWidth:b.width,
        cellSize:Math.round(cell.width),recordsDisplay:recs.display,
        fonts:[...new Set(stats.map(s=>getComputedStyle(s).fontSize))],
        statAlign:getComputedStyle(document.querySelector('.stat')).textAlign,
        rightDisplay:rc.display,
        stacked:sections[1].top>=sections[0].bottom-2,
        taskFont:getComputedStyle(document.querySelector('.task-name')).fontSize,
        chipHeight:Math.round(document.querySelector('.chip').getBoundingClientRect().height)};
    })()`);
    check("landscape keeps the original side-by-side layout", () => {
      assert.equal(landscape.direction, "row");
      assert.equal(landscape.columns, 2);
      assert.equal(landscape.sideBySide, true);
      assert.ok(Math.abs(landscape.rightWidth - 380) <= 2, JSON.stringify(landscape));
    });
    check("landscape keeps original heatmap cells, records list and stat style", () => {
      assert.equal(landscape.cellSize, 13);
      assert.equal(landscape.recordsDisplay, "block");
      assert.ok(["left", "start"].includes(landscape.statAlign), landscape.statAlign);
      assert.deepEqual(landscape.fonts.sort(), ["22px", "28px"], JSON.stringify(landscape.fonts));
    });
    check("landscape keeps stacked right column and original quadrant scale", () => {
      assert.equal(landscape.rightDisplay, "flex");
      assert.equal(landscape.stacked, true, JSON.stringify(landscape));
      assert.equal(landscape.taskFont, "15px");
      assert.equal(landscape.chipHeight, 34);
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
