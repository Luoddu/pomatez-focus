// Real production main/preload/renderer + official REST shape on isolated loopback.
const { app, BrowserWindow, powerMonitor } = require("electron");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  os = require("node:os");
if (
  process.env.POMATEZ_HEADLESS !== "1" ||
  !process.env.POMATEZ_PROFILE
)
  throw Error("Hidden isolated profile required");
const {
  localRequest,
} = require("../app/electron/build/focus/activitywatch");
const root = path.resolve(__dirname, "..");
fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
let clock = new Date().setHours(12, 0, 0, 0),
  bSeconds = 2700,
  xSeconds = 600,
  down = false;
const ids = [
  "aw-watcher-web-edge_TEST",
  "aw-watcher-window_TEST",
  "aw-watcher-afk_TEST",
];
const interval = (seconds, end, site) => ({
  timestamp: new Date(end - seconds * 1000).toISOString(),
  duration: seconds,
  data: { url: `https://www.${site}.com/synthetic`, audible: true },
});
const requests = [];
const server = http.createServer((req, res) => {
  requests.push(req.method + " " + req.url);
  res.setHeader("Content-Type", "application/json");
  if (down) {
    res.writeHead(503);
    res.end("{}");
    return;
  }
  if (req.url === "/api/0/info") {
    res.end(JSON.stringify({ hostname: "TEST", version: "v0.13.2" }));
    return;
  }
  if (req.url === "/api/0/buckets/") {
    res.end(
      JSON.stringify(
        Object.fromEntries(
          ids.map((id, i) => [
            id,
            {
              hostname: "TEST",
              type: ["web.tab.current", "currentwindow", "afkstatus"][
                i
              ],
              created: new Date(clock - 86400000).toISOString(),
            },
          ])
        )
      )
    );
    return;
  }
  if (/\/events\?limit=1$/.test(req.url)) {
    res.end(
      JSON.stringify([
        {
          timestamp: new Date(clock - 60000).toISOString(),
          duration: 59,
          data: {},
        },
      ])
    );
    return;
  }
  if (req.method === "POST" && req.url === "/api/0/query/") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const input = JSON.parse(raw);
      const q = input.query.join("");
      if (
        !q.includes("filter_period_intersect(b,w)") ||
        !q.includes("period_union(a,audio)")
      ) {
        res.writeHead(400);
        res.end("{}");
        return;
      }
      res.end(
        JSON.stringify([
          [
            interval(bSeconds, clock - xSeconds * 1000, "bilibili"),
            interval(xSeconds, clock, "xiaohongshu"),
          ],
        ])
      );
    });
    return;
  }
  res.writeHead(404);
  res.end("{}");
});
const { restMonitor } = require("../app/electron/build/main");
restMonitor.now = () => clock;
const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  checks = [],
  errors = [];
