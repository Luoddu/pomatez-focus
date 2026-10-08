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
// Keep production main and renderer on the same advancing noon test clock.
// Synthetic AW already uses noon; real 00:xx backfills otherwise cross yesterday.
function installNoonClock() {
  const RealDate = Date;
  const now = RealDate.now();
  const noon = new RealDate(now);
  noon.setHours(12, 0, 0, 0);
  const offset = noon.getTime() - now;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [RealDate.now() + offset]));
    }
    static now() {
      return RealDate.now() + offset;
    }
  };
}
installNoonClock();
const root = path.resolve(__dirname, "..");
fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
let clock = new Date().setHours(12, 0, 0, 0),
  bSeconds = 240,
  xSeconds = 0,
  down = false,
  liveMode = null,
  liveEdge = true;
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
    if (liveMode) {
      const browser = req.url.includes("web-edge"),
        window = req.url.includes("window");
      res.end(
        JSON.stringify([
          {
            timestamp: new Date(clock - 100000).toISOString(),
            duration: browser ? 80 : 99,
            data: browser
              ? {
                  url: "https://www." + liveMode + ".com/synthetic",
                  audible: true,
                }
              : window
              ? { app: liveEdge ? "msedge.exe" : "Other" }
              : { status: "not-afk" },
          },
        ])
      );
      return;
    }
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
            interval(
              bSeconds,
              clock - xSeconds * 1000 - (liveMode ? 20000 : 0),
              "bilibili"
            ),
            interval(
              xSeconds,
              clock - (liveMode ? 20000 : 0),
              "xiaohongshu"
            ),
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
    const popup = () =>
      BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().endsWith("/assets/rest-reminder.html")
      );
    const js = async (
      code,
      target = code.includes(".rest-reminder") ? popup() || win : win
    ) => {
      let timeout;
      try {
        return await Promise.race([
          target.webContents.executeJavaScript(code, true),
          new Promise((_, reject) => {
            timeout = setTimeout(
              () =>
                reject(
                  Error(
                    "Renderer command stalled: " + code.slice(0, 120)
                  )
                ),
              8000
            );
          }),
        ]);
      } catch (error) {
        if (!code.includes("restStatistics('all')"))
          console.error(
            "Failed renderer command:",
            code,
            "console:",
            errors
          );
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    };
    const until = async (fn) => {
      for (let i = 0; i < 150; i++) {
        if (await fn()) return;
        await wait(40);
      }
      throw Error("UI wait failed");
    };
    const click = async (text) => {
      console.log("UI click:", text);
      if (text === "去睡觉" || text === "去健身" || text === "开始下一个番茄")
        await until(
          () =>
            popup() &&
            !popup().webContents.isLoadingMainFrame() &&
            js(
              "Array.from(document.querySelectorAll('button')).filter(b=>!b.hidden).every(b=>!b.disabled)",
              popup()
            )
        );
      await js(
        `(()=>{const e=Array.from(document.querySelectorAll('button')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(
          text
        )}||e.textContent.trim()===${JSON.stringify(
          text
        )});if(!e)throw Error('Missing '+${JSON.stringify(
          text
        )});if(e.disabled)throw Error('Disabled '+${JSON.stringify(
          text
        )});e.click()})()`,
        text === "去睡觉" || text === "去健身" || text === "开始下一个番茄" ? popup() : win
      );
      if (text === "去睡觉" || text === "去健身" || text === "开始下一个番茄")
        await until(() => !popup());
    };
    await js(`(${installNoonClock.toString()})()`, win);
    win.webContents.debugger.attach("1.3");
    await win.webContents.debugger.sendCommand("Page.enable");
    const capture = async (name) => {
      console.log("Capture:", name);
      win.webContents.invalidate();
      await wait(250);
      let timeout;
      const shot = await Promise.race([
        win.capturePage(undefined, {
          stayHidden: true,
          stayAwake: true,
        }),
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(Error("Hidden screenshot stalled: " + name)),
            8000
          );
        }),
      ]).finally(() => clearTimeout(timeout));
      fs.writeFileSync(
        path.join(root, "artifacts", name + ".png"),
        shot.toPNG()
      );
    };
    await until(() =>
      js(`!!document.querySelector('.scientific-rest')`)
    );
    await until(
      () => restMonitor.snapshot().progress?.completedCount === 0
    );
    restMonitor.start();
    await until(() => restMonitor.snapshot().status === "recording");
    const originalRefresh = restMonitor.refreshNow.bind(restMonitor);
    let releaseRefresh,
      refreshCalls = 0;
    const refreshGate = new Promise((resolve) => {
      releaseRefresh = resolve;
    });
    restMonitor.refreshNow = async () => {
      refreshCalls++;
      await refreshGate;
      return originalRefresh();
    };
    const discoveryBefore = requests.filter((p) =>
      p.endsWith("/buckets/")
    ).length;
    bSeconds = 260;
    await js("document.querySelector('.rest-refresh').click()");
    await until(() =>
      js("document.querySelector('.rest-refresh').disabled")
    );
    await js("document.querySelector('.rest-refresh').click()");
    releaseRefresh();
    await until(() => restMonitor.snapshot().usage?.bilibili === 260);
    await until(() =>
      js("!document.querySelector('.rest-refresh').disabled")
    );
    assert.equal(refreshCalls, 1);
    assert.equal(
      requests.filter((p) => p.endsWith("/buckets/")).length,
      discoveryBefore + 1
    );
    restMonitor.refreshNow = originalRefresh;
    down = true;
    await js("document.querySelector('.rest-refresh').click()");
    await until(() => restMonitor.snapshot().status === "interrupted");
    assert.equal(restMonitor.snapshot().usage.bilibili, 260);
    await until(() =>
      js("!document.querySelector('.rest-refresh').disabled")
    );
    assert.ok(
      await js(
        "document.querySelector('.rest-health').title.includes('ActivityWatch')"
      )
    );
    down = false;
    bSeconds = 270;
    await js("document.querySelector('.rest-refresh').click()");
    await until(
      () =>
        restMonitor.snapshot().status === "recording" &&
        restMonitor.snapshot().usage?.bilibili === 270
    );
    checks.push(
      "title refresh joins one request, rediscovers buckets, updates usage, retains outage totals and recovers"
    );
    bSeconds = 299;
    await restMonitor.refresh();
    assert.equal(restMonitor.snapshot().reminder, null);
    for (const seconds of [300, 600, 900]) {
      // Cross-site sum: three minutes B + two minutes X is already five.
      bSeconds = seconds - 120;
      xSeconds = 120;
      await restMonitor.refresh();
      await until(() =>
        js(`!!document.querySelector('.rest-reminder')`)
      );
      assert.equal(restMonitor.snapshot().reminder.kind, "focus");
      assert.ok(
        await js(
          `document.querySelector('.rest-reminder').textContent.includes('番茄 0/12')`
        )
      );
      assert.equal(
        await js(
          `[...document.querySelectorAll('.rest-reminder button')].filter(b=>!b.hidden).length`
        ),
        2
      );
      if (seconds === 300) await capture("scientific-rest-before12");
      await click("去睡觉");
      await until(() =>
        js(`!document.querySelector('.rest-reminder')`)
      );
    }
    checks.push(
      "production confirmed-record hook: 0/12 and combined 5/10/15 minute reminders, no prompt at 299 seconds"
    );
    assert.equal(
      await js(`document.querySelector('.rest-reminder')===null`, win),
      true
    );
    assert.equal(win.isAlwaysOnTop(), false);
    checks.push(
      "farm has no in-page reminder and remains unpinned after native reminders"
    );
    const setInput = (selector, value) =>
      js(
        `(()=>{const e=document.querySelector(${JSON.stringify(
          selector
        )});const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(e,${JSON.stringify(
          String(value)
        )});e.dispatchEvent(new Event('input',{bubbles:true}))})()`
      );
    await click("明天");
    await click("补记");
    await setInput('[aria-label="补记番茄数"]', 7);
    await click("保存补记");
    await until(() => restMonitor.snapshot().progress?.gymAvailable === true);
    assert.equal(await js(`document.querySelector('.journey-heading strong').textContent`,win),"明日旅程");
    await click("切换小窗");
    await until(()=>js(`document.querySelector('.focus-app').classList.contains('compact')`,win));
    const compactReload = new Promise(resolve => win.webContents.once('did-finish-load',resolve));
    restMonitor.reportProgress({day:restMonitor.snapshot().progress.day,completedCount:null});
    win.reload(); await compactReload;
    await until(()=>restMonitor.snapshot().progress?.gymAvailable === true);
    assert.equal(await js(`document.querySelector('.journey-card')===null`,win),true);
    const gymDayKey='pomatez-journey-v1:local:'+restMonitor.snapshot().progress.day;
    const originalDayPlan=await js(`localStorage.getItem(${JSON.stringify(gymDayKey)})`,win);
    await js(`localStorage.setItem(${JSON.stringify(gymDayKey)},'{bad')`,win);
    const badCompactReload=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));win.reload();await badCompactReload;
    await until(()=>restMonitor.snapshot().progress?.completedCount===7 && restMonitor.snapshot().progress?.gymAvailable===false);
    assert.equal(await js(`localStorage.getItem(${JSON.stringify(gymDayKey)})`,win),'{bad');
    await js(`localStorage.setItem(${JSON.stringify(gymDayKey)},${JSON.stringify(originalDayPlan)})`,win);
    const goodCompactReload=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));win.reload();await goodCompactReload;
    await until(()=>restMonitor.snapshot().progress?.gymAvailable===true);
    await click("切换小窗");
    await until(()=>js(`!!document.querySelector('.journey-card .journey-tomato')`,win));
    checks.push("current-day gym projection updates on tomorrow view and cold compact reload; corrupt plan disables gym without reset, restored valid plan works");
    await click("开始专注");
    bSeconds = 1080; xSeconds = 120;
    await restMonitor.refresh();
    await until(() => popup() && !popup().webContents.isLoadingMainFrame());
    assert.equal(await js(`getComputedStyle(document.querySelector('.rest-reminder')).borderTopColor`,popup()),"rgb(80, 101, 255)");
    await until(() => js(`!document.querySelector('[data-action="gym"]').hidden`,popup()));
    assert.equal(await js(`[...document.querySelectorAll('button')].filter(b=>!b.hidden).length`,popup()),3);
    await capture("scientific-focus-gym-reminder");
    fs.writeFileSync(path.join(root,"artifacts/scientific-focus-native-gym.png"),(await popup().webContents.capturePage()).toPNG());
    await js(`window.gymOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('pomatez-journey-v1:'))throw Error('Synthetic gym quota');return window.gymOriginalSet.call(this,k,v)};void 0`,win);
    await js(`document.querySelector('[data-action="gym"]').click()`,popup());
    await until(()=>js(`document.querySelector('p').textContent.includes('操作未完成')`,popup()));
    assert.equal(await js(`JSON.parse(localStorage.getItem('pomatez-focus-v1')).active.status`,win),"active");
    assert.ok(restMonitor.snapshot().reminder);
    await js(`Storage.prototype.setItem=window.gymOriginalSet;void 0`,win);
    await click("去健身");
    assert.equal(await js(`JSON.parse(localStorage.getItem('pomatez-focus-v1')).active.status`,win),"paused");
    assert.ok(await js(`(()=>{const e=document.querySelector('.journey-card');const p=JSON.parse(localStorage.getItem('pomatez-journey-v1:'+encodeURIComponent(e.dataset.scope)+':'+e.dataset.day));return p.restingAction.endsWith(':1')})()`,win));
    await click("结束"); await click("确认结束"); await click("放弃本次");
    await click("继续：健身");
    await until(() => restMonitor.snapshot().progress?.gymAvailable === false);
    bSeconds = 1380;
    await restMonitor.refresh();
    await until(() => popup() && !popup().webContents.isLoadingMainFrame());
    assert.equal(await js(`document.querySelector('[data-action="gym"]').hidden`,popup()),true);
    await assert.rejects(js(`window.restReminderApi.act({key:${JSON.stringify(restMonitor.snapshot().reminder.key)},action:'gym'})`,popup()));
    await click("去睡觉");
    checks.push("blue native border, current journey gym action pauses real timer/persists rest, passed gym hides and forged gym rejected");
    await click("补记");
    await setInput('[aria-label="补记番茄数"]', 5);
    await click("保存补记");
    await until(
      () => restMonitor.snapshot().progress?.completedCount === 12
    );
    bSeconds = 1200;
    xSeconds = 0;
    await restMonitor.refresh();
    assert.equal(restMonitor.snapshot().reminder, null);
    checks.push(
      "real manual-confirmed twelve tomatoes propagate via narrow IPC and stop under-quota reminders"
    );
    const progressReports = [],
      originalProgress = restMonitor.reportProgress.bind(restMonitor);
    restMonitor.reportProgress = (value) => {
      progressReports.push(value.completedCount);
      return originalProgress(value);
    };
    const restored = new Promise((r) =>
      win.webContents.once("did-finish-load", r)
    );
    win.reload();
    await restored;
    await until(() => progressReports.includes(12));
    assert.ok(
      progressReports.every((count) => count === null || count === 12)
    );
    await restMonitor.refresh();
    assert.equal(restMonitor.snapshot().reminder, null);
    restMonitor.reportProgress = originalProgress;
    checks.push(
      "production reload waits for stored records: no transient zero or false early reminder for completed goal"
    );
    bSeconds = 2700;
    xSeconds = 600;
    await restMonitor.refresh();
    await until(() =>
      js(
        `document.querySelector('.rest-ring-label strong')?.textContent==='5'`
      )
    );
    assert.equal(win.isVisible(), false);
    assert.equal(restMonitor.snapshot().settings.supervise, true);
    assert.ok(
      await js(
        `document.querySelector('.rest-sites').textContent.includes('0小时 45分钟 0秒')&&document.querySelector('.rest-sites').textContent.includes('0小时 10分钟 0秒')`
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
    const weekQueryBefore = requests.filter((p) =>
      p.endsWith("/query/")
    ).length;
    await js("document.querySelector('.rest-refresh').click()");
    await until(() =>
      js("!document.querySelector('.rest-refresh').disabled")
    );
    assert.ok(
      requests.filter((p) => p.endsWith("/query/")).length >=
        weekQueryBefore + 2
    );
    checks.push(
      "refresh in weekly statistics invalidates cached week and retrieves both fresh day and week"
    );
    await click("返回额度");
    checks.push(
      "same-place statistics and today/week hourly distribution"
    );
    await click("设置策略");
    await js(
      `(()=>{const e=document.querySelector('.rest-settings input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(e,'7');e.dispatchEvent(new Event('input',{bubbles:true}))})()`
    );
    await click("保存策略");
    await until(() => js(`!!document.querySelector('.rest-error')`));
    assert.equal(restMonitor.snapshot().settings.quotaMinutes, 60);
    await js(
      `(()=>{const e=document.querySelector('.rest-settings input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(e,'60');e.dispatchEvent(new Event('input',{bubbles:true}))})()`
    );
    await click("保存策略");
    await until(() => js(`!!document.querySelector('.rest-quota')`));
    checks.push(
      "quota validation leaves old settings usable and valid save works"
    );
    await click("设置策略");
    assert.equal(
      await js(
        `document.querySelectorAll('.rest-settings input').length`
      ),
      3
    );
    const strategyGeometry = await js(
      `(()=>{const r=document.querySelector('.rest-card').getBoundingClientRect(), m=document.querySelector('.heatmap').getBoundingClientRect();return {height:r.height,calendar:m.height,right:r.right,viewport:innerWidth}})()`
    );
    console.log("Strategy geometry:", JSON.stringify(strategyGeometry));
    assert.ok(
      strategyGeometry.height <= strategyGeometry.calendar + 15
    );
    assert.ok(strategyGeometry.right <= strategyGeometry.viewport + 1);
    await setInput('[aria-label="每日摸鱼额度（分钟）"]', 90);
    await setInput('[aria-label="每日番茄目标（个）"]', 15);
    await setInput('[aria-label="提醒间隔（分钟）"]', 3);
    const saveGeometry = await js(
      `(()=>{const box=document.querySelector('.rest-settings'),button=[...box.querySelectorAll('button')].find(b=>b.textContent==='保存策略');button.scrollIntoView({block:'nearest'});const r=button.getBoundingClientRect(),s=box.getBoundingClientRect();return {top:r.top,bottom:r.bottom,containerTop:s.top,containerBottom:s.bottom,viewport:innerHeight,scrollHeight:box.scrollHeight,clientHeight:box.clientHeight}})()`
    );
    console.log(
      "Strategy save reachability:",
      JSON.stringify(saveGeometry)
    );
    assert.ok(saveGeometry.top >= saveGeometry.containerTop - 1);
    assert.ok(saveGeometry.bottom <= saveGeometry.containerBottom + 1);
    assert.ok(saveGeometry.bottom <= saveGeometry.viewport + 1);
    await click("保存策略");
    await until(() => js(`!!document.querySelector('.rest-quota')`));
    assert.deepEqual(restMonitor.snapshot().settings, {
      quotaMinutes: 90,
      supervise: true,
      pomodoroGoal: 15,
      reminderMinutes: 3,
    });
    assert.equal(restMonitor.snapshot().reminder, null);
    bSeconds = 2820; // Total57: custom three-minute threshold, goal still12/15.
    await restMonitor.refresh();
    await until(() => js(`!!document.querySelector('.rest-reminder')`));
    assert.equal(restMonitor.snapshot().reminder.kind, "focus");
    assert.ok(
      await js(
        `document.querySelector('.rest-reminder').textContent.includes('12/15')`
      )
    );
    await click("去睡觉");
    await js(`document.querySelector('.rest-supervise input').click()`);
    await until(
      () => restMonitor.snapshot().settings.supervise === false
    );
    const customReload = new Promise((r) =>
      win.webContents.once("did-finish-load", r)
    );
    win.reload();
    await customReload;
    await until(() =>
      js(
        `document.querySelector('.rest-supervise input')?.checked===false`
      )
    );
    assert.deepEqual(restMonitor.snapshot().settings, {
      quotaMinutes: 90,
      supervise: false,
      pomodoroGoal: 15,
      reminderMinutes: 3,
    });
    await click("设置策略");
    assert.equal(
      await js(
        `document.querySelector('[aria-label="每日番茄目标（个）"]').value`
      ),
      "15"
    );
    assert.equal(
      await js(
        `document.querySelector('[aria-label="提醒间隔（分钟）"]').value`
      ),
      "3"
    );
    await setInput('[aria-label="每日摸鱼额度（分钟）"]', 60);
    await setInput('[aria-label="每日番茄目标（个）"]', 12);
    await setInput('[aria-label="提醒间隔（分钟）"]', 5);
    await click("保存策略");
    await until(() => js(`!!document.querySelector('.rest-quota')`));
    await js(`document.querySelector('.rest-supervise input').click()`);
    await until(
      () => restMonitor.snapshot().settings.supervise === true
    );
    checks.push(
      "three real settings save, custom threshold/goal works, switch preserves strategy, reload restores inputs, layout remains compact"
    );
    // Start through the normal existing task flow.
    await click("开始专注");
    await until(() =>
      js(
        `JSON.parse(localStorage.getItem('pomatez-focus-v1')).active?.status==='active'`
      )
    );
    assert.equal(restMonitor.snapshot().progress.completedCount, 12); // Active session is not a completed tomato.
    bSeconds = 3001;
    await restMonitor.refresh();
    await until(() => js(`!!document.querySelector('.rest-reminder')`));
    assert.equal(restMonitor.snapshot().reminder.kind, "quota");
    assert.equal(restMonitor.snapshot().reminder.excessMinutes, 1);
    await click("去睡觉");
    await until(() => js(`!document.querySelector('.rest-reminder')`));
    checks.push(
      "quota exceeded after twelve tomatoes prompts immediately, active timer does not count as a tomato"
    );
    bSeconds = 3300;
    await restMonitor.refresh();
    await until(() => js(`!!document.querySelector('.rest-reminder')`));
    assert.equal(
      await js(
        `[...document.querySelectorAll('.rest-reminder button')].filter(b=>!b.hidden).length`
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
        `document.querySelector('.rest-health').classList.contains('interrupted') && document.querySelector('.rest-health').title.includes('ActivityWatch')`
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
    clock += 30000; // Advance synthetic time to the full-day reconciliation.
    await until(() => js(`!!document.querySelector('.focus-app')`));
    for (let i = 0; i < 700 && !restMonitor.snapshot().reminder; i++)
      await wait(50);
    assert.ok(restMonitor.snapshot().reminder);
    assert.equal(win.isVisible(), false);
    await click("开始下一个番茄");
    checks.push(
      "real periodic poll survives native close-to-tray with hidden renderer"
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
    await until(
      () => restMonitor.snapshot().progress?.completedCount === 12
    );
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
    await js(
      `document.querySelector('.rest-card').scrollIntoView({block:'center'})`
    );
    assert.ok(
      await js(
        `(()=>{const r=document.querySelector('.rest-card').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()`
      )
    );
    console.log("Portrait card geometry verified");
    checks.push("portrait-width card stays within viewport");
    // The independent reminder remains reachable even with a compact farm.
    await js(
      `document.querySelector('[aria-label="切换小窗"]').click()`
    );
    await until(() =>
      js(
        `document.querySelector('.focus-app').classList.contains('compact')`
      )
    );
    await js(
      `window.focusApi.restSettings({quotaMinutes:60,supervise:true})`
    );
    bSeconds = 5400;
    await restMonitor.refresh();
    await until(() => js(`!!document.querySelector('.rest-reminder')`));
    const compact = await js(
      `(()=>{const r=document.querySelector('.rest-reminder').getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:innerWidth,height:innerHeight,buttons:[...document.querySelectorAll('.rest-reminder button')].filter(b=>!b.hidden).length}})()`
    );
    assert.ok(
      compact.top >= 0 &&
        compact.bottom <= compact.height + 1 &&
        compact.left >= 0 &&
        compact.right <= compact.width + 1,
      JSON.stringify(compact)
    );
    assert.equal(compact.buttons, 2);
    console.log("Compact reminder geometry", JSON.stringify(compact));
    await click("开始下一个番茄");
    assert.equal(restMonitor.snapshot().reminder, null);
    checks.push(
      "compact reminder fits both actions and returns to existing focus"
    );
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
    await js(
      `document.querySelector('[aria-label="切换小窗"]').click()`
    );
    await until(() =>
      js(`!!document.querySelector(".rest-sites strong")`)
    );
    restMonitor.stop();
    await restMonitor.configure({
      ...restMonitor.snapshot().settings,
      supervise: false,
    });
    bSeconds = 600;
    xSeconds = 0;
    liveMode = "bilibili";
    clock = Date.now();
    await js(
      `(()=>{const R=Date,shift=${clock}-R.now();window.Date=class extends R{constructor(...a){super(...(a.length?a:[R.now()+shift]))}static now(){return R.now()+shift}}})()`
    );
    await restMonitor.refresh();
    await until(() =>
      js(
        `document.querySelector('.rest-heading').textContent.includes('科学专注') && /小时.+分钟.+秒/.test(document.querySelector('.rest-sites strong').textContent)`
      )
    );
    const siteSeconds = () =>
      js(
        `[...document.querySelectorAll('.rest-sites strong')].map(e=>{const a=e.textContent.split('小时 '), b=a[1].split('分钟 '); return Number(a[0])*3600+Number(b[0])*60+Number(b[1].split('秒')[0])})`
      );
    await wait(200);
    const a = await siteSeconds();
    await wait(1100);
    const b = await siteSeconds();
    assert.ok(b[0] > a[0], JSON.stringify({ a, b }));
    assert.equal(b[1], 0);
    assert.equal(restMonitor.snapshot().usage.bilibili, 600);
    checks.push(
      "official active Bilibili context drives second display without mutating confirmed aggregate"
    );
    const cpuBefore = app.getAppMetrics();
    const perfStart = process.hrtime.bigint();
    for (let i = 0; i < 2; i++) {
      await wait(5000);
      clock = Date.now();
      await restMonitor.refresh(true);
    }
    const cpuAfter = app.getAppMetrics(),
      elapsedMs = Number(process.hrtime.bigint() - perfStart) / 1e6;
    const processes = cpuAfter.map((p) => {
      const prior = cpuBefore.find((b) => b.pid === p.pid);
      const delta =
        (p.cpu.cumulativeCPUUsage || 0) -
        (prior?.cpu.cumulativeCPUUsage || 0);
      return {
        pid: p.pid,
        type: p.type,
        cpuSeconds: delta,
        oneCorePercent: (delta * 100000) / elapsedMs,
      };
    });
    const perf = {
      elapsedMs,
      processes,
      processCountBefore: cpuBefore.length,
      processCountAfter: cpuAfter.length,
      samePids:
        cpuBefore
          .map((p) => p.pid)
          .sort()
          .join(",") ===
        cpuAfter
          .map((p) => p.pid)
          .sort()
          .join(","),
      totalOneCorePercent: processes.reduce(
        (sum, p) => sum + p.oneCorePercent,
        0
      ),
      hiddenIsolated: true,
      activeLocalSeconds: true,
      newFeatureProcess: false,
    };
    assert.equal(perf.samePids, true, JSON.stringify(perf));
    fs.writeFileSync(
      path.join(root, "artifacts/p043-renderer-performance.json"),
      JSON.stringify(perf, null, 2)
    );
    clock = Date.now();
    liveMode = "xiaohongshu";
    xSeconds = 30;
    await restMonitor.refresh();
    await wait(200);
    const x1 = await siteSeconds();
    await wait(1100);
    const x2 = await siteSeconds();
    assert.equal(x2[0], 600);
    assert.ok(x2[1] > x1[1]);
    checks.push(
      "tab switch advances Xiaohongshu seconds and stops the Bilibili projection"
    );
    clock = Date.now();
    await restMonitor.refresh();
    const dom = await win.webContents.debugger.sendCommand(
      "DOM.getDocument"
    );
    const dot = await win.webContents.debugger.sendCommand(
      "DOM.querySelector",
      { nodeId: dom.root.nodeId, selector: ".rest-health" }
    );
    await win.webContents.debugger.sendCommand("CSS.enable");
    await win.webContents.debugger.sendCommand("CSS.forcePseudoState", {
      nodeId: dot.nodeId,
      forcedPseudoClasses: ["hover"],
    });
    await js(
      `document.querySelector('.rest-health').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`
    );
    await wait(100);
    const tooltip = await js(
      `(()=>{const t=document.querySelector('.rest-health-tooltip');return {visible:getComputedStyle(t).display!=='none',text:t.textContent}})()`
    );
    assert.ok(
      tooltip.visible &&
        tooltip.text.includes("监测运行") &&
        tooltip.text.includes("最近检测") &&
        tooltip.text.includes("Edge前台") &&
        tooltip.text.includes("估算"),
      JSON.stringify(tooltip)
    );
    liveEdge = false;
    clock = Date.now();
    await restMonitor.refresh();
    await wait(200);
    const other1 = await siteSeconds();
    await wait(1100);
    assert.deepEqual(await siteSeconds(), other1);
    down = true;
    clock = Date.now();
    await restMonitor.refresh();
    await wait(200);
    const lost1 = await siteSeconds();
    await wait(1100);
    assert.deepEqual(await siteSeconds(), lost1);
    assert.equal(restMonitor.snapshot().live, null);
    checks.push(
      "detailed live hover is visible; other foreground application and connection loss freeze seconds"
    );

    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(root, "artifacts/activitywatch-desktop.json"),
      JSON.stringify(
        {
          checks,
          geometry,
          small,
          compact,
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
