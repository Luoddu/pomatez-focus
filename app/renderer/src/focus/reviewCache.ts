type Store = Pick<Storage, "getItem" | "setItem">;
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
