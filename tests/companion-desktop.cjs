// Real hidden Electron/main/preload/renderer, isolated synthetic data only.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const { randomUUID } = require("node:crypto");
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  __dirname,
  "../artifacts/test-profiles",
  randomUUID()
);
const {
  FocusService,
} = require("../app/electron/build/focus/service.js");
const sourceKey = "a".repeat(64);
const task = {
  id: "plan-1",
  planId: "plan-1",
  taskId: "task-1",
  title: "Synthetic research · 第 1 个番茄",
  source: "feishu",
  sourceKey,
  quadrant: "iu",
  projectType: "research",
  description: "Synthetic description",
  plannedToday: 1,
  doneToday: 0,
};
const now = Date.now();
let records = [
  {
    id: randomUUID(),
    task,
    status: "saved",
    sync: "synced",
    cloudSynced: true,
    startedAt: now - 3600000,
    endedAt: now - 600000,
    acceptedSeconds: 3000,
    elapsedSeconds: 3000,
    plannedSeconds: 1500,
    completedCount: 2,
  },
];
let notes = [],
  journalCalls = 0,
  releaseJournal,
  journalMode = "fail";
let releaseSync,
  syncMode = "hold",
  archiveCount = 0;
FocusService.prototype.status = () => ({ configured: true, sourceKey });
FocusService.prototype.today = async () => [task];
FocusService.prototype.history = async () => ({
  sourceKey,
  records,
  missing: 0,
});
FocusService.prototype.dailyReviews = async () => ({
  sourceKey,
  summaries: {},
});
FocusService.prototype.journal = async () => ({ sourceKey, notes });
FocusService.prototype.saveJournal = async (value) => {
  journalCalls++;
  if (journalMode !== "instant")
    await new Promise((r) => {
      releaseJournal = r;
    });
  if (journalMode === "fail") throw Error("Synthetic diary offline");
  const note = { ...value, synced: true };
  if (!notes.some((n) => n.id === note.id)) notes.push(note);
  return note;
};
FocusService.prototype.backupHistory = () => ({ saved: true });
FocusService.prototype.sync = async () => {
  if (syncMode === "hold")
    await new Promise((r) => {
      releaseSync = r;
    });
  if (syncMode === "fail") throw Error("Synthetic focus offline");
  return { synced: true, planId: task.planId };
};
FocusService.prototype.archiveHistory = async (record) => {
  archiveCount++;
  const saved = { ...record, cloudSynced: true };
  records = [...records.filter((r) => r.id !== record.id), saved];
  return saved;
};
require("../app/electron/build/main.js");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const timeout = setTimeout(() => app.exit(2), 100000);
app.whenReady().then(async () => {
  const checks = [];
  try {
    let win;
    for (let i = 0; i < 200; i++) {
      win = BrowserWindow.getAllWindows()[0];
      if (
        win &&
        !win.webContents.isLoadingMainFrame() &&
        win.webContents.getURL().startsWith("file:")
      )
        break;
      await delay(40);
    }
    assert.ok(win);
    assert.equal(win.isVisible(), false);
    let shown = false;
    win.on("show", () => (shown = true));
    win.webContents.debugger.attach("1.3");
    await win.webContents.debugger.sendCommand("Page.enable");
    const capture = async (name) => {
      await delay(400);
      const shot = await win.webContents.debugger.sendCommand(
        "Page.captureScreenshot",
        {
          format: "png",
          fromSurface: true,
          captureBeyondViewport: false,
        }
      );
      fs.writeFileSync(
        path.join(__dirname, "../artifacts/" + name + ".png"),
        Buffer.from(shot.data, "base64")
      );
    };
    const js = async (s) => {
      try {
        return await win.webContents.executeJavaScript(s, true);
      } catch (e) {
        console.error("Renderer expression:", s);
        throw e;
      }
    };
    const until = async (s) => {
      for (let n = 0; n < 200; n++) {
        if (await (typeof s === "function" ? s() : js(s))) return;
        await delay(30);
      }
      throw Error("Timed out: " + s);
    };
    const click = (label) =>
      js(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(
          label
        )}||b.textContent.trim()===${JSON.stringify(
          label
        )});if(!b||b.disabled)throw Error('Unavailable '+${JSON.stringify(
          label
        )});b.click()})()`
      );
    const set = (selector, value, kind = "input") =>
      js(
        `(()=>{const e=document.querySelector(${JSON.stringify(
          selector
        )});if(!e)throw Error('Missing field');const proto=e instanceof HTMLSelectElement?HTMLSelectElement.prototype:e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(
          String(value)
        )});e.dispatchEvent(new Event(${JSON.stringify(
          kind
        )},{bubbles:true}));})()`
      );
    const stored = () =>
      js("JSON.parse(localStorage.getItem('pomatez-focus-v1'))");
    const journal = () =>
      js(
        "JSON.parse(localStorage.getItem('pomatez-farm-journal-v1')||'[]')"
      );
    const abandon = async () => {
      await click("结束");
      await click("确认结束");
      await until(
        "!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('放弃'))"
      );
      await js(
        "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('放弃')).click()"
      );
      await until("!!document.querySelector('.scarecrow-speech')");
    };
    await until(
      "!!document.querySelector('.research-goal') && document.querySelector('.research-goal').textContent.includes('2/')"
    );
    win.setContentSize(1440, 1100);
    assert.equal(
      await js(
        "document.querySelector('.research-goals-title').querySelector('.weekgoal').classList.contains('research-weekgoal')"
      ),
      true
    );
    const fills = await js(
      "[...document.querySelectorAll('.research-goals-title .wg-fill')].map(e=>getComputedStyle(e).backgroundColor)"
    );
    assert.match(fills[0], /207, 81, 69/);
    assert.match(fills[1], /209, 154, 34/);
    checks.push("research first/red and overall gold");
    assert.equal(
      await js(
        "document.querySelectorAll('.hm-holiday').length>0 && document.querySelectorAll('.hm-makeup').length>0"
      ),
      true
    );
    checks.push("calendar holiday and makeup distinguish");
    // Failed upload keeps the locally saved note and waits for an explicit retry.
    await js("document.querySelector('.scarecrow-speech').click()");
    await set(
      '[aria-label="随手记内容"]',
      "<img src=x onerror=alert(1)> Synthetic diary"
    );
    await click("记下来");
    await until(() => !!releaseJournal);
    const noteId = (await journal())[0].id;
    assert.equal((await journal())[0].synced, false);
    assert.equal(notes.length, 0);
    releaseJournal();
    releaseJournal = null;
    await until(
      "document.querySelector('.farm-journal [role=alert]')?.textContent.includes('Synthetic diary offline')"
    );
    await delay(250);
    assert.equal(journalCalls, 1);
    journalMode = "instant";
    await click("同步日记 (1)");
    await until(async () => (await journal())[0].synced);
    assert.equal(notes.length, 1);
    assert.equal(notes[0].id, noteId);
    assert.equal(
      await js(
        "document.querySelectorAll('.journal-notes img').length"
      ),
      0
    );
    checks.push(
      "journal persists before cloud, failure no polling, same UUID retry, escaped text"
    );
    // Unmount the board while an upload is pending; its late receipt must survive.
    journalMode = "hold";
    await set(
      '[aria-label="随手记内容"]',
      "Synthetic diary during focus"
    );
    await click("记下来");
    await until(() => !!releaseJournal);
    assert.equal((await journal()).length, 2);
    await click("开始专注");
    await until(async () => !!(await stored()).active);
    releaseJournal();
    releaseJournal = null;
    await until(async () => (await journal()).every((n) => n.synced));
    journalMode = "instant";
    await abandon();
    await js("document.querySelector('.scarecrow-speech').click()");
    await until(
      "document.querySelectorAll('.journal-notes article').length===2"
    );
    assert.equal(notes.length, 2);
    await js(
      "document.querySelector('.farm-journal').scrollIntoView({block:'center'})"
    );
    await capture("companion-journal");
    checks.push(
      "start while journal syncing, board remount preserves late receipt"
    );
    // Supplement classification is local immediately and travels in the existing snapshot.
    await click("补记");
    await set("#manual-task", task.id, "change");
    await set("#manual-category", "research", "change");
    await click("保存补记");
    await until(() => !!releaseSync);
    const saved = (await stored()).records.find((r) => !r.cloudSynced);
    assert.equal(saved.colorOverride, "research");
    assert.equal(saved.colorRevision, 1);
    assert.equal(saved.task.planId, task.planId);
    assert.equal(saved.acceptedSeconds, 1500);
    assert.ok(
      await js(
        "Number(document.querySelector('.harvest-sync [role=progressbar]').getAttribute('aria-valuenow'))<100"
      )
    );
    await js("document.querySelector('.quad-iu .chip').click()");
    await click("开始专注");
    await until(
      async () => (await stored()).active?.task.planId === task.planId
    );
    assert.equal(
      await js("!!document.querySelector('.harvest-sync.busy')"),
      true
    );
    releaseSync();
    releaseSync = null;
    syncMode = "instant";
    await until(
      "document.querySelector('.harvest-sync.done [role=progressbar]')?.getAttribute('aria-valuenow')==='100'"
    );
    assert.equal(archiveCount, 1);
    assert.equal(
      records.find((r) => r.id === saved.id).colorOverride,
      "research"
    );
    assert.equal((await stored()).active.task.planId, task.planId);
    await abandon();
    checks.push(
      "supplement category local/cloud unchanged accounting, true receipt progress, focus remains usable"
    );
    // A failed focus write never gives a done animation and retains the original row.
    syncMode = "fail";
    await click("补记");
    await set("#manual-task", task.id, "change");
    await click("保存补记");
    await until("!!document.querySelector('.harvest-sync.error')");
    assert.equal(
      await js("!!document.querySelector('.harvest-sync.done')"),
      false
    );
    assert.equal(
      (await stored()).records.filter((r) => !r.cloudSynced).length,
      1
    );
    syncMode = "instant";
    await js(
      "document.querySelector('.harvest-sync.error button').click()"
    );
    await until(async () =>
      (await stored()).records.every((r) => r.cloudSynced)
    );
    checks.push(
      "failed focus upload retains row; explicit retry does not duplicate"
    );
    // Small-screen controls remain reachable by scrolling.
    win.setContentSize(480, 640);
    await click("补记");
    await delay(200);
    const geometry = await js(
      "(()=>{const b=[...document.querySelectorAll('.manual-form button')].find(b=>b.textContent==='保存补记');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {reachable:b.contains(hit),overflow:document.documentElement.scrollWidth>innerWidth+1}})()"
    );
    assert.equal(geometry.reachable, true, JSON.stringify(geometry));
    assert.equal(geometry.overflow, false);
    await click("取消");
    win.setContentSize(1440, 1100);
    checks.push(
      "small-screen supplement save reachable with no horizontal overflow"
    );
    await click("统计");
    await until("!!document.querySelector('.routine-panel')");
    assert.equal(
      await js(
        "document.querySelectorAll('[data-zone=morning]').length"
      ),
      21
    );
    assert.equal(
      await js("document.querySelectorAll('[data-zone=rest]').length"),
      119
    );
    assert.match(
      await js("document.querySelector('.routine-panel').textContent"),
      /暂停不计入/
    );
    await js(
      "document.querySelector('.routine-panel').scrollIntoView({block:'center'})"
    );
    await capture("companion-stats");
    checks.push("stats morning/rest partitions and holiday rest text");
    await click("返回");
    await until("!!document.querySelector('.farm-scarecrow')");
    const url = new URL(win.webContents.getURL());
    url.searchParams.set(
      "farmNow",
      String(Date.parse("2026-10-03T01:00:00Z"))
    );
    await win.loadURL(url.href);
    await until(
      "document.querySelector('.farm-scarecrow')?.getAttribute('data-festive')==='true'"
    );
    assert.equal(
      await js(
        "document.querySelector('.farm-scarecrow').getAttribute('data-season')"
      ),
      "autumn"
    );
    assert.equal(
      await js(
        "document.querySelector('.farm-scarecrow').getAttribute('data-night')"
      ),
      "false"
    );
    assert.match(
      await js(
        "document.querySelector('.scarecrow-speech').textContent"
      ),
      /休息/
    );
    checks.push(
      "autumn/holiday/day scarecrow and safe holiday invitation"
    );
    // Fresh CDP screenshots; renderer state assertions are separate from visual QA.
    await capture("companion-board");
    notes.push({
      id: randomUUID(),
      sourceKey,
      at: Date.parse("2026-09-15T01:00:00Z"),
      author: "澄",
      text: "Synthetic Cheng prompt <b>plain text</b>",
      synced: true,
    });
    url.searchParams.set(
      "farmNow",
      String(Date.parse("2026-09-15T01:00:00Z"))
    );
    await win.loadURL(url.href);
    await until(
      "document.querySelector('.scarecrow-speech')?.textContent.includes('Synthetic Cheng prompt')"
    );
    assert.equal(
      await js(
        "document.querySelectorAll('.scarecrow-speech b').length"
      ),
      0
    );
    checks.push(
      "same-Base current-day Cheng prompt read as plain text"
    );
    url.searchParams.set(
      "farmNow",
      String(Date.parse("2026-09-15T16:00:00Z"))
    );
    await win.loadURL(url.href);
    await until(
      "document.querySelector('.farm-scarecrow')?.getAttribute('data-night')==='true'"
    );
    assert.match(
      await js(
        "document.querySelector('.scarecrow-speech').textContent"
      ),
      /睡|休息/
    );
    assert.doesNotMatch(
      await js(
        "document.querySelector('.scarecrow-speech').textContent"
      ),
      /Synthetic Cheng prompt/
    );
    await until("document.querySelector('.farm-companion')!==null");
    await delay(400);
    checks.push("night sleep guidance");
    await js("document.querySelector('.scarecrow-speech').click()");
    journalMode = "fail";
    await set('[aria-label="随手记内容"]', 'Synthetic offline note one');
    await click('记下来'); await until(() => !!releaseJournal);
    await set('[aria-label="随手记内容"]', 'Synthetic offline note two');
    await click('记下来');
    const callsBeforeFailure = journalCalls;
    releaseJournal(); releaseJournal = null;
    await until("document.querySelector('.farm-journal [role=alert]')?.textContent.includes('Synthetic diary offline')");
    await delay(400); assert.equal(journalCalls, callsBeforeFailure);
    assert.equal((await journal()).filter(n => !n.synced).length, 2);
    journalMode = 'instant'; await click('同步日记 (2)');
    await until(async () => (await journal()).every(n => n.synced));
    assert.equal(new Set(notes.map(n => n.id)).size, notes.length);
    checks.push('multiple pending notes do not cause a failed-first-row retry loop; explicit retry drains once');
    assert.equal(shown, false);
    const result = {
      passed: checks.length,
      checks,
      hidden: true,
      synthetic: true,
    };
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/companion-desktop.json"),
      JSON.stringify(result, null, 2)
    );
    console.log(JSON.stringify(result));
    clearTimeout(timeout);
    app.exit(0);
  } catch (e) {
    console.error(e.stack);
    clearTimeout(timeout);
    app.exit(1);
  }
});
