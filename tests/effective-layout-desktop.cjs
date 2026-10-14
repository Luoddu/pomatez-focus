// P0-POMO-058: node tests/effective-layout-desktop.cjs
// Renderer-only fixture: no production main/preload, real profile, Feishu or AW.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const dependencyRoot = process.env.POMATEZ_TEST_DEPENDENCIES ||
  (fs.existsSync(path.join(root, "node_modules/react")) ? root : path.resolve(root, "../pomatez-focus"));
const dependency = name => require(require.resolve(name, { paths: [dependencyRoot] }));

if (!process.versions.electron) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(dependency("electron"), [__filename], {
    cwd: root, env, windowsHide: true, stdio: "inherit", timeout: 60000,
  });
  if (result.error) throw result.error;
  process.exit(result.status === null ? 1 : result.status);
}

const { app, BrowserWindow, session } = require("electron");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "pomatez-effective-fixture-"));
app.setPath("userData", profile);
app.setPath("sessionData", profile);
app.commandLine.appendSwitch("disable-background-networking");
app.disableHardwareAcceleration();
const checks = [];
const errors = [];
const requests = [];
const check = (name, fn) => { fn(); checks.push(name); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const deadline = setTimeout(() => app.exit(2), 45000);

// Four-source precheck is also a handoff receipt, without touching shared docs.
const precheck = {
  current: "HistoryPanel integer count-up, week/milestone totals; ResearchGoal raw researchWeeks; portrait paired panels",
  official: "No adoption/upgrade or third-party semantic change; existing React hooks/CSS grid and esbuild buildSync API",
  helpers: "weights, classification.recordCategory, researchWeeks, weekgoal, crossedFlags; Learning.md no weight-specific lesson",
  acceptance: "tests/portrait-desktop.cjs, research.test.mjs, weekgoal.test.mjs; old paired-panel assertion superseded here",
  baseline: "Isolated source snapshot on task/p0-pomo-058-effective-tomatoes, initially unborn HEAD; no Git commits by UI subtask",
  resources: "One hidden renderer-only window; fresh OS-temp profile; no ports/services/database or real profile",
};

app.whenReady().then(async () => {
  // Browser sessions deny every external request even if a future child component attempts one.
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const external = /^(https?|wss?):/.test(details.url);
    if (external) requests.push(details.url);
    callback({ cancel: external });
  });
  const focus = path.join(root, "app/renderer/src/focus").replace(/\\/g, "/");
  const source = `
    import React from 'react';
    import ReactDOM from 'react-dom';
    import HistoryPanel from ${JSON.stringify(focus + "/components/HistoryPanel.tsx")};
    import WeightSettings from ${JSON.stringify(focus + "/components/WeightSettings.tsx")};
    import { DEFAULT_WEIGHTS, formatEffective, saveWeights } from ${JSON.stringify(focus + "/weights.js")};
    import { weekKeyOf } from ${JSON.stringify(focus + "/weekgoal.ts")};
    import { researchWeeks } from ${JSON.stringify(focus + "/research.ts")};
    const now = Date.parse('2026-10-14T12:00:00+08:00');
    Date.now = () => now;
    // Also freeze new Date(), used by the original integer today projection.
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    };
    const store = new Map();
    Object.defineProperty(window, 'localStorage', { value: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key),
    }});
    localStorage.setItem('pomatez-focus-weekgoal-v1', JSON.stringify({[weekKeyOf(now)]:15}));
    localStorage.setItem('pomatez-focus-research-weekgoal-v1', JSON.stringify({[weekKeyOf(now)]:8}));
    if (!crypto.randomUUID) crypto.randomUUID = () => "fixture-" + Math.random().toString(36).slice(2);
    const events = {week:[], milestone:[], buttons:[]};
    const call = name => () => events.buttons.push(name);
    const record = (id, count, category, overrides={}) => ({
      id, task:{id, title:'Fixture '+id, source:'local', projectType:category, quadrant:'inu'},
      startedAt:now-3600000, endedAt:now-1800000, plannedSeconds:1500,
      elapsedSeconds:count*1500, acceptedSeconds:count*1500, completedCount:count,
      status:'saved', sync:'local', ...overrides,
    });
    const state = {
      records:[record('research',8,'research'),record('misc',10,'misc')],
      weights:{...DEFAULT_WEIGHTS,misc:0.6},
    };
    const props = {
      pendingCount:0,canSync:true,syncBusy:false,onSync:call('sync'),tasks:[],
      onAddManual:call('manual'),onEdit:call('edit'),onRecolor:call('recolor'),
      onGenerate:call('generate'),refreshedLabel:'',generating:false,genStageText:'',
      genPercent:0,genFailed:false,refreshBusy:false,settingsOpen:false,
      onToggleSettings:call('settings'),onToggleCompact:call('compact'),onOpenStats:call('stats'),
      onWeekGoalMet:(...args)=>events.week.push(args),onMilestone:n=>events.milestone.push(n),
      restState:{settings:{quotaMinutes:60,supervise:true,pomodoroGoal:12,reminderMinutes:5},
        progress:null,usage:null,status:'interrupted',message:'Fixture only',updatedAt:null,reminder:null},
      journey:{scope:'fixture',ready:true,active:null,restLog:null,restAction:call('rest'),
        restWindow:()=>({startedAt:null,endedAt:now}),saveRestBackfill:call('rest-backfill'),
        begin:call('begin'),change:()=>true,pause:call('pause'),resume:call('resume')},
    };
    const render = () => ReactDOM.render(<HistoryPanel {...props} {...state}/>,document.getElementById('app'));
    const mountWeights = () => ReactDOM.render(<WeightSettings weights={state.weights || DEFAULT_WEIGHTS} loadError=""
      onSave={next=>{state.weights=saveWeights(localStorage,next);render();mountWeights();}}/>,document.getElementById('weight-settings'));
    window.fixture = {events,state,record,formatEffective,researchWeeks,
      mountWeights,
      update:(patch)=>{Object.assign(state,patch);render();},
      remount:()=>{ReactDOM.unmountComponentAtNode(document.getElementById('app'));render();},
      snapshot:()=>JSON.stringify(state.records)};
    render();
  `;
  const bundle = dependency("esbuild").buildSync({
    absWorkingDir: root, stdin: { contents: source, resolveDir: root, loader: "tsx" },
    nodePaths: [path.join(dependencyRoot, "node_modules")],
    bundle: true, write: false, platform: "browser", format: "iife",
    define: { "process.env.NODE_ENV": '"production"' },
  }).outputFiles[0].text;
  const css = fs.readFileSync(path.join(focus, "focus.css"), "utf8");
  const html = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:"><style>${css}</style><style>@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style><div id="app"></div><div id="weight-settings" class="settings-col"></div><script>${bundle.replace(/<\/script/gi, "<\\/script")}</script>`;
  const win = new BrowserWindow({
    show: false, width: 1600, height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  win.on("show", () => errors.push("Unexpected visible window"));
  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 3) errors.push(message);
  });
  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  const js = code => win.webContents.executeJavaScript(code, true);
  win.webContents.debugger.attach("1.3");
  const resize = async (width, height) => {
    win.setContentSize(width, height);
    // Hidden native windows may defer renderer resize events. Drive the actual
    // CSS viewport explicitly, then assert its size before testing geometry.
    await win.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: false,
    });
    await wait(80);
    assert.deepEqual(await js("[innerWidth,innerHeight]"), [width,height]);
  };
  const screenshots = [];
  const capture = async filename => {
    assert.equal(win.isVisible(), false);
    win.webContents.invalidate();
    await wait(120);
    const clip = filename === "effective-portrait.png" ? {x:0,y:0,width:await js("innerWidth"),height:Math.ceil(await js("document.querySelector('.right-col').getBoundingClientRect().bottom"))} : undefined;
    const image = await win.webContents.capturePage(clip, {
      stayHidden: true, stayAwake: true,
    });
    assert.equal(image.isEmpty(), false, filename + " capture is empty");
    const destination = path.join(root, "artifacts", filename);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, image.toPNG());
    screenshots.push(destination);
    assert.equal(win.isVisible(), false);
  };
  await resize(1600,900);
  await wait(750);
  const original = await js("fixture.snapshot()");
  const values = () => js(`({
    today:document.querySelector('[data-stat="今日番茄"] strong').textContent,
    time:document.querySelector('[data-stat="今日专注时长"] strong').textContent,
    actual:document.querySelector('.actual-tomatoes')?.textContent??null,
    label:document.querySelector('[data-stat="今日番茄"] > span').textContent,
    tier:document.querySelector('[data-stat="今日番茄"] strong').getAttribute('data-tier'),
    week:document.querySelector('.weekgoal:not(.research-weekgoal) .wg-now').textContent,
    weekMet:document.querySelector('.weekgoal:not(.research-weekgoal) .weekgoal-chip').classList.contains('met'),
    research:document.querySelector('.research-goal .wg-now').textContent,
    researchMet:document.querySelector('.research-goal').classList.contains('met'),
    events:fixture.events,
  })`);
  let value = await values();
  check("8 research + 10 misc at 0.6 = 14; effective primary and raw secondary; time preserved; goal 15 blocked", () => {
    assert.equal(value.today, "14"); assert.equal(value.label, "有效番茄"); assert.equal(value.actual, "今日番茄：18"); assert.equal(value.tier, "high");
    assert.equal(value.time, "7 小时 30 分钟"); assert.equal(value.week, "14");
    assert.equal(value.weekMet, false); assert.equal(value.research, "8");
    assert.deepEqual(value.events.week, []);
  });
  await resize(1080,1840);
  await capture("effective-portrait.png");
  await resize(1600,900);
  await js("fixture.update({weights:undefined})"); await wait(50); value = await values();
  check("optional weights preserve all-one behavior without goal celebration", () => {
    assert.equal(value.week, "18"); assert.equal(value.weekMet, true);
    assert.equal(value.actual, null); assert.equal(value.today, "18"); assert.equal(value.label, "今日番茄"); assert.equal(value.tier, "high"); assert.deepEqual(value.events.week, []);
  });
  await js("fixture.update({weights:{research:0.58,delivery:1,longterm:1,software:1,personal:1,misc:0,unclassified:1}})");
  await wait(50); value = await values();
  check("zero coefficient still shows effective row; fractional research stays fractional", () => {
    assert.equal(value.today, "4.64"); assert.equal(value.actual, "今日番茄：18"); assert.equal(value.label, "有效番茄"); assert.equal(value.tier, null);
    assert.equal(value.research, "4.64"); assert.equal(value.researchMet, false);
  });
  await js("fixture.update({records:[fixture.record('research',50,'research')]})"); await wait(700);
  value = await values();
  check("research exact integer boundary avoids floating point undercount", () => {
    assert.equal(value.research, "29");
  });
  await js("fixture.update({records:[fixture.record('misc',40,'misc')],weights:{...fixture.state.weights,research:1,misc:0.6}})");
  await wait(700);
  const baseline = await js("JSON.parse(JSON.stringify(fixture.events))");
  await js("fixture.update({weights:{...fixture.state.weights,misc:1}})"); await wait(50);
  const changedEvents = await js("fixture.events");
  check("weight change across 25 milestone does not replay historical rewards", () => {
    assert.deepEqual(changedEvents, baseline);
  });
  await js("fixture.update({weights:{...fixture.state.weights,misc:0.6}})"); await wait(50);
  await js("fixture.update({weights:{...fixture.state.weights},records:[fixture.record('misc',42,'misc')]})");
  await wait(700);
  const newMilestones = await js("fixture.events.milestone");
  check("new records still cross milestones; equivalent weight objects do not reset baseline", () => {
    assert.deepEqual(newMilestones.slice(baseline.milestone.length), [25]);
  });
  await js("fixture.update({records:[fixture.record('research',8,'research'),fixture.record('misc',10,'misc')],weights:{...fixture.state.weights,misc:0.6}})");
  await js("fixture.remount()");
  await wait(700);
  const weekBefore = await js("fixture.events.week.length");
  await js("fixture.update({records:[...fixture.state.records,fixture.record('new',1,'research')]})");
  await wait(700);
  const weekAfter = await js("fixture.events.week.length");
  check("new saved tomato reaches goal 15 and celebrates once", () => {
    assert.equal(weekAfter, weekBefore + 1);
  });
  await js("fixture.update({weights:{...fixture.state.weights}})"); await wait(50);
  assert.equal(await js("fixture.events.week.length"), weekBefore + 1);
  await js("fixture.update({records:JSON.parse(" + JSON.stringify(original) + ")})"); await wait(700);
  const rawAfter = await js("fixture.snapshot()");
  check("source records unchanged and two-decimal formatting trims trailing zeroes", () => {
    assert.equal(rawAfter, original);
  });
  assert.deepEqual(await js("[0,1,1.2,1.23,1.234,0.1+0.2].map(fixture.formatEffective)"), ["0","1","1.2","1.23","1.23","0.3"]);

  // Open the scientific settings before resizing: state must survive every media-query switch.
  await js("[...document.querySelectorAll('.scientific-rest button')].find(b=>b.textContent.includes('设置')).click()");
  const layout = () => js(`(()=>{
    const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const rc=document.querySelector('.right-col');
    return {rc:rect('.right-col'),calendar:rect('.calendar-section'),today:rect('[data-stat="今日番茄"]'),time:rect('[data-stat="今日专注时长"]'),rest:rect('.scientific-rest'),journey:rect('.journey-card'),records:rect('.records-section'),
      viewport:[innerWidth,innerHeight],display:getComputedStyle(rc).display,minHeight:getComputedStyle(rc).minHeight,
      overflow:rc.scrollWidth>rc.clientWidth+2,restCount:document.querySelectorAll('.scientific-rest').length,
      settings:!!document.querySelector('.rest-view-settings'),statColumns:getComputedStyle(document.querySelector('.stat-grid')).gridTemplateColumns};
  })()`);
  for (const [width, height] of [[1080,1840],[900,700],[720,1000],[390,844]]) {
    await resize(width,height);
    const l = await layout();
    check(`portrait/narrow ${width}x${height}: right calendar, left stats/rest/journey, no padded blank space`, () => {
      assert.equal(l.display,"grid"); assert.equal(l.minHeight,"0px");
      assert.ok(Math.abs(l.calendar.width-(l.rc.width-10)/2)<2,JSON.stringify(l));
      assert.ok(l.calendar.x>=l.rest.right-1,JSON.stringify(l));
      assert.ok(Math.abs(l.today.y-l.calendar.y)<2,JSON.stringify(l));
      assert.ok(Math.abs(l.today.y-l.time.y)<2,JSON.stringify(l));
      assert.ok(l.rest.y>=Math.max(l.today.bottom,l.time.bottom)-1,JSON.stringify(l));
      assert.ok(l.journey.y>=Math.max(l.today.bottom,l.time.bottom,l.rest.bottom)-1,JSON.stringify(l));
      assert.ok(Math.abs(l.journey.width-(l.rc.width-10)/2)<2,JSON.stringify(l));
      assert.ok(l.records.y>=Math.max(l.journey.bottom,l.calendar.bottom)-1,JSON.stringify(l));
      assert.equal(l.overflow,false); assert.equal(l.restCount,1); assert.equal(l.settings,true);
    });
  }
  await resize(1600,900); const wide = await layout();
  check("wide screen retains original stacked right column and two-column stats; rest state survives", () => {
    assert.equal(wide.display,"flex",JSON.stringify(wide)); assert.equal(wide.restCount,1); assert.equal(wide.settings,true);
    assert.equal(wide.statColumns.split(" ").length,2);
    assert.ok(wide.rest.y>=wide.journey.bottom-1,JSON.stringify(wide));
  });
  await js("fixture.update({weights:undefined});fixture.mountWeights()"); await wait(50);
  const beforeSave = await values();
  await js("[...document.querySelectorAll('.s-weights button')].find(b=>b.textContent==='杂事按 0.6').click()");
  assert.equal((await values()).actual,null);
  await js("[...document.querySelectorAll('.s-weights button')].find(b=>b.textContent==='保存比例').click()");
  await wait(50); const saved = await values();
  const stored = await js("JSON.parse(localStorage.getItem('pomatez-focus-tomato-weights-v1'))");
  check("real WeightSettings shortcut applies only on save: raw 18 to effective 14, no celebration replay", () => {
    assert.equal(beforeSave.today,"18"); assert.equal(beforeSave.week,"18");
    assert.equal(saved.today,"14"); assert.equal(saved.label,"有效番茄"); assert.equal(saved.week,"14");
    assert.equal(saved.actual,"今日番茄：18"); assert.equal(saved.tier,"high"); assert.equal(stored.weights.misc,0.6);
    assert.deepEqual(saved.events.week,beforeSave.events.week);
    assert.deepEqual(saved.events.milestone,beforeSave.events.milestone);
  });
  const weightLayout = () => js(`({
    columns:getComputedStyle(document.querySelector('.weight-fields')).gridTemplateColumns.split(' ').length,
    dots:[...document.querySelectorAll('.weight-field i')].every(e=>getComputedStyle(e).borderRadius==='50%'),
    inputHeight:document.querySelector('.weight-field input').getBoundingClientRect().height,
    overflow:document.querySelector('.s-weights').scrollWidth>document.querySelector('.s-weights').clientWidth+2,
  })`);
  const wideFields = await weightLayout();
  // Capture the actual saved WeightSettings UI without unmounting HistoryPanel
  // or ScientificRest. Restore the fixture's visibility/scroll for later checks.
  const captureScroll = await js("[scrollX,scrollY]");
  await js("document.getElementById('app').style.display='none';window.scrollTo(0,0)");
  try {
    await capture("effective-settings.png");
  } finally {
    await js(`document.getElementById('app').style.display='';window.scrollTo(${captureScroll[0]},${captureScroll[1]})`);
  }
  await resize(390,844); const narrowFields = await weightLayout();
  check("weight settings use compact two-column rows with round color dots; narrow view uses one column", () => {
    assert.equal(wideFields.columns,2); assert.equal(narrowFields.columns,1);
    assert.equal(wideFields.dots,true); assert.equal(narrowFields.dots,true);
    assert.equal(wideFields.inputHeight,34); assert.equal(narrowFields.overflow,false);
  });
  await js("[...document.querySelectorAll('.s-weights button')].find(b=>b.textContent==='全部按 1').click();[...document.querySelectorAll('.s-weights button')].find(b=>b.textContent==='保存比例').click()");
  await wait(50); const allOne = await values();
  check("saving all-one weights restores single raw count without duplicate goal celebration", () => {
    assert.equal(allOne.today,"18"); assert.equal(allOne.week,"18"); assert.equal(allOne.actual,null);
    assert.deepEqual(allOne.events.week,saved.events.week);
  });
  for (const label of ["专注统计","生成今日番茄","设置","切换小窗","手动同步"]) {
    await js(`document.querySelector('button[aria-label="${label}"]').click()`);
  }
  const clicked = await js("fixture.events.buttons");
  check("overview and sync buttons retain callbacks; no real network or visible window", () => {
    assert.deepEqual(clicked, ["stats","generate","settings","compact","sync"]);
    assert.equal(win.isVisible(),false); assert.deepEqual(requests,[]); assert.deepEqual(errors,[]);
  });
  console.log(JSON.stringify({passed:checks.length,checks,precheck,profile,screenshots,learning:"none: reuses existing derived-view and responsive-layout patterns"},null,2));
  clearTimeout(deadline); win.destroy(); app.quit();
}).catch(error => {
  console.error(error.stack); clearTimeout(deadline); app.exit(1);
});
