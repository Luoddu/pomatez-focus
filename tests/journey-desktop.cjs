const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
if (
  process.env.POMATEZ_HEADLESS !== "1" ||
  !process.env.POMATEZ_PROFILE
)
  throw Error("isolated profile required");
const phase = process.env.JOURNEY_PHASE,
  root = path.resolve(__dirname, ".."),
  checks = [];
let shared = [],
  tasks = [1, 2].map((n) => ({
    id: `${phase}-row${n}`,
    planId: `${phase}-plan${n}`,
    taskId: `task${n}`,
    title: `合成科研任务${n} · 第1个番茄`,
    source: "feishu",
    sourceKey: "synthetic",
    quadrant: "iu",
  }));
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: "synthetic",
});
FocusService.prototype.today = async () => structuredClone(tasks);
FocusService.prototype.generateToday = async () => ({ created: 0 });
FocusService.prototype.history = async () => ({
  sourceKey: "synthetic",
  records: shared,
  missing: 0,
});
FocusService.prototype.sync = async (r) => ({
  synced: true,
  planId: r.task.planId,
});
FocusService.prototype.archiveHistory = async (r) => {
  const v = { ...r, cloudSynced: true, sync: "synced" };
  shared.push(v);
  return v;
};
FocusService.prototype.dailyReviews = async () => ({
  sourceKey: "synthetic",
  reviews: {},
});
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = setTimeout(() => app.exit(2), 55000);
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
      await wait(70);
    }
    assert.ok(win);
    assert.equal(win.webContents.isAudioMuted(), true);
    assert.equal(app.commandLine.hasSwitch("mute-audio"), true);
    const silentPeer = new BrowserWindow({show:false});
    assert.equal(silentPeer.webContents.isAudioMuted(), true);
    silentPeer.destroy();
    checks.push("headless startup and every new webContents are muted before playback");
    const errors = [];
    win.webContents.on("console-message", (_e, l, m) => {
      if (l >= 3) errors.push(m);
    });
    const js = async (s) => {
        try {
          return await win.webContents.executeJavaScript(s, true);
        } catch (e) {
          console.error("FAILED-JS", s); console.error("RENDERER-ERRORS",errors);
          throw e;
        }
      },
      until = async (f) => {
        for (let n = 0; n < 160; n++) {
          if (await f()) return;
          await wait(40);
        }
        throw Error("timeout " + f);
      };
    const click = (text, selector = "button") =>
      js(
        `(()=>{const b=[...document.querySelectorAll(${JSON.stringify(
          selector
        )})].find(b=>b.textContent.trim()===${JSON.stringify(
          text
        )}||b.getAttribute('aria-label')===${JSON.stringify(
          text
        )});if(!b||b.disabled)throw Error('button unavailable '+${JSON.stringify(
          text
        )});b.click()})()`
      );
    const change = (sel, value) =>
      js(
        `(()=>{const e=document.querySelector(${JSON.stringify(
          sel
        )});if(!e)throw Error('missing input');Object.getOwnPropertyDescriptor(e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(
          value
        )});e.dispatchEvent(new Event(e instanceof HTMLSelectElement?'change':'input',{bubbles:true}))})()`
      );
    const stored = () =>
      js(`JSON.parse(localStorage.getItem('pomatez-focus-v1'))`);
    const plan = () =>
      js(
        `(()=>{const e=document.querySelector('.journey-card');return JSON.parse(localStorage.getItem('pomatez-journey-v1:'+encodeURIComponent(e.dataset.scope)+':'+e.dataset.day))})()`
      );
    const reload = async (source, broken = false) => {
      if (source) {
        win.webContents.debugger.attach("1.3");
        await win.webContents.debugger.sendCommand("Page.enable");
        var seed = await win.webContents.debugger.sendCommand(
          "Page.addScriptToEvaluateOnNewDocument",
          { source }
        );
      }
      const done = new Promise((r) =>
        win.webContents.once("did-finish-load", r)
      );
      win.webContents.reload();
      await done;
      await wait(400);
      if (source) {
        await win.webContents.debugger.sendCommand(
          "Page.removeScriptToEvaluateOnNewDocument",
          { identifier: seed.identifier }
        );
        win.webContents.debugger.detach();
      }
      if (!broken)
        await until(() =>
          js(`document.querySelectorAll('.journey-tomato').length===16`)
        );
    };
    const open = async (index) => {
      await js(
        `document.querySelectorAll('.journey-tomato')[${index}].click()`
      );
      await until(() =>
        js(`!!document.querySelector('.journey-dialog')`)
      );
    };
    await until(() =>
      js(`document.querySelectorAll('.journey-tomato').length===16`)
    );
    if (phase === "plan") {
      const d = new Date();
      d.setHours(9, 0, 0, 0);
      const rec = (id, count, day) => ({
        id,
        task: {
          id: "synthetic",
          title: "实际合成记录",
          source: "feishu",
          sourceKey: "synthetic",
        },
        startedAt: d.getTime() + day * 86400000,
        endedAt: d.getTime() + day * 86400000 + 4500000,
        plannedSeconds: 1500,
        elapsedSeconds: 4500,
        acceptedSeconds: 4500,
        completedCount: count,
        status: "saved",
        sync: "local",
        cloudSynced: true,
      });
      await reload(
        `localStorage.setItem('pomatez-focus-v1',${JSON.stringify(
          JSON.stringify({
            active: null,
            records: [
              rec("seed-today", 3, 0),
              rec("seed-yesterday", 279, -1),
            ],
          })
        )})`
      );
      assert.equal(
        await js(
          `document.querySelectorAll('.journey-tomato[data-complete="true"]').length`
        ),
        3
      );
      assert.equal(
        await js(`document.querySelector('.stb-from').textContent`),
        "250"
      );
      assert.equal(
        await js(`document.querySelector('.stb-to').textContent`),
        "300"
      );
      checks.push(
        "confirmed records fill 3 outlines, 282 road 250–300"
      );
      await open(3);
      await change('[aria-label="预设番茄任务"]', "plan-row1");
      await click("保存任务", ".journey-dialog button");
      const before = await plan(),
        moved = before.stages[0].slots[3];
      await js(
        `(()=>{const s=document.querySelector('[data-journey-slot="${moved.id}"]'),t=document.querySelectorAll('.journey-stage')[1],dt=new DataTransfer();s.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));t.dispatchEvent(new DragEvent('dragover',{bubbles:true,dataTransfer:dt,cancelable:true}));t.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt,cancelable:true}));s.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}));})()`
      );
      await wait(100);
      const after = await plan();
      assert.deepEqual(
        after.stages.map((s) => s.slots.length),
        [3, 4, 3, 3, 3]
      );
      assert.equal(after.stages[1].slots.at(-1).task.key, "task1");
      assert.equal(after.stages[1].slots.at(-1).id, moved.id);
      checks.push(
        "DOM native DataTransfer drag adjusts 3+4 and preserves stable task"
      );
      assert.equal(
        await js(
          `document.querySelector('.journey-tomato[data-complete="true"]').draggable`
        ),
        false
      );
      const shape = await js(
        `(()=>{const a=document.querySelector('[data-stat="今日番茄"]').getBoundingClientRect(),b=document.querySelector('.journey-card').getBoundingClientRect(),c=document.querySelector('.right-col').getBoundingClientRect();return {same:Math.abs(a.width-b.width)<1,left:Math.abs(a.left-b.left)<1,below:b.top>=a.bottom,width:c.width,overflow:document.documentElement.scrollWidth>innerWidth}})()`
      );
      assert.ok(
        shape.same && shape.left && shape.below && !shape.overflow,
        JSON.stringify(shape)
      );
      checks.push(
        "journey same half-column width below count, outer column preserved"
      );
      await click("休息", ".journey-stage button");
      assert.equal((await plan()).resting, (await plan()).stages[0].id);
      await click("继续", ".journey-stage button");
      assert.equal((await plan()).resting, null);
      checks.push("rest manually entered/continued without clock gate");
      await click("明天", ".journey-heading button");
      await until(() =>
        js(
          `document.querySelector('.journey-heading strong').textContent==='明日旅程'`
        )
      );
      await open(0);
      await change('[aria-label="预设番茄任务"]', "plan-row1");
      await click("保存任务", ".journey-dialog button");
      await open(1);
      await change('[aria-label="预设番茄任务"]', "plan-row2");
      await click("保存任务", ".journey-dialog button");
      assert.equal((await plan()).stages[0].slots[0].task.key, "task1");
      assert.equal((await plan()).stages[0].slots[1].task.key, "task2");
      assert.equal((await stored()).active, null);
      checks.push(
        "tomorrow individual task presets persist without starting timer"
      );
      await click("今天", ".journey-heading button");
      await open(6);
      await click("开始这个番茄", ".journey-dialog button");
      await until(async () => !!(await stored()).active);
      const a = (await stored()).active;
      assert.equal(a.task.id, "plan-row1");
      assert.equal(
        await js(
          `document.querySelectorAll('.journey-tomato[data-active="true"]').length`
        ),
        1
      );
      assert.equal(
        await js(
          `document.querySelectorAll('.journey-tomato[data-complete="true"]').length`
        ),
        3
      );
      await open(6);
      await change('[aria-label="预设番茄任务"]', "plan-row2");
      await click("更换任务", ".journey-dialog button");
      const b = (await stored()).active;
      assert.equal(b.id, a.id);
      assert.equal(b.task.id, "plan-row2");
      assert.equal(b.startedAt, a.startedAt);
      assert.equal(
        await js(
          `document.querySelector('.journey-tomato[data-active="true"]').draggable`
        ),
        false
      );
      checks.push(
        "existing timer starts once and active task replacement preserves session identity, no premature fill"
      );
      await wait(1200);
      await click("结束");
      await click("确认结束");
      await until(() => js(`!!document.querySelector('.review-card')`));
      await click("1", ".quick-counts button");
      await click("记录番茄");
      await until(() =>
        js(
          `document.querySelectorAll('.journey-tomato[data-complete="true"]').length===4`
        )
      );
      assert.equal(
        (await stored()).records.filter((r) => r.id === a.id).length,
        1
      );
      checks.push(
        "actual end confirmation fills one outline, single saved record"
      );
      const beforeFail = await plan();
      await js(
        `window.originalJourneySet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('pomatez-journey-v1:'))throw Error('Synthetic plan quota');return window.originalJourneySet.call(this,k,v)};void 0`
      );
      await click("开始", ".journey-footer button");
      assert.equal((await stored()).active, null);
      await until(() =>
        js(`!!document.querySelector('.journey-error')`)
      );
      assert.match(
        await js(
          `document.querySelector('.journey-error').textContent`
        ),
        /quota/
      );
      assert.deepEqual(await plan(), beforeFail);
      await js(
        `void (Storage.prototype.setItem=window.originalJourneySet)`
      );
      checks.push(
        "plan storage failure preserves plan/history and prevents timer start"
      );
      await click("开始", ".journey-footer button");
      await until(async () => !!(await stored()).active);
      await click("休息", ".journey-stage button");
      const resting = await plan(), paused = (await stored()).active;
      assert.equal(paused.status, "paused");
      await js(`window.originalFocusSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pomatez-focus-v1')throw Error('Synthetic timer quota');return window.originalFocusSet.call(this,k,v)};void 0`);
      await click("继续", ".journey-stage button");
      assert.equal((await stored()).active.status, "paused");
      assert.equal((await plan()).resting, resting.resting);
      assert.deepEqual((await plan()).passed, resting.passed);
      assert.match(await js(`document.querySelector('.journey-error').textContent`), /恢复未保存/);
      await js(`void (Storage.prototype.setItem=window.originalFocusSet)`);
      await click("继续", ".journey-stage button");
      assert.equal((await stored()).active.id, paused.id);
      assert.equal((await stored()).active.status, "active");
      assert.equal((await plan()).resting, null);
      checks.push("timer write failure keeps rest node paused; successful retry resumes same session and continues");
      await wait(500);
      await click("结束");
      await click("确认结束");
      await click("放弃本次");
      await until(async () => (await stored()).active === null);
      assert.equal(
        await js(
          `document.querySelectorAll('.journey-tomato[data-complete="true"]').length`
        ),
        4
      );
      checks.push(
        "discarded unfinished session stays outline, valid storage recovers"
      );
      await click("明天", ".journey-heading button");
      fs.writeFileSync(
        path.join(root, "artifacts/journey-restart-expected.json"),
        JSON.stringify(await plan())
      );
      await click("今天", ".journey-heading button");
      fs.writeFileSync(
        path.join(root, "artifacts/journey-actual.png"),
        (await win.webContents.capturePage()).toPNG()
      );
      const midnight = new Date(); midnight.setDate(midnight.getDate()+1); midnight.setHours(12,0,0,0);
      await js(`{const Base=Date,fixed=${midnight.getTime()};globalThis.Date=class extends Base{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}};void 0`);
      await click("明天", ".journey-heading button");
      await click("今天", ".journey-heading button");
      await open(0); await click("开始这个番茄", ".journey-dialog button");
      assert.equal((await stored()).active,null);
      assert.match(await js(`document.querySelector('.journey-dialog .journey-error').textContent`),/日期已变化/);
      await click("关闭旅程编辑");
      tasks = tasks.map((t,i)=>({...t,id:`midnight-row${i+1}`,planId:`midnight-plan${i+1}`}));
      await click("生成今日番茄");
      await until(()=>js(`!!document.querySelector('[data-task-id="midnight-row1"]') || [...document.querySelectorAll('.chip')].some(b=>b.getAttribute('title')?.includes('合成科研任务1'))`));
      await until(()=>js(`!document.querySelector('.gen-btn').disabled`));
      await open(0); await click("开始这个番茄", ".journey-dialog button");
      await until(async()=>!!(await stored()).active);
      assert.equal((await stored()).active.task.planId,'midnight-plan1');
      await click("结束");await click("确认结束");await click("放弃本次");
      await until(async()=>(await stored()).active===null);
      checks.push("same process day rollover rejects stale task snapshot, explicit refresh starts today's row");
    } else {
      const fixed = new Date();
      fixed.setDate(fixed.getDate() + 1);
      fixed.setHours(12, 0, 0, 0);
      await reload(
        `{const Base=Date,fixed=${fixed.getTime()};globalThis.Date=class extends Base{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}}`
      );
      const expected = JSON.parse(
        fs.readFileSync(
          path.join(root, "artifacts/journey-restart-expected.json"),
          "utf8"
        )
      );
      assert.deepEqual(await plan(), expected);
      assert.equal(
        await js(
          `document.querySelectorAll('.journey-tomato[data-complete="true"]').length`
        ),
        0
      );
      checks.push(
        "new Electron process + next calendar day restores tomorrow plan, excludes yesterday counts"
      );
      await open(0);
      await click("开始这个番茄", ".journey-dialog button");
      await until(async () => !!(await stored()).active);
      assert.equal((await stored()).active.task.planId, "resume-plan1");
      assert.equal((await stored()).active.task.taskId, "task1");
      checks.push(
        "next-day preset resolves current plan row rather than stale prior-day id"
      );
      await click("结束");
      await click("确认结束");
      await click("放弃本次");
      await until(async () => (await stored()).active === null);
      tasks = [];
      await reload(
        `{const Base=Date,fixed=${fixed.getTime()};globalThis.Date=class extends Base{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}}`
      );
      await open(0);
      await click("开始这个番茄", ".journey-dialog button");
      assert.equal((await stored()).active, null);
      assert.match(
        await js(
          `document.querySelector('.journey-dialog .journey-error').textContent`
        ),
        /没有可用番茄/
      );
      await click("关闭旅程编辑");
      checks.push(
        "unavailable preset explicitly rejected without unrelated/free fallback"
      );
      const p = await plan();
      await js(
        `localStorage.setItem('pomatez-journey-v1:synthetic:${p.day}','{bad')`
      );
      await reload(
        `{const Base=Date,fixed=${fixed.getTime()};globalThis.Date=class extends Base{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}}`,
        true
      );
      await until(() =>
        js(
          `document.querySelector('.journey-note')?.textContent.includes('JSON')`
        )
      );
      assert.equal(
        await js(
          `localStorage.getItem('pomatez-journey-v1:synthetic:${p.day}')`
        ),
        "{bad"
      );
      assert.ok((await stored()).records.length >= 3);
      checks.push(
        "corrupt plan preserved, actual history remains available"
      );
    }
    assert.equal(win.isVisible(), false);
    assert.equal(errors.length, 0, errors.join("\n"));
    const metrics = app
      .getAppMetrics()
      .map((m) => ({ pid: m.pid, type: m.type }));
    fs.writeFileSync(
      path.join(root, `artifacts/journey-${phase}-checks.json`),
      JSON.stringify({ phase, checks, metrics }, null, 2)
    );
    console.log(JSON.stringify({ phase, checks }, null, 2));
    clearTimeout(deadline);
    app.exit(0);
  } catch (e) {
    console.error(e);
    clearTimeout(deadline);
    app.exit(1);
  }
});
