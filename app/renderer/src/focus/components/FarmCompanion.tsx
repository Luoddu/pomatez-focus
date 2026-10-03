import React, { useEffect, useRef, useState } from "react";
import type { FocusSession } from "../session";
import { api } from "./shared";
import {
  beijingDate,
  companionGreeting,
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
}: {
  records: FocusSession[];
  now: number;
  sourceKey: string;
  connected: boolean;
}) {
  const [open, setOpen] = useState(false);
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
            (!failed && entries.current.some(
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
  return (
    <div className={`farm-companion ${greeting.kind}`}>
      <button
        className="scarecrow-speech"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="companion-name">
          田间伙伴
          {dailyPrompt && speech === dailyPrompt.text
            ? " · 澄的留言"
            : ""}
        </span>
        <span>{speech}</span>
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
    </div>
  );
}
