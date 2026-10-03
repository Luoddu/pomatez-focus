export const JOURNAL_KEY = "pomatez-farm-journal-v1";
export function journalNote(value) {
  if (
    !value ||
    !/^[0-9a-f-]{36}$/i.test(value.id || "") ||
    !/^[a-f0-9]{64}$/.test(value.sourceKey || "") ||
    !Number.isFinite(value.at) ||
    value.at < 946684800000 ||
    value.at > Date.now() + 60000 ||
    !["我", "澄"].includes(value.author) ||
    typeof value.text !== "string" ||
    !value.text.trim() ||
    value.text.length > 4000
  )
    throw Error("日记格式无效，请填写 1–4000 字的内容");
  return {
    id: value.id,
    sourceKey: value.sourceKey,
    at: value.at,
    author: value.author,
    text: value.text,
    ...(value.replyTo
      ? { replyTo: String(value.replyTo).slice(0, 100) }
      : {}),
    synced: value.synced === true,
  };
}
export function loadJournal(storage) {
  const raw = storage.getItem(JOURNAL_KEY);
  if (!raw) return [];
  const notes = JSON.parse(raw);
  if (!Array.isArray(notes))
    throw Error("日记存储格式异常，原内容已保留");
  return notes.map(journalNote);
}
export function mergeJournal(local, remote) {
  const index = new Map();
  for (const value of [...local, ...remote]) {
    const n = journalNote(value),
      old = index.get(n.id);
    if (
      old &&
      ["sourceKey", "at", "author", "text", "replyTo"].some(
        (k) => old[k] !== n[k]
      )
    )
      throw Error("同一条日记存在不同内容，保留本机并等待核对");
    index.set(n.id, { ...n, synced: n.synced || old?.synced || false });
  }
  return Array.from(index.values()).sort(
    (a, b) => b.at - a.at || a.id.localeCompare(b.id)
  );
}
export function saveJournal(storage, notes) {
  // Validate and persist before a UI success or any cloud request.
  const next = mergeJournal([], notes);
  storage.setItem(JOURNAL_KEY, JSON.stringify(next));
  return next;
}
