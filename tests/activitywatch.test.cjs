const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  http = require("node:http");
const {
  ActivityWatchRest,
  summarize,
  usageQuery,
  validSettings,
  localRequest,
  dayBounds,
  dayKey,
} = require("../app/electron/build/focus/activitywatch");
const dir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "pomo-aw-test-"));
const at = (h = 12, m = 0) => new Date(2026, 9, 7, h, m).getTime();
const event = (start, seconds, site = "bilibili", extra = {}) => ({
  timestamp: new Date(start).toISOString(),
  duration: seconds,
  data: {
    url: `https://www.${site}.com/watch`,
    audible: true,
    ...extra,
  },
});
function fixture() {
  let now = at(),
    seconds = 0,
    broken = false,
    stale = false,
    queries = 0;
  const ids = [
    "aw-watcher-web-edge_TEST",
    "aw-watcher-window_TEST",
    "aw-watcher-afk_TEST",
  ];
  const request = async (endpoint, body) => {
    if (broken) throw Error("disconnected");
    if (endpoint === "/info")
      return { hostname: "TEST", version: "v0.13.2" };
    if (endpoint === "/buckets/")
      return Object.fromEntries(
        ids.map((id, i) => [
          id,
          {
            hostname: "TEST",
            type: ["web.tab.current", "currentwindow", "afkstatus"][i],
            created: new Date(at(0)).toISOString(),
          },
        ])
      );
    if (endpoint.includes("/events?limit=1"))
      return [event(now - (stale ? 200000 : 10000), 1)];
    assert.equal(endpoint, "/query/");
    queries++;
    assert.equal(body.timeperiods.length, 1);
    return [[event(now - seconds * 1000, seconds)]];
  };
  return {
    request,
    now: () => now,
    seconds: (n) => (seconds = n),
    advance: (n) => (now += n),
    disconnect: (v) => (broken = v),
    stale: (v) => (stale = v),
    queries: () => queries,
  };
}
test("disjoint URL intervals clip midnight, split hours and reject spoofed domains", () => {
  const start = at(0),
    end = at(2);
  const result = summarize(
    [
      event(start - 60000, 120),
      event(start, 60),
      event(at(0, 59), 120, "xiaohongshu"),
      event(at(1), 60, "xiaohongshu"),
      event(at(1, 10), 60, "evil", {
        url: "https://bilibili.com.evil.example",
      }),
      event(at(1, 15), 60, "evil", {
        url: "https://evil.example/?bilibili.com",
      }),
      event(at(1, 20), 20, "bilibili", {
        url: "https://space.bilibili.com/user",
      }),
      event(at(2) - 10000, 30),
    ],
    start,
    end
  );
  assert.equal(result.bilibili, 90);
  assert.equal(result.xiaohongshu, 120);
  assert.equal(result.totalSeconds, 210);
  assert.equal(result.hours[0].xiaohongshu, 60);
  assert.equal(result.hours[1].xiaohongshu, 60);
  assert.ok(
    result.sessions.every((s) => !("url" in s) && !("title" in s))
  );
});
test("overlapping different tabs give later tab precedence and never exceed elapsed time", () => {
  const s = at();
  const r = summarize(
    [event(s, 100), event(s + 50000, 100, "xiaohongshu")],
    s,
    s + 200000
  );
  assert.equal(r.bilibili, 50);
  assert.equal(r.xiaohongshu, 100);
  assert.equal(r.totalSeconds, 150);
});
test("native query requires browser foreground and not-afk OR audible, no flood of gaps", () => {
  const query = usageQuery('browser";unknown', "window", "afk").join(
    ""
  );
  assert.ok(query.includes("filter_period_intersect(b,w)"));
  assert.ok(query.includes("period_union(a,audio)"));
  assert.ok(query.includes("filter_period_intersect(b,a)"));
  assert.ok(!query.includes("flood("));
  assert.ok(query.includes('browser\\";unknown'));
  assert.ok(query.includes("msedge.exe"));
});
test("bounded settings reject renderer URL, invalid quota and nonboolean switch", () => {
  assert.deepEqual(
    validSettings({
      quotaMinutes: 60,
      supervise: true,
      url: "https://evil.invalid",
    }),
    { quotaMinutes: 60, supervise: true }
  );
  for (const q of [0, 7, 65, 480, 481, NaN, "60"])
    assert.throws(() =>
      validSettings({ quotaMinutes: q, supervise: true })
    );
  assert.throws(() =>
    validSettings({ quotaMinutes: 60, supervise: "yes" })
  );
});
test("recorded five-minute thresholds, silent wall time, restart dedup and reconnect coalescing", async () => {
  const f = fixture(),
    directory = dir();
  let reminders = 0;
  const monitor = new ActivityWatchRest(
    directory,
    () => {},
    () => reminders++,
    f.request,
    f.now
  );
  f.seconds(3600);
  await monitor.refresh();
  assert.equal(reminders, 0);
  f.seconds(3900);
  let s = await monitor.refresh();
  assert.equal(reminders, 1);
  assert.equal(s.reminder.excessMinutes, 5);
  monitor.acknowledge(s.reminder.key);
  f.advance(600000);
  await monitor.refresh();
  assert.equal(reminders, 1);
  const restarted = new ActivityWatchRest(
    directory,
    () => {},
    () => reminders++,
    f.request,
    f.now
  );
  await restarted.refresh();
  assert.equal(reminders, 1);
  assert.equal(restarted.snapshot().reminder, null);
  f.disconnect(true);
  const broken = await restarted.refresh();
  assert.equal(broken.status, "interrupted");
  assert.equal(broken.usage.totalSeconds, 3900);
  f.seconds(5100);
  f.disconnect(false);
  s = await restarted.refresh();
  assert.equal(reminders, 2);
  assert.equal(s.reminder.excessMinutes, 25);
  f.seconds(5400);
  s = await restarted.refresh();
  assert.equal(reminders, 2);
  assert.equal(s.reminder.excessMinutes, 30);
  const disk = fs.readFileSync(
    path.join(directory, "aw-rest-settings.json"),
    "utf8"
  );
  assert.ok(!disk.includes("https:"));
  assert.ok(!disk.includes("sessions"));
});
test("midnight clears prior day while unavailable and next day starts fresh", async () => {
  const f = fixture(),
    monitor = new ActivityWatchRest(
      dir(),
      () => {},
      () => {},
      f.request,
      f.now
    );
  f.seconds(3900);
  await monitor.refresh();
  f.advance(24 * 3600000);
  f.disconnect(true);
  const missing = await monitor.refresh();
  assert.equal(missing.usage, null);
  assert.equal(missing.reminder, null);
  f.disconnect(false);
  f.seconds(600);
  const fresh = await monitor.refresh();
  assert.equal(fresh.usage.totalSeconds, 600);
  assert.equal(fresh.reminder, null);
});
test("daily and seven-day bounds follow local calendar, not fixed UTC offset", () => {
  assert.equal(dayKey(at()), "2026-10-07");
  assert.equal(dayKey(dayBounds(at(), 7).start), "2026-10-01");
  assert.equal(new Date(dayBounds(at()).start).getHours(), 0);
});

