import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FocusSession, FocusTask } from "../session";
import {
  Journey,
  JourneySlot,
  completion,
  journeyDay,
  locked,
  moveSlot,
  readJourney,
  reconcileJourney,
  applyJourneyTemplate,
  restActions,
  REST_LABELS,
  resolveTask,
  taskRef,
  writeJourney,
} from "../journey.js";
import { parseTitle, LogoIcon } from "./shared";
import { tomatoRecordTone } from "../week";
import {
  JourneyRestIcon,
  JourneyOutline,
  JourneySettingsIcon,
} from "./JourneyIcons";
import JourneyTemplates from "./JourneyTemplates";
import { ACTUAL_REST, ActualRestKind, RestEvent, RestLog, openRest, restClock } from "../restLog";

const localTimeInput = (at: number) => {
  const d = new Date(at);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,19);
};
type RestEntry = {kind:ActualRestKind; start:string; end:string; suggestedStart:number|null; suggestedEnd:number};
const restEntryTimes = (entry: RestEntry) => ({
  startedAt: entry.suggestedStart !== null && entry.start === localTimeInput(entry.suggestedStart)
    ? entry.suggestedStart : new Date(entry.start).getTime(),
  endedAt: entry.end === localTimeInput(entry.suggestedEnd) ? entry.suggestedEnd : new Date(entry.end).getTime(),
});

