import http from "http";
import fs from "fs";
import path from "path";

type Site = "bilibili" | "xiaohongshu";
export type RestSettings = {
  quotaMinutes: number;
  supervise: boolean;
  pomodoroGoal: number;
  reminderMinutes: number;
};
type Interval = { start: number; end: number; site: Site };
export type Usage = {
  day: string;
  start: number;
  end: number;
  totalSeconds: number;
  bilibili: number;
  xiaohongshu: number;
  hours: { hour: number; bilibili: number; xiaohongshu: number }[];
  sessions: Interval[];
  coverageStart: number | null;
};
export type RestState = {
  settings: RestSettings;
  progress: { day: string; completedCount: number } | null;
  usage: Usage | null;
  status: "connecting" | "recording" | "interrupted";
  message: string;
  updatedAt: number | null;
  reminder: {
    key: string;
    excessMinutes: number;
    kind: "focus" | "quota";
    watchedMinutes: number;
    completedCount: number | null;
  } | null;
};
export const POLL_MS = 30000;
const MAX_RESPONSE = 4 * 1024 * 1024;
const EDGE_APPS = [
  "msedge.exe",
  "Microsoft Edge",
  "Microsoft Edge Beta",
  "Microsoft-Edge-Stable",
  "Microsoft-edge",
  "microsoft-edge",
  "microsoft-edge-beta",
  "microsoft-edge-dev",
];
export const dayKey = (value: number) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};
export function dayBounds(now: number, days = 1) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start: start.getTime(), end: now };
}
export function validSettings(value: any): RestSettings {
  if (
    !value ||
    typeof value.supervise !== "boolean" ||
    !Number.isInteger(value.quotaMinutes) ||
    value.quotaMinutes < 5 ||
    value.quotaMinutes > 480 ||
    value.quotaMinutes % 5
  )
    throw Error("额度须为 5–480 分钟，按 5 分钟调整");
  const pomodoroGoal =
    value.pomodoroGoal === undefined ? 12 : value.pomodoroGoal;
  const reminderMinutes =
    value.reminderMinutes === undefined ? 5 : value.reminderMinutes;
  if (
    !Number.isInteger(pomodoroGoal) ||
    pomodoroGoal < 0 ||
    pomodoroGoal > 60
  )
    throw Error("番茄目标须为 0–60 个整数，0 表示仅按额度提醒");
  if (
    !Number.isInteger(reminderMinutes) ||
    reminderMinutes < 1 ||
    reminderMinutes > 60
  )
    throw Error("提醒间隔须为 1–60 分钟的整数");
  return {
    quotaMinutes: value.quotaMinutes,
    supervise: value.supervise,
    pomodoroGoal,
    reminderMinutes,
  };
}
function siteOf(data: any): Site | null {
  // Use the actual URL as well as the official query's registered-domain filter.
  try {
    const u = new URL(data?.url);
    if (!["https:", "http:"].includes(u.protocol)) return null;
    const h = u.hostname.toLowerCase().replace(/\.$/, "");
    if (h === "bilibili.com" || h.endsWith(".bilibili.com"))
      return "bilibili";
    if (h === "xiaohongshu.com" || h.endsWith(".xiaohongshu.com"))
      return "xiaohongshu";
  } catch (_) {}
  return null;
}
// Disjoint intervals prevent duplicated watcher records or AFK intersections
// from counting twice. If tab transitions overlap, the later tab wins.
export function summarize(
  events: any[],
  start: number,
  end: number,
  coverageStart: number | null = null
): Usage {
  const intervals: Interval[] = [];
  for (const ev of events) {
    const site = siteOf(ev?.data),
      t = Date.parse(ev?.timestamp),
      seconds = ev?.duration;
    if (
      !site ||
      !Number.isFinite(t) ||
      typeof seconds !== "number" ||
      !Number.isFinite(seconds) ||
      seconds <= 0
    )
      continue;
    const s = Math.max(t, start),
      e = Math.min(t + seconds * 1000, end);
    if (e > s) intervals.push({ start: s, end: e, site });
  }
  const points = intervals
    .flatMap((item, id) => [
      { t: item.start, id, add: true },
      { t: item.end, id, add: false },
    ])
    .sort((a, b) => a.t - b.t || Number(a.add) - Number(b.add));
  const active = new Map<number, Interval>(),
    sessions: Interval[] = [];
  let previous = start;
  for (let i = 0; i < points.length; ) {
    const t = points[i].t;
    if (t > previous && active.size) {
      const winner = Array.from(active.entries()).sort(
        (a, b) => b[1].start - a[1].start || b[0] - a[0]
      )[0][1];
      const last = sessions[sessions.length - 1];
      if (last?.site === winner.site && last.end === previous)
        last.end = t;
      else
        sessions.push({ start: previous, end: t, site: winner.site });
    }
    while (i < points.length && points[i].t === t) {
      const p = points[i++];
      if (p.add) active.set(p.id, intervals[p.id]);
      else active.delete(p.id);
    }
    previous = t;
  }
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    bilibili: 0,
    xiaohongshu: 0,
  }));
  const result: Usage = {
    day: dayKey(end),
    start,
    end,
    totalSeconds: 0,
    bilibili: 0,
    xiaohongshu: 0,
    hours,
    sessions,
    coverageStart,
  };
  for (const session of sessions) {
    const seconds = (session.end - session.start) / 1000;
    result[session.site] += seconds;
    result.totalSeconds += seconds;
    let t = session.start;
    while (t < session.end) {
      const next = new Date(t);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      const e = Math.min(session.end, Math.max(t + 1, next.getTime()));
      hours[new Date(t).getHours()][session.site] += (e - t) / 1000;
      t = e;
    }
  }
  return result;
}
export function usageQuery(
  browser: string,
  window: string,
  afk: string
) {
  const q = (s: string) => JSON.stringify(s);
  return [
    `b=query_bucket(${q(browser)});`,
    "b=split_url_events(b);",
    'b=filter_keyvals(b,"$domain",["bilibili.com","xiaohongshu.com"]);',
    `w=query_bucket(${q(window)});`,
    `w=filter_keyvals(w,"app",${JSON.stringify(EDGE_APPS)});`,
    "b=filter_period_intersect(b,w);",
    `a=query_bucket(${q(afk)});`,
    'a=filter_keyvals(a,"status",["not-afk"]);',
    'audio=filter_keyvals(b,"audible",[true]);',
    "a=period_union(a,audio);",
    "b=filter_period_intersect(b,a);",
    "RETURN=b;",
  ];
}
// Fixed local official endpoints. No credentials, redirects, arbitrary URL or
// query script is exposed to the renderer.
export function localRequest(
  endpoint: string,
  body?: any,
  port = 5600
): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload =
      body === undefined
        ? undefined
        : Buffer.from(JSON.stringify(body), "utf8");
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/0${endpoint}`,
        method: payload ? "POST" : "GET",
        headers: payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": payload.length,
            }
          : {},
      },
      (res) => {
        let size = 0;
        const chunks: Buffer[] = [];
        if (res.statusCode !== 200) {
          res.resume();
          reject(Error("ActivityWatch 接口不可用"));
          return;
        }
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_RESPONSE) req.destroy(Error("统计响应过大"));
          else chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (_) {
            reject(Error("统计响应无效"));
          }
        });
        res.on("error", reject);
      }
    );
    const deadline = setTimeout(
      () => req.destroy(Error("ActivityWatch 连接超时")),
      8000
    );
    req.on("close", () => clearTimeout(deadline));
    req.on("error", () => reject(Error("ActivityWatch 未连接")));
    req.end(payload);
  });
}
export class ActivityWatchRest {
  private file: string;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private generation = 0;
  private busy: Promise<RestState> | null = null;
  private busyGeneration = 0;
  private failures = 0;
  private ledger = {
    day: "",
    quota: 60,
    interval: 5,
    step: 0,
    focusStep: 0,
    quotaCrossed: false,
  };
  private storageOk = true;
  private week: Usage | null = null;
  private weekBusy: Promise<Usage> | null = null;
  private bucketIds: {
    browser: string;
    window: string;
    afk: string;
  } | null = null;
  private coverageStart: number | null = null;
  private state: RestState = {
    settings: {
      quotaMinutes: 60,
      supervise: true,
      pomodoroGoal: 12,
      reminderMinutes: 5,
    },
    progress: null,
    usage: null,
    status: "connecting",
    message: "正在连接本机 ActivityWatch",
    updatedAt: null,
    reminder: null,
  };
  constructor(
    directory: string,
    private onState: (state: RestState) => void = () => {},
    private onReminder: () => void = () => {},
    private request = localRequest,
    private now = Date.now
  ) {
    this.file = path.join(directory, "aw-rest-settings.json");
    if (fs.existsSync(this.file)) {
      try {
        const stored = JSON.parse(fs.readFileSync(this.file, "utf8"));
        const oldQuota = stored.settings?.quotaMinutes;
        // Previous releases allowed up to 480; only valid old settings migrate.
        if (
          !Number.isInteger(oldQuota) ||
          oldQuota < 5 ||
          oldQuota > 480 ||
          oldQuota % 5
        )
          throw Error("旧额度无效");
        this.state.settings = validSettings({
          ...stored.settings,
          quotaMinutes: oldQuota,
        });
        if (
          typeof stored.ledger?.day === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(stored.ledger.day) &&
          Number.isSafeInteger(stored.ledger.step) &&
          stored.ledger.step >= 0 &&
          Number.isInteger(stored.ledger.quota) &&
          stored.ledger.quota >= 5 &&
          stored.ledger.quota <= 480 &&
          stored.ledger.quota % 5 === 0
        ) {
          const old = stored.ledger;
          const oldInterval =
            old.interval === undefined ? 5 : old.interval;
          if (
            !Number.isInteger(oldInterval) ||
            oldInterval < 1 ||
            oldInterval > 60
          )
            throw Error("提醒间隔账本无效");
          const legacy =
            old.focusStep === undefined &&
            old.quotaCrossed === undefined;
          if (
            !legacy &&
            (!Number.isSafeInteger(old.focusStep) ||
              old.focusStep < 0 ||
              typeof old.quotaCrossed !== "boolean")
          )
            throw Error("提醒账本无效");
          const total =
            stored.last?.day === old.day &&
            Number.isFinite(stored.last.totalSeconds) &&
            stored.last.totalSeconds >= 0
              ? stored.last.totalSeconds
              : 0;
          const quota = this.state.settings.quotaMinutes;
          const interval = this.state.settings.reminderMinutes;
          const rebase =
            old.quota !== quota || oldInterval !== interval;
          this.ledger = {
            day: old.day,
            quota,
            interval,
            step: !rebase
              ? old.step
              : Math.max(
                  0,
                  Math.floor((total - quota * 60) / (interval * 60))
                ),
            focusStep:
              legacy || rebase
                ? Math.floor(total / (interval * 60))
                : old.focusStep,
            quotaCrossed:
              legacy || rebase
                ? old.step > 0 || total > quota * 60
                : old.quotaCrossed,
          };
        } else throw Error("提醒账本无效");
        // Only aggregate daily totals are retained, never browser URLs/titles.
        if (
          stored.last?.day === dayKey(this.now()) &&
          [
            stored.last.totalSeconds,
            stored.last.bilibili,
            stored.last.xiaohongshu,
          ].every((n: any) => Number.isFinite(n) && n >= 0)
        )
          this.state.usage = {
            ...summarize([], dayBounds(this.now()).start, this.now()),
            ...stored.last,
          };
      } catch (_) {
        this.storageOk = false;
        this.state.message = "额度设置读取失败，请重新保存设置";
      }
    }
  }
  snapshot() {
    return JSON.parse(JSON.stringify(this.state)) as RestState;
  }
  private emit() {
    this.onState(this.snapshot());
  }
  private save() {
    const u = this.state.usage;
    const last = u
      ? {
          day: u.day,
          totalSeconds: u.totalSeconds,
          bilibili: u.bilibili,
          xiaohongshu: u.xiaohongshu,
        }
      : null;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = this.file + ".tmp";
    fs.writeFileSync(
      temp,
      JSON.stringify({
        settings: this.state.settings,
        ledger: this.ledger,
        last,
      }),
      { mode: 0o600 }
    );
    fs.renameSync(temp, this.file);
    this.storageOk = true;
  }
  configure(value: any) {
    const settings = validSettings(value),
      before = this.snapshot(),
      ledger = { ...this.ledger };
    this.state.settings = settings;
    this.state.reminder = null;
    const u = this.state.usage;
    this.ledger = {
      day: dayKey(this.now()),
      quota: settings.quotaMinutes,
      interval: settings.reminderMinutes,
      focusStep:
        u?.day === dayKey(this.now())
          ? Math.floor(u.totalSeconds / (settings.reminderMinutes * 60))
          : 0,
      quotaCrossed:
        u?.day === dayKey(this.now()) &&
        u.totalSeconds > settings.quotaMinutes * 60,
      step:
        u?.day === dayKey(this.now())
          ? Math.max(
              0,
              Math.floor(
                (u.totalSeconds - settings.quotaMinutes * 60) /
                  (settings.reminderMinutes * 60)
              )
            )
          : 0,
    };
    try {
      this.save();
    } catch (_) {
      this.state = before;
      this.ledger = ledger;
      this.storageOk = false;
      this.state.reminder = null;
      this.state.message = "提醒状态保存失败，请重新保存设置以恢复督促";
      this.emit();
      throw Error("额度设置未保存，请重试");
    }
    this.emit();
    return this.snapshot();
  }
  acknowledge(key: any) {
    if (typeof key !== "string" || key.length > 100)
      throw Error("提醒标识无效");
    if (this.state.reminder?.key === key) this.state.reminder = null;
    this.emit();
    return this.snapshot();
  }
  reportProgress(value: any) {
    if (
      !value ||
      value.day !== dayKey(this.now()) ||
      (value.completedCount !== null &&
        (!Number.isSafeInteger(value.completedCount) ||
          value.completedCount < 0 ||
          value.completedCount > 100000))
    )
      throw Error("今日番茄进度无效");
    // The existing renderer record store owns this count. Never persist a copy.
    if (value.completedCount === null) {
      this.state.progress = null;
      if (this.state.reminder?.kind === "focus")
        this.state.reminder = null;
      this.emit();
      return this.snapshot();
    }
    this.state.progress = {
      day: value.day,
      completedCount: value.completedCount,
    };
    if (
      value.completedCount >= this.state.settings.pomodoroGoal &&
      this.state.reminder?.kind === "focus"
    )
      this.state.reminder = null;
    this.emit();
    return this.snapshot();
  }
  start() {
    if (this.running) return;
    this.running = true;
    void this.tick();
  }
  isRunning() {
    return this.running;
  }
  stop() {
    this.running = false;
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  private async tick() {
    const generation = this.generation;
    await this.refresh();
    if (this.running && generation === this.generation) {
      const midnight = new Date(this.now());
      midnight.setHours(24, 0, 0, 0);
      this.timer = setTimeout(
        () => void this.tick(),
        Math.max(
          10,
          Math.min(
            midnight.getTime() - this.now(),
            300000,
            POLL_MS * 2 ** Math.min(this.failures, 4)
          )
        )
      );
    }
  }
  suspend() {
    this.stop();
    this.state.status = "interrupted";
    this.state.message = "采集已暂停，恢复后继续核对";
    this.emit();
  }
  private async discover() {
    const [info, buckets] = await Promise.all([
      this.request("/info"),
      this.request("/buckets/"),
    ]);
    const host = info?.hostname;
    if (
      typeof host !== "string" ||
      host.length > 255 ||
      !buckets ||
      typeof buckets !== "object"
    )
      throw Error("ActivityWatch 数据源无效");
    const entries: any[] = Object.entries(buckets).map(
      ([id, value]: any) => ({ ...value, id })
    );
    const pick = (type: string, prefix: string) =>
      entries.find(
        (b) =>
          b.hostname === host &&
          b.type === type &&
          b.id === `${prefix}_${host}`
      );
    const browser = pick("web.tab.current", "aw-watcher-web-edge"),
      window = pick("currentwindow", "aw-watcher-window"),
      afk = pick("afkstatus", "aw-watcher-afk");
    if (!browser || !window || !afk)
      throw Error(
        "未找到本机 Edge、窗口或空闲采集，请确认采集器已启动"
      );
    this.bucketIds = {
      browser: browser.id,
      window: window.id,
      afk: afk.id,
    };
    const starts = [browser.created, window.created, afk.created]
      .map(Date.parse)
      .filter(Number.isFinite);
    this.coverageStart = starts.length ? Math.max(...starts) : null;
  }
  private async readUsage(days: number, now: number) {
    if (!this.bucketIds) await this.discover();
    const { browser, window, afk } = this.bucketIds!,
      range = dayBounds(now, days);
    const response = await this.request("/query/", {
      timeperiods: [
        `${new Date(range.start).toISOString()}/${new Date(
          now
        ).toISOString()}`,
      ],
      query: usageQuery(browser, window, afk),
    });
    if (
      !Array.isArray(response) ||
      response.length !== 1 ||
      !Array.isArray(response[0])
    )
      throw Error("统计响应无效");
    return summarize(response[0], range.start, now, this.coverageStart);
  }
  async statistics(value: any) {
    if (value !== "week" && value !== "today")
      throw Error("统计范围无效");
    if (value === "today") return (await this.refresh()).usage;
    const now = this.now();
    if (
      this.week &&
      dayKey(this.week.end) === dayKey(now) &&
      now - this.week.end < 60000
    )
      return this.week;
    if (!this.weekBusy)
      this.weekBusy = this.readUsage(7, now)
        .then((result) => (this.week = result))
        .finally(() => {
          this.weekBusy = null;
        });
    return this.weekBusy;
  }
  refresh(): Promise<RestState> {
    if (this.busy)
      return this.busyGeneration === this.generation
        ? this.busy
        : this.busy.then(() => this.refresh());
    this.busyGeneration = this.generation;
    this.busy = this.update(this.generation).finally(() => {
      this.busy = null;
    });
    return this.busy;
  }
  private async update(
    generation: number,
    rollover = false
  ): Promise<RestState> {
    const now = this.now(),
      day = dayKey(now);
    if (this.state.progress?.day !== day) this.state.progress = null;
    if (this.state.usage && this.state.usage.day !== day) {
      this.state.usage = null;
      this.state.reminder = null;
      this.state.updatedAt = null;
      this.emit();
    }
    try {
      if (!this.bucketIds) await this.discover();
      const ids = Object.values(this.bucketIds!);
      const health = await Promise.all(
        ids.map((id) =>
          this.request(
            `/buckets/${encodeURIComponent(id)}/events?limit=1`
          )
        )
      );
      if (
        health.some((list) => {
          if (!Array.isArray(list) || !list.length) return true;
          const end =
            Date.parse(list[0].timestamp) +
            Number(list[0].duration) * 1000;
          return (
            !Number.isFinite(end) ||
            end > now + 10000 ||
            now - end > 180000
          );
        })
      )
        throw Error(
          "采集已中断：请确认 ActivityWatch 与 Edge 扩展运行中"
        );
      const u = await this.readUsage(1, now);
      if (generation !== this.generation) return this.snapshot();
      // A request may finish after midnight. Never publish or persist yesterday's
      // usage/threshold; make one bounded retry with the new local day.
      if (dayKey(this.now()) !== day) {
        this.state.usage = null;
        this.state.reminder = null;
        this.state.updatedAt = null;
        this.state.status = "connecting";
        this.state.message = "日期已切换，正在核对今日记录";
        this.emit();
        if (!rollover) return this.update(generation, true);
        throw Error("日期持续变化，稍后重新核对今日记录");
      }
      this.state.usage = u;
      this.state.updatedAt = now;
      this.failures = 0;
      this.state.status = "recording";
      this.state.message = this.storageOk
        ? "本机记录 · 每 30 秒更新"
        : "额度设置读取失败或未保存，请重新保存设置以恢复督促";
      const quota = this.state.settings.quotaMinutes;
      const interval = this.state.settings.reminderMinutes;
      const stepSeconds = interval * 60;
      if (
        this.ledger.day !== day ||
        this.ledger.quota !== quota ||
        this.ledger.interval !== interval
      )
        this.ledger = {
          day,
          quota,
          interval,
          step: 0,
          focusStep: 0,
          quotaCrossed: false,
        };
      const step = Math.max(
        0,
        Math.floor(
          (u.totalSeconds - quota * 60 + 0.000001) / stepSeconds
        )
      );
      const focusStep = Math.floor(
        (u.totalSeconds + 0.000001) / stepSeconds
      );
      const quotaCrossed = u.totalSeconds > quota * 60 + 0.000001;
      const count =
        this.state.progress?.day === day
          ? this.state.progress.completedCount
          : null;
      if (this.storageOk) {
        const before = { ...this.ledger },
          quotaReminder =
            quotaCrossed &&
            (!this.ledger.quotaCrossed || step > this.ledger.step),
          focusReminder =
            count !== null &&
            count < this.state.settings.pomodoroGoal &&
            focusStep > this.ledger.focusStep,
          newReminder =
            this.state.settings.supervise &&
            (quotaReminder || focusReminder);
        this.ledger.step = Math.max(step, this.ledger.step);
        // Observe both counters even after 12 tomatoes or while supervision is off.
        // Returning to the stricter policy must not replay past thresholds.
        if (count !== null || quotaCrossed)
          this.ledger.focusStep = Math.max(
            focusStep,
            this.ledger.focusStep
          );
        this.ledger.quotaCrossed =
          this.ledger.quotaCrossed || quotaCrossed;
        try {
          this.save();
        } catch (_) {
          this.ledger = before;
          this.storageOk = false;
          this.state.reminder = null;
          throw Error("提醒状态保存失败，暂停督促以避免重复");
        }
        if (newReminder) {
          const wasPending = !!this.state.reminder;
          this.state.reminder = {
            key: `${day}/${quota}/${interval}/${focusStep}/${step}/${
              quotaCrossed ? 1 : 0
            }`,
            excessMinutes: Math.max(
              0,
              Math.ceil((u.totalSeconds - quota * 60) / 60)
            ),
            kind: quotaCrossed ? "quota" : "focus",
            watchedMinutes: Math.floor(u.totalSeconds / 60),
            completedCount: count,
          };
          this.emit();
          if (!wasPending) this.onReminder();
        }
      }
    } catch (error: any) {
      if (generation !== this.generation) return this.snapshot();
      if (dayKey(this.now()) !== day) {
        this.state.usage = null;
        this.state.reminder = null;
        this.state.updatedAt = null;
      }
      this.failures++;
      this.bucketIds = null;
      this.state.status = "interrupted";
      this.state.message = error.message || "ActivityWatch 未连接";
    }
    this.emit();
    return this.snapshot();
  }
}
