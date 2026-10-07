import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "./shared";
import type { FocusSession } from "../session";
import { dailyRestProgress } from "../restProgress";

type Usage = {
  day: string;
  start: number;
  end: number;
  totalSeconds: number;
  bilibili: number;
  xiaohongshu: number;
  coverageStart: number | null;
  hours: { hour: number; bilibili: number; xiaohongshu: number }[];
  sessions: {
    start: number;
    end: number;
    site: "bilibili" | "xiaohongshu";
  }[];
};
export type RestState = {
  settings: {
    quotaMinutes: number;
    supervise: boolean;
    pomodoroGoal: number;
    reminderMinutes: number;
  };
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
const initial: RestState = {
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
export function useScientificRest(
  records: FocusSession[],
  ready: boolean
) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    const bridge = api();
    let mounted = true,
      received = false;
    if (!bridge?.restState) {
      setState({
        ...initial,
        status: "interrupted",
        message: "需要桌面版连接 ActivityWatch",
      });
      return;
    }
    const off = bridge.onRestState((next: RestState) => {
      received = true;
      if (mounted) setState(next);
    });
    bridge
      .restState()
      .then((next: RestState) => {
        if (mounted && !received) setState(next);
      })
      .catch(() => {
        if (mounted)
          setState({
            ...initial,
            status: "interrupted",
            message: "本机统计连接失败",
          });
      });
    return () => {
      mounted = false;
      off();
    };
  }, []);
  const { day: progressDay, completedCount } = dailyRestProgress(
    records,
    state.updatedAt || Date.now()
  );
  const reportedCount = ready ? completedCount : null;
  useEffect(() => {
    const bridge = api();
    if (bridge?.restProgress)
      void bridge
        .restProgress({
          day: progressDay,
          completedCount: reportedCount,
        })
        .catch(() => {});
    // Progress is a projection of the timer's confirmed records, including edits
    // and cloud merges. No independent daily counter or polling timer is needed.
  }, [progressDay, reportedCount]);
  return state;
}
const minutes = (seconds: number) =>
  `${Math.round(seconds / 6) / 10} 分钟`;
const time = (value: number) =>
  new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
