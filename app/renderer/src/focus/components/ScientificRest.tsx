import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "./shared";
import type { FocusSession } from "../session";
import { dailyRestProgress } from "../restProgress";
import { DEFAULT_WEIGHTS, TomatoWeights } from "../weights";
import {
  durationText,
  displayUsage,
  monitorDetail,
  quotaDisplay,
} from "../restDisplay";

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
type FocusLock={enabled:boolean;plannedEnabled:boolean;goal:number;quotaMinutes:number;releaseMinutes:number;plannedReleaseMinutes:number;day:string;count:number|null;reached:boolean;lockedForChanges:boolean;releasing:boolean;until:number;blocked:boolean;quotaSpent:boolean;error:string};
export type RestState = {
  browserControl?: { policy: { mode: "mirror"|"pause"|"cooldown"|"quota"; cooldownMinutes: number; autoRaise: boolean }; connected:boolean; pausedCount:number; pauseKey:string; checkedAt:number|null; error:string; installed:boolean;focusLockCapable?:boolean;leaseCapable?:boolean;focusLock?:FocusLock };
  settings: {
    quotaMinutes: number;
    supervise: boolean;
    pomodoroGoal: number;
    reminderMinutes: number;
  };
  progress: { day: string; completedCount: number; effectiveCount?: number; gymAvailable?: boolean } | null;
  usage: Usage | null;
  status: "connecting" | "recording" | "interrupted";
  message: string;
  updatedAt: number | null;
  live?: {
    checkedAt: number;
    startedAt: number;
    site: "bilibili" | "xiaohongshu" | null;
    estimateFrom: number | null;
    expiresAt: number;
    detail: string;
  } | null;
  reminder: {
    key: string;
    excessMinutes: number;
    kind: "focus" | "quota";
    watchedMinutes: number;
    watchedSeconds?:number;
    excessSeconds?:number;
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
  ready: boolean,
  gymAvailable = false,
  weights: TomatoWeights = DEFAULT_WEIGHTS
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
  const { day: progressDay, completedCount, effectiveCount } = dailyRestProgress(
    records,
    state.updatedAt || Date.now(),
    weights
  );
  const reportedCount = ready ? completedCount : null;
  useEffect(() => {
    const bridge = api();
    if (bridge?.restProgress)
      void bridge
        .restProgress({
          day: progressDay,
          completedCount: reportedCount,
          ...(ready ? { effectiveCount } : {}),
          gymAvailable: ready && gymAvailable,
        })
        .catch(() => {});
    // Progress is a projection of the timer's confirmed records, including edits
    // and cloud merges. No independent daily counter or polling timer is needed.
  }, [progressDay, reportedCount, effectiveCount, ready, gymAvailable]);
  return state;
}
const minutes = (seconds: number) =>
  `${Math.round(seconds / 6) / 10} 分钟`;
const reminderElapsed=(seconds:number|undefined,minutes:number)=>seconds===undefined?`${minutes} 分钟`:seconds<60?`${seconds} 秒`:seconds%60?`${Math.floor(seconds/60)} 分 ${seconds%60} 秒`:`${seconds/60} 分钟`;
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
  const [reminderUnit,setReminderUnit]=useState<"minutes"|"seconds">("minutes");
  const [draftRelease,setDraftRelease]=useState("15");
  const [busy, setBusy] = useState(false);
  const [setupNote,setSetupNote]=useState("");
  const policy=state.browserControl?.policy || {mode:"pause" as const,cooldownMinutes:2,autoRaise:true};
  const lock=state.browserControl?.focusLock;
  const requestId = useRef(0);
  useEffect(
    () => () => {
      requestId.current++;
    },
    []
  );
  const [showHealth, setShowHealth] = useState(false);
  const [, setWallNow] = useState(Date.now());
  useEffect(() => {
    if (
      state.status !== "recording" ||
      (!state.live?.site && !showHealth)
    )
      return;
    setWallNow(Date.now());
    const timer = setInterval(() => setWallNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.status, state.live?.site, showHealth]);
  // Read the clock on every render, including new detector snapshots between ticks.
  const displayNow = Date.now();
  const usage = displayUsage(state, displayNow);
  const statusDetail = monitorDetail(state, displayNow)+"\n浏览器控制："+(state.browserControl?.connected?"配套扩展已连接":"未连接，暂停尚未确认")+(lock?.enabled&&!state.browserControl?.focusLockCapable?"\n每日锁尚未确认：请更新并重新加载配套扩展":lock?.enabled&&!state.browserControl?.leaseCapable?"\n专注锁稳定修复待配套更新：更新浏览器配套，在Edge重新加载并刷新网站":"");
  const ring=usage?quotaDisplay(usage.totalSeconds,lock?.enabled?lock.quotaMinutes:state.settings.quotaMinutes):null;
  const ratio=ring?.ratio||0,over=ring?.over||false;
  const watching=state.status==="recording" && !!state.live?.site && displayNow>=state.live.checkedAt && displayNow<=state.live.expiresAt;
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
  async function lockAction(action:"focusLockConfigure"|"focusLockRelease"|"focusLockResume",value?:any){
    setBusy(true);setError("");try{await api()[action](value);}catch(e:any){setError(e.message||"每日锁设置未保存");}finally{setBusy(false);}
  }
  const [refreshing, setRefreshing] = useState(false);
  async function refreshStatus() {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    try {
      await api().restRefresh();
      if (view === "stats" && range === "week")
        await selectRange("week");
    } catch (e: any) {
      setError(e.message || "刷新失败，请稍后重试");
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <section
      className="scientific-rest side-section"
      aria-label="科学专注"
    >
      <div className="side-title">
        <span className="rest-heading">
          科学专注
          <button
            type="button"
            className="rest-refresh"
            aria-label="刷新采集状态"
            title={
              refreshing ? "正在核对 ActivityWatch…" : "刷新采集状态"
            }
            disabled={refreshing}
            onClick={() => void refreshStatus()}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M16 8a6 6 0 1 0 0 4M16 3v5h-5" />
            </svg>
          </button>
        </span>
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
              className={`rest-ring${over ? " over" : ""}${watching ? " watching" : ""}`}
              role="group"
              aria-label={
                !ring
                  ? "暂无记录"
                  : `${ring.label} ${ring.clock}${over?`，已超额 ${ring.excess}`:""}`
              }
            >
              <div
                className={`rest-health${
                  state.status !== "recording" ? " interrupted" : ""
                }`}
                role="status"
                aria-live="off"
                tabIndex={0}
                aria-describedby="rest-monitor-detail"
                onMouseEnter={() => setShowHealth(true)}
                onMouseLeave={() => setShowHealth(false)}
                onFocus={() => setShowHealth(true)}
                onBlur={() => setShowHealth(false)}
                title={statusDetail}
              >
                <span aria-hidden="true" />
                <span className="rest-health-label">
                  {statusDetail}
                </span>
                <span
                  id="rest-monitor-detail"
                  className="rest-health-tooltip"
                  role="tooltip"
                >
                  {statusDetail}
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
              <div className="rest-ring-label rest-clock-label">
                <strong>
                  {ring?.clock || "—"}
                </strong>
                <small>{ring?.label || "剩余额度"}</small>
                {over && <small className="rest-excess">超额 {ring!.excess}</small>}
              </div>
            </div>
            <div className="rest-controls">
              <label className="rest-supervise">
                开启督促
                <input
                  type="checkbox"
                  checked={lock?.enabled?!lock.releasing:state.settings.supervise}
                  disabled={busy||!!lock?.lockedForChanges}
                  onChange={(e) =>
                    lock?.enabled?void lockAction(e.target.checked?"focusLockResume":"focusLockRelease"):void configure(
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
                    const fractional=!Number.isInteger(state.settings.reminderMinutes);setReminderUnit(fractional?"seconds":"minutes");
                    setDraftReminder(String(fractional?Math.round(state.settings.reminderMinutes*60):state.settings.reminderMinutes));setDraftRelease(String(lock?.plannedReleaseMinutes||15));
                    setError("");
                    setView("settings");
                  }}
                >
                  设置策略
                </button>
              </div>
              {lock?.enabled&&<div className="daily-focus-summary" role="status">
                <span>每日锁 · 今日 {lock.count===null?"待确认":lock.count}/{lock.goal}</span>
                <small>{!state.browserControl?.focusLockCapable?"更新配套后生效":lock.quotaSpent?"今日额度已用完":lock.releasing?`放行至 ${time(lock.until)}`:lock.reached?"已达标，可临时放行":"未达标，督促已锁定"}</small>
                {lock.reached&&!lock.releasing&&!lock.quotaSpent&&<button className="btn-text" disabled={busy} onClick={()=>void lockAction("focusLockRelease")}>临时放行 {lock.releaseMinutes} 分钟</button>}
                {lock.releasing&&<button className="btn-text" disabled={busy} onClick={()=>void lockAction("focusLockResume")}>恢复锁定</button>}
              </div>}
              <div className="rest-sites">
                <div>
                  <i className="rest-dot bili" />
                  B站
                  <strong>
                    {usage ? durationText(usage.bilibili) : "—"}
                  </strong>
                </div>
                <div>
                  <i className="rest-dot xhs" />
                  小红书
                  <strong>
                    {usage ? durationText(usage.xiaohongshu) : "—"}
                  </strong>
                </div>
              </div>
              {watching && <div className="rest-watching" role="status">正在浏览{state.live!.site==="bilibili"?" B站":"小红书"} · 时间正在流逝</div>}
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
                disabled={!!lock?.lockedForChanges}
                onChange={(e) => setDraftGoal(e.target.value)}
              />{" "}
              个
            </label>
            <label>
              每看多久提醒{" "}
              <input
                type="number"
                aria-label="提醒间隔"
                min={reminderUnit==="seconds"?5:5/60}
                max={reminderUnit==="seconds"?3600:60}
                step={reminderUnit==="seconds"?1:1/60}
                value={draftReminder}
                onChange={(e) => setDraftReminder(e.target.value)}
              />{" "}
              <select aria-label="提醒间隔单位" value={reminderUnit} onChange={e=>{const next=e.target.value as "minutes"|"seconds";if(next!==reminderUnit)setDraftReminder(String(next==="seconds"?Math.round(Number(draftReminder)*60):Number(draftReminder)/60));setReminderUnit(next);}}><option value="minutes">分钟</option><option value="seconds">秒</option></select>
            </label>
            <p>提醒最短5秒，约每5秒检查。目标设0仅按额度提醒。</p>
            <div className="daily-focus-settings">
              <label>每日专注锁 <input aria-label="启用每日专注锁" type="checkbox" checked={!!lock?.plannedEnabled} disabled={busy||!!lock?.lockedForChanges} onChange={e=>void lockAction("focusLockConfigure",{enabled:e.target.checked,releaseMinutes:Number(draftRelease)})}/></label>
              <label>临时放行 <input aria-label="每日锁临时放行分钟" type="number" min={1} max={60} step={1} value={draftRelease} disabled={!!lock?.lockedForChanges} onChange={e=>setDraftRelease(e.target.value)}/> 分钟</label>
              <small>{lock?.enabled?`今日承诺 ${lock.count===null?"待确认":lock.count}/${lock.goal}。未达标不能修改；达标后的设置改动次日生效。`:"先保存每日目标，再开启；达标后才能手动临时放行，次日重新锁定。"}</small>
              {!state.browserControl?.focusLockCapable&&<small>每日锁需新版配套连接：更新／重新加载扩展后，打开B站或小红书页面再开启。</small>}
              {lock?.error&&<small role="alert">{lock.error}</small>}
              <button className="btn-text" disabled={busy||!!lock?.lockedForChanges} onClick={()=>void lockAction("focusLockConfigure",{enabled:!!lock?.plannedEnabled,releaseMinutes:Number(draftRelease)})}>保存每日锁设置</button>
            </div>
            <div className="browser-policy">
              <label>干预挡位 <select aria-label="浏览器干预挡位" disabled={busy||!!lock?.lockedForChanges} value={policy.mode} onChange={async e=>{setError("");try{await api().browserConfigure({...policy,mode:e.target.value});}catch(err:any){setError(err.message);}}}>
                <option value="mirror">时间镜子</option><option value="pause">暂停挡</option><option value="cooldown">冷静挡</option><option value="quota">额度锁定挡</option>
              </select></label>
              <label>冷静时间 <input aria-label="冷静时间（分钟）" disabled={busy||!!lock?.lockedForChanges} type="number" min={1} max={30} value={policy.cooldownMinutes} onChange={async e=>{try{await api().browserConfigure({...policy,cooldownMinutes:Number(e.target.value)});}catch(err:any){setError(err.message);}}} /> 分钟</label>
              <label><input type="checkbox" disabled={busy||!!lock?.lockedForChanges} checked={policy.autoRaise} onChange={async e=>{try{await api().browserConfigure({...policy,autoRaise:e.target.checked});}catch(err:any){setError(err.message);}}} />浏览时农场原屏幕置顶</label>
              <small>干预设置即时保存；镜子挡不暂停，冷静挡等待后可续，额度挡用完后至次日限制。</small>
              <p role="status">{state.browserControl?.error || (state.browserControl?.connected ? `配套扩展已连接${state.browserControl.pauseKey?` · 最近确认暂停 ${state.browserControl.pausedCount} 个播放器`:""}` : "配套扩展未连接 · 视频暂停尚未确认")}</p>
              {state.browserControl?.connected && <small>{state.browserControl.leaseCapable?"稳定连接已确认":"请更新浏览器配套，在Edge重新加载扩展，并刷新B站／小红书页面，完成稳定锁定修复。"}</small>}
              <button className="btn-small" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{const result=await api().browserSetup();setSetupNote(state.browserControl?.installed?"已更新配套文件。在Edge扩展页找到番茄农场，点击重新加载，再刷新B站／小红书页面。":`已打开配套文件夹。Edge扩展 → 开发人员模式 → 加载解压缩的扩展，选择该文件夹。扩展ID：${result.extensionId}`);}catch(err:any){setError(err.message);}finally{setBusy(false);}}}>安装／更新浏览器配套</button>
              {setupNote && <small>{setupNote}</small>}
            </div>
            <button
              className="btn-small"
              disabled={busy}
              onClick={async () => {
                if (
                  await configure(
                    Number(draft),
                    lock?.enabled?true:state.settings.supervise,
                    draftGoal.trim() ? Number(draftGoal) : NaN,
                    Number(draftReminder)/(reminderUnit==="seconds"?60:1)
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
  onGym,
}: {
  state: RestState;
  onSleep: () => void;
  onFocus: () => void;
  onGym?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null),
    first = useRef<HTMLButtonElement>(null);
  const reminder =
    state.settings.supervise && state.status === "recording"
      ? state.reminder
      : null;
  const callbacks = useRef({ onSleep, onFocus, onGym, reminder });
  callbacks.current = { onSleep, onFocus, onGym, reminder };
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
          else if (request.action === "gym" && current.onGym) current.onGym();
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
              ? `已看 ${reminderElapsed(reminder.watchedSeconds,reminder.watchedMinutes)}，${state.progress?.effectiveCount !== undefined && state.progress.effectiveCount !== state.progress.completedCount ? "有效番茄" : "番茄"} ${
                  state.progress?.effectiveCount ?? state.progress?.completedCount ??
                  reminder.completedCount
                }/${
                  state.settings.pomodoroGoal
                }：去睡觉，或回到科研主线。`
              : `已超额 ${reminderElapsed(reminder.excessSeconds,reminder.excessMinutes)}：累了去睡觉，或者回到科研主线。`)}
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
          {onGym && state.progress?.gymAvailable && <button disabled={busy} className="btn-small outline" onClick={() => void act(onGym, true)}>去健身</button>}
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
