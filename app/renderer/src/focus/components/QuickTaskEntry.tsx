import React, { useState } from "react";
import type { FocusQuadrant } from "../session";
export default function QuickTaskEntry({
  quadrant,
  onAdd,
  onClose,
}: {
  quadrant: FocusQuadrant;
  onAdd: (
    title: string,
    quadrant: FocusQuadrant,
    count: number
  ) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(1);
  const [error, setError] = useState("");
  return (
    <form
      className="quick-task-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          if (!title.trim() || title.trim().length > 200)
            throw Error("请输入 1–200 字的任务名称");
          if (!Number.isInteger(count) || count < 1 || count > 50)
            throw Error("计划番茄数应为 1–50");
          onAdd(title.trim(), quadrant, count);
          onClose();
        } catch (err: any) {
          setError(err.message);
        }
      }}
    >
      <input
        autoFocus
        aria-label="新增任务名称"
        placeholder="临时要做什么？"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="manual-inline">
        <label>
          今日番茄{" "}
          <input
            aria-label="新增任务番茄数"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <button className="btn-small" type="submit">
          添加
        </button>
        <button className="btn-text" type="button" onClick={onClose}>
          取消
        </button>
      </div>
      {error && (
        <div role="alert" className="manual-error">
          {error}
        </div>
      )}
    </form>
  );
}
