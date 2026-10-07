const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
if (
  process.env.POMATEZ_HEADLESS !== "1" ||
  !process.env.POMATEZ_PROFILE
)
  throw Error("Isolated hidden profile required");
const root = path.resolve(__dirname, "..");
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const geometry = [];
const deadline = setTimeout(() => app.exit(2), 45000);
const record = (
  day,
  hour,
  minute,
  seconds,
  count,
  status = "saved"
) => {
  const now = new Date(),
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + day,
      hour,
      minute
    ).getTime();
  return {
    id: `synthetic-${day}-${hour}-${minute}`,
    task: { id: "synthetic-task", title: "合成热力验收", source: "local" },
    startedAt: start,
    endedAt: start + seconds * 1000,
    plannedSeconds: seconds,
    acceptedSeconds: seconds,
    elapsedSeconds: seconds,
    completedCount: count,
    status,
    sync: "local",
  };
};
const records = [
  record(0, 9, 45, 1800, 1),
  record(-1, 9, 0, 1500, 8),
  record(0, 23, 30, 1500, 1),
];
app
  .whenReady()
  .then(async () => {
    let win;
    for (let i = 0; i < 100; i++) {
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
    const errors = [];
    win.webContents.on("console-message", (_event, level, message) => {
      if (level >= 3) errors.push(message);
    });
    const js = (code) => win.webContents.executeJavaScript(code, true);
    win.webContents.debugger.attach("1.3");
    await win.webContents.debugger.sendCommand("Page.enable");
    const seed = await win.webContents.debugger.sendCommand(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source: `localStorage.setItem('pomatez-focus-v1',${JSON.stringify(
          JSON.stringify({ active: record(0, 8, 0, 1500, 9, "paused"), records })
        )})`,
      }
    );
    const loaded = new Promise((r) =>
      win.webContents.once("did-finish-load", r)
    );
    win.webContents.reload();
    await loaded;
    await wait(500);
    await win.webContents.debugger.sendCommand(
      "Page.removeScriptToEvaluateOnNewDocument",
      { identifier: seed.identifier }
    );
    win.webContents.debugger.detach();
    const data = await js(`(()=>{
    const cells=[...document.querySelectorAll('.today-heatmap-cell')];
    return { stats:[...document.querySelectorAll('.stat')].map(e=>e.dataset.stat),
      legend:!!document.querySelector('.holiday-legend'),
      quotaText:document.querySelector('.rest-card').textContent.includes('今日额度'),
      cells:cells.map(e=>({slot:Number(e.dataset.slot),count:Number(e.dataset.count),title:e.title})),
      calendar:document.querySelectorAll('.hm-grid .hm-cell').length,
      health:!!document.querySelector('.rest-ring .rest-health[role="status"]'),
      hiddenLabel:getComputedStyle(document.querySelector('.rest-health-label')).clipPath };
  })()`);
    assert.deepEqual(data.stats, ["今日番茄", "今日专注时长"]);
    assert.equal(data.legend, false);
    assert.equal(data.quotaText, false);
    assert.equal(data.health, true);
    assert.equal(data.hiddenLabel, "inset(50%)");
    assert.ok(data.calendar >= 16 * 7);
    checks.push(
      "today overview remains, total cards/legend/footer removed, accessible ring status retained"
    );
    assert.equal(data.cells.length, 48);
    assert.equal(data.cells[19].count, 0.5);
    assert.equal(data.cells[20].count, 0.5);
    assert.equal(data.cells[47].count, 1);
    assert.equal(
      data.cells.reduce((s, c) => s + c.count, 0),
      2
    );
    assert.equal(data.cells[16].count, 0);
    assert.equal(data.cells[18].count, 0);
    assert.equal(data.cells[19].title, "09:30–10:00 · 0.5 个番茄");
    assert.equal(data.cells[47].title, "23:30–24:00 · 1 个番茄");
    checks.push(
    "48 half-hours use existing weighted counts, yesterday/unfinished excluded, late night and tooltip valid"
    );
    for (const [width, height] of [
      [1440, 1000],
      [1040, 800],
      [1080, 1840],
    ]) {
      win.setContentSize(width, height);
      await wait(250);
      const bounds = await js(`(()=>{
      const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      const side=document.querySelector('.right-col');
      return {width:innerWidth,side:rect('.right-col'),layout:getComputedStyle(document.querySelector('.content')).flexDirection,
        calendar:rect('.heatmap'),scroll:rect('.hm-scroll'),today:rect('.today-heatmap'),ring:rect('.rest-ring'),dot:rect('.rest-health'),
        overflow:side.scrollWidth>side.clientWidth+2};
    })()`);
      assert.equal(bounds.overflow, false, JSON.stringify(bounds));
      assert.ok(
        bounds.today.right <= bounds.calendar.right - 8,
        JSON.stringify(bounds)
      );
      assert.ok(
        bounds.today.left >= bounds.scroll.right + 5,
        JSON.stringify(bounds)
      );
      assert.ok(
        bounds.today.left >= bounds.side.left &&
          bounds.today.right <= bounds.side.right,
        JSON.stringify(bounds)
      );
      assert.ok(
        bounds.dot.left >= bounds.ring.left &&
          bounds.dot.left < bounds.ring.left + 20,
        JSON.stringify(bounds)
      );
      assert.ok(
        bounds.dot.top >= bounds.ring.top &&
          bounds.dot.top < bounds.ring.top + 20,
        JSON.stringify(bounds)
      );
      if (width > height)
        assert.equal(
          Math.round(bounds.side.width),
          380,
          JSON.stringify(bounds)
        );
      geometry.push(bounds);
      if (width === 1440) {
        fs.writeFileSync(path.join(root, "artifacts/overview-heat-preview.png"), (await win.capturePage()).toPNG());
      }
      checks.push(
        `same column proportions, internal calendar/today fit and status top-left at ${width}×${height}`
      );
    }
    assert.equal(win.isVisible(), false);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(root, "artifacts/overview-heat-test.json"),
      JSON.stringify(
        { passed: checks.length, checks, data, geometry },
        null,
        2
      )
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
