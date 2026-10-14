// P0-POMO-059: node --test tests/effective-stats.test.cjs
// Pure helpers + synthetic in-memory DOM. No Electron/main/profile/Feishu/network.
const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const esbuild = require("esbuild");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");
const focus = path.join(root, "app/renderer/src/focus").replace(/\\/g, "/");
const source = `
  export * from ${JSON.stringify(focus + "/weights.js")};
  export * from ${JSON.stringify(focus + "/stats.ts")};
  export * from ${JSON.stringify(focus + "/shareCard.ts")};
  export * from ${JSON.stringify(focus + "/research.ts")};
  export { default as StatsPanel } from ${JSON.stringify(focus + "/components/StatsPanel.tsx")};
  export { default as HeatmapCalendar } from ${JSON.stringify(focus + "/components/HeatmapCalendar.tsx")};
  export { default as TodayTimeHeatmap } from ${JSON.stringify(focus + "/components/TodayTimeHeatmap.tsx")};
`;
const compiled = esbuild.buildSync({
  absWorkingDir: root, stdin: { contents: source, resolveDir: root, loader: "ts" },
  bundle: true, platform: "node", format: "cjs", write: false,
  external: ["react", "react-dom", "react-dom/server"],
}).outputFiles[0].text;
const virtualModule = new Module(path.join(__dirname, ".effective-stats-memory.cjs"), module);
virtualModule.filename = path.join(__dirname, ".effective-stats-memory.cjs");
virtualModule.paths = Module._nodeModulePaths(__dirname);
virtualModule._compile(compiled, virtualModule.filename);
const {
  DEFAULT_WEIGHTS, effectiveRecords, effectiveCount, formatEffective,
  rangeOf, inRange, summarize, categoryBuckets, barBuckets, annualHeatmap,
  halfHourMatrix, currentStreak, topTasks, focusDurationTrend,
  shareCardModel, drawShareCard, heatTier,
  researchWeeks, researchGoal,
  StatsPanel, HeatmapCalendar, TodayTimeHeatmap,
} = virtualModule.exports;
const NativeDate = Date;
const at = (day, hour = 9, minute = 0) => new NativeDate(2026, 9, day, hour, minute).getTime();
const NOW = at(14, 18);
const RANGE = rangeOf("week", NOW);
const weights = { ...DEFAULT_WEIGHTS, misc: 0.6 };
const record = (day, count, category, extra = {}) => ({
  id: `fixture-${day}-${category}-${count}`,
  task: { id: `fixture-${category}`, title: `Fixture ${category}`, source: "local", projectType: category, quadrant: "inu" },
  startedAt: at(day), endedAt: at(day) + 1500000,
  plannedSeconds: 1500, elapsedSeconds: 1500, acceptedSeconds: 1500,
  completedCount: count, status: "saved", sync: "local", ...extra,
});
const mixed = [record(12, 8, "research"), record(14, 10, "misc")];
const sum = values => values.reduce((total, value) => total + value, 0);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const deepFreeze = value => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
let React, ReactDOM, act, dom;
const previousGlobals = new Map();
const drawn = [];
const fakeContext = () => new Proxy({
  measureText: text => ({ width: String(text).length * 12 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  fillText: (text, x, y) => drawn.push({ text: String(text), x, y }),
}, { get: (target, key) => key in target ? target[key] : () => {} });
before(() => {
  // JSDOM does not load external resources; all renderer APIs are fixture-only.
  dom = new JSDOM('<!doctype html><div id="fixture"></div>', { url: "https://fixture.invalid/", pretendToBeVisual: true });
  // Node's native MessageChannel leaves React16's browser scheduler ports alive.
  // Use the browser fixture's environment and its ordinary timeout fallback.
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, MessageChannel: undefined })) {
    previousGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  globalThis.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [NOW])); }
    static now() { return NOW; }
  };
  dom.window.Date = globalThis.Date;
  dom.window.HTMLCanvasElement.prototype.getContext = () => fakeContext();
  dom.window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,Zml4dHVyZQ==";
  dom.window.__SHARE_CARD_HOOK__ = true;
  React = require("react");
  ReactDOM = require("react-dom");
  act = require("react-dom/test-utils").act;
});
afterEach(() => {
  act(() => { ReactDOM.unmountComponentAtNode(document.getElementById("fixture")); });
  drawn.length = 0;
  localStorage.clear();
});
after(() => {
  dom.window.close();
  globalThis.Date = NativeDate;
  for (const [key, descriptor] of previousGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});
const render = (Component, props) => act(() => { ReactDOM.render(React.createElement(Component, props), document.getElementById("fixture")); });
const click = element => {
  assert.ok(element, "missing fixture button/cell");
  act(() => { element.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
};
const metric = label => [...document.querySelectorAll(".st-row")]
  .find(row => row.querySelector(".st-label")?.textContent === label)?.querySelector("strong")?.textContent;
const statsProps = (records, weights) => ({ records, weights, onClose() {}, settingsOpen: false, onToggleSettings() {}, onToggleCompact() {} });

test("projection preserves source bytes, identity fields, real seconds and times; saved counts alone are effective", () => {
  const raw = deepFreeze([...mixed, record(14, 99, "misc", { status: "active" })]);
  const before = JSON.stringify(raw);
  const projected = effectiveRecords(raw, weights);
  assert.deepEqual(projected.map(r => r.completedCount), [8, 6, 0]);
  assert.notEqual(projected, raw);
  projected.forEach((r, index) => {
    assert.notEqual(r, raw[index]);
    for (const key of ["id", "startedAt", "endedAt", "acceptedSeconds", "elapsedSeconds", "plannedSeconds", "task"]) assert.equal(r[key], raw[index][key]);
  });
  assert.equal(JSON.stringify(raw), before);
});

test("mixed 8 + 10*0.6 gives 14 everywhere, daily misc 6; category totals and share agree once", () => {
  const projected = effectiveRecords(mixed, weights);
  const summary = summarize(inRange(projected, RANGE));
  const buckets = categoryBuckets(projected, RANGE, NOW);
  const today = buckets.find(b => b.isToday);
  const share = shareCardModel(mixed, RANGE, NOW, weights);
  assert.equal(summary.count, 14); assert.equal(today.count, 6);
  assert.equal(today.categories.find(c => c.category === "misc").count, 6);
  for (const bucket of buckets) assert.equal(sum(bucket.categories.map(c => c.count)), bucket.count);
  assert.equal(share.count, 14); assert.equal(share.totalAll, 14); assert.equal(share.seconds, 3000);
  assert.equal(sum(share.buckets.map(b => b.count)), 14);
  assert.equal(sum(share.quads.map(q => q.count)), 14);
  near(sum(share.heat.flat()), 14);
});

test("fractional research 4.64 appears in summary, average, bars and share drawing without integer rounding", () => {
  const raw = [record(14, 8, "research")];
  const w = { ...DEFAULT_WEIGHTS, research: 0.58 };
  render(StatsPanel, statsProps(raw, w));
  assert.equal(metric("番茄"), "4.64"); assert.equal(metric("日均番茄"), "4.64");
  assert.equal(document.querySelector(".bar-val").textContent, "4.64");
  const share = shareCardModel(raw, RANGE, NOW, w);
  assert.equal(share.count, 4.64); assert.equal(share.quads.find(q => q.key === "inu").count, 4.64);
  drawShareCard(document.createElement("canvas"), share);
  assert.ok(drawn.some(item => item.text === "4.64"));
  assert.ok(drawn.some(item => item.text.includes("累计收获 4.64")));
  assert.ok(drawn.some(item => item.text.includes("还差 5.36")));
});

test("counts >=10 remain fractional in stats total/bar titles and canvas: 14.4 stays 14.4", () => {
  const raw = [record(14, 8, "research"), record(14, 10, "misc")];
  const w = { ...DEFAULT_WEIGHTS, misc: 0.64 };
  render(StatsPanel, statsProps(raw, w));
  assert.equal(metric("番茄"), "14.4");
  assert.equal(document.querySelector(".bar-val").textContent, "14.4");
  assert.ok(document.querySelector(".bar.today[title]").title.includes("14.4 个番茄"));
  click([...document.querySelectorAll("button")].find(b => b.textContent === "分享"));
  assert.ok(drawn.some(item => item.text === "14.4"));
});

test("zero weights keep actual duration/active days, yield no harvest, streak, heat or milestone", () => {
  const w = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map(k => [k, 0]));
  const projected = effectiveRecords(mixed, w);
  const summary = summarize(projected);
  assert.equal(summary.count, 0); assert.equal(summary.seconds, 3000); assert.equal(summary.activeDays, 2);
  assert.equal(currentStreak(projected, NOW), 0);
  assert.equal(sum(halfHourMatrix(projected, RANGE).rows.flat()), 0);
  const model = shareCardModel(mixed, RANGE, NOW, w);
  assert.equal(model.count, 0); assert.equal(model.totalAll, 0); assert.equal(model.seconds, 3000);
  assert.equal(model.milestoneReached, 0); assert.equal(model.bestDayLabel, null);
  render(StatsPanel, statsProps(mixed, w));
  assert.equal(metric("番茄"), "0"); assert.equal(metric("专注时长"), "50 分钟");
  assert.equal(document.querySelector(".stats-empty"), null);
});

test("all-one/omitted weights preserve original count/duration/category/heat/share values", () => {
  const projected = effectiveRecords(mixed);
  assert.deepEqual(projected, mixed);
  assert.deepEqual(summarize(projected), summarize(mixed));
  assert.deepEqual(halfHourMatrix(projected, RANGE), halfHourMatrix(mixed, RANGE));
  assert.deepEqual(categoryBuckets(projected, RANGE, NOW), categoryBuckets(mixed, RANGE, NOW));
  assert.deepEqual(shareCardModel(mixed, RANGE, NOW), shareCardModel(mixed, RANGE, NOW, DEFAULT_WEIGHTS));
  render(StatsPanel, statsProps(mixed)); assert.equal(metric("番茄"), "18");
});

test("0.29 repeated three/100 times sums exactly 0.87/29 across summary, day/month/year/categories/share", () => {
  const w = { ...DEFAULT_WEIGHTS, misc: 0.29 };
  for (const [length, expected] of [[3, 0.87], [100, 29]]) {
    const raw = Array.from({ length }, (_, index) => record(14, 1, "misc", { id: `cent-${index}` }));
    const projected = effectiveRecords(raw, w);
    assert.equal(summarize(projected).count, expected);
    assert.equal(summarize(projected).bestDay.count, expected);
    for (const key of ["week", "month", "quarter", "year"]) {
      const range = rangeOf(key, NOW);
      assert.equal(sum(barBuckets(projected, range, NOW).map(b => b.count)), expected);
      assert.equal(sum(categoryBuckets(projected, range, NOW).map(b => b.categories.find(c => c.category === "misc").count)), expected);
      const model = shareCardModel(raw, range, NOW, w);
      assert.equal(model.count, expected); assert.equal(model.totalAll, expected);
      assert.equal(sum(model.quads.map(q => q.count)), expected);
    }
    assert.equal(annualHeatmap(projected, 2026).find(c => c.date === at(14, 0)).count, expected);
    assert.equal(topTasks(projected)[0].count, expected);
    render(HeatmapCalendar, { records: raw, weights: w });
    assert.equal(document.querySelector(".hm-cell.today").textContent, formatEffective(expected));
  }
});

test("cent threshold normalization keeps exact milestone 10 from 100 records at 0.1", () => {
  const raw = Array.from({ length: 100 }, () => record(14, 1, "misc"));
  const model = shareCardModel(raw, RANGE, NOW, { ...DEFAULT_WEIGHTS, misc: 0.1 });
  assert.equal(model.count, 10); assert.equal(model.totalAll, 10); assert.equal(model.milestoneReached, 10);
  assert.equal(heatTier(0.9999999999999999), heatTier(1));
});

test("projected 50 research at 0.58 reaches research goal 29 exactly without binary undercount", () => {
  const raw = deepFreeze([record(14, 50, "research")]);
  const before = JSON.stringify(raw);
  const projected = effectiveRecords(raw, { ...DEFAULT_WEIGHTS, research: 0.58 });
  const current = researchWeeks(projected, NOW, 1)[0];
  const goal = researchGoal(NOW, { [current.key]: 29 });
  assert.equal(current.count, 29);
  assert.equal(goal, 29);
  assert.equal(current.count >= goal, true);
  assert.equal(current.seconds, raw[0].acceptedSeconds);
  assert.equal(JSON.stringify(raw), before);
});

test("classification overrides determine effective category mass and keep original category/color metadata", () => {
  const raw = [record(14, 10, "research", { colorOverride: "misc" }), record(14, 2, "misc", { colorOverride: "research" })];
  const projected = effectiveRecords(raw, weights);
  const bucket = categoryBuckets(projected, RANGE, NOW).find(b => b.isToday);
  assert.equal(bucket.count, 8);
  assert.equal(bucket.categories.find(c => c.category === "misc").count, 6);
  assert.equal(bucket.categories.find(c => c.category === "research").count, 2);
  assert.equal(projected[0].colorOverride, "misc");
  assert.equal(projected[0].task.projectType, "research");
  assert.equal(shareCardModel(raw, RANGE, NOW, weights).count, bucket.count);
});

test("month calendar, fractional tiers and embedded today heat use effective counts exactly once", () => {
  render(HeatmapCalendar, { records: mixed, weights, goals: {} });
  const today = document.querySelector(".hm-cell.today");
  assert.equal(today.dataset.count, "6"); assert.equal(today.textContent, "6");
  assert.ok([...document.querySelectorAll(".hm-week-total")].some(node => node.textContent === "14"));
  near(sum([...document.querySelectorAll(".today-heatmap-cell")].map(node => Number(node.dataset.count))), 6);
  render(HeatmapCalendar, { records: [record(14, 1, "misc")], weights: { ...weights, misc: 0.29 } });
  const fraction = document.querySelector(".hm-cell.today");
  assert.equal(fraction.textContent, "0.29"); assert.ok(fraction.classList.contains("hm-t1"));
  assert.equal(document.querySelector('.today-heatmap-cell[data-slot="18"]').title, "09:00–09:30 · 0.29 个番茄");
});

test("today heat distributes weighted mass across original real time boundaries", () => {
  const raw = [record(14, 10, "misc", { startedAt: at(14, 9, 15), endedAt: at(14, 10, 15), acceptedSeconds: 3600 })];
  const before = JSON.stringify(raw);
  render(TodayTimeHeatmap, { records: raw, weights });
  for (const [slot, count] of [[18, 1.5], [19, 3], [20, 1.5]]) {
    const cell = document.querySelector(`.today-heatmap-cell[data-slot="${slot}"]`);
    assert.equal(Number(cell.dataset.count), count); assert.ok(cell.title.includes(`${count} 个番茄`));
  }
  assert.equal(JSON.stringify(raw), before);
  assert.deepEqual(focusDurationTrend(effectiveRecords(raw, weights), NOW), focusDurationTrend(raw, NOW));
});

test("real StatsPanel category colors, weight-change rerender and share callback use raw input only once", () => {
  const before = JSON.stringify(mixed);
  render(StatsPanel, statsProps(mixed, weights));
  click([...document.querySelectorAll(".harvest-switch button")].find(b => b.textContent === "分类"));
  const miscSegment = document.querySelector('.bar-segment[data-category="misc"]');
  assert.ok(miscSegment.title.includes("6 个")); assert.ok(miscSegment.style.background);
  click([...document.querySelectorAll("button")].find(b => b.textContent === "分享"));
  assert.ok(drawn.some(item => item.text === "14")); // double weighting would yield 11.6
  assert.equal(window.__shareCardPng, "data:image/png;base64,Zml4dHVyZQ==");
  render(StatsPanel, statsProps(mixed, DEFAULT_WEIGHTS));
  assert.equal(metric("番茄"), "18");
  render(StatsPanel, statsProps(mixed, { ...weights, misc: 0 }));
  assert.equal(metric("番茄"), "8"); assert.equal(metric("专注时长"), "50 分钟");
  assert.equal(JSON.stringify(mixed), before);
});

test("four-source handoff: narrow writes, existing helpers, no external adoption or runtime side effects", () => {
  const statsSource = fs.readFileSync(path.join(focus, "components/StatsPanel.tsx"), "utf8");
  assert.ok(statsSource.includes("shareCardModel(records, range, now, weights)"));
  assert.ok(statsSource.includes("records={displayedRecords}"));
  // Current: P0-POMO-059 / baseline 3a93524; task-specific source read.
  // Official: no adoption/upgrade; existing React16 + fixed local esbuild public API.
  // Helpers/Learning: weights projection/classification/stats/shareCard; no applicable new Learning.
  // Acceptance: weights.test.mjs, stats.test.mjs, share-card.test.mjs; this fixture.
  // Expanded scope: stats.ts only targeted hundredths addition; timing/scheduling untouched.
  // Rollback: restore these UI/stat files; raw records require no migration.
});
