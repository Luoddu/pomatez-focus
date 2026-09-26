import { textValue } from "./plan";

// Existing review table is read-only. Weekly/session rows never become day summaries.
export function dailyReviews(rows: any[]): Record<string, string> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const f = row.fields || {};
    if (textValue(f["周期类型"]).trim() !== "日") continue;
    const at = f["周期开始"];
    const text = textValue(f["进展与卡点"]).trim();
    if (typeof at !== "number" || !Number.isFinite(at) || !text)
      continue;
    const d = new Date(at + 8 * 3600000);
    if (!Number.isFinite(d.getTime())) continue;
    const day = d.toISOString().slice(0, 10);
    const values = grouped.get(day) || [];
    values.push(text);
    grouped.set(day, values);
  }
  const result: Record<string, string> = {};
  grouped.forEach((values, day) => {
    // Duplicate daily rows need resolution in Feishu rather than arbitrary selection.
    if (values.length === 1) result[day] = values[0].slice(0, 2000);
  });
  return result;
}