test("before 12 confirmed tomatoes: each five recorded minutes, no wall-time alerts", async () => {
  const f = fixture();
  let alerts = 0;
  const m = new ActivityWatchRest(
    dir(),
    () => {},
    () => alerts++,
    f.request,
    f.now
  );
  m.reportProgress({ day: dayKey(f.now()), completedCount: 11 });
  f.seconds(299.99);
  assert.equal((await m.refresh()).reminder, null);
  for (const seconds of [300, 600, 900]) {
    f.seconds(seconds);
    const s = await m.refresh();
    assert.equal(s.reminder.kind, "focus");
    assert.equal(s.reminder.watchedMinutes, seconds / 60);
    assert.equal(s.reminder.completedCount, 11);
    m.acknowledge(s.reminder.key);
  }
  assert.equal(alerts, 3);
  f.advance(600000);
  await m.refresh();
  assert.equal(alerts, 3);
  f.seconds(1200);
  await m.refresh();
  m.reportProgress({ day: dayKey(f.now()), completedCount: 12 });
  assert.equal(m.snapshot().reminder, null);
  f.seconds(1500);
  await m.refresh();
  assert.equal(alerts, 4);
  m.reportProgress({ day: dayKey(f.now()), completedCount: 11 });
  await m.refresh();
  assert.equal(alerts, 4); // Goal edits do not replay the observed 25-minute step.
  f.seconds(1800);
  assert.equal((await m.refresh()).reminder.kind, "focus");
  assert.equal(alerts, 5);
});

