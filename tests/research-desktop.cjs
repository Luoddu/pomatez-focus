const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
if (
  process.env.POMATEZ_HEADLESS !== "1" ||
  !process.env.POMATEZ_PROFILE
)
  throw Error("isolated hidden profile required");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
const sourceKey = "synthetic-research";
const tasks = [
  ["personal", "个人示例", "iu", "personal"],
  ["research", "科研示例", "iu", "research"],
  ["research-inu", "长期研究示例", "inu", "research"],
].map(([id, title, quadrant, projectType]) => ({
  id,
  taskId: id,
  planId: id,
  title,
  quadrant,
  projectType,
  source: "feishu",
  sourceKey,
  plannedToday: 1,
  doneToday: 0,
  description: "模拟详情，不含私人任务",
}));
const shifted = new Date(Date.now() + 28800000),
  day = 86400000;
const monday =
  Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  ) -
  28800000 -
  ((shifted.getUTCDay() + 6) % 7) * day;
const records = Array.from({ length: 8 }, (_, i) => ({
  id: `synthetic-record-${i}`,
  task: tasks[1],
  status: "saved",
  sync: "synced",
  cloudSynced: true,
  completedCount: i === 7 ? 3 : i + 1,
  acceptedSeconds: (i + 1) * 1500,
  elapsedSeconds: (i + 1) * 1500,
  plannedSeconds: 1500,
  startedAt: monday - (7 - i) * 7 * day,
  endedAt: monday - (7 - i) * 7 * day + (i + 1) * 1500000,
}));
FocusService.prototype.status = () => ({ configured: true, sourceKey });
FocusService.prototype.today = async () => tasks;
FocusService.prototype.history = async () => ({
  sourceKey,
  records,
  missing: [],
});
FocusService.prototype.dailyReviews = async () => ({
  sourceKey,
  summaries: {},
});
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 45000);
app.whenReady().then(async () => {
  try {
    let win;
    for (let i = 0; i < 100; i++) {
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
    let shown = false;
    win.on("show", () => (shown = true));
    const js = async (s) => {
      try {
        return await win.webContents.executeJavaScript(s, true);
      } catch (e) {
        console.error("Renderer expression:", s);
        throw e;
      }
    };
    const until = async (s) => {
      for (let n = 0; n < 160; n++) {
        if (await js(s)) return;
        await wait(40);
      }
      throw Error(`Timed out: ${s}`);
    };
    const click = (label) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(
          label
        )}||b.getAttribute('aria-label')===${JSON.stringify(
          label
        )});if(!b||b.disabled)throw Error('missing '+${JSON.stringify(
          label
        )});b.click()})()`
      );
    await js(
      `localStorage.setItem('pomatez-focus-v1',${JSON.stringify(
        JSON.stringify({ active: null, records })
      )})`
    );
    const reload = async () => {
      const ready = new Promise((r) =>
        win.webContents.once("did-finish-load", r)
      );
      win.webContents.reload();
      await ready;
      await until(
        "document.querySelector('.research-goal')?.textContent.includes('3/')"
      );
    };
    await reload();
    win.setContentSize(1440, 1000);
    await wait(200);
    assert.match(
      await js("document.querySelector('.research-goal').textContent"),
      /3\/40/
    );
    const ordered = await js(
      "[...document.querySelectorAll('.quad-iu .task-name')].map(e=>e.textContent)"
    );
    assert.match(ordered[0], /科研示例/);
    assert.match(ordered[1], /个人示例/);
    assert.equal(
      await js(
        "document.querySelectorAll('.quad-inu .is-research').length"
      ),
      1
    );
    await click("设置科研周目标");
    await js(
      `(()=>{const i=document.querySelector('[aria-label="科研本周目标数"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'3');i.dispatchEvent(new Event('input',{bubbles:true}))})()`
    );
    await js(
      "document.querySelector('.research-weekgoal .weekgoal-pop button').click()"
    );
    await until(
      "document.querySelector('.research-goal').classList.contains('met')"
    );
    await reload();
    assert.match(
      await js("document.querySelector('.research-goal').textContent"),
      /3\/3/
    );
    assert.match(
      await js(
        "document.querySelector('.weekgoal:not(.research-weekgoal) .wg-text').textContent"
      ),
      /\/60/
    );
    assert.equal(
      await js(
        "document.querySelectorAll('[data-research-fruit=true]').length>0"
      ),
      true
    );
    assert.match(
      await js(
        "document.querySelector('.research-harvest').textContent"
      ),
      /3 个/
    );
    for (const size of [
      [760, 650],
      [1080, 1840],
    ]) {
      win.setContentSize(...size);
      await wait(200);
      await click("设置科研周目标");
      await until(
        "!!document.querySelector('.research-weekgoal .weekgoal-pop')"
      );
      const geometry = await js(
        `(()=>{const b=document.querySelector('.research-goal'),p=document.querySelector('.research-weekgoal .weekgoal-pop');b.scrollIntoView({block:'center'});const r=p.getBoundingClientRect();const s=p.querySelector('button'),bRect=s.getBoundingClientRect(),hit=document.elementFromPoint(bRect.x+bRect.width/2,bRect.y+bRect.height/2);return {left:r.left,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,clickable:s.contains(hit)}})()`
      );
      assert.ok(
        geometry.left >= 0 &&
          geometry.right <= geometry.w + 1 &&
          geometry.bottom <= geometry.h &&
          geometry.clickable,
        JSON.stringify(geometry)
      );
      await js(
        "document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))"
      );
    }
    win.setContentSize(1440, 1000);
    await wait(200);
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/research-board.png"),
      (await win.webContents.capturePage()).toPNG()
    );
    await click("统计");
    await until("!!document.querySelector('.research-progress')");
    assert.equal(
      await js("document.querySelectorAll('.research-week').length"),
      8
    );
    assert.match(
      await js(
        "document.querySelector('.research-progress').textContent"
      ),
      /目标已达成/
    );
    await click("查看科研时长趋势");
    await until(
      "document.querySelector('.category-filter[aria-pressed=true]')?.textContent.includes('科研')"
    );
    await wait(700);
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/research-stats.png"),
      (await win.webContents.capturePage()).toPNG()
    );
    await click("返回");
    await until("!!document.querySelector('.quad-iu .chip')");
    await js(
      "document.querySelector('.quad-inu .is-research .chip').click()"
    );
    assert.equal(
      await js(
        "document.querySelector('.quad-inu .chip.selected')!==null && !document.querySelector('.btn-begin').disabled"
      ),
      true
    );
    await js(
      "document.querySelector('.quad-iu .task:not(.is-research) .chip').click()"
    );
    await js(
      "document.querySelector('.action-bar .btn-begin').click()"
    );
    await until("!!document.querySelector('.timing-buttons')");
    assert.match(
      await js(
        "document.querySelector('.current-task')?.textContent||document.body.textContent"
      ),
      /个人示例/
    );
    assert.equal(shown, false);
    clearTimeout(timeout);
    console.log(
      JSON.stringify({
        passed: true,
        checks: [
          "default goal",
          "save/reload/total unchanged",
          "stable quadrant priority",
          "research farm fruit",
          "small and portrait goal access",
          "8 week research trend",
          "normal task starts focus",
          "hidden and muted",
        ],
      })
    );
    app.exit(0);
  } catch (e) {
    console.error(e);
    clearTimeout(timeout);
    app.exit(1);
  }
});
