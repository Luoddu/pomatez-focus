import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// A read-only popover: opening it never selects a tomato or changes the timer.
export default function TaskTitle({
  taskKey,
  title,
  description,
}: {
  taskKey: string;
  title: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = `task-details-${encodeURIComponent(taskKey)}`;
  useLayoutEffect(() => {
    if (!open || !button.current || !panel.current) return;
    const anchor = button.current.getBoundingClientRect();
    const box = panel.current.getBoundingClientRect();
    setPosition({
      left: Math.max(
        12,
        Math.min(anchor.left, window.innerWidth - box.width - 12)
      ),
      top: Math.max(
        12,
        Math.min(
          anchor.bottom + 8,
          window.innerHeight - box.height - 12
        )
      ),
    });
  }, [open, description]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => {
      const target = e.target as Node;
      if (
        !button.current?.contains(target) &&
        !panel.current?.contains(target)
      )
        setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const resize = () => setOpen(false);
    const scroll = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", outside, true);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("click", outside, true);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  if (!description) return <>{title}</>;
  return (
    <>
      <button
        ref={button}
        className="task-title-button"
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="单击查看任务详情"
        onClick={() => setOpen((value) => !value)}
      >
        {title}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={panelId}
            className="task-detail-popover"
            role="region"
            aria-label={`${title}：任务详情`}
            style={position}
          >
            <div className="task-detail-heading">{title}</div>
            <div className="task-detail-text">{description}</div>
          </div>,
          document.body
        )}
    </>
  );
}
