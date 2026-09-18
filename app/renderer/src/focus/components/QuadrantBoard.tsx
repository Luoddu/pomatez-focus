import React, { useState } from "react";
import { FocusTask, FocusQuadrant } from "../session";
import QuickTaskEntry from "./QuickTaskEntry";
import { QuadrantKey } from "../week";
import { QUADRANTS, clock, groupTasks, parseTitle } from "./shared";
import FarmField from "./FarmField";
import TaskTitle from "./TaskTitle";

// 已收格子的视觉上限：计划数很大时只画前 12 格，文字仍显示真实 x/y
const HARVEST_CELLS_MAX = 12;

const GroupList = ({
  tasks,
  selected,
  onSelect,
  onAdjust,
  adjusting,
  activeTaskId,
  onComplete,
  completing,
}: {
  tasks: FocusTask[];
  selected: string;
  onSelect: (id: string) => void;
  onAdjust?: (taskId: string, delta: 1 | -1) => void;
  adjusting: string;
  activeTaskId: string;
  onComplete?: (task: FocusTask) => void;
  completing: string;
}) => {
  const [hover, setHover] = useState("");
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
        const rows = group.tasks.filter((t) => t.kind !== "done");
        const info = group.tasks.find((t) => t.plannedToday != null);
        const done = info?.doneToday ?? 0;
        const planned = info?.plannedToday ?? rows.length;
        const pending = rows.filter((t) => t.kind !== "pending").length;
        const complete = planned > 0 && done >= planned;
        const taskId = group.tasks[0]?.taskId || "";
        const canAdjust =
          !!onAdjust &&
          !!taskId &&
          !group.tasks.some((t) => t.kind === "free" || t.quickTask);
        const busy = adjusting === group.key;
        // 计时中的任务不允许减：该行可能已有未同步的专注分钟
        const timing = !!activeTaskId && activeTaskId === taskId;
        return (
          <div
            className={`task${complete ? " complete" : ""}`}
            key={group.key}
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
                />
                {group.tasks.some((t) => t.quickTask) && (
                  <small> · 待同步，可专注</small>
                )}
              </div>
              <div className="chips">
                {rows.map((task) => (
                  <button
                    key={task.id}
                    className={`chip tone-${task.quadrant || "unu"} ${
                      task.id === selected ? "selected" : ""
                    } ${task.kind === "pending" ? "pending" : ""}`}
                    title={
                      canComplete(task)
                        ? `${task.title}（右键可标记完成）`
                        : task.title
                    }
                    disabled={task.kind === "pending"}
                    onClick={() => onSelect(task.id)}
                    onContextMenu={(e) => {
                      if (!canComplete(task)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setMenu({ task, x: e.clientX, y: e.clientY });
                    }}
                  >
                    {parseTitle(task.title).pomodoro}
                  </button>
                ))}
              </div>
            </div>
            <div className="task-side">
              {canAdjust && (hover === group.key || busy) && (
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
                    disabled={busy || pending === 0 || timing}
                    onClick={() => onAdjust!(taskId, -1)}
                  >
                    −
                  </button>
                  <button
                    className="adjust-btn"
                    aria-label={`增加番茄：${group.name}`}
                    title="增加一个今日番茄"
                    disabled={busy}
                    onClick={() => onAdjust!(taskId, 1)}
                  >
                    ＋
                  </button>
                </span>
              )}
              <span
                className={`harvest-mini ${complete ? "done" : ""}`}
                title={`今日已收 ${done} 个，共计划 ${planned} 个`}
              >
                已收 {done}/{planned}
                {complete ? " ✓" : ""}
                <span className="cells">
                  {Array.from(
                    { length: Math.min(planned, HARVEST_CELLS_MAX) },
                    (_, i) => (
                      <span
                        key={i}
                        className={`cell ${i < done ? "on" : ""}`}
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
  onMinutes,
  onBegin,
  onBreak,
  busy,
  blocked,
  canBreak,
  restSeconds,
  totalTomatoes,
  weekTomatoes,
  weekTones,
  pileTones,
  farmNow,
  onAdjust,
  adjusting,
  activeTaskId,
  onComplete,
  completing,
  onAddTask,
}: {
  tasks: FocusTask[];
  selected: string;
  onSelect: (id: string) => void;
  minutes: number;
  onMinutes: (minutes: number) => void;
  onBegin: () => void;
  onBreak: () => void;
  busy: boolean;
  blocked: boolean;
  canBreak: boolean;
  restSeconds: number;
  totalTomatoes: number;
  weekTomatoes: number;
  weekTones: QuadrantKey[];
  pileTones: QuadrantKey[];
  farmNow?: number;
  onAdjust?: (taskId: string, delta: 1 | -1) => void;
  adjusting: string;
  activeTaskId: string;
  onComplete?: (task: FocusTask) => void;
  completing: string;
  onAddTask?: (
    title: string,
    quadrant: FocusQuadrant,
    count: number
  ) => void;
}) {
  const [adding, setAdding] = useState<FocusQuadrant | null>(null);
  const selectedRow = tasks.find((t) => t.id === selected);
  const selectedTask = selectedRow ? selectedRow.title : "";
  // 象限缺失或无法识别的任务全部归入“不紧急不重要”
  const quadrantOf = (t: FocusTask) => t.quadrant || "unu";
  // 两行两列：同一行内一空一有时，空象限收成细条（slim），
  // 有任务的象限横向占满剩余行宽（spread，任务双列排布）
  const rows = [QUADRANTS.slice(0, 2), QUADRANTS.slice(2, 4)];
  return (
    <div className="left-col">
      <div className="quadrants">
        {rows.map((row) => {
          const rowLists = row.map((q) =>
            tasks.filter((t) => quadrantOf(t) === q.key)
          );
          const borrowing =
            !rowLists[0].length !== !rowLists[1].length;
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
                    }${spread ? " spread" : ""}`}
                    key={q.key}
                    data-quadrant={q.key}
                  >
              <div className="quad-head">
                <span className={`pill ${q.pill}`}>{q.label}</span>
                <span className="quad-count">{list.length} 个任务</span>
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
                  onClose={() => setAdding(null)}
                />
              )}
              <GroupList
                tasks={list}
                selected={selected}
                onSelect={onSelect}
                onAdjust={onAdjust}
                adjusting={adjusting}
                activeTaskId={activeTaskId}
                onComplete={onComplete}
                completing={completing}
              />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <FarmField
        total={totalTomatoes}
        week={weekTomatoes}
        tones={weekTones}
        pileTones={pileTones}
        now={farmNow}
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
            {canBreak && restSeconds <= 0 && (
              <button className="btn-text" onClick={onBreak}>
                休息 5 分钟
              </button>
            )}
            {restSeconds > 0 && (
              <div className="rest-bar" role="status">
                <div
                  className="rest-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (restSeconds / 300) * 100)
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