test("12 tomatoes allow quota time; exceed immediately, then 65/70, never duplicate overlapping reasons", async () => {
  const f = fixture();
  let alerts = 0;
  const m = new ActivityWatchRest(
    dir(),
    () => {},
    () => alerts++,
    f.request,
    f.now
  );
  m.reportProgress({ day: dayKey(f.now()), completedCount: 12 });
  f.seconds(3600);
  assert.equal((await m.refresh()).reminder, null);
  f.seconds(3600.01);
  let s = await m.refresh();
  assert.equal(s.reminder.kind, "quota");
  assert.equal(alerts, 1);
  m.acknowledge(s.reminder.key);
  f.seconds(3899.99);
  assert.equal((await m.refresh()).reminder, null);
  f.seconds(3900);
  s = await m.refresh();
  assert.equal(s.reminder.excessMinutes, 5);
  assert.equal(alerts, 2);
  m.acknowledge(s.reminder.key);
  m.reportProgress({ day: dayKey(f.now()), completedCount: 11 });
  f.seconds(4200);
  s = await m.refresh();
  assert.equal(s.reminder.kind, "quota");
  assert.equal(alerts, 3); // Focus + quota same poll is one prompt.
  m.reportProgress({ day: dayKey(f.now()), completedCount: 12 });
  assert.equal(m.snapshot().reminder.key, s.reminder.key); // Still over quota.
});

test("startup waits for genuine progress; rejects invalid/day-stale progress and clears yesterday's goal", async () => {
  const f = fixture();
  const m = new ActivityWatchRest(
    dir(),
    () => {},
    () => {},
    f.request,
    f.now
  );
  f.seconds(300);
  assert.equal((await m.refresh()).reminder, null);
  for (const value of [
    null,
    { day: "2026-10-06", completedCount: 12 },
    { day: dayKey(f.now()), completedCount: -1 },
    { day: dayKey(f.now()), completedCount: 11.5 },
    { day: dayKey(f.now()), completedCount: "12" },
  ])
    assert.throws(() => m.reportProgress(value));
  m.reportProgress({
    day: dayKey(f.now()),
    completedCount: 0,
    url: "https://evil.invalid",
  });
  let s = await m.refresh();
  assert.equal(s.reminder.kind, "focus");
  assert.ok(!JSON.stringify(s.progress).includes("url"));
  m.reportProgress({ day: dayKey(f.now()), completedCount: 12 });
  f.advance(24 * 3600000);
  s = await m.refresh();
  assert.equal(s.progress, null);
  assert.equal(s.reminder, null);
  m.reportProgress({ day: dayKey(f.now()), completedCount: 0 });
  assert.equal((await m.refresh()).reminder.kind, "focus");
});

test("new focus ledger persists, offline reconnect coalesces, disabling/re-enabling rebases", async () => {
  const f = fixture(),
    directory = dir();
  let alerts = 0;
  const create = () =>
    new ActivityWatchRest(
      directory,
      () => {},
      () => alerts++,
      f.request,
      f.now
    );
  let m = create();
  m.reportProgress({ day: dayKey(f.now()), completedCount: 0 });
  f.seconds(300);
  let s = await m.refresh();
  m.acknowledge(s.reminder.key);
  m = create();
  m.reportProgress({ day: dayKey(f.now()), completedCount: 0 });
  assert.equal((await m.refresh()).reminder, null);
  assert.equal(alerts, 1);
  f.disconnect(true);
  f.seconds(1200);
  assert.equal((await m.refresh()).status, "interrupted");
  assert.equal(m.snapshot().reminder, null);
  f.disconnect(false);
  s = await m.refresh();
  assert.equal(alerts, 2);
  assert.equal(s.reminder.watchedMinutes, 20);
  m.configure({ quotaMinutes: 60, supervise: false });
  f.seconds(1500);
  assert.equal((await m.refresh()).reminder, null);
  m.configure({ quotaMinutes: 60, supervise: true });
  assert.equal((await m.refresh()).reminder, null);
  f.seconds(1800);
  assert.equal((await m.refresh()).reminder.kind, "focus");
  assert.equal(alerts, 3);
  const disk = fs.readFileSync(
    path.join(directory, "aw-rest-settings.json"),
    "utf8"
  );
  assert.ok(!disk.includes("completedCount"));
});

