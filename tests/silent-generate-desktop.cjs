// Real hidden Electron main/preload/renderer; synthetic service, no external writes.
// 覆盖「生成今日番茄」分流：当天已有计划 → 后台静默（无进度 UI、界面可操作、
// 有变化轻提示 / 无变化不打扰）；今日计划为空 → 前台进度（逻辑不变）。
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { FocusService } = require("../app/electron/build/focus/service.js");
process.env.POMATEZ_HEADLESS = "1";
process.env.POMATEZ_PROFILE = path.join(
  __dirname,
  "../artifacts/test-profiles",
  randomUUID()
);
const planRow = (n) => ({
  id: `p${n}`,
  planId: `p${n}`,
  taskId: "t1",
  title: `合成任务 · 第 ${n} 个番茄`,
  source: "feishu",
  sourceKey: "synthetic",
  quadrant: "iu",
});
let rows = [planRow(1), planRow(2)];
let genResult = { created: 0, eligibleTasks: 1, blocked: 0 };
let genCalls = 0,
  todayCalls = 0;
let genHold = false,
  genResume;
FocusService.prototype.status = () => ({
  configured: true,
  sourceKey: "synthetic",
});
FocusService.prototype.today = async () => {
  todayCalls++;
  return rows;
};
FocusService.prototype.generateToday = async function () {
  genCalls++;
  this.onGenerateProgress?.({ stage: "connect" });
  this.onGenerateProgress?.({ stage: "plan" });
  if (genHold) await new Promise((resolve) => (genResume = resolve));
  return genResult;
};
require("../app/electron/build/main.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = setTimeout(() => app.exit(2), 30000);
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
    const js = (s) => win.webContents.executeJavaScript(s, true);
    const until = async (f) => {
      for (let i = 0; i < 150; i++) {
        if (await f()) return;
        await wait(30);
      }
      throw Error("Timed out");
    };
    const chipCount = () => js(`document.querySelectorAll('.chip').length`);
    const clickGen = () =>
      js(
        `(()=>{const b=document.querySelector('.gen-btn');if(!b)throw Error('no gen button');if(b.disabled)throw Error('gen button disabled');b.click()})()`
      );

    // ── 场景 1：当日重复生成 = 后台静默，有变化 → 轻提示并合并 ──
    await until(async () => (await chipCount()) === 2);
    genHold = true;
    genResult = { created: 1, eligibleTasks: 1, blocked: 0 };
    rows = [planRow(1), planRow(2), planRow(3)];
    const todayBeforeGen = todayCalls;
    await clickGen();
    await wait(300);
    // 静默期间：无进度条、无 spinner、按钮仍可点、看板可交互
    assert.equal(await js(`!document.querySelector('.gen-progress')`), true);
    assert.equal(await js(`!document.querySelector('.gen-spinner')`), true);
    assert.equal(
      await js(`document.querySelector('.gen-btn').textContent`),
      "生成今日番茄"
    );
    assert.equal(
      await js(`document.querySelector('.gen-btn').disabled`),
      false
    );
    await js(`document.querySelectorAll('.chip')[1].click()`);
    assert.equal(
      await js(`document.querySelectorAll('.chip.selected').length`),
      1
    );
    genResume();
    genHold = false;
    await until(async () => (await chipCount()) === 3);
    await until(() =>
      js(`document.querySelector('.toast')?.textContent.includes('今日番茄已更新')`)
    );
    assert.ok(todayCalls > todayBeforeGen);
    assert.equal(await js(`!document.querySelector('.gen-progress')`), true);

    // ── 场景 2：当日重复生成 = 后台静默，无变化 → 不打扰 ──
    await js(`document.querySelector('.toast-close')?.click()`);
    // 信息 toast 约 3 秒自动消失；先等场景 1 的提示彻底离场
    await until(() => js(`!document.querySelector('.toast')`));
    genResult = { created: 0, eligibleTasks: 1, blocked: 0 };
    const todayBeforeQuiet = todayCalls;
    const callsBeforeQuiet = genCalls;
    await clickGen();
    await until(() => genCalls === callsBeforeQuiet + 1);
    await until(() => todayCalls > todayBeforeQuiet);
    await wait(300);
    assert.equal(await js(`!document.querySelector('.toast')`), true);
    assert.equal(await js(`!document.querySelector('.gen-progress')`), true);

    // ── 场景 3：今日计划为空 = 首次生成，前台进度逻辑不变 ──
    // ⟳ 按钮已并入生成按钮；清空今日计划改用整页重载（初始 refresh 拉空表）
    rows = [];
    await win.webContents.reload();
    await until(() =>
      js(
        `Boolean(document.querySelector('.gen-btn'))&&!document.querySelector('.gen-btn').disabled&&document.querySelectorAll('.chip').length===0`
      )
    );
    genHold = true;
    genResult = { created: 2, eligibleTasks: 1, blocked: 0 };
    await clickGen();
    await until(() =>
      js(`Boolean(document.querySelector('.gen-progress'))`)
    );
    assert.equal(await js(`Boolean(document.querySelector('.gen-spinner'))`), true);
    assert.equal(
      await js(`document.querySelector('.gen-btn').textContent`),
      "生成中…"
    );
    assert.equal(
      await js(`document.querySelector('.gen-btn').disabled`),
      true
    );
    rows = [planRow(1), planRow(2)];
    genResume();
    genHold = false;
    await until(async () => (await chipCount()) === 2);
    await until(() =>
      js(`document.querySelector('.toast')?.textContent.includes('已生成 2 个今日番茄')`)
    );
    assert.equal(await js(`!document.querySelector('.gen-progress')`), true);

    assert.equal(win.isVisible(), false);
    const result = {
      passed: 3,
      checks: [
        "repeat generate runs silently: no progress UI, board stays interactive, change merges with light notice",
        "repeat generate without changes stays quiet",
        "first generation of the day keeps the foreground progress flow",
      ],
    };
    fs.writeFileSync(
      path.join(__dirname, "../artifacts/silent-generate-test.json"),
      JSON.stringify(result, null, 2)
    );
    console.log(JSON.stringify(result));
    clearTimeout(deadline);
    app.exit(0);
  } catch (e) {
    console.error(e.stack);
    clearTimeout(deadline);
    app.exit(1);
  }
});
