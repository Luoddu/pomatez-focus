type Store = Pick<Storage, "getItem" | "setItem">;

// 只提取明确标注的主题，避免把复盘正文或未经归纳的任务名当作主题。
export function reviewTheme(summary: string = ""): string {
  const plain = summary.replace(/\*\*/g, "").replace(/\r\n?/g, "\n");
  const match = plain.match(
    /(?:^|\n)\s*(?:#{1,6}\s*)?当日主题\s*[:：]\s*([\s\S]*)/
  );
  if (!match) return "";
  return match[1]
    .split(
      /\n\s*\n|\n\s*(?:#{1,6}\s*)?[^\n:：]{1,20}[:：]|(?:代表进展|主要进展|待确认|明日计划|下一步|遗留问题)\s*[:：]/
    )[0]
    .replace(/\s*\n\s*/g, " ")
    .trim();
}
const key = (source: string) => `pomatez-day-reviews-v1:${source}`;
export const reviewDayKey = (at: number) =>
  new Date(at + 8 * 3600000).toISOString().slice(0, 10);
export function validateReviews(
  value: unknown
): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("复盘摘要响应无效");
  const entries = Object.entries(value);
  if (
    entries.length > 50000 ||
    entries.some(
      ([day, text]) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        typeof text !== "string" ||
        text.length > 2000
    )
  )
    throw Error("复盘摘要格式无效");
  return Object.fromEntries(entries);
}
export function loadReviews(
  store: Store,
  source: string
): Record<string, string> {
  const raw = store.getItem(key(source));
  return raw ? validateReviews(JSON.parse(raw)) : {};
}
export function saveReviews(
  store: Store,
  source: string,
  summaries: unknown
) {
  const valid = validateReviews(summaries);
  store.setItem(key(source), JSON.stringify(valid));
  return valid;
}
