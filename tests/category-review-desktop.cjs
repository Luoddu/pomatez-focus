// Real main/preload/renderer and adapter, isolated profile, synthetic HTTP only.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs"),
  { randomUUID } = require("node:crypto");
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
const {
  connectionKey,
} = require("../app/electron/build/focus/feishu.js");
const {
  HISTORY_FIELD,
} = require("../app/electron/build/focus/history.js");
const { harness, record, config } = require("./plan-fixture.cjs");
const { client, state } = harness();
const source = connectionKey(config),
  start = new Date().setHours(0, 0, 0, 0) - 6 * 3600000;
const end = Math.min(Date.now() - 1000, start + 10 * 3600000);
const raw = record((end - start) / 1000, {
  startedAt: start,
  endedAt: end,
  acceptedSeconds: 1800,
  completedCount: 1,
  segments: [{ start, end }],
  task: {
    id: "p1",
    planId: "p1",
    taskId: "t1",
    source: "feishu",
    sourceKey: source,
    title: "模拟隐藏任务名称",
  },
});
const day = new Date(start + 8 * 3600000).toISOString().slice(0, 10);
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  __dirname,
  "../artifacts/test-profiles",
  randomUUID()
);
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: source,
});
FocusService.prototype.today = () => client.today();
FocusService.prototype.sync = (v) => client.sync(v);
FocusService.prototype.setup = () => client.setupPlans();
FocusService.prototype.history = () => client.history();
FocusService.prototype.archiveHistory = (v) => client.archiveHistory(v);
FocusService.prototype.recolorRecord = (v) => client.recolorRecord(v);
FocusService.prototype.correctRecord = (v) => client.correctRecord(v);
FocusService.prototype.generateToday = async () => ({ created: 0, eligibleTasks: 0, blocked: 0 });
FocusService.prototype.dailyReviews = async () => ({
  sourceKey: source,
  summaries: {
    [day]:
      "当日主题：设备维护与临时协调，晚间推进测试大纲。\n代表进展：模拟进展正文不应展示。\n下一步：模拟计划不应展示。",
  },
});
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = setTimeout(() => app.exit(2), 50000);
app.whenReady().then(async () => {
  try {
    let win;
    for (let n = 0; n < 150; n++) {
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
    const errors = [];
    win.on("show", () => errors.push("visible"));
    const js = (s) => win.webContents.executeJavaScript(s, true);
    const until = async (fn) => {
      for (let n = 0; n < 160; n++) {
        if (await fn()) return;
        await wait(40);
      }
      throw Error("Condition timed out");
    };
    const click = (text) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(
          text
        )}||b.getAttribute('aria-label')===${JSON.stringify(
          text
        )});if(!b||b.disabled)throw Error('Unavailable button');b.click()})()`
      );
    const input = (selector, value) =>
      js(
        `(()=>{const i=document.querySelector(${JSON.stringify(
          selector
        )});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(
          value
        )});i.dispatchEvent(new Event('input',{bubbles:true}))})()`
      );
    const reload = async () => {
      const ready = new Promise((r) =>
        win.webContents.once("did-finish-load", r)
      );
      win.webContents.reload();
      await ready;
      await wait(250);
    };
    const receipt = await client.sync(raw);
    await client.archiveHistory({
      ...raw,
      sync: "synced",
      syncedPlanId: receipt.planId,
    });
    const saved = (await client.history()).records;
    win.webContents.debugger.attach("1.3");
    await win.webContents.debugger.sendCommand("Page.enable");
    const script = await win.webContents.debugger.sendCommand(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source: `localStorage.setItem('pomatez-focus-v1',${JSON.stringify(
          JSON.stringify({ active: null, records: saved })
        )})`,
      }
    );
    await reload();
    await win.webContents.debugger.sendCommand(
      "Page.removeScriptToEvaluateOnNewDocument",
      { identifier: script.identifier }
    );
    win.webContents.debugger.detach();
    await until(() =>
      js(
        "document.querySelector('.day-review-text')?.textContent.includes('设备维护与临时协调')"
      )
    );
    assert.equal(
      await js("document.querySelectorAll('.record').length"),
      0
    );
    assert.equal(
      await js(
        "document.body.textContent.includes('模拟隐藏任务名称')||[...document.querySelectorAll('[title]')].some(e=>e.title.includes('模拟隐藏任务名称'))"
      ),
      false
    );
    assert.equal(
      await js(
        "document.querySelector('.day-review-text').textContent"
      ),
      "设备维护与临时协调，晚间推进测试大纲。"
    );
    assert.equal(
      await js(
        "Boolean(document.querySelector('.day-review-label')) || document.querySelector('.day-glass').textContent.includes('模拟进展正文')"
      ),
      false
    );
    await js("document.querySelector('.day-glass').scrollIntoView({block:'center'})");
    await wait(200);
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/history-theme-card.png"),
      (await win.capturePage()).toPNG()
    );
    const checks = [
      "folded history shows only daily theme, no review heading or progress prose",
      "past default glass shows read-only review and contains no hidden task names or tooltips",
    ];
    await js("document.querySelector('.day-glass').click()");
    await until(() =>
      js("document.querySelectorAll('.record').length===1")
    );
    state.writes = [];
    const account = { ...state.plans[0].fields };
    delete account[HISTORY_FIELD];
    await js(
      "document.querySelector('.record').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:200,clientY:400}))"
    );
    await until(() =>
      js("Boolean(document.querySelector('.record-color-menu'))")
    );
    await js(
      "[...document.querySelectorAll('.record-color-menu button')].find(b=>b.textContent.includes('科研')).click()"
    );
    await until(
      async () =>
        (await client.history()).records[0].colorOverride === "research"
    );
    await until(() =>
      js(
        "document.querySelector('.r-icon')?.title.includes('手动分类')"
      )
    );
    assert.ok(
      state.writes.every((w) =>
        Object.keys(w.body.fields).every((f) => f === HISTORY_FIELD)
      )
    );
    const afterAccount = { ...state.plans[0].fields };
    delete afterAccount[HISTORY_FIELD];
    assert.deepEqual(afterAccount, account);
    await reload();
    await until(() =>
      js("Boolean(document.querySelector('.day-glass'))")
    );
    await js("document.querySelector('.day-glass').click()");
    await until(() =>
      js(
        "document.querySelector('.r-icon')?.title.includes('手动分类')"
      )
    );
    await js(
      "document.querySelector('.record').dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'F10',shiftKey:true}))"
    );
    await until(() =>
      js("Boolean(document.querySelector('.record-color-menu'))")
    );
    await js(
      "document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'ArrowDown'}))"
    );
    assert.equal(
      await js("document.activeElement.getAttribute('role')"),
      "menuitemradio"
    );
    await js(
      "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))"
    );
    await until(() =>
      js("!document.querySelector('.record-color-menu')")
    );
    checks.push(
      "native context menu recolors through persistent queue and IPC, survives reload, accounting unchanged"
    );
    await js("document.querySelector('.record-edit').click()");
    await until(() =>
      js("Boolean(document.querySelector('#manual-end'))")
    );
    const assertEditorReachable = async () => {
      await wait(120);
      const geometry = await js(`(()=>{
        const p=document.querySelector('.right-col');
        p.scrollTop=p.scrollHeight;
        document.querySelector('.manual-actions').scrollIntoView({block:'end'});
        return {scroll: getComputedStyle(p).overflowY, hidden:getComputedStyle(document.querySelector('.records')).display};
      })()`);
      assert.equal(geometry.scroll, "auto");
      assert.equal(geometry.hidden, "none");
      const buttonGeometry = await js(`(()=>{
        const p=document.querySelector('.right-col').getBoundingClientRect();
        return [...document.querySelectorAll('.manual-actions button')].map(b=>{
          const r=b.getBoundingClientRect();
          return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,pTop:p.top,pBottom:p.bottom,height:innerHeight,width:innerWidth,hit:b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};
        });
      })()`);
      assert.ok(buttonGeometry.every(r=>r.top>=Math.max(0,r.pTop)&&r.bottom<=Math.min(r.height,r.pBottom)+1&&r.left>=0&&r.right<=r.width&&r.hit), JSON.stringify(buttonGeometry));
    };
    win.setContentSize(1040, 580);
    await assertEditorReachable();
    await wait(250);
    assert.ok(await js(`(()=>{const b=document.querySelector('.manual-actions button'),r=b.getBoundingClientRect();return r.bottom<=innerHeight&&b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`));
    fs.writeFileSync(path.join(__dirname, "../artifacts/small-editor.png"), (await win.capturePage()).toPNG());
    win.setContentSize(760, 580);
    await assertEditorReachable();
    checks.push("small landscape and minimum-width edit forms scroll to visible clickable save/cancel buttons");
    const local = await js(
      `(()=>{const d=new Date(${
        start + 1800000
      });d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,19)})()`
    );
    const shorter = await js(
      `(()=>{const d=new Date(${
        start + 900000
      });d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,19)})()`
    );
    await input("#manual-end", shorter);
    assert.equal(
      await js(
        "Number(document.querySelector('#manual-minutes').value)"
      ),
      15
    );
    assert.equal(
      await js(
        "Number(document.querySelector('[aria-label=补记番茄数]').value)"
      ),
      1
    );
    assert.ok(
      await js(
        "document.querySelector('.manual-time-hint').textContent.includes('自动调小')"
      )
    );
    await input("#manual-end", local);
    assert.equal(
      await js(
        "Number(document.querySelector('#manual-minutes').value)"
      ),
      15
    );
    await input("#manual-minutes", "31");
    await click("保存修改");
    assert.ok(
      await js(
        "document.querySelector('.manual-error').textContent.includes('30 分 0 秒')"
      )
    );
    await input("#manual-minutes", "30");
    assert.equal(
      await js("Boolean(document.querySelector('.manual-error'))"),
      false
    );
    checks.push(
      "shorter end clamps duration without changing count; extending does not inflate focus; explicit maximum and correction work"
    );
    await click("保存修改");
    await until(
      async () =>
        Math.abs(
          (await client.history()).records[0].endedAt -
            (start + 1800000)
        ) < 1000
    );
    assert.equal(await js("Boolean(document.querySelector('.is-editing-record'))"), false);
    assert.equal(
      (await client.history()).records[0].acceptedSeconds,
      1800
    );
    assert.equal(
      (await client.history()).records[0].elapsedSeconds,
      1800
    );
    assert.equal(
      (await client.history()).records[0].colorOverride,
      "research"
    );
    checks.push(
      "overnight end edit saves earlier real endpoint, retains accepted duration/count/category through adapter"
    );
    await click("补记");
    await until(() =>
      js("Boolean(document.querySelector('#manual-name'))")
    );
    await assertEditorReachable();
    await click("取消");
    assert.equal(await js("Boolean(document.querySelector('.manual-form'))"), false);
    await click("补记");
    await until(() => js("Boolean(document.querySelector('#manual-name'))"));
    await input("#manual-name", "模拟临时命名番茄");
    const period = await js(`(()=>{const fmt=n=>{const d=new Date(n);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,19)};const end=Date.now()-60000;return {start:fmt(end-140*60000),end:fmt(end)}})()`);
    await input("#manual-when", period.start);
    await input("#manual-end", period.end);
    assert.equal(await js("Number(document.querySelector('#manual-minutes').value)"), 140);
    assert.equal(await js("Number(document.querySelector('[aria-label=补记番茄数]').value)"), 5);
    for (const count of [4, 6, 0, 5]) {
      await input("[aria-label=补记番茄数]", String(count));
      assert.deepEqual(await js("({start:document.querySelector('#manual-when').value,end:document.querySelector('#manual-end').value,minutes:Number(document.querySelector('#manual-minutes').value)})"), { ...period, minutes: 140 });
    }
    await input("#manual-end", period.start);
    assert.equal(await js("Number(document.querySelector('[aria-label=补记番茄数]').value)"), 0);
    await click("保存补记");
    assert.ok(await js("Boolean(document.querySelector('.manual-error'))"));
    await input("#manual-end", period.end);
    await click("保存补记");
    await until(() =>
      js(
        "JSON.parse(localStorage.getItem('pomatez-focus-v1')).records.some(r=>r.task.title==='模拟临时命名番茄')"
      )
    );
    checks.push(
      "supplement accepts ad hoc typed name and explicit end without task selection"
    );
    const savedPeriod = await js("JSON.parse(localStorage.getItem('pomatez-focus-v1')).records.find(r=>r.task.title==='模拟临时命名番茄')");
    assert.equal(savedPeriod.acceptedSeconds, 8400);
    assert.equal(savedPeriod.completedCount, 5);
    assert.equal(savedPeriod.endedAt - savedPeriod.startedAt, 8400000);
    checks.push("period sets defaults; independent count including zero leaves both endpoints and duration; invalid span rejected, valid period persists");
    await click("统计");
    await until(() =>
      js("Boolean(document.querySelector('.stats-page'))")
    );
    await click("分类");
    await until(() =>
      js("document.querySelectorAll('.bar-segment').length>0")
    );
    assert.ok(
      await js(
        "Boolean(document.querySelector('.bar-segment[data-category=research]'))"
      )
    );
    await js(
      "[...document.querySelectorAll('.category-filter')].find(b=>b.textContent.includes('科研')).click()"
    );
    assert.equal(
      await js(
        "[...document.querySelectorAll('.category-filter')].find(b=>b.textContent.includes('科研')).getAttribute('aria-pressed')"
      ),
      "true"
    );
    assert.ok(
      await js(
        "document.querySelector('.stats-trend').textContent.includes('科研')"
      )
    );
    assert.ok(
      await js(
        "getComputedStyle(document.querySelector('.trend-key.average')).backgroundColor !== 'rgba(0, 0, 0, 0)'"
      )
    );
    const capture = async (name, w, h) => {
      win.setContentSize(w, h);
      await wait(250);
      assert.equal(
        await js(
          "document.querySelector('.stats-page').scrollWidth>innerWidth+2"
        ),
        false
      );
      fs.writeFileSync(
        path.join(__dirname, "../artifacts", name),
        (await win.capturePage()).toPNG()
      );
    };
    await capture("category-review-stats.png", 1080, 950);
    await capture("category-review-stats-portrait.png", 760, 1260);
    await click("返回");
    await wait(1200);
    await js(
      "document.querySelector('.records-section').scrollIntoView({block:'center'})"
    );
    await wait(150);
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/category-review-glass.png"),
      (await win.capturePage()).toPNG()
    );
    checks.push(
      "stacked category bars, selected trend buttons and light warm chart fit landscape and portrait"
    );
    assert.equal(errors.length, 0);
    assert.equal(win.isVisible(), false);
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/category-review-desktop.json"),
      JSON.stringify({ checks, realFeishuWrites: 0 }, null, 2)
    );
    console.log(JSON.stringify({ passed: checks.length, checks }));
    clearTimeout(deadline);
    app.exit(0);
  } catch (e) {
    console.error(e.stack || String(e));
    clearTimeout(deadline);
    app.exit(1);
  }
});
