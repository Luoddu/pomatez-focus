import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { FocusSession } from "../session";
import { api } from "./shared";
import {
  beijingDate,
  companionGreeting,
  companionPromptSlot,
  routineSummary,
} from "../wellbeing.js";
import { loadJournal, mergeJournal, saveJournal } from "../journal.js";

type Note = {
  id: string;
  sourceKey: string;
  at: number;
  author: "我" | "澄";
  text: string;
  replyTo?: string;
  synced: boolean;
};
// The board unmounts while timing. Serialize its journal work across mounts;
// merge the latest persisted notes so an older receipt cannot erase a new note.
let journalTail: Promise<void> = Promise.resolve();
export default function FarmCompanion({
  records,
  now,
  sourceKey,
  connected,
  anchor,
  open,
  onOpenChange,
}: {
  records: FocusSession[];
  now: number;
  sourceKey: string;
  connected: boolean;
  anchor: React.RefObject<SVGGElement>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [automatic, setAutomatic] = useState<{
    key: string;
    text: string;
  } | null>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({
    left: 8,
    top: 8,
    arrow: 40,
  });
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [revision, setRevision] = useState(0);
  const [journalBusy, setJournalBusy] = useState(false);
  const entries = useRef<Note[]>([]),
    running = useRef(false),
    healthy = useRef(true);
  const mounted = useRef(true);
  const scope = sourceKey || "0".repeat(64);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  useEffect(() => {
    mounted.current = true;
    try {
      entries.current = loadJournal(localStorage);
      setNotes(entries.current);
      healthy.current = true;
    } catch (e) {
      healthy.current = false;
      setError((e as Error).message);
    }
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    try {
      setDraft(
        localStorage.getItem(`pomatez-journal-draft-${scope}`) || ""
      );
    } catch {
      setError("日记草稿存储不可用，请先保留文字");
    }
  }, [scope]);
  const persist = (next: Note[]) => {
    const saved = saveJournal(localStorage, next) as Note[];
    entries.current = saved;
    if (mounted.current) setNotes(saved);
  };
  useEffect(() => {
    if (
      !connected ||
      !sourceKey ||
      !api()?.journal ||
      running.current ||
      !healthy.current
    )
      return;
    const attempted = new Set<string>();
    running.current = true;
    setJournalBusy(true);
    setStatus("正在同步日记");
    const work = async () => {
      let failed = false;
      try {
        entries.current = loadJournal(localStorage);
        let next;
        while (
          (next = entries.current.find(
            (n) =>
              n.sourceKey === sourceKey &&
              !n.synced &&
              !attempted.has(n.id)
          ))
        ) {
          attempted.add(next.id);
          const receipt = await api().saveJournal(next);
          if (
            receipt.sourceKey !== sourceKey ||
            receipt.id !== next.id ||
            !receipt.synced
          )
            throw Error("日记回执所属连接不一致，保留本机");
          persist(
            mergeJournal(loadJournal(localStorage), [receipt]) as Note[]
          );
        }
        const remote = await api().journal();
        if (
          remote.sourceKey !== sourceKey ||
          remote.notes.some(
            (n: Note) => n.sourceKey !== sourceKey || !n.synced
          )
        )
          throw Error("日记来源不一致，未合入");
        persist(
          mergeJournal(
            loadJournal(localStorage),
            remote.notes
          ) as Note[]
        );
        if (mounted.current && scopeRef.current === sourceKey) {
          setStatus("日记已同步飞书");
          setError("");
        }
      } catch (e) {
        failed = true;
        if (mounted.current && scopeRef.current === sourceKey) {
          setError(`日记保留本机 · ${(e as Error).message}`);
          setStatus("待同步");
        }
      } finally {
        running.current = false;
        if (mounted.current) setJournalBusy(false);
        if (
          mounted.current &&
          (scopeRef.current !== sourceKey ||
            (!failed &&
              entries.current.some(
                (n) =>
                  n.sourceKey === sourceKey &&
                  !n.synced &&
                  !attempted.has(n.id)
              )))
        )
          setRevision((v) => v + 1);
      }
    };
    journalTail = journalTail.then(work, work);
    // Retry only on explicit save/sync/reconnect, never poll a failed request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, sourceKey, revision]);
  useEffect(() => {
    if (!connected || !sourceKey || !api()?.journal) return;
    let lastRead = Date.now();
    let disposed = false;
    const refresh = () => {
      if (
        document.visibilityState !== "visible" ||
        !healthy.current ||
        Date.now() - lastRead < 60000
      )
        return;
      lastRead = Date.now();
      const read = async () => {
        if (disposed || scopeRef.current !== sourceKey) return;
        try {
          // Focus refresh is read-only: it must never replay a failed upload.
          const remote = await api().journal();
          if (
            remote.sourceKey !== sourceKey ||
            remote.notes.some(
              (n: Note) => n.sourceKey !== sourceKey || !n.synced
            )
          )
            throw Error("日记来源不一致，未合入");
          persist(
            mergeJournal(
              loadJournal(localStorage),
              remote.notes
            ) as Note[]
          );
        } catch (e) {
          if (!disposed && scopeRef.current === sourceKey)
            setError(`日记保留本机 · ${(e as Error).message}`);
        }
      };
      journalTail = journalTail.then(read, read);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
    // Same UUID merge/serialization as regular sync; no timer or upload here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, sourceKey]);
  const today = beijingDate(now);
  const todayRecords = records.filter(
    (r) => beijingDate(r.startedAt) === today
  );
  const count = todayRecords.reduce(
    (n, r) => n + (r.completedCount || 0),
    0
  );
  const routine = routineSummary(todayRecords);
  const greeting = companionGreeting(
    now,
    count,
    routine.morningSeconds
  );
  const dailyPrompt = notes.find(
    (n) =>
      n.sourceKey === scope &&
      n.author === "澄" &&
      beijingDate(n.at) === today
  );
  // Sleep and holiday guidance always wins over an external work prompt.
  const speech =
    dailyPrompt && ["day", "morning"].includes(greeting.kind)
      ? dailyPrompt.text
      : greeting.text;
  const visible = notes.filter((n) => n.sourceKey === scope);
  const pending = visible.filter((n) => !n.synced).length;
  const slot = companionPromptSlot(now);
  useEffect(() => {
    setAutomatic(null);
  }, [scope]);
  const promptKey =
    dailyPrompt && ["day", "morning"].includes(greeting.kind)
      ? `cheng:${dailyPrompt.id}`
      : slot
      ? `${today}:${slot}`
      : "";
  const reminderText =
    slot === "morning" && greeting.kind === "holiday"
      ? `早上好。${greeting.text}`
      : speech;
  useEffect(() => {
    if (!promptKey || document.visibilityState !== "visible") return;
    try {
      const key = `pomatez-companion-seen-${scope}`;
      const old = JSON.parse(localStorage.getItem(key) || "[]");
      const seen: string[] = Array.isArray(old)
        ? old.filter((v) => typeof v === "string")
        : [];
      if (seen.includes(promptKey)) return;
      // Persist before showing: board remounts/restarts must not nag again.
      const next = [...seen, promptKey];
      if (slot) next.push(`${today}:${slot}`);
      localStorage.setItem(
        key,
        JSON.stringify(Array.from(new Set(next)).slice(-120))
      );
      if (!open) setAutomatic({ key: promptKey, text: reminderText });
    } catch {
      /* A failed reminder receipt must not cause repeated popups. */
    }
  }, [scope, today, slot, promptKey, reminderText, open, now]);
  useEffect(() => {
    if (open) {
      setAutomatic(null);
      closeButton.current?.focus();
      return;
    }
    if (!automatic) return;
    const timer = setTimeout(() => setAutomatic(null), 30000);
    return () => clearTimeout(timer);
  }, [open, automatic]);
  const showing = open || !!automatic;
  useLayoutEffect(() => {
    if (!showing) return;
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      const panel = bubble.current;
      if (!rect || !panel) return;
      const left = Math.max(
        8,
        Math.min(
          rect.left + rect.width / 2 - panel.offsetWidth + 48,
          window.innerWidth - panel.offsetWidth - 8
        )
      );
      const top = Math.max(
        8,
        Math.min(
          rect.top - panel.offsetHeight - 14,
          window.innerHeight - panel.offsetHeight - 8
        )
      );
      setPosition({
        left,
        top,
        arrow: Math.max(
          20,
          Math.min(
            panel.offsetWidth - 20,
            rect.left + rect.width / 2 - left
          )
        ),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const observer = new ResizeObserver(place);
    if (bubble.current) observer.observe(bubble.current);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [showing, open, anchor]);
  useEffect(() => {
    if (!showing) return;
    const dismiss = () => {
      setAutomatic(null);
      onOpenChange(false);
    };
    const outside = (e: PointerEvent) => {
      if (
        !anchor.current?.contains(e.target as Node) &&
        !bubble.current?.contains(e.target as Node)
      )
        dismiss();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        anchor.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [showing, anchor, onOpenChange]);
  const save = () => {
    if (!healthy.current) return;
    try {
      persist(
        mergeJournal(loadJournal(localStorage), [
          {
            id: crypto.randomUUID(),
            sourceKey: scope,
            at: Date.now(),
            author: "我",
            text: draft.trim(),
            replyTo: dailyPrompt?.id || greeting.kind,
            synced: false,
          },
        ]) as Note[]
      );
      setDraft("");
      localStorage.removeItem(`pomatez-journal-draft-${scope}`);
      setStatus(connected ? "已保存本机，等待飞书同步" : "已保存本机");
      setError("");
      setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message || "未能保存，请保留文字再试");
    }
  };
  if (!showing) return null;
  return createPortal(
    <div
      ref={bubble}
      className={`farm-companion ${greeting.kind}`}
      role={open ? "dialog" : undefined}
      aria-label={open ? "稻草人：聊聊与随手记" : undefined}
      data-automatic={!open}
      style={
        {
          left: position.left,
          top: position.top,
          "--speech-arrow": `${position.arrow}px`,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        ref={closeButton}
        className="companion-close"
        aria-label="收起稻草人气泡"
        onClick={() => {
          setAutomatic(null);
          onOpenChange(false);
          anchor.current?.focus();
        }}
      >
        ×
      </button>
      <button
        className="scarecrow-speech"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className="companion-name">
          田间伙伴
          {dailyPrompt && speech === dailyPrompt.text
            ? " · 澄的留言"
            : ""}
        </span>
        <span role={!open ? "status" : undefined}>
          {open ? speech : automatic?.text}
        </span>
        <small>{open ? "收起" : "聊聊 / 随手记"}</small>
      </button>
      {open && (
        <section className="farm-journal" aria-label="稻草人日记与对话">
          <p className="hint">
            想法、昨晚的睡眠，或者今天的一点感受，都可以记在这里。
            {!sourceKey && "未连接时的日记仅保留本机。"}
          </p>
          <textarea
            aria-label="随手记内容"
            placeholder="我想说…"
            maxLength={4000}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              try {
                localStorage.setItem(
                  `pomatez-journal-draft-${scope}`,
                  e.target.value
                );
              } catch {
                setError("草稿未存成功，请先复制保留文字");
              }
            }}
          />
          <div className="journal-actions">
            <button
              className="btn-small"
              disabled={!draft.trim() || !healthy.current}
              onClick={save}
            >
              记下来
            </button>
            <button
              className="btn-text"
              disabled={!connected || journalBusy}
              onClick={() => setRevision((v) => v + 1)}
            >
              同步日记{pending ? ` (${pending})` : ""}
            </button>
            <span role="status">{status}</span>
          </div>
          {error && (
            <p className="manual-error" role="alert">
              {error}
            </p>
          )}
          <div className="journal-notes">
            {visible.slice(0, 100).map((n) => (
              <article key={n.id}>
                <small>
                  {n.author} · {new Date(n.at).toLocaleString()} ·{" "}
                  {n.synced ? "已同步" : "仅本机，待同步"}
                </small>
                <p>{n.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>,
    document.body
  );
}