test("valid old ledger migrates without retroactive focus prompts; old >60 quota clamps, corrupt new ledger fails closed", async () => {
  const f = fixture();
  for (const quota of [60, 120]) {
    const directory = dir();
    fs.writeFileSync(
      path.join(directory, "aw-rest-settings.json"),
      JSON.stringify({
        settings: { quotaMinutes: quota, supervise: true },
        ledger: { day: dayKey(f.now()), quota, step: 0 },
        last: {
          day: dayKey(f.now()),
          totalSeconds: 900,
          bilibili: 900,
          xiaohongshu: 0,
        },
      })
    );
    const m = new ActivityWatchRest(
      directory,
      () => {},
      () => {},
      f.request,
      f.now
    );
    m.reportProgress({ day: dayKey(f.now()), completedCount: 0 });
    f.seconds(900);
    assert.equal((await m.refresh()).reminder, null);
    assert.equal(m.snapshot().settings.quotaMinutes, 60);
    f.seconds(1200);
    assert.equal((await m.refresh()).reminder.kind, "focus");
    m.acknowledge(m.snapshot().reminder.key);
    const stored = JSON.parse(
      fs.readFileSync(path.join(directory, "aw-rest-settings.json"))
    );
    stored.ledger.focusStep = "corrupt";
    fs.writeFileSync(
      path.join(directory, "aw-rest-settings.json"),
      JSON.stringify(stored)
    );
    const broken = new ActivityWatchRest(
      directory,
      () => {},
      () => {},
      f.request,
      f.now
    );
    broken.reportProgress({ day: dayKey(f.now()), completedCount: 0 });
    f.seconds(1500);
    const s = await broken.refresh();
    assert.equal(s.reminder, null);
    assert.match(s.message, /重新保存设置/);
  }
});
test("an in-flight midnight result is discarded and retried once for today's usage", async () => {
  const f = fixture(),
    directory = dir();
  f.advance(at(23, 59) + 59000 - f.now());
  let queries = 0,
    reminders = 0;
  const request = async (endpoint, body) => {
    if (endpoint !== "/query/") return f.request(endpoint, body);
    queries++;
    if (queries === 1) {
      const yesterday = f.now();
      f.advance(2000);
      return [[event(yesterday - 3900000, 3900)]];
    }
    return [[event(f.now() - 1000, 1)]];
  };
  const monitor = new ActivityWatchRest(
    directory,
    () => {},
    () => reminders++,
    request,
    f.now
  );
  const s = await monitor.refresh();
  assert.equal(queries, 2);
  assert.equal(s.status, "recording");
  assert.equal(s.usage.day, "2026-10-08");
  assert.equal(s.usage.totalSeconds, 1);
  assert.equal(s.reminder, null);
  assert.equal(reminders, 0);
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(directory, "aw-rest-settings.json"))
    ).ledger.day,
    "2026-10-08"
  );
  // Repeated clock jumps remain bounded and publish no stale day.
  let jumps = 0;
  const unstable = new ActivityWatchRest(
    dir(),
    () => {},
    () => reminders++,
    async (endpoint, body) => {
      if (endpoint !== "/query/") return f.request(endpoint, body);
      jumps++;
      const end = f.now();
      f.advance(24 * 3600000);
      return [[event(end - 3900000, 3900)]];
    },
    f.now
  );
  const interrupted = await unstable.refresh();
  assert.equal(jumps, 2);
  assert.equal(interrupted.status, "interrupted");
  assert.equal(interrupted.usage, null);
  assert.equal(interrupted.reminder, null);
  assert.equal(reminders, 0);
});
test("existing invalid ledgers suppress supervision until explicitly repaired; fresh profiles still alert", async () => {
  for (const ledger of [
    undefined,
    { day: "2026-10-07", quota: 60, step: "bad" },
    { day: "bad", quota: 60, step: 1 },
    { day: "2026-10-07", quota: 7, step: 1 },
  ]) {
    const directory = dir(),
      f = fixture();
    fs.writeFileSync(
      path.join(directory, "aw-rest-settings.json"),
      JSON.stringify({
        settings: { quotaMinutes: 60, supervise: true },
        ledger,
      })
    );
    let alerts = 0;
    const monitor = new ActivityWatchRest(
      directory,
      () => {},
      () => alerts++,
      f.request,
      f.now
    );
    f.seconds(3900);
    let s = await monitor.refresh();
    assert.equal(alerts, 0);
    assert.equal(s.reminder, null);
    assert.equal(s.usage.totalSeconds, 3900);
    assert.match(s.message, /重新保存设置/);
    monitor.configure({ quotaMinutes: 60, supervise: true });
    f.seconds(4200);
    s = await monitor.refresh();
    assert.equal(alerts, 1);
    assert.equal(s.reminder.excessMinutes, 10);
  }
  const f = fixture();
  f.seconds(3900);
  const fresh = new ActivityWatchRest(
    dir(),
    () => {},
    () => {},
    f.request,
    f.now
  );
  assert.equal((await fresh.refresh()).reminder.excessMinutes, 5);
});
test("failed persistence clears pending reminders across subsequent polls and explicit repair resumes supervision", async (t) => {
  const directory = dir(),
    f = fixture(),
    temp = path.join(directory, "aw-rest-settings.json.tmp");
  let alerts = 0;
  const monitor = new ActivityWatchRest(
    directory,
    () => {},
    () => alerts++,
    f.request,
    f.now
  );
  f.seconds(3900);
  assert.ok((await monitor.refresh()).reminder);
  fs.mkdirSync(temp);
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  f.seconds(4200);
  let s = await monitor.refresh();
  assert.equal(s.status, "interrupted");
  assert.equal(s.reminder, null);
  s = await monitor.refresh();
  assert.equal(s.status, "recording");
  assert.equal(s.reminder, null);
  assert.match(s.message, /恢复督促/);
  assert.equal(alerts, 1);
  fs.rmSync(temp, { recursive: true });
  monitor.configure({ quotaMinutes: 60, supervise: true });
  f.seconds(4500);
  s = await monitor.refresh();
  assert.equal(alerts, 2);
  assert.equal(s.reminder.excessMinutes, 15);
  // A failed explicit settings save also clears a pending reminder.
  fs.mkdirSync(temp);
  assert.throws(() =>
    monitor.configure({ quotaMinutes: 55, supervise: true })
  );
  s = await monitor.refresh();
  assert.equal(s.settings.quotaMinutes, 60);
  assert.equal(s.reminder, null);
  assert.equal(alerts, 2);
});
test("disabled supervision still records; settings survive restart; invalid settings leave state", async () => {
  const f = fixture(),
    directory = dir();
  let n = 0;
  const monitor = new ActivityWatchRest(
    directory,
    () => {},
    () => n++,
    f.request,
    f.now
  );
  monitor.configure({ quotaMinutes: 10, supervise: false });
  f.seconds(1200);
  await monitor.refresh();
  assert.equal(n, 0);
  assert.equal(monitor.snapshot().usage.totalSeconds, 1200);
  assert.throws(() =>
    monitor.configure({ quotaMinutes: 9, supervise: false })
  );
  assert.equal(monitor.snapshot().settings.quotaMinutes, 10);
  assert.deepEqual(
    new ActivityWatchRest(
      directory,
      () => {},
      () => {},
      f.request,
      f.now
    ).snapshot().settings,
    { quotaMinutes: 10, supervise: false }
  );
  monitor.configure({ quotaMinutes: 10, supervise: true });
  await monitor.refresh();
  assert.equal(n, 0);
  f.seconds(1500);
  await monitor.refresh();
  assert.equal(n, 1);
});
test("freshness checks latest event end rather than a long merged start", async () => {
  const f = fixture();
  const base = f.request;
  const r = (p, b) =>
    p.includes("/events?limit=1")
      ? Promise.resolve([event(f.now() - 1000000, 999)])
      : base(p, b);
  const monitor = new ActivityWatchRest(
    dir(),
    () => {},
    () => {},
    r,
    f.now
  );
  f.seconds(60);
  assert.equal((await monitor.refresh()).status, "recording");
  f.stale(true);
  const stale = new ActivityWatchRest(
    dir(),
    () => {},
    () => {},
    f.request,
    f.now
  );
  assert.equal((await stale.refresh()).status, "interrupted");
});
test("concurrent polling uses one query; no arbitrary statistics scope", async () => {
  const f = fixture(),
    monitor = new ActivityWatchRest(
      dir(),
      () => {},
      () => {},
      f.request,
      f.now
    );
  await Promise.all([
    monitor.refresh(),
    monitor.refresh(),
    monitor.refresh(),
  ]);
  assert.equal(f.queries(), 1);
  await assert.rejects(monitor.statistics("all"));
  await monitor.statistics("week");
  await monitor.statistics("week");
  assert.equal(f.queries(), 2);
});
test("suspend cancels an in-flight result; resume restarts one poll and never alerts from the old generation", async (t) => {
  const f = fixture();
  f.seconds(3900);
  let release,
    delayed = true,
    alerts = 0;
  const request = async (endpoint, body) => {
    if (endpoint === "/query/" && delayed) {
      delayed = false;
      await new Promise((resolve) => (release = resolve));
    }
    return f.request(endpoint, body);
  };
  const monitor = new ActivityWatchRest(
    dir(),
    () => {},
    () => alerts++,
    request,
    f.now
  );
  t.after(() => monitor.stop());
  monitor.start();
  const first = monitor.refresh();
  while (!release)
    await new Promise((resolve) => setImmediate(resolve));
  monitor.suspend();
  release();
  await first;
  assert.equal(alerts, 0);
  assert.equal(monitor.snapshot().status, "interrupted");
  assert.equal(monitor.isRunning(), false);
  monitor.start();
  monitor.start();
  await monitor.refresh();
  assert.equal(alerts, 1);
  assert.equal(f.queries(), 2);
  monitor.stop();
  assert.equal(monitor.isRunning(), false);
});
test("malformed persisted configuration suppresses duplicate alerts and recovers with explicit settings save", async () => {
  const directory = dir(),
    f = fixture();
  fs.writeFileSync(
    path.join(directory, "aw-rest-settings.json"),
    "{broken"
  );
  let n = 0;
  const monitor = new ActivityWatchRest(
    directory,
    () => {},
    () => n++,
    f.request,
    f.now
  );
  f.seconds(4000);
  let s = await monitor.refresh();
  assert.equal(n, 0);
  assert.ok(s.message.includes("读取失败"));
  monitor.configure({ quotaMinutes: 60, supervise: true });
  f.seconds(4300);
  s = await monitor.refresh();
  assert.equal(n, 1);
  assert.equal(s.reminder.excessMinutes, 12); // Actual rounded-up excess, not the old five-minute bucket label.
});
test("fixed loopback transport accepts official JSON and refuses redirects/errors and excessive body", async (t) => {
  const server = http.createServer((req, res) => {
    if (req.url.endsWith("/ok")) {
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.url.endsWith("/redirect")) {
      res.writeHead(302, { Location: "https://evil.invalid" });
      res.end();
      return;
    }
    if (req.url.endsWith("/large")) {
      res.end(" ".repeat(4 * 1024 * 1024 + 1));
      return;
    }
    res.end("not json");
  });
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", resolve)
  );
  t.after(() => server.close());
  const port = server.address().port;
  assert.deepEqual(await localRequest("/ok", undefined, port), {
    ok: true,
  });
  await assert.rejects(localRequest("/redirect", undefined, port));
  await assert.rejects(localRequest("/large", undefined, port));
  await assert.rejects(localRequest("/invalid", undefined, port));
});
