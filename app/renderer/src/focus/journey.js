/* A plan owns outline order only. Saved FocusSession records own completion. */
const DEFAULT_COUNTS = [4, 3, 3, 3, 3];
export const REST_LABELS = {
  meal: "吃饭",
  nap: "小憩",
  gym: "健身",
  night: "下班睡觉",
  break: "休息",
};
const DEFAULT_ACTIONS = [
  ["meal", "nap"],
  ["nap"],
  ["nap", "gym", "meal", "nap"],
  ["nap"],
  ["nap", "night"],
];
const DEFAULT_HOURS = [8, 12, null, 20, null];
const hour = (v) =>
  v === null || (Number.isInteger(v) && v >= 0 && v <= 24);
export function restActions(stage) {
  if (Array.isArray(stage.restActions)) return stage.restActions;
  return String(stage.rest || "休息")
    .split(/[/、→]+/)
    .map((s) =>
      /下班|晚安/.test(s)
        ? "night"
        : /吃饭|用餐/.test(s)
        ? "meal"
        : /健身|运动/.test(s)
        ? "gym"
        : /睡|小憩/.test(s)
        ? "nap"
        : "break"
    )
    .slice(0, 8);
}
function cleanActions(v) {
  if (
    !Array.isArray(v) ||
    v.length > 8 ||
    v.some((s) => !Object.prototype.hasOwnProperty.call(REST_LABELS, s))
  )
    throw Error("休息图案损坏，每段最多8个休息节点");
  return v.slice();
}
export function journeyDay(now = Date.now(), offset = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
export function journeyKey(scope, day) {
  return `pomatez-journey-v1:${encodeURIComponent(scope)}:${day}`;
}
export function newJourney(
  scope,
  day,
  id = () => crypto.randomUUID(),
  template = defaultJourneyTemplate()
) {
  const preset = validateTemplate(template);
  return {
    version: 1,
    scope,
    day,
    resting: null,
    passed: [],
    restingAction: null,
    passedActions: [],
    endHour: preset.endHour,
    stages: preset.stages.map((stage) => ({
      id: id(),
      rest:
        stage.restActions.map((v) => REST_LABELS[v]).join(" / ") ||
        "休息",
      restActions: stage.restActions.slice(),
      time: stage.time,
      slots: Array.from({ length: stage.count }, () => ({
        id: id(),
        task: null,
        binding: null,
      })),
    })),
  };
}
const str = (v, max = 512) =>
  typeof v === "string" && v.length > 0 && v.length <= max;
export function taskRef(task) {
  if (
    !task ||
    !str(task.id) ||
    !str(task.title) ||
    !["local", "feishu"].includes(task.source)
  )
    throw Error("任务不可用");
  if (
    task.source === "feishu" &&
    (!str(task.taskId) || !str(task.sourceKey))
  )
    throw Error("任务来源不完整，请刷新任务");
  return {
    source: task.source,
    key: task.source === "feishu" ? task.taskId : task.id,
    sourceKey: task.sourceKey || null,
    title: task.title.slice(0, 512),
  };
}
function cleanRef(v) {
  if (v === null) return null;
  if (
    !v ||
    !["local", "feishu"].includes(v.source) ||
    !str(v.key) ||
    !str(v.title) ||
    !(v.sourceKey === null || str(v.sourceKey)) ||
    (v.source === "feishu" && !str(v.sourceKey))
  )
    throw Error("旅程任务引用损坏");
  return {
    source: v.source,
    key: v.key,
    title: v.title,
    sourceKey: v.sourceKey,
  };
}
export function resolveTask(ref, tasks, scope) {
  if (!ref) return null;
  return (
    tasks.find(
      (t) =>
        t.kind !== "done" &&
        t.kind !== "pending" &&
        t.source === ref.source &&
        (t.source === "feishu"
          ? t.sourceKey === scope &&
            ref.sourceKey === scope &&
            t.taskId === ref.key
          : scope === "local" && t.id === ref.key)
    ) || null
  );
}
export function validateJourney(v, scope, day) {
  if (
    !v ||
    v.version !== 1 ||
    v.scope !== scope ||
    v.day !== day ||
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Array.isArray(v.stages) ||
    !v.stages.length ||
    v.stages.length > 20 ||
    !Array.isArray(v.passed)
  )
    throw Error("旅程数据损坏或来源不匹配；原数据已保留");
  const ids = new Set();
  let count = 0;
  const unique = (id) => {
    if (!str(id, 128) || ids.has(id)) throw Error("旅程标识损坏");
    ids.add(id);
    return id;
  };
  const stages = v.stages.map((s) => {
    if (!s || !str(s.rest, 80) || !Array.isArray(s.slots))
      throw Error("旅程阶段损坏");
    if (!hour(s.time ?? null))
      throw Error("旅程参考时间应为0–24的整数或留空");
    return {
      id: unique(s.id),
      rest: s.rest,
      restActions: cleanActions(restActions(s)),
      time: s.time ?? null,
      slots: s.slots.map((p) => {
        if (!p || ++count > 100) throw Error("每日最多100个预设番茄");
        const b = p.binding;
        if (
          b !== null &&
          (!b ||
            !str(b.sessionId, 128) ||
            !Number.isInteger(b.unit) ||
            b.unit < 0 ||
            b.unit >= 100)
        )
          throw Error("旅程记录关联损坏");
        return {
          id: unique(p.id),
          task: cleanRef(p.task),
          binding:
            b === null
              ? null
              : { sessionId: b.sessionId, unit: b.unit },
        };
      }),
    };
  });
  const stageIds = new Set(stages.map((s) => s.id));
  if (
    !(v.resting === null || stageIds.has(v.resting)) ||
    v.passed.some((id) => !stageIds.has(id))
  )
    throw Error("休息节点损坏");
  const actions = new Set(
    stages.flatMap((s) => s.restActions.map((_, i) => `${s.id}:${i}`))
  );
  const restingAction =
    v.restingAction === undefined
      ? v.resting
        ? `${v.resting}:0`
        : null
      : v.restingAction;
  const passedActions = v.passedActions ?? [];
  if (
    !hour(v.endHour ?? null) ||
    !Array.isArray(passedActions) ||
    passedActions.some((key) => !actions.has(key)) ||
    !(
      restingAction === null ||
      (actions.has(restingAction) &&
        restingAction.startsWith(`${v.resting}:`))
    ) ||
    (!v.resting && restingAction !== null)
  )
    throw Error("旅程休息或结束时间损坏");
  return {
    version: 1,
    scope,
    day,
    stages,
    resting: v.resting,
    passed: [...new Set(v.passed)],
    restingAction,
    passedActions: [...new Set(passedActions)],
    endHour: v.endHour ?? null,
  };
}
export function readJourney(storage, scope, day) {
  const raw = storage.getItem(journeyKey(scope, day));
  if (raw === null) {
    const library = readTemplateLibrary(storage, scope);
    return newJourney(
      scope,
      day,
      undefined,
      library.templates.find((t) => t.id === library.defaultId)
    );
  }
  if (raw.length > 100000) throw Error("旅程数据过大；原数据已保留");
  return validateJourney(JSON.parse(raw), scope, day);
}
export function writeJourney(storage, plan) {
  const valid = validateJourney(plan, plan.scope, plan.day);
  storage.setItem(
    journeyKey(plan.scope, plan.day),
    JSON.stringify(valid)
  );
  return valid;
}
function eligible(r, plan) {
  return (
    r &&
    r.status === "saved" &&
    Number.isInteger(r.completedCount) &&
    r.completedCount > 0 &&
    r.completedCount <= 100 &&
    Number.isFinite(r.startedAt) &&
    journeyDay(r.startedAt) === plan.day &&
    (plan.scope === "local"
      ? r.task?.source === "local"
      : r.task?.source === "feishu" && r.task.sourceKey === plan.scope)
  );
}
export function completion(plan, records) {
  const byId = new Map(
    records.filter((r) => eligible(r, plan)).map((r) => [r.id, r])
  );
  const used = new Set();
  const result = {};
  for (const s of plan.stages)
    for (const p of s.slots) {
      const b = p.binding,
        r = b && byId.get(b.sessionId),
        k = b && `${b.sessionId}:${b.unit}`;
      if (r && b.unit < r.completedCount && !used.has(k)) {
        used.add(k);
        result[p.id] = r;
      }
    }
  return result;
}
export function reconcileJourney(plan, records, active) {
  const result = JSON.parse(JSON.stringify(plan)),
    used = new Set();
  const byId = new Map(
    records.filter((r) => eligible(r, plan)).map((r) => [r.id, r])
  );
  const activeValid =
    active &&
    journeyDay(active.startedAt) === plan.day &&
    (plan.scope === "local"
      ? active.task.source === "local"
      : active.task.sourceKey === plan.scope);
  for (const s of result.stages)
    for (const p of s.slots) {
      const b = p.binding,
        r = b && byId.get(b.sessionId),
        k = b && `${b.sessionId}:${b.unit}`;
      if (
        b &&
        !used.has(k) &&
        ((r && b.unit < r.completedCount) ||
          (activeValid && active.id === b.sessionId && b.unit === 0))
      )
        used.add(k);
      else p.binding = null;
    }
  const empty = result.stages
    .flatMap((s) => s.slots)
    .filter((p) => !p.binding);
  for (const r of [...byId.values()].sort(
    (a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id)
  ))
    for (let unit = 0; unit < r.completedCount; unit++) {
      const k = `${r.id}:${unit}`;
      if (used.has(k)) continue;
      const p = empty.shift();
      if (!p) break;
      p.binding = { sessionId: r.id, unit };
      used.add(k);
    }
  return result;
}
export function locked(plan, slot, records, active) {
  return (
    !!completion(plan, records)[slot.id] ||
    !!(active && slot.binding?.sessionId === active.id)
  );
}
export function moveSlot(
  plan,
  id,
  stageId,
  beforeId,
  records = [],
  active = null
) {
  const next = JSON.parse(JSON.stringify(plan));
  const source = next.stages.find((s) =>
      s.slots.some((p) => p.id === id)
    ),
    target = next.stages.find((s) => s.id === stageId);
  const p = source?.slots.find((p) => p.id === id);
  if (!p || !target || locked(plan, p, records, active))
    throw Error("已完成或进行中的番茄不能移动");
  if (id === beforeId) return plan;
  source.slots = source.slots.filter((p) => p.id !== id);
  const at = beforeId
    ? target.slots.findIndex((p) => p.id === beforeId)
    : -1;
  target.slots.splice(at < 0 ? target.slots.length : at, 0, p);
  return next;
}
export function resizeStages(
  plan,
  rows,
  records = [],
  active = null,
  id = () => crypto.randomUUID()
) {
  if (
    !rows.length ||
    rows.length > 20 ||
    rows.some(
      (r) =>
        !Number.isInteger(r.count) ||
        r.count < 0 ||
        r.count > 100 ||
        !str(r.rest.trim(), 80)
    ) ||
    rows.reduce((n, r) => n + r.count, 0) > 100
  )
    throw Error("最多20段、100个番茄；数量为非负整数，休息名称1–80字");
  const next = JSON.parse(JSON.stringify(plan));
  const keep = new Set(rows.map((r) => r.id));
  if (
    next.stages.some(
      (s) =>
        !keep.has(s.id) &&
        s.slots.some((p) => locked(plan, p, records, active))
    )
  )
    throw Error("保留已完成或进行中的阶段");
  next.stages = rows.map((r) => {
    const s = next.stages.find((s) => s.id === r.id) || {
      id: id(),
      slots: [],
    };
    const protectedSlots = s.slots.filter((p) =>
      locked(plan, p, records, active)
    );
    if (r.count < protectedSlots.length)
      throw Error("数量不能少于已完成和进行中的番茄");
    // Remove last uncompleted slots first, never discard a protected binding.
    while (s.slots.length > r.count) {
      let i = s.slots.length - 1;
      while (i >= 0 && locked(plan, s.slots[i], records, active)) i--;
      s.slots.splice(i, 1);
    }
    while (s.slots.length < r.count)
      s.slots.push({ id: id(), task: null, binding: null });
    const time = r.time === undefined ? s.time ?? null : r.time;
    if (!hour(time)) throw Error("参考时间应为0–24的整数或留空");
    return {
      ...s,
      rest: r.rest.trim(),
      time,
      restActions: cleanActions(
        r.restActions === undefined ? restActions(s) : r.restActions
      ),
    };
  });
  const ids = new Set(next.stages.map((s) => s.id));
  next.passed = next.passed.filter((id) => ids.has(id));
  if (!ids.has(next.resting)) next.resting = null;
  const actions = new Set(
    next.stages.flatMap((s) =>
      s.restActions.map((_, i) => `${s.id}:${i}`)
    )
  );
  next.passedActions = (next.passedActions || []).filter((key) =>
    actions.has(key)
  );
  if (!actions.has(next.restingAction)) {
    next.restingAction = null;
    next.resting = null;
  }
  return next;
}
export function journeyRoad(total) {
  const reached =
    Math.floor(Math.max(0, Number.isFinite(total) ? total : 0) / 100) *
    100;
  return { reached, next: reached + 100 };
}
// Derive the available rest from the arrangement and confirmed records only.
export function gymRestTarget(plan, records = []) {
  const done = completion(plan, records);
  const stage =
    plan.stages.find((s) => s.id === plan.resting) ||
    plan.stages.find((s) => s.slots.some((p) => !done[p.id])) ||
    plan.stages[plan.stages.length - 1];
  const index = stage?.restActions.findIndex(
    (kind, n) =>
      kind === "gym" && !plan.passedActions.includes(`${stage.id}:${n}`)
  );
  return index >= 0
    ? { stageId: stage.id, actionKey: `${stage.id}:${index}` }
    : null;
}

export function defaultJourneyTemplate() {
  return {
    id: "balanced-day",
    name: "科研与休息",
    endHour: 24,
    stages: DEFAULT_COUNTS.map((count, i) => ({
      count,
      time: DEFAULT_HOURS[i],
      restActions: DEFAULT_ACTIONS[i].slice(),
    })),
  };
}
export function validateTemplate(v) {
  if (
    !v ||
    !str(v.id, 128) ||
    !str(v.name?.trim(), 40) ||
    !Array.isArray(v.stages) ||
    !v.stages.length ||
    v.stages.length > 20 ||
    !hour(v.endHour)
  )
    throw Error("模板名称1–40字、最多20段，结束时间0–24或留空");
  let previous = -1,
    count = 0;
  const stages = v.stages.map((s) => {
    if (
      !s ||
      !Number.isInteger(s.count) ||
      s.count < 0 ||
      s.count > 100 ||
      !hour(s.time)
    )
      throw Error("番茄数量为非负整数，参考小时为0–24或留空");
    if (s.time !== null) {
      if (s.time < previous)
        throw Error("参考时间应按旅程顺序递增；不确定的时间可以留空");
      previous = s.time;
    }
    count += s.count;
    return {
      count: s.count,
      time: s.time,
      restActions: cleanActions(s.restActions),
    };
  });
  if (
    count < 1 ||
    count > 100 ||
    (v.endHour !== null && v.endHour < previous)
  )
    throw Error("模板每日1–100个番茄，结束时间不早于最后一段");
  return { id: v.id, name: v.name.trim(), endHour: v.endHour, stages };
}
export function templateLibraryKey(scope) {
  return `pomatez-journey-templates-v1:${encodeURIComponent(scope)}`;
}
export function validateTemplateLibrary(v, scope) {
  if (
    !v ||
    v.version !== 1 ||
    v.scope !== scope ||
    !Array.isArray(v.templates) ||
    !v.templates.length ||
    v.templates.length > 12
  )
    throw Error("模板数据损坏或来源不匹配；原数据已保留");
  const templates = v.templates.map(validateTemplate),
    ids = new Set(templates.map((t) => t.id));
  if (ids.size !== templates.length || !ids.has(v.defaultId))
    throw Error("默认模板或模板标识损坏");
  return { version: 1, scope, defaultId: v.defaultId, templates };
}
export function readTemplateLibrary(storage, scope) {
  const raw = storage.getItem(templateLibraryKey(scope));
  if (raw === null) {
    const t = defaultJourneyTemplate();
    return { version: 1, scope, defaultId: t.id, templates: [t] };
  }
  if (raw.length > 150000) throw Error("模板数据过大；原数据已保留");
  return validateTemplateLibrary(JSON.parse(raw), scope);
}
export function writeTemplateLibrary(storage, library) {
  const valid = validateTemplateLibrary(library, library.scope);
  storage.setItem(
    templateLibraryKey(valid.scope),
    JSON.stringify(valid)
  );
  return valid;
}
export function templateFromJourney(
  plan,
  name,
  id = () => crypto.randomUUID()
) {
  return validateTemplate({
    id: id(),
    name,
    endHour: plan.endHour ?? null,
    stages: plan.stages.map((s) => ({
      count: s.slots.length,
      time: s.time ?? null,
      restActions: restActions(s),
    })),
  });
}
export function applyJourneyTemplate(
  plan,
  template,
  records = [],
  active = null
) {
  if (
    active &&
    journeyDay(active.startedAt) === plan.day &&
    (plan.scope === "local"
      ? active.task.source === "local"
      : active.task.sourceKey === plan.scope)
  )
    throw Error("请先结束并确认当前番茄，再应用当天模板；明天仍可安排");
  const t = validateTemplate(template);
  const next = resizeStages(
    plan,
    t.stages.map((s, i) => ({
      ...s,
      id: plan.stages[i]?.id,
      rest:
        s.restActions.map((k) => REST_LABELS[k]).join(" / ") || "休息",
    })),
    records,
    active
  );
  const kept = new Set(
    next.stages.flatMap((s) => s.slots.map((p) => p.id))
  );
  if (
    plan.stages.some((s) =>
      s.slots.some((p) => p.task && !kept.has(p.id))
    )
  )
    throw Error("模板会移除已关联任务的番茄；请先移动或解除关联");
  next.endHour = t.endHour;
  next.resting = null;
  next.restingAction = null;
  next.passed = [];
  next.passedActions = [];
  return validateJourney(next, next.scope, next.day);
}
