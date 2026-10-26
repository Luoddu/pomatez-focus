import React, { useEffect, useRef, useState } from "react";
import {
  FocusTask,
  FocusQuadrant,
  FocusProject,
  FocusSession,
} from "../session";
import QuickTaskEntry from "./QuickTaskEntry";
import { QUADRANTS, clock, groupTasks, parseTitle } from "./shared";
import { chipWindow } from "../chipWindow";
import FarmField from "./FarmField";
import TaskTitle from "./TaskTitle";
import { effectiveTaskProgress, formatEffective, TomatoWeights } from "../weights";
import { withTaskCredit, partialProgress } from "../partialTomato";

// 已收格子的视觉上限：计划数很大时只画前 12 格，文字仍显示真实 x/y
const HARVEST_CELLS_MAX = 12;
type BoardDrag = { key: string; scope: string };
type Move = (key: string, quadrant: FocusQuadrant, target?: string, after?: boolean) => void;

const GroupList = ({
  tasks,
  selected,
  onSelect,
  onAdjust,
  activeTaskId,
  onComplete,
  completing,
  dragRef,
  boardScope,
  onMove,
  quadrant,
  onDragChange,
  records,
  weights,
}: {
  tasks: FocusTask[];
  selected: string;
  onSelect: (id: string) => void;
  onAdjust?: (taskId: string, delta: 1 | -1) => void;
  activeTaskId: string;
  onComplete?: (task: FocusTask) => void;
  completing: string;
  dragRef: React.MutableRefObject<BoardDrag | null>;
  boardScope: string | null;
  onMove?: Move;
  quadrant: FocusQuadrant;
  onDragChange: (key: string) => void;
  records: FocusSession[];
  weights?: TomatoWeights;
}) => {
  const [hover, setHover] = useState("");
  const [landing, setLanding] = useState<{key: string; after: boolean} | null>(null);
  // 右键 chip 的上下文菜单：单选项「标记完成」，点别处或右键别处关闭
  const [menu, setMenu] = useState<{
    task: FocusTask;
    x: number;
    y: number;
  } | null>(null);
  const canComplete = (task: FocusTask) =>
    !!onComplete &&
    !!task.taskId &&
    !task.quickTask &&
    task.kind !== "free" &&
    task.kind !== "pending";
  return (
    <div className="task-list">
      {groupTasks(tasks).map((group) => {
        // 占位行（done）只贡献已收数据，不渲染 chip；pending 是乐观临时 chip
        const research = group.tasks.some(
          (t) => t.projectType === "research"
        );
        const rows = group.tasks.filter((t) => t.kind !== "done");
        const info = group.tasks.find((t) => t.plannedToday != null);
        const rawDone = info?.doneToday ?? 0;
        const rawPlanned = info?.plannedToday ?? rows.length;
        const {done, planned, missing} = effectiveTaskProgress({...group.tasks[0], doneToday:rawDone, plannedToday:rawPlanned}, records, Date.now(), weights);
        const pending = rows.filter(
          (t) =>
            t.kind !== "pending" &&
            !t.creditedSeconds &&
            !t.appliedSessionIds?.length
        ).length;
        const complete = rawPlanned > 0 && rawDone >= rawPlanned;
        const taskId = group.tasks[0]?.taskId || "";
        const canAdjust =
          !!onAdjust &&
          !!taskId &&
          !taskId.startsWith("quick-") &&
          !group.tasks.some((t) => t.kind === "free");
        // 计时中的任务不允许减：该行可能已有未同步的专注分钟
        const timing = !!activeTaskId && activeTaskId === taskId;
        const draggable = !!boardScope && !!onMove && !group.tasks.some(t => t.quickTask || t.kind === "pending" || t.kind === "free");
        return (
          <div
            className={`task${complete ? " complete" : ""}${
              research ? " is-research" : ""
            }${landing?.key === group.key ? landing.after ? " drop-after" : " drop-before" : ""}`}
            key={group.key}
            data-task-group={group.key}
            onDragOver={(e) => {
              if (!onMove || !dragRef.current || dragRef.current.scope !== boardScope || dragRef.current.key === group.key) return;
              e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect = "move";
              const r=e.currentTarget.getBoundingClientRect();setLanding({key:group.key,after:e.clientY>=r.top+r.height/2});
            }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setLanding(null); }}
            onDrop={(e) => {
              e.preventDefault();e.stopPropagation();const d=dragRef.current;
              if (d && d.scope===boardScope && onMove) {
                const r=e.currentTarget.getBoundingClientRect();onMove(d.key,quadrant,group.key,e.clientY>=r.top+r.height/2);
              }
              dragRef.current=null;setLanding(null);onDragChange("");
            }}
            onMouseOver={() => setHover(group.key)}
            onMouseOut={(e) => {
              // 子元素之间移动不算移出；只有真正离开整行才收起 ±
              const next = e.relatedTarget as Node | null;
              if (next && e.currentTarget.contains(next)) return;
              setHover((h) => (h === group.key ? "" : h));
            }}
          >
            <div className="task-main">
              <div className="task-name">
                <TaskTitle
                  taskKey={group.key}
                  title={group.name}
                  description={
                    group.tasks.find((t) => t.description)?.description
                  }
                  drag={draggable ? {
                    onStart: e => { dragRef.current={key:group.key,scope:boardScope!};e.dataTransfer.setData("application/x-pomatez-task",group.key);e.dataTransfer.effectAllowed="move";onDragChange(group.key); },
                    onEnd: () => { dragRef.current=null;setLanding(null);onDragChange(""); }
                  } : undefined}
                />
                {group.tasks.some((t) => t.quickTask) && (
                  <small> · 待同步，可专注</small>
                )}
              </div>
              <div className="chips">
                {(() => {
                  // chip 单行窗口：最多渲染前 6 个待办；选中序超出时窗口右滑
                  const win = chipWindow(
                    rows.length,
                    rows.findIndex((t) => t.id === selected)
                  );
                  const hiddenBefore = win.start;
                  const hiddenAfter = rows.length - win.end;
                  return (
                    <>
                      {hiddenBefore > 0 && (
                        <span
                          className="chips-more"
                          title={`前面还有 ${hiddenBefore} 个番茄`}
                        >
                          +{hiddenBefore}
                        </span>
                      )}
                      {rows.slice(win.start, win.end).map((task) => {
                        const partial=partialProgress(withTaskCredit(task,records));return (
                        <button
                          key={task.id}
                          className={`chip tone-${
                            task.quadrant || "unu"
                          } ${task.id === selected ? "selected" : ""} ${
                            task.kind === "pending" ? "pending" : ""
                          } ${partial.credit>0?"partial-tomato":""
                          }`}
                          title={
                            (canComplete(task)
                              ? `${task.title}（右键可标记完成）`
                              : task.title)
                          + (partial.credit>0?` · 未完成：已投入 ${clock(partial.credit)}，剩余 ${clock(partial.remaining)}`:"")
                          }
                          disabled={task.kind === "pending"}
                          onClick={() => onSelect(task.id)}
                          onContextMenu={(e) => {
                            if (!canComplete(task)) return;
                            e.preventDefault();
                            e.stopPropagation();
                            setMenu({
                              task,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                        >
                          {parseTitle(task.title).pomodoro}
                        </button>
                      );})}
                      {hiddenAfter > 0 && (
                        <span
                          className="chips-more"
                          title={`还有 ${hiddenAfter} 个番茄，收完前面的番茄后会继续出现`}
                        >
                          +{hiddenAfter}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="task-side">
              {canAdjust && hover === group.key && (
                <span className="adjust-btns">
                  <button
                    className="adjust-btn"
                    aria-label={`减少番茄：${group.name}`}
                    title={
                      timing
                        ? "计时中的任务不能减番茄"
                        : pending === 0
                        ? "没有可减的待办番茄"
                        : "减去一个待办番茄"
                    }
                    disabled={pending === 0 || timing}
                    onClick={() => onAdjust!(taskId, -1)}
                  >
                    −
                  </button>
                  <button
                    className="adjust-btn"
                    aria-label={`增加番茄：${group.name}`}
                    title="增加一个今日番茄"
                    onClick={() => onAdjust!(taskId, 1)}
                  >
                    ＋
                  </button>
                </span>
              )}
              {/* 已收进度：文字在上、红色记数格在下，仍驻行尾右侧 */}
              <span
                className={`harvest-mini ${complete ? "done" : ""}`}
                title={`今日有效已收 ${formatEffective(done)} 个，共计划 ${formatEffective(planned)} 个${missing ? "（部分明细尚未加载，缺失部分按任务项目比例折算）" : ""}`}
              >
                <span className="hm-text">
                  已收 {formatEffective(done)}/{formatEffective(planned)}
                  {complete ? " ✓" : ""}
                </span>
                <span className="cells">
                  {Array.from(
                    { length: Math.min(Math.ceil(planned), HARVEST_CELLS_MAX) },
                    (_, i) => (
                      <span
                        key={i}
                        className={`cell ${i < done ? "on" : ""}`}
                        style={{ opacity: i < done ? Math.min(1, done-i) : undefined }}
                      />
                    )
                  )}
                </span>
              </span>
            </div>
          </div>
        );
      })}
      {!tasks.length && <div className="quad-empty">暂无任务</div>}
      {menu && (
        <div
          className="ctx-overlay"
          onClick={() => setMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu(null);
          }}
        >
          <div
            className="ctx-menu"
            role="menu"
            style={{
              left: Math.min(menu.x, window.innerWidth - 140),
              top: Math.min(menu.y, window.innerHeight - 60),
            }}
          >
            <button
              className="ctx-item"
              role="menuitem"
              disabled={completing === menu.task.id}
              onClick={() => {
                const task = menu.task;
                setMenu(null);
                onComplete!(task);
              }}
            >
              {completing === menu.task.id
                ? "正在完成…"
                : "标记完成（不计专注时间）"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function QuadrantBoard({
  tasks,
  selected,
  onSelect,
  minutes,
  breakMinutes = 5,
  restDuration = 300,
  onMinutes,
  onBegin,
  onBreak,
  busy,
  blocked,
  canBreak,
  restSeconds,
  totalTomatoes,
  effectiveTotal,
  weekTomatoes,
  weekTones,
  pileTones,
  farmNow,
  onAdjust,
  activeTaskId,
  onComplete,
  completing,
  onAddTask,
  loadProjects,
  records,
  weights,
  journalSource,
  journalConnected,
  boardScope = null,
  onMove,
  resumeFree,
  onResumeFree,
  capture,
}: {
  tasks: FocusTask[];
  selected: string;
  onSelect: (id: string) => void;
  minutes: number;
  breakMinutes?: number;
  restDuration?: number;
  onMinutes: (minutes: number) => void;
  onBegin: () => void;
  onBreak: () => void;
  busy: boolean;
  blocked: boolean;
  canBreak: boolean;
  restSeconds: number;
  totalTomatoes: number;
  effectiveTotal?: number;
  weekTomatoes: number;
  weekTones: string[];
  pileTones: string[];
  farmNow?: number;
  onAdjust?: (taskId: string, delta: 1 | -1) => void;
  activeTaskId: string;
  onComplete?: (task: FocusTask) => void;
  completing: string;
  onAddTask?: (
    title: string,
    quadrant: FocusQuadrant,
    count: number,
    project?: FocusProject
  ) => void;
  loadProjects?: () => Promise<FocusProject[]>;
  records: FocusSession[];
  weights?: TomatoWeights;
  journalSource: string;
  journalConnected: boolean;
  boardScope?: string | null;
  onMove?: Move;
  resumeFree?: FocusTask[];
  onResumeFree?:(task:FocusTask)=>void;
  capture?: React.ReactNode;
}) {
  const [adding, setAdding] = useState<FocusQuadrant | null>(null);
  const dragRef = useRef<BoardDrag | null>(null);
  const [dragging, setDragging] = useState("");
  const [overQuadrant, setOverQuadrant] = useState<FocusQuadrant | null>(null);
  const dragChange = (key: string) => { setDragging(key);if (!key) setOverQuadrant(null); };
  useEffect(() => { dragRef.current=null;dragChange(""); }, [boardScope]);
  const selectedRow = tasks.find((t) => t.id === selected);
  const selectedTask = selectedRow ? selectedRow.title : "";
  // 象限缺失或无法识别的任务全部归入“不紧急不重要”
  const quadrantOf = (t: FocusTask) => t.quadrant || "unu";
  // 两行两列：同一行内一空一有时，空象限收成细条（slim），
  // 有任务的象限横向占满剩余行宽（spread，任务双列排布）
  const rows = [QUADRANTS.slice(0, 2), QUADRANTS.slice(2, 4)];
  return (
    <div className="left-col">
      {capture}
      <div className={`quadrants${dragging ? " is-dragging" : ""}`}>
        {rows.map((row) => {
          const rowLists = row.map((q) =>
            tasks.filter((t) => quadrantOf(t) === q.key)
          );
          const borrowing = !rowLists[0].length !== !rowLists[1].length;
          return (
            <div className="quad-row" key={row[0].key}>
              {row.map((q, i) => {
                const list = rowLists[i];
                const slim = borrowing && !list.length;
                const spread = borrowing && !!list.length;
                return (
                  <div
                    className={`card quad quad-${q.key}${
                      slim ? " slim" : ""
                    }${spread ? " spread" : ""}${overQuadrant===q.key ? " drag-over" : ""}`}
                    key={q.key}
                    data-quadrant={q.key}
                    onDragOver={(e) => { if (!onMove || !dragRef.current || dragRef.current.scope!==boardScope) return;e.preventDefault();e.dataTransfer.dropEffect="move";setOverQuadrant(q.key); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverQuadrant(null); }}
                    onDrop={(e) => { e.preventDefault();const d=dragRef.current;if (d && d.scope===boardScope && onMove) onMove(d.key,q.key);dragRef.current=null;dragChange(""); }}
                  >
                    <div className="quad-head">
                      <span className={`pill ${q.pill}`}>
                        {q.label}
                      </span>
                      <span className="quad-count">
                        {list.length} 个任务
                      </span>
                      {onAddTask && (
                        <button
                          className="quad-add ghost-btn"
                          aria-label={`在${q.label}新增任务`}
                          title="新增任务"
                          onClick={() => setAdding(q.key)}
                        >
                          ＋
                        </button>
                      )}
                    </div>
                    {adding === q.key && onAddTask && (
                      <QuickTaskEntry
                        quadrant={q.key}
                        onAdd={onAddTask}
                        loadProjects={loadProjects}
                        onClose={() => setAdding(null)}
                      />
                    )}
                    <GroupList
                      records={records}
                      weights={weights}
                      tasks={list}
                      selected={selected}
                      onSelect={onSelect}
                      onAdjust={onAdjust}
                      activeTaskId={activeTaskId}
                      onComplete={onComplete}
                      completing={completing}
                      dragRef={dragRef}
                      boardScope={boardScope}
                      onMove={onMove}
                      quadrant={q.key}
                      onDragChange={dragChange}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <FarmField
        weights={weights}
        total={totalTomatoes}
        effectiveTotal={effectiveTotal}
        week={weekTomatoes}
        tones={weekTones}
        pileTones={pileTones}
        now={farmNow}
        records={records}
        journalSource={journalSource}
        journalConnected={journalConnected}
      />
      <div className="action-bar">
        <div className="action-side">
          <span className="hint duration-hint">
            番茄时长{" "}
            <input
              aria-label="番茄时长"
              type="number"
              min="1"
              max="180"
              value={minutes}
              onChange={(e) => onMinutes(Number(e.target.value))}
            />{" "}
            分钟
          </span>
          <div className="action-side-row">
            {resumeFree?.map(task=><button key={task.id} className="btn-text resume-free" disabled={busy||blocked} title="继续之前切断的同一个自由番茄" onClick={()=>onResumeFree?.(task)}>接续自由番茄 · 剩余 {clock(partialProgress(task).remaining)}</button>)}
            {canBreak && restSeconds <= 0 && (
              <button className="btn-text" onClick={onBreak}>
                休息 {breakMinutes} 分钟
              </button>
            )}
            {restSeconds > 0 && (
              <div className="rest-bar" role="status">
                <div
                  className="rest-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (restSeconds / restDuration) * 100)
                    )}%`,
                  }}
                />
                <span className="rest-label">
                  休息中 {clock(restSeconds)}
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          className="btn-begin"
          aria-label="开始专注"
          disabled={busy || blocked || restSeconds > 0}
          onClick={onBegin}
        >
          <span className="begin-title">
            {selectedTask ? "开始专注" : "开始自由专注"}
          </span>
          <span className="begin-sub">
            {selectedTask
              ? `已选：${selectedTask}`
              : "自由番茄 · 无需选择任务"}
          </span>
        </button>
      </div>
    </div>
  );
}