const deadline = setTimeout(() => {
  console.error("ActivityWatch desktop deadline");
  app.exit(2);
}, 110000);
app.whenReady().then(async () => {
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    restMonitor.request = (endpoint, body) =>
      localRequest(endpoint, body, server.address().port);
    let win;
    for (let i = 0; i < 160; i++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await wait(40);
    }
    assert.ok(win);
    win.on("show", () => errors.push("Unexpected visible window"));
    win.webContents.on("console-message", (_e, level, message) => {
      if (level >= 3) errors.push(message);
    });
    const js = (code) => win.webContents.executeJavaScript(code, true);
    const until = async (fn) => {
      for (let i = 0; i < 150; i++) {
        if (await fn()) return;
        await wait(40);
      }
      throw Error("UI wait failed");
    };
    const click = (text) =>
      js(
        `(()=>{const e=Array.from(document.querySelectorAll('button')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(
          text
        )}||e.textContent.trim()===${JSON.stringify(
          text
        )});if(!e)throw Error('Missing '+${JSON.stringify(
          text
        )});e.click()})()`
      );
    win.webContents.debugger.attach("1.3");
    const capture = async (name) => {
      await wait(250);
      const screenshot = await win.webContents.debugger.sendCommand(
        "Page.captureScreenshot",
        {
          format: "png",
          fromSurface: true,
          captureBeyondViewport: false,
        }
      );
      fs.writeFileSync(
        path.join(root, "artifacts", name + ".png"),
        Buffer.from(screenshot.data, "base64")
      );
    };
    await until(() =>
      js(`!!document.querySelector('.scientific-rest')`)
    );
    restMonitor.start();
    await until(() =>
      js(
        `document.querySelector('.rest-ring-label strong')?.textContent==='5'`
      )
    );
    assert.equal(win.isVisible(), false);
    assert.equal(restMonitor.snapshot().settings.supervise, true);
    assert.ok(
      await js(
        `document.querySelector('.rest-sites').textContent.includes('45 分钟')&&document.querySelector('.rest-sites').textContent.includes('10 分钟')`
      )
    );
    checks.push(
      "official local HTTP -> main adapter -> narrow preload -> ring and default supervision"
    );
    const geometry = await js(
      `(()=>{const r=document.querySelector('.rest-card').getBoundingClientRect(), m=document.querySelector('.heatmap').getBoundingClientRect();return {ringTop:r.top,ringBottom:r.bottom,ringWidth:r.width,ringHeight:r.height,calendarTop:m.top,calendarWidth:m.width,calendarHeight:m.height,viewport:innerHeight}})()`
    );
    assert.ok(geometry.ringBottom < geometry.calendarTop);
    assert.ok(
      Math.abs(geometry.ringWidth - geometry.calendarWidth) < 3
    );
    assert.ok(geometry.ringHeight <= geometry.calendarHeight + 15);
    await capture("scientific-rest-quota");
    checks.push(
      "card above calendar, same width and comparable height"
    );
    await click("查看统计");
    await until(() => js(`!!document.querySelector('.rest-chart')`));
    assert.equal(
      await js(`document.querySelectorAll('.scientific-rest').length`),
      1
    );
    assert.equal(
      await js(`document.querySelectorAll('.rest-hour').length`),
      24
    );
    await click("近7天");
    await until(() =>
      js(
        `document.querySelector('.rest-chart-head .selected')?.textContent==='近7天' && !document.querySelector('.rest-chart').hasAttribute('aria-busy') || document.querySelector('.rest-chart')?.getAttribute('aria-busy')==='false'`
      )
    );
    await capture("scientific-rest-statistics");
    await click("返回额度");
    checks.push(
      "same-place statistics and today/week hourly distribution"
    );
    await click("设置额度");
    await js(
      `(()=>{const e=document.querySelector('.rest-settings input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(e,'7');e.dispatchEvent(new Event('input',{bubbles:true}))})()`
    );
    await click("保存额度");
    await until(() => js(`!!document.querySelector('.rest-error')`));
    assert.equal(restMonitor.snapshot().settings.quotaMinutes, 60);
    await js(
      `(()=>{const e=document.querySelector('.rest-settings input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(e,'60');e.dispatchEvent(new Event('input',{bubbles:true}))})()`
    );
    await click("保存额度");
    await until(() => js(`!!document.querySelector('.rest-quota')`));
    checks.push(
      "quota validation leaves old settings usable and valid save works"
    );
    // Start through the normal existing task flow.
    await click("开始专注");
    await until(() =>
      js(
        `JSON.parse(localStorage.getItem('pomatez-focus-v1')).active?.status==='active'`
      )
    );
    bSeconds = 3300;
    await restMonitor.refresh();
    await until(() => js(`!!document.querySelector('.rest-reminder')`));
    assert.equal(
      await js(
        `document.querySelectorAll('.rest-reminder button').length`
      ),
      2
    );
    assert.equal(
      await js(`document.querySelectorAll('.rest-reminder p').length`),
      1
    );
    assert.ok(
      await js(
        `document.querySelector('.rest-reminder').textContent.includes('超额 5 分钟')`
      )
    );
    await capture("scientific-rest-reminder");
    await click("去睡觉");
    await until(() => js(`!document.querySelector('.rest-reminder')`));
    assert.equal(
      (await js(`JSON.parse(localStorage.getItem('pomatez-focus-v1'))`))
        .active.status,
      "paused"
    );
    assert.equal(win.isVisible(), false);
    checks.push(
      "minimal two-button reminder and sleep pauses existing pomodoro then hides"
    );
    const activeId = (
      await js(`JSON.parse(localStorage.getItem('pomatez-focus-v1'))`)
    ).active.id;
    bSeconds = 3600;
    await restMonitor.refresh();
    await until(() => js(`!!document.querySelector('.rest-reminder')`));
    await click("开始下一个番茄");
    await until(() => js(`!document.querySelector('.rest-reminder')`));
    let active = (
      await js(`JSON.parse(localStorage.getItem('pomatez-focus-v1'))`)
    ).active;
    assert.equal(active.id, activeId);
    assert.equal(active.status, "active");
    checks.push(
      "focus action resumes the same paused pomodoro without creating another"
    );
    down = true;
    await restMonitor.refresh();
    await until(() =>
      js(
        `document.querySelector('.rest-health').textContent.includes('采集已中断')`
      )
    );
    assert.equal(restMonitor.snapshot().usage.totalSeconds, 4200);
    assert.equal(
      await js(`!!document.querySelector('.rest-reminder')`),
      false
    );
    down = false;
    bSeconds = 4500;
    await restMonitor.refresh();
    await until(() => js(`!!document.querySelector('.rest-reminder')`));
    assert.equal(
      await js(`document.querySelectorAll('.rest-reminder').length`),
      1
    );
    await click("开始下一个番茄");
    checks.push(
      "disconnect keeps previous total and reconnect coalesces missed thresholds"
    );
    // Actual main-process poll keeps running after native close-to-tray.
    win.close();
    bSeconds = 4800;
    await until(() => js(`!!document.querySelector('.focus-app')`));
    for (let i = 0; i < 700 && !restMonitor.snapshot().reminder; i++)
      await wait(50);
    assert.ok(restMonitor.snapshot().reminder);
    assert.equal(win.isVisible(), false);
    await click("开始下一个番茄");
    checks.push(
      "real 30-second poll survives native close-to-tray with hidden renderer"
    );
    // Restore renderer from the same profile, retaining settings/thresholds.
    await js(
      `window.focusApi.restSettings({quotaMinutes:60,supervise:false})`
    );
    const loaded = new Promise((r) =>
      win.webContents.once("did-finish-load", r)
    );
    win.reload();
    await loaded;
    await wait(300);
    assert.equal(
      await js(
        `document.querySelector('.rest-supervise input').checked`
      ),
      false
    );
    bSeconds = 5100;
    await restMonitor.refresh();
    assert.equal(restMonitor.snapshot().reminder, null);
    checks.push(
      "disabled setting survives renderer reload while recording continues"
    );
    // Preserve usability at the portrait minimum size.
    win.setMinimumSize(480, 520);
    win.setSize(600, 800);
    await wait(200);
    const small = await js(
      `(()=>{const r=document.querySelector('.rest-card').getBoundingClientRect();return {width:r.width,right:r.right,viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth}})()`
    );
    assert.ok(small.right <= small.viewport + 2);
    assert.ok(small.overflow <= 2);
    await capture("scientific-rest-small");
    checks.push("portrait-width card stays within viewport");
    assert.ok(
      requests.every(
        (r) => r.startsWith("GET /api/0/") || r === "POST /api/0/query/"
      )
    );
    const safeState = await js(`window.focusApi.restState()`);
    assert.ok(!JSON.stringify(safeState).includes("https://"));
    assert.ok(!JSON.stringify(safeState).includes("synthetic"));
    await assert.rejects(js(`window.focusApi.restStatistics('all')`));
    checks.push(
      "renderer receives aggregates only and cannot supply arbitrary queries"
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(root, "artifacts/activitywatch-desktop.json"),
      JSON.stringify(
        {
          checks,
          geometry,
          small,
          requests: requests.length,
          visible: win.isVisible(),
        },
        null,
        2
      )
    );
    console.log(
      JSON.stringify({ pass: checks.length, geometry, small })
    );
    clearTimeout(deadline);
    restMonitor.stop();
    server.close();
    app.exit(0);
  } catch (error) {
    console.error(error);
    clearTimeout(deadline);
    restMonitor.stop();
    server.close();
    app.exit(1);
  }
});
