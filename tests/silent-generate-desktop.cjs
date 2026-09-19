// Real hidden main/preload/renderer, synthetic Feishu; no user data or writes.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  __dirname,
  "../artifacts/test-profiles",
  require("node:crypto").randomUUID()
);
const row = (n) => ({
  id: `p${n}`,
  planId: `p${n}`,
  taskId: "t1",
  title: `Synthetic task · 第 ${n} 个番茄`,
  source: "feishu",
  sourceKey: "synthetic",
  quadrant: "iu",
});
let rows = [row(1), row(2)],
  result = { created: 1, eligibleTasks: 1, blocked: 0 };
let calls = 0,
  resume,
  emit,
  fail = false,
  holdRefresh = false,
  refreshResume;
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: "synthetic",
});
FocusService.prototype.history = async () => ({
  sourceKey: "synthetic",
  records: [],
  missing: 0,
});
FocusService.prototype.today = async () => {
  if (holdRefresh) await new Promise((r) => (refreshResume = r));
  return rows;
};
FocusService.prototype.generateToday = async function () {
  calls++;
  emit = (p) => this.onGenerateProgress?.(p);
  emit({ stage: "tasks" });
  await new Promise((r) => (resume = r));
  if (fail) throw Error("Synthetic generation failure");
  return result;
};
require("../app/electron/build/main.js");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 35000);
app.whenReady().then(async () => {
  try {
    let win;
    const until = async (f) => {
      for (let i = 0; i < 200; i++) {
        if (await f()) return;
        await delay(25);
      }
      throw Error("Timeout " + f);
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
        throw Error(s + ": " + e.message);
      }
    };
    const click = (name) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(
          name
        )}||b.textContent.trim()===${JSON.stringify(
          name
        )});if(!b||b.disabled)throw Error('unavailable '+${JSON.stringify(
          name
        )});b.click()})()`
      );
    const pct = () =>
      js(
        "Number(document.querySelector('.gen-track')?.getAttribute('aria-valuenow'))"
      );
    const gen = () => click("生成今日番茄");
    await until(() =>
      js(
        "document.querySelectorAll('.chip').length===2&&!document.querySelector('.gen-btn').disabled"
      )
    );
    const before = await js(
      "document.querySelector('.stat-grid').getBoundingClientRect().top"
    );
    await gen();
    assert.ok(
      await js("!!document.querySelector('[role=progressbar]')")
    );
    await until(() => calls === 1);
    assert.equal(await pct(), 22);
    assert.equal(
      await js("document.querySelector('.gen-btn').disabled"),
      true
    );
    await js("document.querySelector('.gen-btn').click()");
    assert.equal(calls, 1);
    assert.equal(
      await js(
        "document.querySelector('.stat-grid').getBoundingClientRect().top"
      ),
      before
    );
    await js("document.querySelector('.chip').click()");
    await click("开始专注");
    assert.equal(
      await js(
        "JSON.parse(localStorage.getItem('pomatez-focus-v1')).active.status"
      ),
      "active"
    );
    emit({ stage: "write", done: 1, total: 2 });
    await until(async () => (await pct()) === 70);
    emit({ stage: "verify" });
    await until(async () => (await pct()) === 90);
    holdRefresh = true;
    rows = [row(1), row(2), row(3)];
    resume();
    await until(() => !!refreshResume);
    await until(async () => (await pct()) === 96);
    await delay(200);
    assert.equal(await pct(), 96);
    const shot = await win.webContents.executeJavaScript(
      "(()=>{const r=document.querySelector('.side-title').getBoundingClientRect();return {x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)}})()"
    );
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/generation-feedback.png"),
      (await win.webContents.capturePage(shot)).toPNG()
    );
    holdRefresh = false;
    refreshResume();
    await until(async () => (await pct()) === 100);
    assert.equal(
      await js("document.querySelector('.gen-label').textContent"),
      "已更新"
    );
    assert.equal(
      await js("document.querySelector('.gen-btn').disabled"),
      false
    );
    await click("结束");
    await click("确认结束");
    await click("放弃本次");
    result = { created: 0, eligibleTasks: 1, blocked: 0 };
    await gen();
    await until(() => calls === 2);
    resume();
    await until(() =>
      js(
        "document.querySelector('.gen-label').textContent==='已是最新'"
      )
    );
    fail = true;
    await gen();
    await until(() => calls === 3);
    resume();
    await until(() =>
      js(
        "document.querySelector('.gen-btn').classList.contains('failed')"
      )
    );
    assert.equal(await pct(), 0);
    assert.equal(
      await js("document.querySelector('.gen-btn').disabled"),
      false
    );
    fail = false;
    await gen();
    await until(() => calls === 4);
    resume();
    await until(async () => (await pct()) === 100);
    await until(() => js("!document.querySelector('.gen-track')"));
    assert.equal(
      await js("document.querySelector('.gen-label').textContent"),
      "生成今日番茄"
    );
    rows = [];
    win.webContents.reload();
    await until(() =>
      js(
        "!!document.querySelector('.gen-btn')&&!document.querySelector('.gen-btn').disabled&&document.querySelectorAll('.chip').length===0"
      )
    );
    await gen();
    await until(() => calls === 5);
    assert.equal(await pct(), 22);
    rows = [row(1)];
    result = { created: 1, eligibleTasks: 1, blocked: 0 };
    resume();
    await until(async () => (await pct()) === 100);
    win.setContentSize(760, 780);
    await until(() => js("Math.abs(innerWidth-760)<=2"));
    assert.equal(
      await js("document.documentElement.scrollWidth<=innerWidth"),
      true
    );
    assert.equal(
      await js(
        "(()=>{const r=document.querySelector('.gen-btn').getBoundingClientRect();const w=document.querySelector('.win-controls').getBoundingClientRect();return r.right<=w.left+1&&w.right<=innerWidth})()"
      ),
      true
    );
    assert.equal(win.isVisible(), false);
    console.log(
      "PASS immediate feedback, real stages/write counts, no duplicate click, background focus, refresh gate, success/no-change, failure/retry, reset, first generation, narrow layout"
    );
    clearTimeout(timeout);
    app.exit(0);
  } catch (e) {
    console.error(e.stack);
    clearTimeout(timeout);
    app.exit(1);
  }
});
