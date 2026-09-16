// 概览数字的 count-up 滚动动效：纯展示层，由 React 值变化自然驱动。
// 克制原则：不弹窗、不遮挡、不改布局；隐藏窗口 rAF 被节流时由兜底
// 定时器保证收敛到最终值；prefers-reduced-motion 时直接跳变。
import { useEffect, useRef, useState } from "react";

export const COUNT_UP_MS = 500;

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

// t∈[0,1]（越界自动收敛），返回整数补间值
export function countUpValue(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * easeOutCubic(t));
}

// 减动效偏好 → 时长归零（跳变）
export function countUpDuration(
  reducedMotion: boolean,
  base: number = COUNT_UP_MS
): number {
  return reducedMotion ? 0 : base;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// 目标值变化时从当前显示值补间到目标；快速连变时从中途值续接，不跳回
export function useCountUp(target: number, duration = COUNT_UP_MS): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  useEffect(() => {
    const ms = countUpDuration(prefersReducedMotion(), duration);
    const from = displayRef.current;
    if (ms <= 0 || from === target) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const value = countUpValue(from, target, (now - start) / ms);
      displayRef.current = value;
      setDisplay(value);
      if (now - start < ms) raf = requestAnimationFrame(tick);
      else {
        displayRef.current = target;
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    // 隐藏窗口/后台节流时 rAF 可能永不触发：兜底收敛，绝不停留旧值
    const settle = setTimeout(() => {
      cancelAnimationFrame(raf);
      displayRef.current = target;
      setDisplay(target);
    }, ms + 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [target, duration]);
  return display;
}
