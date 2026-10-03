export const JOURNAL_TABLE = "农场日记";
export const JOURNAL_FIELDS = [
  ["日记 ID", 1],
  ["记录时间", 5],
  ["说话人", 1],
  ["内容", 1],
  ["回应话题", 1],
].map(([field_name, type]) => ({ field_name, type }));
export type JournalNote = {
  id: string;
  sourceKey: string;
  at: number;
  author: "我" | "澄";
  text: string;
  replyTo?: string;
  synced?: boolean;
};
export function validateJournal(
  value: any,
  sourceKey: string
): JournalNote {
  if (
    !value ||
    value.sourceKey !== sourceKey ||
    !/^[0-9a-f-]{36}$/i.test(value.id || "") ||
    !Number.isFinite(value.at) ||
    value.at < 946684800000 ||
    value.at > Date.now() + 60000 ||
    !["我", "澄"].includes(value.author) ||
    typeof value.text !== "string" ||
    !value.text.trim() ||
    value.text.length > 4000 ||
    (value.replyTo !== undefined &&
      (typeof value.replyTo !== "string" || value.replyTo.length > 100))
  )
    throw Error("日记内容或所属飞书表无效，未写入");
  return {
    id: value.id,
    sourceKey,
    at: value.at,
    author: value.author,
    text: value.text,
    ...(value.replyTo ? { replyTo: value.replyTo } : {}),
  };
}
