import { recordCategory } from "./classification.js";

export const WEIGHTS_KEY = "pomatez-focus-tomato-weights-v1";
export const WEIGHT_CATEGORIES = ["research", "delivery", "longterm", "software", "personal", "misc", "unclassified"];
export const DEFAULT_WEIGHTS = Object.freeze(Object.fromEntries(WEIGHT_CATEGORIES.map(k => [k, 1])));

export function validateWeights(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("番茄比例配置无效");
  const result = {};
  for (const key of WEIGHT_CATEGORIES) {
    const n = value[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1 || Math.abs(n * 100 - Math.round(n * 100)) > 1e-7)
      throw Error("每项比例须为 0–1，最多两位小数");
    result[key] = Math.round(n * 100) / 100;
  }
  return result;
}
export function loadWeights(storage) {
  const raw = storage.getItem(WEIGHTS_KEY);
  if (raw === null) return { ...DEFAULT_WEIGHTS };
  let data;
  try { data = JSON.parse(raw); } catch (_) { throw Error("番茄比例读取失败，请在设置中重新保存"); }
  if (!data || data.version !== 1) throw Error("番茄比例版本无效，请重新保存");
  return validateWeights(data.weights);
}
export function saveWeights(storage, weights) {
  const value = validateWeights(weights);
  storage.setItem(WEIGHTS_KEY, JSON.stringify({ version: 1, weights: value }));
  return value;
}
const category = record => {
  const value = recordCategory(record);
  return WEIGHT_CATEGORIES.includes(value) ? value : "unclassified";
};
const rate = (record, weights) => weights[category(record)] ?? weights.unclassified;
const saved = record => record.status === "saved" && Number.isSafeInteger(record.completedCount) && record.completedCount > 0;
export function effectiveCount(records, weights = DEFAULT_WEIGHTS) {
  const valid = validateWeights(weights);
  // Sum integer hundredths before division; never round each tomato/session.
  return records.filter(saved).reduce((n, r) => n + r.completedCount * Math.round(rate(r, valid) * 100), 0) / 100;
}
export function hasDiscountedRecords(records, weights = DEFAULT_WEIGHTS) {
  const valid = validateWeights(weights);
  return records.some(r => saved(r) && rate(r, valid) < 1);
}
export function effectiveWeekCount(records, now, weights = DEFAULT_WEIGHTS) {
  // Existing farm convention: Monday 00:00 UTC+8.
  const date = new Date(now + 8 * 3600000);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - ((date.getUTCDay() + 6) % 7) * 86400000 - 8 * 3600000;
  return effectiveCount(records.filter(r => r.startedAt >= start && r.startedAt < start + 7 * 86400000), weights);
}
export const formatEffective = n => Number(n.toFixed(2)).toString();
