import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { ProjectType } from "../session";
import { PROJECT_TYPES } from "../classification.js";
import { PROJECT_LABELS, PROJECT_TONES } from "../week";

// Native Windows options cannot render an independently colored dot.
// Use the same tone/label source as the history classification menu.
export default function CategorySelect({
  value,
  onChange,
}: {
  value: ProjectType | "";
  onChange: (value: ProjectType | "") => void;
}) {
  const values = ["", ...PROJECT_TYPES] as (ProjectType | "")[];
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 240,
  });
  const label = (type: ProjectType | "") =>
    type ? PROJECT_LABELS[type] : "跟随任务项目";
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (open)
      document
        .getElementById(`category-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(
        Math.max(rect.width, 220),
        window.innerWidth - 16
      );
      const height = menu.current?.offsetHeight || 300;
      setPosition({
        width,
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - width - 8)
        ),
        top: Math.max(
          8,
          Math.min(rect.bottom + 4, window.innerHeight - height - 8)
        ),
      });
    };
    place();
    menu.current?.focus();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (
        !trigger.current?.contains(e.target as Node) &&
        !menu.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const show = () => {
    setActive(Math.max(0, values.indexOf(value)));
    setOpen(true);
  };
  const dot = (type: ProjectType | "") => (
    <i
      aria-hidden="true"
      style={{ background: type ? PROJECT_TONES[type] : undefined }}
      className={type ? "" : "category-inherit"}
    />
  );
  return (
    <>
      <button
        type="button"
        id="manual-category"
        ref={trigger}
        className="category-select"
        role="combobox"
        aria-labelledby="manual-category-label"
        aria-controls="manual-category-options"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            show();
          }
        }}
      >
        {dot(value)}
        <span>{label(value)}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open &&
        createPortal(
          <div
            id="manual-category-options"
            className="category-options"
            ref={menu}
            role="listbox"
            tabIndex={-1}
            aria-labelledby="manual-category-label"
            aria-activedescendant={`category-option-${active}`}
            style={position}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "Tab") {
                e.preventDefault();
                setOpen(false);
                if (e.shiftKey) trigger.current?.focus();
                else document.getElementById("manual-minutes")?.focus();
              } else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(values[active]);
                close();
              } else if (
                ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
              ) {
                const key = e.key;
                e.preventDefault();
                setActive((i) =>
                  key === "Home"
                    ? 0
                    : key === "End"
                    ? values.length - 1
                    : (i +
                        (key === "ArrowDown" ? 1 : values.length - 1)) %
                      values.length
                );
              }
            }}
          >
            {values.map((type, i) => (
              <div
                key={type}
                id={`category-option-${i}`}
                role="option"
                aria-selected={value === type}
                className={i === active ? "active" : ""}
                onPointerMove={() => setActive(i)}
                onClick={() => {
                  onChange(type);
                  close();
                }}
              >
                {dot(type)}
                <span>{label(type)}</span>
                {value === type && <small>✓</small>}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
