import { DEFAULT_WEIGHTS, loadWeights, saveWeights, validateWeights } from "./weights";

export const PREFERENCE_KEYS = ["weights", "weekGoals", "researchGoals", "timer", "rest", "browser"] as const;
export type PreferenceKey = typeof PREFERENCE_KEYS[number];
export type PreferenceEntry = { version: 1; id: string; key: PreferenceKey; parents: string[]; value: any; at: number };
export type PreferenceValues = Record<PreferenceKey, any>;
export const TIMER_PREFERENCE_KEY = "pomatez-focus-timer-preferences-v1";
export const PREFERENCES_CHANGED = "pomatez:preferences-changed";
export const PREFERENCE_LABELS: Record<PreferenceKey, string> = {
  weights: "番茄折算比例", weekGoals: "周目标", researchGoals: "科研周目标",
  timer: "番茄与休息时长", rest: "科学休息规则", browser: "浏览器干预规则",
};
export const PREFERENCE_DEFAULTS: PreferenceValues = {
  weights: { ...DEFAULT_WEIGHTS }, weekGoals: {}, researchGoals: {},
  timer: { focusMinutes: 25, restMinutes: 5 },
  rest: { quotaMinutes: 60, supervise: true, pomodoroGoal: 12, reminderMinutes: 5 },
  browser: { mode: "pause", cooldownMinutes: 2, autoRaise: true },
};
export const preferenceJSON = (value: any): string => {
  if (Array.isArray(value)) return `[${value.map(preferenceJSON).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${preferenceJSON(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
};
const exact = (value: any, keys: string[]) => {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join("|") !== keys.sort().join("|")) throw Error("偏好字段无效，未同步");
};
const integer = (v: any, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;
export function validPreferenceValue(key: PreferenceKey, value: any): any {
  if (key === "weights") {
    exact(value, Object.keys(DEFAULT_WEIGHTS));
    return validateWeights(value);
  }
  if (key === "weekGoals" || key === "researchGoals") {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 512) throw Error("周目标偏好无效");
    for (const k of Object.keys(value)) {
      const d = new Date(`${k}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== k || !integer(value[k],1,350)) throw Error("周目标偏好无效");
    }
    return JSON.parse(preferenceJSON(value));
  }
  let valid = false;
  if (key === "timer") {
    exact(value, ["focusMinutes", "restMinutes"]);
    valid = integer(value.focusMinutes,1,180) && integer(value.restMinutes,1,60);
  } else if (key === "rest") {
    exact(value, ["quotaMinutes", "supervise", "pomodoroGoal", "reminderMinutes"]);
    valid = integer(value.quotaMinutes,5,480) && value.quotaMinutes % 5 === 0 && typeof value.supervise === "boolean" && integer(value.pomodoroGoal,0,60) && integer(value.reminderMinutes,1,60);
  } else if (key === "browser") {
    exact(value,["mode", "cooldownMinutes", "autoRaise"]);
    valid = ["mirror","pause","cooldown","quota"].includes(value.mode) && integer(value.cooldownMinutes,1,30) && typeof value.autoRaise === "boolean";
  }
  if (!valid) throw Error("偏好数值无效，未同步");
  return JSON.parse(preferenceJSON(value));
}
export function loadTimerPreferences(storage: Storage) {
  const raw = storage.getItem(TIMER_PREFERENCE_KEY);
  return validPreferenceValue("timer", raw === null ? PREFERENCE_DEFAULTS.timer : JSON.parse(raw));
}
export function saveTimerPreferences(storage: Storage, value: any) {
  const valid = validPreferenceValue("timer", value);
  storage.setItem(TIMER_PREFERENCE_KEY, preferenceJSON(valid));
  return valid;
}
export function localPreferences(storage: Storage, rest: any, browser: any): PreferenceValues {
  const read = (key: string) => { const raw = storage.getItem(key); return raw === null ? {} : JSON.parse(raw); };
  return {
    weights: validPreferenceValue("weights",loadWeights(storage)),
    weekGoals: validPreferenceValue("weekGoals",read("pomatez-focus-weekgoal-v1")),
    researchGoals: validPreferenceValue("researchGoals",read("pomatez-focus-research-weekgoal-v1")),
    timer: loadTimerPreferences(storage),
    rest: validPreferenceValue("rest",rest), browser: validPreferenceValue("browser",browser),
  };
}
export function writeLocalPreference(storage: Storage, key: PreferenceKey, value: any) {
  const valid = validPreferenceValue(key,value);
  if (key === "weights") saveWeights(storage,valid);
  else if (key === "timer") saveTimerPreferences(storage,valid);
  else if (key === "weekGoals" || key === "researchGoals") storage.setItem(`pomatez-focus-${key === "weekGoals" ? "weekgoal" : "research-weekgoal"}-v1`,preferenceJSON(valid));
  else throw Error("系统偏好须由主进程保存");
}
