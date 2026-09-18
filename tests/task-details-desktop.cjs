// Real hidden Electron/main/preload/renderer. All tasks synthetic, no network.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  __dirname,
  "../artifacts/test-profiles",
  randomUUID()
);
const description =
  'Read the synthetic guide.\n<img src=x onerror="window.injected=1">\nPreserve these line breaks.';
const tasks = [
  {
    id: "p1",
    taskId: "t1",
    title: "Synthetic reading · 第 1 个番茄",
    description,
  },
  {
    id: "p2",
    taskId: "t2",
    title: "Synthetic comparison · 第 1 个番茄",
    description: "Long detail " + "comparison ".repeat(600),
  },
  {
    id: "p3",
    taskId: "t3",
    title: "Synthetic without details · 第 1 个番茄",
  },
].map((t) => ({
  ...t,
  planId: t.id,
  source: "feishu",
  sourceKey: "synthetic",
  quadrant: "iu",
}));
let hold = false;
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: "synthetic",
});
FocusService.prototype.today = async () =>
  hold ? new Promise(() => {}) : structuredClone(tasks);
FocusService.prototype.history = async () => ({
  sourceKey: "synthetic",
  records: [],
  missing: 0,
});
require("../app/electron/build/main.js");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 60000);
app.whenReady().then(async () => {
  try {
    let win;
    const until = async (f) => {
      for (let i = 0; i < 200; i++) {
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
    const js = (s) => win.webContents.executeJavaScript(s, true);
    const click = (selector) =>
      js(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const named = (label) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(
          label
        )}||b.textContent.trim()===${JSON.stringify(
          label
        )});if(!b)throw Error('Missing button');b.click()})()`
      );
    const pointerClick = async (selector) => {
      const point = await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:Math.round(r.left+Math.min(30,r.width/2)),y:Math.round(r.top+r.height/2)}})()`);
      win.webContents.sendInputEvent({type:"mouseDown",button:"left",clickCount:1,...point});
      win.webContents.sendInputEvent({type:"mouseUp",button:"left",clickCount:1,...point});
      await delay(150);
    };
    const panel = () =>
      js("!!document.querySelector('.task-detail-popover')");
    const stored = () =>
      js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
    await until(() =>
      js("document.querySelectorAll('.chips .chip').length===3")
    );
    assert.equal(await panel(), false);
    assert.equal(
      await js(
        "document.querySelectorAll('.task-title-button').length"
      ),
      3
    );
    const layout = await js(
      "[...document.querySelectorAll('.task')].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})"
    );
    const selected = await js(
      "document.querySelector('.chip.selected')?.title||''"
    );
    await pointerClick(".task-title-button");
    await until(panel);
    assert.equal(
      await js(
        "document.querySelector('.task-detail-text').textContent"
      ),
      description
    );
    assert.equal(
      await js(
        "!!document.querySelector('.task-detail-popover img')||!!window.injected"
      ),
      false
    );
    assert.deepEqual(
      await js(
        "[...document.querySelectorAll('.task')].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})"
      ),
      layout
    );
    assert.equal(
      await js("document.querySelector('.chip.selected')?.title||''"),
      selected
    );
    assert.ok(!(await stored())?.active);
    console.log(
      "PASS title-only board, literal multiline detail, no layout/selection/timer change"
    );
    await click(".task-detail-text");
    assert.equal(await panel(), true);
    await click(".task-list > .task:nth-child(2) .task-title-button");
    await until(() =>
      js(
        "document.querySelectorAll('.task-detail-popover').length===1 && document.querySelector('.task-detail-text').textContent.startsWith('Long detail')"
      )
    );
    await js(
      "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))"
    );
    await until(async () => !(await panel()));
    await click(".task-title-button");
    await click(".quad-head");
    await until(async () => !(await panel()));
    console.log(
      "PASS switching title, inside click, Escape and outside dismissal"
    );
    assert.equal(await js("document.querySelectorAll('.task-details-hint').length"), 2);
    await click(".task-list > .task:nth-child(3) .task-title-button");
    assert.match(await js("document.querySelector('.task-detail-text').textContent"), /暂无任务详情/);
    await click(".quad-head");
    win.setMinimumSize(420, 420);
    win.setContentSize(520, 780);
    await delay(350);
    assert.ok(Math.abs((await js("innerWidth")) - 520) <= 2); // native DPI rounding
    await click(".task-list > .task:nth-child(2) .task-title-button");
    await until(panel);
    await delay(350);
    assert.equal(await panel(), true);
    assert.equal(
      await js(
        "(()=>{const e=document.querySelector('.task-detail-popover'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollHeight>e.clientHeight&&e.scrollWidth<=e.clientWidth+1})()"
      ),
      true
    );
    const shots = path.join(__dirname, "../artifacts/task-details");
    assert.equal(await js("(()=>{const e=document.querySelector('.task-detail-popover'),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.left+20,r.top+20))})()"), true);
    fs.mkdirSync(shots, { recursive: true });
    // Hidden windows may return the compositor's previous frame on first capture.
    await win.webContents.capturePage();
    await delay(150);
    fs.writeFileSync(
      path.join(shots, "narrow.png"),
      (await win.webContents.capturePage()).toPNG()
    );
    console.log("PASS long detail scrolls and fits narrow viewport");
    win.setSize(1120, 850);
    await delay(100);
    await click(".chips .chip");
    await named("开始专注");
    await until(() =>
      js("!!document.querySelector('.ct-description')")
    );
    assert.equal(
      await js("document.querySelector('.ct-description').textContent"),
      description
    );
    const original = (await stored()).active;
    await named("暂停");
    await until(
      async () => (await stored()).active.status === "paused"
    );
    await named("继续");
    await until(
      async () => (await stored()).active.status === "active"
    );
    assert.equal((await stored()).active.id, original.id);
    hold = true;
    await new Promise((resolve) => {
      win.webContents.once("did-finish-load", resolve);
      win.webContents.reload();
    });
    await until(() =>
      js("!!document.querySelector('.ct-description')")
    );
    assert.equal(
      await js("document.querySelector('.ct-description').textContent"),
      description
    );
    assert.equal((await stored()).active.id, original.id);
    fs.writeFileSync(
      path.join(shots, "timing.png"),
      (await win.webContents.capturePage()).toPNG()
    );
    assert.equal(win.isVisible(), false);
    console.log(
      "PASS active details survive pause/resume and reload while remote reads held"
    );
    clearTimeout(timeout);
    app.exit(0);
  } catch (e) {
    console.error(e);
    clearTimeout(timeout);
    app.exit(1);
  }
});