export default function ScientificRest({
  state,
}: {
  state: RestState;
}) {
  const [view, setView] = useState<"quota" | "stats" | "settings">(
    "quota"
  );
  const [range, setRange] = useState<"today" | "week">("today");
  const [week, setWeek] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("60");
  const [draftGoal, setDraftGoal] = useState("12");
  const [draftReminder, setDraftReminder] = useState("5");
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  useEffect(
    () => () => {
      requestId.current++;
    },
    []
  );
  const usage = state.usage;
  const remaining = usage
    ? Math.max(0, state.settings.quotaMinutes - usage.totalSeconds / 60)
    : null;
  const ratio =
    remaining === null ? 0 : remaining / state.settings.quotaMinutes;
  const over =
    !!usage && usage.totalSeconds > state.settings.quotaMinutes * 60;
  const chart = range === "week" ? week : usage;
  const max = Math.max(
    60,
    ...(chart?.hours || []).map((h) => h.bilibili + h.xiaohongshu)
  );
  const peak = chart?.hours
    .filter((h) => h.bilibili + h.xiaohongshu > 0)
    .sort(
      (a, b) =>
        b.bilibili + b.xiaohongshu - (a.bilibili + a.xiaohongshu)
    )
    .slice(0, 2);
  async function configure(
    quotaMinutes: number,
    supervise: boolean,
    pomodoroGoal = state.settings.pomodoroGoal,
    reminderMinutes = state.settings.reminderMinutes
  ) {
    setBusy(true);
    setError("");
    try {
      await api().restSettings({
        quotaMinutes,
        supervise,
        pomodoroGoal,
        reminderMinutes,
      });
      return true;
    } catch (e: any) {
      setError(e.message || "设置未保存");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function selectRange(next: "today" | "week") {
    setRange(next);
    setError("");
    const id = ++requestId.current;
    if (next === "today") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const value = await api().restStatistics("week");
      if (requestId.current === id) setWeek(value);
    } catch (_) {
      if (requestId.current === id)
        setError("统计读取失败，请稍后重试");
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }
  return (
    <section
      className="scientific-rest side-section"
      aria-label="科学休息"
    >
      <div className="side-title">
        科学休息
        {view !== "quota" && (
          <button
            className="btn-text rest-back"
            onClick={() => {
              requestId.current++;
              setLoading(false);
              setView("quota");
              setError("");
            }}
          >
            返回额度
          </button>
        )}
      </div>
      <div className={`rest-card rest-view-${view}`}>
        {view === "quota" ? (
          <div className="rest-quota">
            <div
              className={`rest-ring${over ? " over" : ""}`}
              role="group"
              aria-label={
                remaining === null
                  ? "暂无记录"
                  : `剩余额度 ${minutes(remaining * 60)}`
              }
            >
              <div
                className={`rest-health${
                  state.status !== "recording" ? " interrupted" : ""
                }`}
                role="status"
                title={
                  state.status === "recording"
                    ? "正在记录网站时间"
                    : state.message
                }
              >
                <span aria-hidden="true" />
                <span className="rest-health-label">
                  {state.status === "recording"
                    ? "正在记录网站时间"
                    : state.usage
                    ? "采集已中断 · 保留上次记录"
                    : state.status === "connecting"
                    ? "正在连接采集…"
                    : "采集未连接"}
                </span>
              </div>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle
                  className="rest-ring-track"
                  cx="60"
                  cy="60"
                  r="51"
                />
                <circle
                  className="rest-ring-value"
                  cx="60"
                  cy="60"
                  r="51"
                  strokeDasharray={`${ratio * 320.442} 320.442`}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="rest-ring-label">
                <strong>
                  {remaining === null ? "—" : Math.ceil(remaining)}
                </strong>
                <span>分钟</span>
                <small>{over ? "额度已用完" : "剩余额度"}</small>
              </div>
            </div>
            <div className="rest-controls">
              <label className="rest-supervise">
                开启督促
                <input
                  type="checkbox"
                  checked={state.settings.supervise}
                  disabled={busy}
                  onChange={(e) =>
                    void configure(
                      state.settings.quotaMinutes,
                      e.target.checked
                    )
                  }
                />
              </label>
              <div className="rest-links">
                <button
                  className="btn-text rest-stat-link"
                  onClick={() => {
                    setView("stats");
                    void selectRange("today");
                  }}
                >
                  查看统计
                </button>
                <button
                  className="btn-text"
                  onClick={() => {
                    setDraft(String(state.settings.quotaMinutes));
                    setDraftGoal(String(state.settings.pomodoroGoal));
                    setDraftReminder(
                      String(state.settings.reminderMinutes)
                    );
                    setError("");
                    setView("settings");
                  }}
                >
                  设置策略
                </button>
              </div>
              <div className="rest-sites">
                <div>
                  <i className="rest-dot bili" />
                  B站
                  <strong>
                    {usage ? minutes(usage.bilibili) : "—"}
                  </strong>
                </div>
                <div>
                  <i className="rest-dot xhs" />
                  小红书
                  <strong>
                    {usage ? minutes(usage.xiaohongshu) : "—"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        ) : view === "settings" ? (
          <div className="rest-settings">
            <label>
              每日摸鱼额度{" "}
              <input
                type="number"
                aria-label="每日摸鱼额度（分钟）"
                min={5}
                max={480}
                step={5}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />{" "}
              分钟
            </label>
            <label>
              每日番茄目标{" "}
              <input
                type="number"
                aria-label="每日番茄目标（个）"
                min={0}
                max={60}
                step={1}
                value={draftGoal}
                onChange={(e) => setDraftGoal(e.target.value)}
              />{" "}
              个
            </label>
            <label>
              每看多久提醒{" "}
              <input
                type="number"
                aria-label="提醒间隔（分钟）"
                min={1}
                max={60}
                step={1}
                value={draftReminder}
                onChange={(e) => setDraftReminder(e.target.value)}
              />{" "}
              分钟
            </label>
            <p>未达目标时督促，超额继续提醒；目标设0则仅按额度提醒。</p>
            <button
              className="btn-small"
              disabled={busy}
              onClick={async () => {
                if (
                  await configure(
                    Number(draft),
                    state.settings.supervise,
                    draftGoal.trim() ? Number(draftGoal) : NaN,
                    Number(draftReminder)
                  )
                )
                  setView("quota");
              }}
            >
              保存策略
            </button>
          </div>
        ) : (
          <div className="rest-stats">
            <div className="rest-chart-head">
              <span>浏览时间分布</span>
              <div role="group" aria-label="浏览统计范围">
                {(["today", "week"] as const).map((r) => (
                  <button
                    className={`btn-text${
                      range === r ? " selected" : ""
                    }`}
                    key={r}
                    onClick={() => void selectRange(r)}
                  >
                    {r === "today" ? "今日" : "近7天"}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="rest-chart"
              aria-label="按小时统计 B站与小红书时间"
              aria-busy={loading}
            >
              {(
                chart?.hours ||
                Array.from({ length: 24 }, (_, hour) => ({
                  hour,
                  bilibili: 0,
                  xiaohongshu: 0,
                }))
              ).map((h) => (
                <div
                  className="rest-hour"
                  key={h.hour}
                  title={`${h.hour}:00–${h.hour + 1}:00 · B站 ${minutes(
                    h.bilibili
                  )} · 小红书 ${minutes(h.xiaohongshu)}`}
                >
                  <div className="rest-hour-bars">
                    <span
                      className="bili"
                      style={{ height: `${(h.bilibili / max) * 100}%` }}
                    />
                    <span
                      className="xhs"
                      style={{
                        height: `${(h.xiaohongshu / max) * 100}%`,
                      }}
                    />
                  </div>
                  {h.hour % 6 === 0 && (
                    <small>{String(h.hour).padStart(2, "0")}</small>
                  )}
                </div>
              ))}
            </div>
            <div className="rest-chart-foot">
              <span>
                <i className="rest-dot bili" />
                B站 <i className="rest-dot xhs" />
                小红书
              </span>
              <span>
                {loading
                  ? "正在读取…"
                  : peak?.length
                  ? `常看 ${peak
                      .map((h) => `${h.hour}–${h.hour + 1}时`)
                      .join("、")}`
                  : "暂无浏览记录"}
              </span>
            </div>
            <details className="rest-sessions">
              <summary>
                查看浏览时段
                {range === "week" &&
                chart?.coverageStart &&
                chart.coverageStart > chart.start
                  ? `（采集始于 ${new Date(
                      chart.coverageStart
                    ).toLocaleDateString("zh-CN")}）`
                  : ""}
              </summary>
              <div>
                {chart?.sessions.length
                  ? chart.sessions
                      .slice(-80)
                      .reverse()
                      .map((s, i) => (
                        <div key={`${s.start}-${i}`}>
                          <span>
                            {range === "week"
                              ? `${new Date(s.start).toLocaleDateString(
                                  "zh-CN",
                                  { month: "numeric", day: "numeric" }
                                )} `
                              : ""}
                            {time(s.start)}–{time(s.end)}
                          </span>
                          <span>
                            {s.site === "bilibili" ? "B站" : "小红书"} ·{" "}
                            {minutes((s.end - s.start) / 1000)}
                          </span>
                        </div>
                      ))
                  : "暂无记录"}
              </div>
            </details>
          </div>
        )}
        {error && (
          <div className="rest-error" role="alert">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

export function ScientificRestReminder({
  state,
  onSleep,
  onFocus,
}: {
  state: RestState;
  onSleep: () => void;
  onFocus: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null),
    first = useRef<HTMLButtonElement>(null);
  const reminder =
    state.settings.supervise && state.status === "recording"
      ? state.reminder
      : null;
  const callbacks = useRef({ onSleep, onFocus, reminder });
  callbacks.current = { onSleep, onFocus, reminder };
  useEffect(() => {
    const bridge = api();
    if (!bridge?.nativeRestReminder) return;
    return bridge.onRestAction(
      (request: { id: number; key: string; action: string }) => {
        let ok = false;
        try {
          const current = callbacks.current;
          if (request.key !== current.reminder?.key)
            throw Error("Stale reminder");
          if (request.action === "sleep") current.onSleep();
          else if (request.action === "focus") current.onFocus();
          else throw Error("Invalid action");
          ok = true;
        } catch (_) {
          /* Native reminder retains its retry affordance. */
        }
        void bridge
          .restActionResult({ id: request.id, key: request.key, ok })
          .catch(() => {});
      }
    );
  }, []);
  useEffect(() => {
    if (!reminder) return;
    const previous = document.activeElement as HTMLElement | null;
    first.current?.focus();
    return () => previous?.focus();
    // Focus once when the dialog opens, not every time the amount changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!reminder]);
  if (!reminder || api()?.nativeRestReminder) return null;
  async function act(action: () => void, hide = false) {
    setBusy(true);
    setError("");
    try {
      action();
      await api().restAcknowledge(reminder!.key);
      if (hide) await api().hide();
    } catch (_) {
      setError("操作未完成，请重试");
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <div className="rest-reminder-backdrop">
      <div
        className="rest-reminder"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rest-reminder-title"
        aria-describedby="rest-reminder-line"
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            const buttons = Array.from(
              dialog.current!.querySelectorAll<HTMLButtonElement>(
                "button"
              )
            );
            const from = buttons.indexOf(
              document.activeElement as HTMLButtonElement
            );
            e.preventDefault();
            buttons[
              (from + (e.shiftKey ? buttons.length - 1 : 1)) %
                buttons.length
            ]?.focus();
          }
        }}
      >
        <h2 id="rest-reminder-title">把时间还给自己</h2>
        <p id="rest-reminder-line">
          {error ||
            (reminder.kind === "focus"
              ? `已看 ${reminder.watchedMinutes} 分钟，番茄 ${
                  state.progress?.completedCount ??
                  reminder.completedCount
                }/${
                  state.settings.pomodoroGoal
                }：去睡觉，或回到科研主线。`
              : `已超额 ${reminder.excessMinutes} 分钟：累了去睡觉，或者回到科研主线。`)}
        </p>
        <div>
          <button
            ref={first}
            disabled={busy}
            className="btn-small outline"
            onClick={() => void act(onSleep, true)}
          >
            去睡觉
          </button>
          <button
            disabled={busy}
            className="btn-small"
            onClick={() => void act(onFocus)}
          >
            开始下一个番茄
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