export type JourneyControls = {
  scope: string;
  ready: boolean;
  active: FocusSession | null;
  restLog: RestLog | null;
  restAction: (kind: ActualRestKind, finish: boolean) => void;
  restWindow: () => { startedAt: number | null; endedAt: number };
  saveRestBackfill: (kind: ActualRestKind, startedAt: number, endedAt: number) => void;
  begin: (task: FocusTask | null, sessionId: string) => void;
  change: (task: FocusTask | null) => boolean;
  pause: () => void;
  resume: () => void;
  onPlan?: (plan: Journey) => void;
  refreshToken?: number;
};
export default function TodayJourney({
  records,
  tasks,
  controls,
}: {
  records: FocusSession[];
  tasks: FocusTask[];
  controls: JourneyControls;
}) {
  const [offset, setOffset] = useState(0),
    [plan, setPlan] = useState<Journey | null>(null),
    [error, setError] = useState("");
  const [edit, setEdit] = useState<string | null>(null),
    [choice, setChoice] = useState(""),
    [destination, setDestination] = useState("");
  const [settings, setSettings] = useState(false);
  const day = journeyDay(Date.now(), offset), scope = controls.scope;
  const [restMenu, setRestMenu] = useState<ActualRestKind | null>(null);
  const [restEntry, setRestEntry] = useState<RestEntry | null>(null);
  const [restNow, setRestNow] = useState(Date.now());
  const ongoing = openRest(controls.restLog);
  useEffect(() => {
    if (!ongoing || offset !== 0) return;
    let tick: ReturnType<typeof setInterval> | undefined;
    const syncVisibility = () => {
      if (tick) clearInterval(tick);
      tick = undefined;
      setRestNow(Date.now());
      if (!document.hidden) tick = setInterval(() => setRestNow(Date.now()), 1000);
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => { if (tick) clearInterval(tick); document.removeEventListener("visibilitychange", syncVisibility); };
  }, [ongoing, offset]);
  useEffect(() => { setRestMenu(null); setRestEntry(null); }, [scope, day]);
  useEffect(() => {
    if (!restMenu) return;
    const outside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".journey-rest-controls,.journey-rest-button")) setRestMenu(null);
    };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setRestMenu(null); };
    document.addEventListener("click", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("click", outside); document.removeEventListener("keydown", escape); };
  }, [restMenu]);
  const ref = useRef<Journey | null>(null);
  const drag = useRef<string | null>(null);
  const persist = (next: Journey) => {
    const valid = writeJourney(localStorage, next);
    ref.current = valid;
    setPlan(valid);
    if (valid.day === journeyDay()) controls.onPlan?.(valid);
    return valid;
  };
  const attempt = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (e: any) {
      setError(e.message || "旅程未保存，请重试");
    }
  };
  useEffect(() => {
    setEdit(null);
    setSettings(false);
    ref.current = null;
    setPlan(null);
    if (!controls.ready) return;
    attempt(() =>
      persist(
        reconcileJourney(
          readJourney(localStorage, scope, day),
          records,
          controls.active
        )
      )
    );
    // A record event or day/source change reconciles outlines, never the one-second clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, day, controls.ready, controls.refreshToken]);
  useEffect(() => {
    if (
      !controls.ready ||
      !ref.current ||
      ref.current.day !== day ||
      ref.current.scope !== scope
    )
      return;
    try {
      const next = reconcileJourney(
        ref.current,
        records,
        controls.active
      );
      if (JSON.stringify(next) !== JSON.stringify(ref.current))
        persist(next);
    } catch (e: any) {
      setError(e.message || "旅程未保存，请重试");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, controls.active?.id, controls.ready, scope, day]);
  const done = useMemo(
    () => (plan ? completion(plan, records) : {}),
    [plan, records]
  );
  const slots = plan?.stages.flatMap((s) => s.slots) || [],
    selected = slots.find((s) => s.id === edit);
  const options = useMemo(() => {
    const values: FocusTask[] = [],
      keys = new Set<string>();
    for (const t of tasks) {
      try {
        const r = taskRef(t);
        if (
          r.source === "local"
            ? scope !== "local"
            : r.sourceKey !== scope
        )
          continue;
        const key = `${r.source}:${r.sourceKey}:${r.key}`;
        if (!keys.has(key)) {
          keys.add(key);
          values.push(t);
        }
      } catch (_) {}
    }
    return values;
  }, [tasks, scope]);
  const chosen = options.find((t) => t.id === choice);
  const selectedRef =
    choice === "__preset__"
      ? selected?.task || null
      : chosen
      ? taskRef(chosen)
      : choice
      ? selected?.task || null
      : null;
  const today = offset === 0;
  const actualRests = controls.restLog?.events.filter(e => journeyDay(e.startedAt) === day) || [];
  const restDetails = (event: RestEvent) => {
    const when = (at: number) => new Date(at).toLocaleTimeString("zh-CN", {hour12:false});
    return `${ACTUAL_REST[event.kind].label} · ${when(event.startedAt)}—${event.endedAt === null ? "进行中" : when(event.endedAt)} · ${restClock(event, restNow)} · 第${event.afterCount}个番茄后`;
  };
  const actualAt = (position: number) => actualRests
    .filter(e => Math.min(e.afterCount, slots.length) === position)
    .map(event => <span className="journey-rest journey-actual-rest" key={event.id}>
      <button className={`journey-rest-button is-passed${event.endedAt === null ? " is-ongoing" : ""}`}
        data-rest-event={event.id} data-after-count={event.afterCount}
        data-preset-key={event.presetKey || ""} data-rest-kind={event.kind}
        title={restDetails(event)} aria-label={restDetails(event)}
        onClick={() => { if (today) setRestMenu(event.kind); }} disabled={!today}>
        <JourneyRestIcon kind={event.kind} />
      </button>
    </span>);
  const commitRest = (kind: ActualRestKind, finish: boolean) => attempt(() => {
    if (finish && ongoing?.kind !== kind) {
      const window = controls.restWindow();
      setRestEntry({kind, start:window.startedAt === null ? "" : localTimeInput(window.startedAt), end:localTimeInput(window.endedAt),
        suggestedStart:window.startedAt, suggestedEnd:window.endedAt});
      setRestMenu(null);
      return;
    }
    controls.restAction(kind, finish);
    setRestMenu(null);
  });
  const open = (p: JourneySlot) => {
    setEdit(p.id);
    setError("");
    const match = options.find((t) => {
      try {
        const r = taskRef(t);
        return (
          p.task &&
          r.source === p.task.source &&
          r.sourceKey === p.task.sourceKey &&
          r.key === p.task.key
        );
      } catch (_) {
        return false;
      }
    });
    setChoice(match?.id || (p.task ? "__preset__" : ""));
    setDestination(
      plan!.stages.find((s) => s.slots.some((v) => v.id === p.id))!.id
    );
  };
  const current = !!(
    selected?.binding &&
    controls.active?.id === selected.binding.sessionId
  );
  const saveTask = () =>
    attempt(() => {
      if (!ref.current || !selected || done[selected.id])
        throw Error("已完成的番茄保留实际任务");
      const target = selectedRef
        ? resolveTask(selectedRef, tasks, scope)
        : null;
      if (current && selectedRef && !target)
        throw Error("预设任务今天没有可用番茄，请刷新或重新选任务");
      if (current && !controls.change(target))
        throw Error("当前任务未更换，请先结束确认或刷新任务");
      const next = JSON.parse(JSON.stringify(ref.current)) as Journey;
      next.stages
        .flatMap((s) => s.slots)
        .find((s) => s.id === selected.id)!.task = selectedRef;
      persist(next);
      setEdit(null);
    });
  const beginSlot = (p: JourneySlot) => {
    if (!today || journeyDay() !== plan?.day || !controls.ready)
      throw Error("只能开始当天旅程");
    if (controls.active) throw Error("请先结束并确认当前专注");
    const target = p.task ? resolveTask(p.task, tasks, scope) : null;
    if (p.task && !target)
      throw Error(
        "预设任务今天没有可用番茄，请生成今日番茄或重新选任务"
      );
    const next = JSON.parse(JSON.stringify(ref.current)) as Journey;
    const id = crypto.randomUUID();
    next.resting = null;
    next.restingAction = null;
    next.stages
      .flatMap((s) => s.slots)
      .find((s) => s.id === p.id)!.binding = { sessionId: id, unit: 0 };
    persist(next); // A failed plan write must never start an unlinked timer.
    try {
      controls.begin(target, id);
    } catch (e) {
      persist(reconcileJourney(next, records, controls.active));
      throw e;
    }
    setEdit(null);
  };
  const start = (p: JourneySlot) => attempt(() => beginSlot(p));
  const move = (
    id: string,
    stage: string,
    before: string | null = null
  ) =>
    attempt(() => {
      persist(
        moveSlot(
          ref.current!,
          id,
          stage,
          before,
          records,
          controls.active
        )
      );
    });
  const nextSlot = slots.find(
    (p) =>
      !done[p.id] &&
      !(controls.active && p.binding?.sessionId === controls.active.id)
  );
  const toggleRest = (stageId: string, index: number) =>
    attempt(() => {
      if (!today || !ref.current || ref.current.day !== journeyDay())
        throw Error("只能进入当天休息");
      const previous = ref.current,
        key = `${stageId}:${index}`;
      const continuing =
        previous.resting === stageId &&
        (previous.restingAction || `${stageId}:0`) === key;
      const next = JSON.parse(JSON.stringify(previous)) as Journey;
      next.resting = continuing ? null : stageId;
      next.restingAction = continuing ? null : key;
      if (continuing && !next.passedActions.includes(key))
        next.passedActions.push(key);
      persist(next); // Do not change the timer if the journey write fails.
      try {
        if (continuing) controls.resume();
        else controls.pause();
      } catch (e) {
        persist(previous);
        throw e;
      }
    });
  const restEntryKind = restEntry?.kind;
  useEffect(() => {
    if (!edit && !settings && !restEntryKind) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog =
      document.querySelector<HTMLElement>(".journey-dialog");
    dialog?.querySelector<HTMLElement>("select,input,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEdit(null);
        setSettings(false);
        setRestEntry(null);
      }
      if (e.key === "Tab" && dialog) {
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            "button:not(:disabled),select,input"
          )
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [edit, settings, restEntryKind]);
  return (
    <div
      className="card journey-card"
      data-long={slots.length > 16}
      data-day={day}
      data-scope={scope}
    >
      <div className="journey-heading">
        <strong
          title={`${Object.keys(done).length}/${slots.length} 个番茄`}
        >
          {today ? "今日旅程" : "明日旅程"}
        </strong>
        <span className="journey-heading-actions">
          {today && <span className="journey-rest-controls">
            {(["meal", "nap", "gym"] as ActualRestKind[]).map(kind => <button key={kind}
              className={`btn-text journey-rest-start${ongoing?.kind === kind ? " is-ongoing" : ""}`}
              aria-label={ACTUAL_REST[kind].record}
              title={ongoing?.kind === kind ? restDetails(ongoing) : `记录实际${ACTUAL_REST[kind].label}`}
              aria-expanded={restMenu === kind} disabled={!controls.ready || !controls.restLog}
              onClick={() => { setRestMenu(restMenu === kind ? null : kind); setError(""); }}>
              <JourneyRestIcon kind={kind} />
              {ongoing?.kind === kind && <small role="timer">{restClock(ongoing, restNow)}</small>}
            </button>)}
            {restMenu && <div className="journey-rest-menu" role="group" aria-label={`${ACTUAL_REST[restMenu].label}选项`}>
              <button className="btn-text" disabled={ongoing?.kind === restMenu} onClick={() => commitRest(restMenu, false)}>
                {ACTUAL_REST[restMenu].begin}
              </button>
              <button className="btn-text" onClick={() => commitRest(restMenu, true)}>
                {ACTUAL_REST[restMenu].finish}
              </button>
            </div>}
          </span>}
          <button
            className="btn-text"
            aria-label={today ? "明天" : "今天"}
            title={today ? "预设明天旅程" : "返回今日旅程"}
            onClick={() => setOffset(today ? 1 : 0)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 2v6M16 2v6M8 14h2M14 14h2M8 18h2" />
            </svg>
          </button>
          <button
            className="btn-text"
            aria-label="设置"
            title="可视化旅程模板"
            disabled={!plan}
            onClick={() => {
              setSettings(true);
              setEdit(null);
              setError("");
            }}
          >
            <JourneySettingsIcon />
          </button>
          {today &&
            plan &&
            !plan.resting &&
            nextSlot &&
            !controls.active && (
              <button
                className="btn-text"
                aria-label="开始"
                title="开始下一个旅程番茄"
                onClick={() => start(nextSlot)}
              >
                ▶
              </button>
            )}
        </span>
      </div>
      {!plan && (
        <div className="journey-note">
          {error || "等待任务与记录载入"}
        </div>
      )}
      {plan && (
        <>
          <div className="journey-stages">
            {actualAt(0)}
            {plan.stages.map((s, i) => (
              <div
                className={`journey-stage${
                  plan.resting === s.id ? " is-resting" : ""
                }`}
                key={s.id}
                data-stage={s.id}
                onDragOver={(e) => {
                  if (drag.current) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag.current) move(drag.current, s.id);
                  drag.current = null;
                }}
              >
                <div className="journey-slots">
                  {s.slots.map((p, j) => {
                    const actual = done[p.id],
                      running =
                        !!p.binding &&
                        controls.active?.id === p.binding.sessionId;
                    const position = slots.findIndex(v => v.id === p.id) + 1;
                    return (
                      <React.Fragment key={p.id}>
                      <button
                        key={p.id}
                        data-journey-slot={p.id}
                        data-complete={!!actual}
                        data-active={running}
                        className={`journey-tomato${
                          actual ? " is-complete" : ""
                        }${running ? " is-active" : ""}`}
                        draggable={!actual && !running}
                        title={`${i + 1}段 · 第${j + 1}个 · ${
                          actual
                            ? "已完成：" +
                              parseTitle(actual.task.title).name
                            : running
                            ? "进行中：" +
                              parseTitle(controls.active!.task.title)
                                .name
                            : p.task
                            ? parseTitle(p.task.title).name
                            : "未关联任务"
                        }`}
                        aria-label={`旅程第${i + 1}段第${j + 1}个番茄`}
                        onClick={() => open(p)}
                        onDragStart={(e) => {
                          if (
                            locked(plan, p, records, controls.active)
                          ) {
                            e.preventDefault();
                            return;
                          }
                          drag.current = p.id;
                          e.dataTransfer.setData("text/plain", p.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => (drag.current = null)}
                        onDragOver={(e) => {
                          if (drag.current) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (drag.current)
                            move(drag.current, s.id, p.id);
                          drag.current = null;
                        }}
                      >
                        {actual || running ? (
                          <LogoIcon
                            size={22}
                            tone={
                              actual
                                ? tomatoRecordTone(actual)
                                : "#e2ab52"
                            }
                          />
                        ) : (
                          <JourneyOutline size={22} />
                        )}
                        {j === 0 && s.time !== null ? (
                          <small className="journey-time-corner">
                            {s.time}
                          </small>
                        ) : i === plan.stages.length - 1 &&
                          j === s.slots.length - 1 &&
                          plan.endHour !== null ? (
                          <small className="journey-time-corner">
                            {plan.endHour}
                          </small>
                        ) : null}
                      </button>
                      {actualAt(position)}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="journey-rest">
                  {restActions(s).map((kind, n) => {
                    const key = `${s.id}:${n}`,
                      resting =
                        plan.resting === s.id &&
                        (plan.restingAction || `${s.id}:0`) === key;
                    if (actualRests.some(event => event.presetKey === key && event.kind === kind)) return null;
                    return (
                      <button
                        key={key}
                        className={`journey-rest-button${
                          plan.passedActions.includes(key)
                            ? " is-passed"
                            : ""
                        }`}
                        data-rest-kind={kind}
                        data-rest-index={n}
                        aria-label={`${resting ? "继续" : "休息"}：${
                          REST_LABELS[kind]
                        }`}
                        aria-pressed={resting}
                        disabled={!today}
                        title={
                          resting
                            ? `${REST_LABELS[kind]}中 · 点击结束并继续`
                            : `${REST_LABELS[kind]} · 点击进入，不强制卡点`
                        }
                        onClick={() => kind === "meal" || kind === "nap" || kind === "gym" ? setRestMenu(kind) : toggleRest(s.id, n)}
                      >
                        <JourneyRestIcon kind={kind} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {error && plan && (
        <p className="journey-error" role="alert">
          {error}
        </p>
      )}
      {restEntry && createPortal(
        <div className="journey-overlay" onClick={() => setRestEntry(null)}>
          <section className="journey-dialog journey-rest-dialog" role="dialog" aria-modal="true"
            aria-label={`补记${ACTUAL_REST[restEntry.kind].label}`} onClick={e => e.stopPropagation()}>
            <div className="journey-dialog-heading"><h3>补记{ACTUAL_REST[restEntry.kind].label}</h3>
              <button className="btn-text" aria-label="关闭休息补记" onClick={() => setRestEntry(null)}>关闭</button></div>
            <p className="journey-note">{restEntry.start ? "默认从上一事件结束算起，可以调整起止时间。" : "未找到上一事件，请填写实际开始时间。"}</p>
            <label className="journey-label">开始时间<input aria-label="休息开始时间" type="datetime-local" step="1" value={restEntry.start}
              onChange={e => { setRestEntry({...restEntry,start:e.target.value}); setError(""); }} /></label>
            <label className="journey-label">结束时间<input aria-label="休息结束时间" type="datetime-local" step="1" value={restEntry.end}
              onChange={e => { setRestEntry({...restEntry,end:e.target.value}); setError(""); }} /></label>
            <p className="journey-note">时长 {Number.isFinite(restEntryTimes(restEntry).startedAt) && restEntryTimes(restEntry).endedAt > restEntryTimes(restEntry).startedAt
              ? restClock(restEntryTimes(restEntry) as RestEvent) : "—"}</p>
            {error && <p className="journey-error" role="alert">{error}</p>}
            <div className="journey-dialog-actions"><button className="btn-primary" onClick={() => attempt(() => {
              const times = restEntryTimes(restEntry);
              controls.saveRestBackfill(restEntry.kind,times.startedAt,times.endedAt);
              setRestEntry(null);
            })}>保存休息补记</button><button className="btn-text" onClick={() => setRestEntry(null)}>取消</button></div>
          </section>
        </div>,document.body)}
      {(selected || settings) &&
        createPortal(
          <div
            className="journey-overlay"
            onClick={() => {
              setEdit(null);
              setSettings(false);
            }}
          >
            <section
              className="journey-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={settings ? "设置番茄旅程" : "旅程任务"}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="journey-dialog-heading">
                <h3>
                  {settings
                    ? `${today ? "今日" : "明日"}旅程设置`
                    : done[selected!.id]
                    ? "已完成番茄"
                    : current
                    ? "更换当前任务"
                    : "预设任务"}
                </h3>
                <button
                  className="btn-text"
                  aria-label="关闭旅程编辑"
                  onClick={() => {
                    setEdit(null);
                    setSettings(false);
                  }}
                >
                  关闭
                </button>
              </div>
              {settings ? (
                <JourneyTemplates
                  plan={plan!}
                  today={today}
                  activeToday={today && !!controls.active}
                  onApply={(t) => {
                    if (
                      !ref.current ||
                      ref.current.scope !== scope ||
                      ref.current.day !== day
                    )
                      throw Error(
                        "日期或任务来源已变化，请重新打开模板"
                      );
                    persist(
                      applyJourneyTemplate(
                        ref.current,
                        t,
                        records,
                        controls.active
                      )
                    );
                    setSettings(false);
                  }}
                />
              ) : (
                selected && (
                  <>
                    {done[selected.id] ? (
                      <p>
                        实际任务：
                        {parseTitle(done[selected.id].task.title).name}
                      </p>
                    ) : (
                      <>
                        <label className="journey-label">
                          这个番茄做什么？
                          <select
                            aria-label="预设番茄任务"
                            value={choice}
                            onChange={(e) => setChoice(e.target.value)}
                          >
                            <option value="">
                              自由番茄 · 暂不关联
                            </option>
                            {selected.task && (
                              <option value="__preset__">
                                保留预设：
                                {parseTitle(selected.task.title).name}
                              </option>
                            )}
                            {options.map((t) => (
                              <option key={t.id} value={t.id}>
                                {parseTitle(t.title).name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {selected.task &&
                          !resolveTask(selected.task, tasks, scope) && (
                            <p className="journey-note">
                              预设任务当前无可用日计划。可先保存预设，次日生成今日番茄后再开始；或选择其他任务。
                            </p>
                          )}
                        {!current && (
                          <label className="journey-label">
                            移动到
                            <select
                              aria-label="移动番茄到阶段"
                              value={destination}
                              onChange={(e) =>
                                setDestination(e.target.value)
                              }
                            >
                              {plan!.stages.map((s, i) => (
                                <option key={s.id} value={s.id}>
                                  第{i + 1}段 → {s.rest}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn-text"
                              onClick={() => {
                                move(selected.id, destination);
                                setEdit(null);
                              }}
                            >
                              移动
                            </button>
                          </label>
                        )}
                        <div className="journey-dialog-actions">
                          <button
                            className="btn-primary"
                            onClick={saveTask}
                          >
                            {current ? "更换任务" : "保存任务"}
                          </button>
                          {today && !controls.active && (
                            <button
                              className="btn-primary"
                              onClick={() =>
                                attempt(() => {
                                  const next = JSON.parse(
                                    JSON.stringify(ref.current)
                                  ) as Journey;
                                  next.stages
                                    .flatMap((s) => s.slots)
                                    .find(
                                      (s) => s.id === selected.id
                                    )!.task = selectedRef;
                                  const valid = persist(next);
                                  beginSlot(
                                    valid.stages
                                      .flatMap((s) => s.slots)
                                      .find(
                                        (s) => s.id === selected.id
                                      )!
                                  );
                                })
                              }
                            >
                              开始这个番茄
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )
              )}
              {error && (
                <p className="journey-error" role="alert">
                  {error}
                </p>
              )}
            </section>
          </div>,
          document.body
        )}
    </div>
  );
}
