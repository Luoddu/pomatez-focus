import { createHash } from "crypto";
import {
  MOVE_FIELD,
  readMove,
  sameEdit,
  RecordMove,
  MoveStep,
} from "./move";
import {
  HISTORY_FIELD,
  historyRecord,
  readHistory,
  mergeHistory,
} from "./history";
import {
  PLAN_FIELDS,
  FREE_TITLE,
  ledgerField,
  textValue,
  readLedger,
  ledgerSeconds,
  mergePlan,
  correctPlan,
  removePlanRecord,
  fieldsAgree,
} from "./plan";
import {
  MAX_PER_TASK,
  DAILY_CAPACITY,
  BATCH_SIZE,
  resolveTodayCountField,
  collectTaskPlans,
  resolvePlanningMode,
  scanExisting,
  pomodoroPlan,
  pomodoroSequence,
  localDayOf,
  dayStart,
  dateKeyOf,
  clientToken,
} from "./generate";
export type Connection = {
  appId: string;
  appSecret: string;
  baseUrl: string;
  planTable: string;
  dateField: string;
  taskField: string;
  completedField: string;
  // 任务表四象限单选字段名；缺省或空字符串=自动探测
  quadrantField?: string;
  appToken?: string;
};
// 生成今日番茄的阶段进度：经 service → main 进程 webContents.send →
// preload 桥转发给渲染层做阶段文字；write 阶段带 done/total/batch/batches
export type GenerateProgress = {
  stage: "connect" | "tasks" | "records" | "plan" | "write" | "verify";
  done?: number;
  total?: number;
  batch?: number;
  batches?: number;
};
export type Request = (
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: any,
  token?: string
) => Promise<any>;
export const SESSION_TABLE = "专注会话";
export const SESSION_FIELDS = [
  ["会话 ID", 1],
  ["任务", 1],
  ["计划记录 ID", 1],
  ["任务记录 ID", 1],
  ["开始时间", 5],
  ["结束时间", 5],
  ["计划分钟", 2],
  ["计时分钟", 2],
  ["实际分钟", 2],
  ["完成番茄数", 2],
  ["专注日期", 1],
  ["记录类型", 1],
].map(([field_name, type]) => ({ field_name, type }));
const id = (value: string) => {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9_-]{1,160}$/.test(value)
  )
    throw new Error("飞书标识格式错误");
  return encodeURIComponent(value);
};
const plain = (value: any): string =>
  typeof value === "string"
    ? value
    : Array.isArray(value)
    ? value
        .map((v) => (typeof v === "string" ? v : v.text || ""))
        .join("")
    : value && typeof value === "object"
    ? value.text || ""
    : "";
// List-records returns rich link objects containing record_ids. Keep older
// scalar/record_id forms too, but never join IDs declared for another table.
const linkedRecordIds = (value: any, table: string): string[] =>
  Array.from(
    new Set<string>(
      (Array.isArray(value) ? value : [value])
        .flatMap((v) => {
          if (typeof v === "string") return [v];
          if (!v || (v.table_id && v.table_id !== table)) return [];
          return Array.isArray(v.record_ids)
            ? v.record_ids
            : [v.record_id];
        })
        .filter(
          (v) =>
            typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v)
        )
    )
  );
// 单选项标签 → 前端象限键；不在表内的标签一律视为未分类
const QUADRANT_LABELS: Record<string, "iu" | "inu" | "uni" | "unu"> = {
  重要且紧急: "iu",
  重要不紧急: "inu",
  紧急不重要: "uni",
  不紧急不重要: "unu",
};
export function validateConnection(value: any): Connection {
  for (const key of [
    "appId",
    "appSecret",
    "baseUrl",
    "planTable",
    "dateField",
    "taskField",
    "completedField",
  ])
    if (
      typeof value?.[key] !== "string" ||
      !value[key].trim() ||
      value[key].length > 2048
    )
      throw new Error("请填写完整的飞书连接信息");
  const u = new URL(value.baseUrl);
  if (
    u.protocol !== "https:" ||
    !/(^|\.)feishu\.cn$/.test(u.hostname) ||
    u.username ||
    u.password ||
    u.port ||
    !/^\/(wiki|base)\/[A-Za-z0-9]+\/?$/.test(u.pathname)
  )
    throw new Error("仅支持飞书知识库或多维表格 HTTPS 链接");
  if (
    value.quadrantField != null &&
    (typeof value.quadrantField !== "string" ||
      value.quadrantField.length > 255)
  )
    throw new Error("四象限字段名格式错误");
  return {
    appId: value.appId.trim(),
    appSecret: value.appSecret.trim(),
    baseUrl: u.origin + u.pathname,
    planTable: value.planTable.trim(),
    dateField: value.dateField.trim(),
    taskField: value.taskField.trim(),
    completedField: value.completedField.trim(),
    quadrantField: value.quadrantField?.trim(),
  };
}
export function connectionKey(c: Connection) {
  return createHash("sha256")
    .update(`${c.appToken}|${c.planTable}`)
    .digest("hex");
}
export function sessionFields(r: any) {
  if (
    !r ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      r.id
    ) ||
    r.status !== "saved" ||
    r.task?.source !== "feishu" ||
    typeof r.task.title !== "string" ||
    r.task.title.length > 2000
  )
    throw new Error("专注记录格式错误");
  for (const key of [
    "startedAt",
    "endedAt",
    "plannedSeconds",
    "elapsedSeconds",
    "acceptedSeconds",
    "completedCount",
  ])
    if (!Number.isFinite(r[key]) || r[key] < 0)
      throw new Error("专注记录时间无效");
  if (
    r.endedAt < r.startedAt ||
    r.startedAt < 946684800000 ||
    r.endedAt > Date.now() + 60000 ||
    r.plannedSeconds < 60 ||
    r.plannedSeconds > 10800 ||
    r.elapsedSeconds > (r.endedAt - r.startedAt) / 1000 + 2 ||
    r.acceptedSeconds > Math.ceil(r.elapsedSeconds) ||
    !Number.isInteger(r.completedCount) ||
    r.completedCount > 100
  )
    throw new Error("专注记录超出有效范围");
  id(r.task.planId);
  if (r.task.taskId) id(r.task.taskId);
  const d = new Date(r.startedAt),
    date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    "会话 ID": r.id,
    任务: r.task.title,
    "计划记录 ID": r.task.planId,
    "任务记录 ID": r.task.taskId || "",
    开始时间: r.startedAt,
    结束时间: r.endedAt,
    计划分钟: r.plannedSeconds / 60,
    计时分钟: r.elapsedSeconds / 60,
    实际分钟: r.acceptedSeconds / 60,
    完成番茄数: r.completedCount,
    专注日期: date,
    记录类型: r.verification === true ? "验收" : "专注",
  };
}
export class Feishu {
  private token = "";
  private expires = 0;
  private inFlight = new Map<string, Promise<any>>();
  private planQueue: Promise<any> = Promise.resolve();
  // 最近一次 today() 命中的四象限字段名；未探测到为 null，供 status 展示
  public quadrantFieldResolved: string | null = null;
  constructor(public config: Connection, private request: Request) {}
  private async call(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: any
  ) {
    if (!this.token || Date.now() >= this.expires) {
      const auth = await this.request(
        "POST",
        "auth/v3/tenant_access_token/internal",
        { app_id: this.config.appId, app_secret: this.config.appSecret }
      );
      if (typeof auth.tenant_access_token !== "string")
        throw new Error("飞书授权响应无效");
      this.token = auth.tenant_access_token;
      this.expires =
        Date.now() + Math.max(30, (auth.expire || 7200) - 120) * 1000;
    }
    return this.request(method, path, body, this.token);
  }
  async resolve() {
    const u = new URL(this.config.baseUrl),
      token = u.pathname.split("/")[2];
    if (u.pathname.startsWith("/wiki/")) {
      const r = await this.call(
        "GET",
        `wiki/v2/spaces/get_node?token=${id(token)}`
      );
      if (r.data?.node?.obj_type !== "bitable")
        throw new Error("链接不是飞书多维表格");
      this.config.appToken = r.data.node.obj_token;
    } else this.config.appToken = token;
    id(this.config.appToken!);
    await this.planSchema();
    return this.config;
  }
  private root() {
    if (!this.config.appToken) throw new Error("请先连接飞书");
    return `bitable/v1/apps/${id(this.config.appToken)}`;
  }
  private async list(path: string) {
    let cursor = "";
    const items: any[] = [];
    const seen = new Set<string>();
    do {
      const r = await this.call(
        "GET",
        `${path}${path.includes("?") ? "&" : "?"}page_size=100${
          cursor ? `&page_token=${encodeURIComponent(cursor)}` : ""
        }`
      );
      // Bitable omits `items` entirely on an empty table (total=0, has_more=false).
      const page =
        r.data?.items == null &&
        r.data?.total === 0 &&
        r.data?.has_more === false
          ? []
          : r.data?.items;
      if (!Array.isArray(page)) throw new Error("飞书列表响应不完整");
      items.push(...page);
      cursor = r.data.has_more ? r.data.page_token : "";
      if (
        (r.data.has_more && (!cursor || seen.has(cursor))) ||
        items.length > 50000
      )
        throw new Error("飞书分页异常或数据超过本版上限");
      seen.add(cursor);
    } while (cursor);
    return items;
  }
  private async findTable(name: string, required = true) {
    const matches = (await this.list(`${this.root()}/tables`)).filter(
      (t) => t.name === name
    );
    if (matches.length > 1 || (required && matches.length !== 1))
      throw new Error(`请检查数据表“${name}”是否存在且唯一`);
    return matches[0];
  }
  private async planSchema() {
    const table = await this.findTable(this.config.planTable),
      path = `${this.root()}/tables/${id(table.table_id)}`;
    const fields = await this.list(`${path}/fields`);
    for (const [name, types] of [
      [this.config.dateField, [5]],
      [this.config.completedField, [7]],
      [this.config.taskField, [18, 21]],
    ] as [string, number[]][]) {
      const f = fields.filter((f) => f.field_name === name);
      if (f.length !== 1 || !types.includes(f[0].type))
        throw new Error(`字段“${name}”不存在或类型不符`);
    }
    return { table, path, fields };
  }
  // 四象限为可选增强：字段缺失、探测失败或标签不匹配都不得影响今日列表
  private async guardRecordMoves(
    schema: { path: string; fields: any[] },
    record?: any
  ) {
    if (!schema.fields.some((f) => f.field_name === MOVE_FIELD)) return;
    const rows = await this.list(`${schema.path}/records`),
      key = connectionKey(this.config);
    if (
      rows.some((r) =>
        readMove(
          r.fields?.[MOVE_FIELD],
          key,
          this.config.completedField
        )
      )
    )
      throw Error(
        "有任务修改尚未同步完成，请先重试记录修改；新专注已保留本机"
      );
    if (
      record &&
      rows.some((row) =>
        readHistory(row.fields?.[HISTORY_FIELD], key).some(
          (r) =>
            r.id === record.id &&
            (r.revision || 0) > (record.revision || 0)
        )
      )
    )
      throw Error("此记录已在另一台电脑修改，请同步最新成果后再操作");
  }
  private async resolveQuadrantField(linkedTable: string) {
    const wanted = (this.config.quadrantField ?? "").trim();
    try {
      const fields = await this.list(
        `${this.root()}/tables/${id(linkedTable)}/fields`
      );
      if (wanted) {
        const f = fields.find(
          (f) => f.field_name === wanted && f.type === 3
        );
        if (f) return wanted;
        // The first quadrant UI prefilled this name even for existing Bases.
        // Treat that missing legacy default as auto, but respect custom names.
        if (wanted !== "四象限") return null;
      }
      const labels = Object.keys(QUADRANT_LABELS);
      const candidates = fields.filter(
        (f) =>
          f.type === 3 &&
          Array.isArray(f.property?.options) &&
          labels.every((label) =>
            f.property.options.some((o: any) => o?.name === label)
          )
      );
      // Multiple matching columns require explicit selection, never first-wins.
      return candidates.length === 1 ? candidates[0].field_name : null;
    } catch {
      return null;
    }
  }
  async correctRecord(input: any) {
    const key = connectionKey(this.config);
    const before = historyRecord(input?.before, key);
    const after = historyRecord(input?.after, key);
    if (
      before.id !== after.id ||
      (after.revision || 0) !== (before.revision || 0) + 1 ||
      before.syncTarget !== "plan" ||
      after.syncTarget !== "plan"
    )
      throw Error("修改必须保留原记录，并递增一个版本");
    if (JSON.stringify(before.task) !== JSON.stringify(after.task))
      return this.moveRecord(before, after);
    const schema = await this.planSchema();
    await this.guardRecordMoves(schema);
    const rows = await this.list(`${schema.path}/records`);
    const matches = rows.filter((r) =>
      readLedger(r.fields)?.entries.some((e) => e.id === before.id)
    );
    if (matches.length !== 1)
      throw Error("无法唯一定位原专注，请先完成原记录同步");
    const row = matches[0];
    const taskTable = schema.fields.find(
      (f) => f.field_name === this.config.taskField
    )?.property?.table_id;
    if (before.task.planId && row.record_id !== before.task.planId)
      throw Error("原番茄关联已变化，未修改");
    if (
      before.task.taskId &&
      !linkedRecordIds(
        row.fields?.[this.config.taskField],
        taskTable
      ).includes(before.task.taskId)
    )
      throw Error("原任务关联已变化，未修改");
    if (
      after.completedCount < before.completedCount &&
      after.completionOwnedPlanIds
    ) {
      const firstSequence = pomodoroSequence(
        textValue(row.fields?.番茄)
      );
      after.completionOwnedPlanIds =
        after.completionOwnedPlanIds.filter((owned: string) => {
          if (owned === row.record_id)
            return (
              after.acceptedSeconds >=
                (readLedger(row.fields)?.target ||
                  after.plannedSeconds) || after.completedCount > 0
            );
          const target = rows.find((r) => r.record_id === owned);
          const n = pomodoroSequence(textValue(target?.fields?.番茄));
          return (
            n >= firstSequence &&
            n < firstSequence + after.completedCount
          );
        });
    }
    const history = readHistory(row.fields?.[HISTORY_FIELD], key);
    const current = history.find((r) => r.id === before.id);
    if (
      !current ||
      (JSON.stringify(current) !== JSON.stringify(before) &&
        JSON.stringify(current) !== JSON.stringify(after))
    )
      throw Error("此记录已在另一台电脑修改，请同步后重新编辑");
    const patch = correctPlan(
      row.fields,
      before,
      after,
      this.config.completedField
    );
    const correctedLedger = readLedger(patch)!;
    if (
      after.completedCount === 0 &&
      before.completionOwnedPlanIds?.includes(row.record_id) &&
      ledgerSeconds(correctedLedger) < correctedLedger.target &&
      !correctedLedger.entries.some(
        (e) => e.id !== before.id && e.seconds > 0
      )
    )
      patch[this.config.completedField] = false;
    patch[HISTORY_FIELD] = JSON.stringify({
      version: 1,
      records: history.map((r) => (r.id === after.id ? after : r)),
    });
    if (patch[HISTORY_FIELD].length > 70000)
      throw Error("修改后的专注明细超过容量");
    const route = `${schema.path}/records/${id(row.record_id)}`;
    if (!fieldsAgree(row.fields, patch))
      await this.call("PUT", route, { fields: patch });
    const verified = (await this.call("GET", route)).data?.record;
    if (!verified?.fields || !fieldsAgree(verified.fields, patch))
      throw Error("修改回读未通过，已保留待重试");
    // Decreasing count must not undo completions belonging to other sessions.
    // Only undo rows whose ownership was recorded by this app's original sync.
    const first = pomodoroSequence(textValue(row.fields?.番茄));
    const linkedTable = schema.fields.find(
      (f) => f.field_name === this.config.taskField
    )?.property?.table_id;
    const sameTask = (r: any) =>
      localDayOf(r.fields?.[this.config.dateField]) ===
        localDayOf(row.fields?.[this.config.dateField]) &&
      JSON.stringify(
        linkedRecordIds(r.fields?.[this.config.taskField], linkedTable)
      ) === JSON.stringify([before.task.taskId]);
    const warnings: string[] = [];
    if (
      before.completedCount > after.completedCount &&
      before.task.kind !== "free"
    ) {
      for (const target of rows.filter(sameTask)) {
        const n = pomodoroSequence(textValue(target.fields?.番茄));
        if (
          target.record_id === row.record_id ||
          n < first + after.completedCount ||
          n >= first + before.completedCount ||
          target.fields?.[this.config.completedField] !== true
        )
          continue;
        const claimed = rows.some((anchor) =>
          readHistory(anchor.fields?.[HISTORY_FIELD], key).some(
            (other) => {
              if (
                other.id === before.id ||
                other.task.taskId !== before.task.taskId ||
                other.completedCount < 1
              )
                return false;
              const start = pomodoroSequence(
                textValue(anchor.fields?.番茄)
              );
              return (
                sameTask(anchor) &&
                start > 0 &&
                n >= start &&
                n < start + other.completedCount
              );
            }
          )
        );
        if (
          !before.completionOwnedPlanIds?.includes(target.record_id) ||
          ledgerSeconds(readLedger(target.fields)) > 0 ||
          claimed
        ) {
          warnings.push(
            "成果已修正；部分原表勾选已有其他来源或缺少归属，请到飞书核对"
          );
          continue;
        }
        const targetPath = `${schema.path}/records/${id(
          target.record_id
        )}`;
        await this.call("PUT", targetPath, {
          fields: { [this.config.completedField]: false },
        });
        const actual = (await this.call("GET", targetPath)).data
          ?.record;
        if (
          !actual?.fields ||
          actual.fields[this.config.completedField] === true
        )
          throw Error("额外番茄完成状态回读失败，可重试");
      }
    }
    if (after.completedCount > before.completedCount) {
      const completed = await this.completePlanRows(after, verified);
      if (completed?.failed.length)
        throw Error("修改已记账，额外番茄待重试同步");
    }
    return {
      record: {
        ...after,
        syncedPlanId: row.record_id,
        cloudSynced: true,
      },
      warning: warnings[0] || "",
    };
  }
  private async moveRecord(before: any, requested: any) {
    const key = connectionKey(this.config),
      schema = await this.planSchema();
    const completed = this.config.completedField;
    const taskTable = schema.fields.find(
      (f) => f.field_name === this.config.taskField
    )?.property?.table_id;
    const rows = await this.list(`${schema.path}/records`);
    const identity = (r: any) =>
      JSON.stringify([
        linkedRecordIds(r.fields?.[this.config.taskField], taskTable),
        localDayOf(r.fields?.[this.config.dateField]),
        textValue(r.fields?.番茄),
      ]);
    const moves = rows
      .map((row) => ({
        row,
        move: readMove(row.fields?.[MOVE_FIELD], key, completed),
      }))
      .filter((x) => x.move);
    let pending = moves.find((x) => x.move!.before.id === before.id);
    if (moves.some((x) => x.move!.before.id !== before.id))
      throw Error("另一条记录正在修改任务，请先完成该记录同步");
    if (
      pending &&
      (JSON.stringify(pending.move!.before) !==
        JSON.stringify(before) ||
        !sameEdit(pending.move!.after, requested))
    )
      throw Error("这条记录已有不同的任务修改，请先同步原修改");
    const target = rows.find(
      (r) => r.record_id === requested.task.planId
    );
    if (
      !target ||
      requested.task.id !== requested.task.planId ||
      JSON.stringify(
        linkedRecordIds(
          target.fields?.[this.config.taskField],
          taskTable
        )
      ) !== JSON.stringify([requested.task.taskId])
    )
      throw Error("目标番茄或任务关联无效，请刷新后重新选择");
    if (!pending) {
      const source = rows.find((r) =>
        readHistory(r.fields?.[HISTORY_FIELD], key).some(
          (r) => r.id === before.id
        )
      );
      const already = readHistory(
        target.fields?.[HISTORY_FIELD],
        key
      ).find((r) => r.id === before.id);
      // A lost final acknowledgment is an ordinary idempotent retry.
      if (
        already &&
        sameEdit(already, requested) &&
        already.previousTasks?.some(
          (t: any) => JSON.stringify(t) === JSON.stringify(before.task)
        )
      )
        return {
          record: {
            ...already,
            syncedPlanId: target.record_id,
            cloudSynced: true,
          },
          warning: "",
        };
      if (
        !source ||
        source.record_id === target.record_id ||
        (before.task.planId &&
          source.record_id !== before.task.planId) ||
        (before.task.taskId &&
          JSON.stringify(
            linkedRecordIds(
              source.fields?.[this.config.taskField],
              taskTable
            )
          ) !== JSON.stringify([before.task.taskId]))
      )
        throw Error("无法唯一定位原任务，先同步后重新修改");
      const oldHistory = readHistory(
        source.fields?.[HISTORY_FIELD],
        key
      );
      if (
        JSON.stringify(oldHistory.find((r) => r.id === before.id)) !==
        JSON.stringify(before)
      )
        throw Error("此记录已在另一台电脑修改，请同步后重新编辑");
      const sourcePatch: any = removePlanRecord(source.fields, before);
      const after = historyRecord(
        {
          ...requested,
          completionOwnedPlanIds: [],
          previousTasks: [...(before.previousTasks || []), before.task],
        },
        key
      );
      const destination = mergePlan(
        target.fields,
        after,
        completed
      ).patch;
      const first = pomodoroSequence(textValue(target.fields?.番茄));
      const day = localDayOf(target.fields?.[this.config.dateField]);
      if (
        first < 1 ||
        day == null ||
        first + after.completedCount - 1 > MAX_PER_TASK
      )
        throw Error("目标番茄序号、日期或完成数量无效");
      // Stable empty plan creation uses the existing generator identity. No focus
      // accounting changes until the full recoverable intent is stored below.
      const targetRows = [];
      for (let n = first; n < first + after.completedCount; n++) {
        const mine = (r: any) =>
          localDayOf(r.fields?.[this.config.dateField]) === day &&
          JSON.stringify(
            linkedRecordIds(
              r.fields?.[this.config.taskField],
              taskTable
            )
          ) === JSON.stringify([after.task.taskId]) &&
          pomodoroSequence(textValue(r.fields?.番茄)) === n;
        let matches = rows.filter(mine);
        if (!matches.length) {
          await this.call(
            "POST",
            `${schema.path}/records?client_token=${clientToken(
              `today-pomodoro-create|${this.config.appToken}|${
                after.task.taskId
              }|${dateKeyOf(day)}|${n}`
            )}`,
            {
              fields: {
                番茄: String(n),
                [this.config.taskField]: [after.task.taskId],
                [this.config.dateField]: day,
              },
            }
          );
          matches = (await this.list(`${schema.path}/records`)).filter(
            mine
          );
          if (matches.length === 1) rows.push(matches[0]);
        }
        if (matches.length !== 1)
          throw Error("目标任务存在重复番茄，请先核对");
        targetRows.push(matches[0]);
      }
      const patches = new Map<string, any>([
        [source.record_id, sourcePatch],
        [target.record_id, destination],
      ]);
      for (const row of targetRows) {
        patches.set(row.record_id, {
          ...(patches.get(row.record_id) || {}),
          [completed]: true,
        });
        if (row.fields?.[completed] !== true)
          after.completionOwnedPlanIds.push(row.record_id);
      }
      if (
        destination[completed] === true &&
        target.fields?.[completed] !== true &&
        !after.completionOwnedPlanIds.includes(target.record_id)
      )
        after.completionOwnedPlanIds.push(target.record_id);
      const oldFirst = pomodoroSequence(textValue(source.fields?.番茄));
      const sourceTask = linkedRecordIds(
        source.fields?.[this.config.taskField],
        taskTable
      )[0];
      const sourceDay = localDayOf(
        source.fields?.[this.config.dateField]
      );
      const sameSource = (r: any) =>
        localDayOf(r.fields?.[this.config.dateField]) === sourceDay &&
        JSON.stringify(
          linkedRecordIds(r.fields?.[this.config.taskField], taskTable)
        ) === JSON.stringify([sourceTask]);
      let warning = "";
      for (const row of rows.filter(sameSource)) {
        const n = pomodoroSequence(textValue(row.fields?.番茄));
        if (
          row.record_id !== source.record_id &&
          (n < oldFirst || n >= oldFirst + before.completedCount)
        )
          continue;
        if (row.fields?.[completed] !== true) continue;
        const owned = before.completionOwnedPlanIds?.includes(
          row.record_id
        );
        const otherLedger = readLedger(
          row.record_id === source.record_id ? sourcePatch : row.fields
        );
        const claimed = rows.filter(sameSource).some((anchor) =>
          readHistory(anchor.fields?.[HISTORY_FIELD], key).some(
            (other) => {
              const start = pomodoroSequence(
                textValue(anchor.fields?.番茄)
              );
              return (
                other.id !== before.id &&
                other.completedCount > 0 &&
                n >= start &&
                n < start + other.completedCount
              );
            }
          )
        );
        if (!owned || ledgerSeconds(otherLedger) > 0 || claimed) {
          if (!owned)
            warning =
              "记录已转移；原任务有缺少归属的完成勾选，已保留，请到飞书核对";
          continue;
        }
        // A shared source/target task can overlap; the new completion wins.
        if (!targetRows.some((r) => r.record_id === row.record_id))
          patches.set(row.record_id, {
            ...(patches.get(row.record_id) || {}),
            [completed]: false,
          });
      }
      sourcePatch[HISTORY_FIELD] = JSON.stringify({
        version: 1,
        records: oldHistory.filter((r) => r.id !== before.id),
      });
      patches.get(source.record_id)[HISTORY_FIELD] =
        sourcePatch[HISTORY_FIELD];
      patches.get(target.record_id)[HISTORY_FIELD] = mergeHistory(
        target.fields?.[HISTORY_FIELD],
        after,
        key
      );
      const steps: MoveStep[] = Array.from(patches).map(
        ([rowId, patch]) => {
          const row = rows.find((r) => r.record_id === rowId)!;
          const original = Object.fromEntries(
            Object.keys(patch).map((k) => [
              k,
              k === completed
                ? row.fields?.[k] === true
                : ["实际分钟", "专注日期"].includes(k)
                ? row.fields?.[k] ?? null
                : textValue(row.fields?.[k]),
            ])
          );
          return {
            rowId,
            identity: identity(row),
            before: original,
            after: patch,
          };
        }
      );
      const move: RecordMove = {
        version: 1,
        before,
        after,
        steps,
        warning,
      };
      const raw = JSON.stringify(move);
      readMove(raw, key, completed); // Capacity/schema validation before first accounting write.
      const columns = schema.fields.filter(
        (f) => f.field_name === MOVE_FIELD
      );
      if (
        columns.length > 1 ||
        (columns.length && columns[0].type !== 1)
      )
        throw Error("专注任务迁移须为唯一文本字段");
      if (!columns.length) {
        await this.call(
          "POST",
          `${schema.path}/fields?client_token=${clientToken(
            `${schema.path}|record-move-v1`
          )}`,
          { field_name: MOVE_FIELD, type: 1 }
        );
        const actual = await this.list(`${schema.path}/fields`);
        if (
          actual.filter(
            (f) => f.field_name === MOVE_FIELD && f.type === 1
          ).length !== 1
        )
          throw Error("迁移字段回读失败");
      }
      const route = `${schema.path}/records/${id(source.record_id)}`;
      await this.call("PUT", route, { fields: { [MOVE_FIELD]: raw } });
      const saved = (await this.call("GET", route)).data?.record;
      if (textValue(saved?.fields?.[MOVE_FIELD]) !== raw)
        throw Error("任务修改意图回读失败，可重试");
      pending = { row: source, move };
    }
    const move = pending.move!,
      sourcePath = `${schema.path}/records/${id(
        pending.row.record_id
      )}`;
    const verifyStep = async (step: MoveStep) => {
      const row = (
        await this.call(
          "GET",
          `${schema.path}/records/${id(step.rowId)}`
        )
      ).data?.record;
      if (
        !row ||
        identity(row) !== step.identity ||
        (!fieldsAgree(row.fields, step.before) &&
          !fieldsAgree(row.fields, step.after))
      )
        throw Error(
          "任务修改期间原表有其他变化，已保留迁移明细，请核对后重试"
        );
      return row;
    };
    for (const step of move.steps) await verifyStep(step);
    for (const step of move.steps) {
      const row = await verifyStep(step),
        route = `${schema.path}/records/${id(step.rowId)}`;
      if (!fieldsAgree(row.fields, step.after))
        await this.call("PUT", route, { fields: step.after });
      const actual = (await this.call("GET", route)).data?.record;
      if (!actual || !fieldsAgree(actual.fields, step.after))
        throw Error("任务修改回读失败，可安全重试");
    }
    await this.call("PUT", sourcePath, {
      fields: { [MOVE_FIELD]: "" },
    });
    if (
      textValue(
        (await this.call("GET", sourcePath)).data?.record?.fields?.[
          MOVE_FIELD
        ]
      )
    )
      throw Error("任务修改完成确认失败，可重试");
    return {
      record: {
        ...move.after,
        syncedPlanId: move.after.task.planId,
        cloudSynced: true,
      },
      warning: move.warning,
    };
  }
  async createQuickTask(input: any) {
    const labels: Record<string, string> = {
      iu: "重要且紧急",
      inu: "重要不紧急",
      uni: "紧急不重要",
      unu: "不紧急不重要",
    };
    if (
      input?.sourceKey !== connectionKey(this.config) ||
      !/^[0-9a-f-]{36}$/i.test(input?.id || "") ||
      typeof input.title !== "string" ||
      !input.title.trim() ||
      input.title.length > 200 ||
      !labels[input.quadrant] ||
      !Number.isInteger(input.count) ||
      input.count < 1 ||
      input.count > MAX_PER_TASK ||
      !Number.isFinite(input.day) ||
      input.day < 946684800000 ||
      input.day > Date.now() + 86400000
    )
      throw Error("新增任务参数或所属飞书表无效");
    const schema = await this.planSchema();
    const link = schema.fields.find(
      (f) => f.field_name === this.config.taskField
    );
    if (
      link?.type !== 21 ||
      !link.property?.table_id ||
      !schema.fields.some(
        (f) => f.field_name === "番茄" && f.type === 1
      )
    )
      throw Error("原番茄表需要双向任务关联和番茄文本字段");
    const taskPath = `${this.root()}/tables/${id(
      link.property.table_id
    )}`;
    const fields = await this.list(`${taskPath}/fields`);
    const countField = resolveTodayCountField(fields);
    const quadrant = await this.resolveQuadrantField(
      link.property.table_id
    );
    if (
      !quadrant ||
      countField.field?.type !== 2 ||
      !fields.some(
        (f) => f.field_name === "任务名称" && f.type === 1
      ) ||
      !fields.some((f) => f.field_name === "计划日" && f.type === 5)
    )
      throw Error(
        "请核对任务表的任务名称、计划日、今日计划番茄数和象限字段"
      );
    // Persistent intent marker survives restarts and API idempotency-token expiry.
    const marker = "农场任务标识";
    const markerFields = fields.filter((f) => f.field_name === marker);
    if (
      markerFields.length > 1 ||
      (markerFields.length && markerFields[0].type !== 1)
    )
      throw Error("农场任务标识必须是唯一文本字段");
    if (!markerFields.length) {
      await this.call(
        "POST",
        `${taskPath}/fields?client_token=${clientToken(
          `${taskPath}|quick-task-marker-v1`
        )}`,
        { field_name: marker, type: 1 }
      );
      const actual = await this.list(`${taskPath}/fields`);
      if (
        actual.filter((f) => f.field_name === marker && f.type === 1)
          .length !== 1
      )
        throw Error("任务标识字段回读失败");
    }
    const expected = {
      任务名称: input.title.trim(),
      计划日: dayStart(new Date(input.day)),
      [countField.name]: input.count,
      [quadrant]: labels[input.quadrant],
      [marker]: input.id,
    };
    const find = async () =>
      (await this.list(`${taskPath}/records`)).filter(
        (r) => textValue(r.fields?.[marker]) === input.id
      );
    let matches = await find();
    if (!matches.length) {
      await this.call(
        "POST",
        `${taskPath}/records?client_token=${input.id}`,
        { fields: expected }
      );
      matches = await find();
    }
    if (
      matches.length !== 1 ||
      !fieldsAgree(matches[0].fields, expected)
    )
      throw Error("新增任务回读不一致，已保留待核对，未重复创建");
    const taskId = matches[0].record_id;
    const dateKey = dateKeyOf(expected.计划日);
    const mine = (r: any) =>
      localDayOf(r.fields?.[this.config.dateField]) ===
        expected.计划日 &&
      JSON.stringify(
        linkedRecordIds(
          r.fields?.[this.config.taskField],
          link.property.table_id
        )
      ) === JSON.stringify([taskId]);
    let plans = (await this.list(`${schema.path}/records`)).filter(
      mine
    );
    for (let n = 1; n <= input.count; n++) {
      const hit = plans.filter(
        (r) => pomodoroSequence(textValue(r.fields?.番茄)) === n
      );
      if (hit.length > 1)
        throw Error("今日番茄出现重复序号，未继续创建");
      if (!hit.length)
        await this.call(
          "POST",
          `${schema.path}/records?client_token=${clientToken(
            `today-pomodoro-create|${this.config.appToken}|${taskId}|${dateKey}|${n}`
          )}`,
          {
            fields: {
              番茄: String(n),
              [this.config.taskField]: [taskId],
              [this.config.dateField]: expected.计划日,
            },
          }
        );
    }
    plans = (await this.list(`${schema.path}/records`)).filter(mine);
    if (
      Array.from({ length: input.count }, (_, i) => i + 1).some(
        (n) =>
          plans.filter(
            (r) => pomodoroSequence(textValue(r.fields?.番茄)) === n
          ).length !== 1
      )
    )
      throw Error("任务已创建，番茄计划待重试核对");
    const doneToday = plans.filter(
      (r) => r.fields?.[this.config.completedField] === true
    ).length;
    const taskRows = Array.from({ length: input.count }, (_, i) => {
      const r = plans.find(
        (r) => pomodoroSequence(textValue(r.fields?.番茄)) === i + 1
      )!;
      const ledger = readLedger(r.fields);
      return {
        id: r.record_id,
        planId: r.record_id,
        taskId,
        title: `${input.title.trim()} · 第 ${i + 1} 个番茄`,
        source: "feishu",
        sourceKey: input.sourceKey,
        quadrant: input.quadrant,
        doneToday,
        plannedToday: plans.length,
        ...(r.fields?.[this.config.completedField] === true
          ? { kind: "done" }
          : {}),
        creditedSeconds: ledgerSeconds(ledger),
        goalSeconds: ledger?.target,
        appliedSessionIds: ledger?.entries.map((e) => e.id) || [],
      };
    });
    return { taskId, created: true, tasks: taskRows };
  }
  async today(now = new Date()) {
    const { path, fields } = await this.planSchema();
    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime(),
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      ).getTime();
    const rows = await this.list(`${path}/records`);
    const linkedTable = fields.find(
      (f) => f.field_name === this.config.taskField
    )?.property?.table_id;
    const taskOf = (r: any) =>
      linkedRecordIds(
        r.fields?.[this.config.taskField],
        linkedTable
      )[0] || "";
    // Multi-pomodoro confirmation stores its timestamp on the selected row only.
    // Recover the exact contiguous range from the immutable shared session, never
    // infer completion from another task's title or copy dates across the whole task.
    const completedAt = new Map<string, number>();
    for (const anchor of rows) {
      let records: any[] = [];
      try {
        records = readHistory(
          anchor.fields?.[HISTORY_FIELD],
          connectionKey(this.config)
        );
      } catch {
        /* History sync reports malformed envelopes separately. */
      }
      for (const record of records) {
        if (
          record.task.planId !== anchor.record_id ||
          record.task.taskId !== taskOf(anchor)
        )
          continue;
        const first = pomodoroSequence(
          textValue(anchor.fields?.["番茄"])
        );
        if (first <= 0 || record.completedCount < 1) continue;
        for (const row of rows) {
          const seq = pomodoroSequence(textValue(row.fields?.["番茄"]));
          if (
            taskOf(row) === taskOf(anchor) &&
            localDayOf(row.fields?.[this.config.dateField]) ===
              localDayOf(anchor.fields?.[this.config.dateField]) &&
            seq >= first &&
            seq < first + record.completedCount
          ) {
            completedAt.set(
              row.record_id,
              Math.max(
                completedAt.get(row.record_id) || 0,
                record.startedAt
              )
            );
          }
        }
      }
    }
    const isDone = (r: any) => {
      if (r.fields?.[this.config.completedField] === true) return true;
      try {
        const ledger = readLedger(r.fields);
        return !!ledger && ledgerSeconds(ledger) >= ledger.target;
      } catch {
        return false;
      }
    };
    const inRange = rows.filter((r) => {
      const f = r.fields || {};
      let date = f[this.config.dateField];
      if (isDone(r)) {
        // Actual focus day takes precedence over a rescheduled plan day.
        // Legacy manually checked rows with no date evidence retain their plan day.
        date = completedAt.get(r.record_id) ?? f["专注日期"] ?? date;
        if (
          !completedAt.has(r.record_id) &&
          typeof f["专注日期"] !== "number"
        ) {
          try {
            const entries = readLedger(f)?.entries;
            if (entries?.length)
              date = Math.max(...entries.map((e) => e.start));
          } catch {
            /* Keep legacy plan date. */
          }
        }
      }
      return typeof date === "number" && date >= start && date < end;
    });
    const selected = inRange.filter(
      (r) => r.fields[this.config.completedField] !== true
    );
    // 已收 x/y 聚合：y=今日该任务番茄行总数（含已完成+待办），x=已完成行数；
    // 完成判定沿用同步链路口径——已完成勾选，或分钟台账累计达到目标
    const harvestKey = (r: any) =>
      linkedRecordIds(
        r.fields?.[this.config.taskField],
        linkedTable
      )[0] || "";
    const harvestOf = (r: any) => harvestKey(r) || r.record_id;
    const harvest = new Map<
      string,
      { done: number; planned: number }
    >();
    for (const r of inRange) {
      let done = r.fields?.[this.config.completedField] === true;
      if (!done)
        try {
          const ledger = readLedger(r.fields);
          done = !!ledger && ledgerSeconds(ledger) >= ledger.target;
        } catch {
          // 台账无法解析的行只按未完成计数，不拖垮今日列表
          done = false;
        }
      const key = harvestOf(r),
        h = harvest.get(key) || { done: 0, planned: 0 };
      h.planned += 1;
      if (done) h.done += 1;
      harvest.set(key, h);
    }
    this.quadrantFieldResolved = null;
    const linked =
      linkedTable && inRange.length
        ? await this.list(
            `${this.root()}/tables/${id(linkedTable)}/records`
          )
        : [];
    const quadrantField =
      linkedTable && inRange.length
        ? (this.quadrantFieldResolved = await this.resolveQuadrantField(
            linkedTable
          ))
        : null;
    const linkedById = new Map(linked.map((r) => [r.record_id, r]));
    const titles = new Map(
      linked.map((r) => [
        r.record_id,
        plain(r.fields?.["任务名称"]) ||
          plain(Object.values(r.fields || {})[0]),
      ])
    );
    const taskTitle = (refs: string[], link: any) =>
      refs
        .map((ref: string) => titles.get(ref))
        .filter(Boolean)
        .join("、") ||
      plain(link) ||
      "未命名任务";
    const taskQuadrant = (refs: string[]) => {
      const value = quadrantField
        ? plain(linkedById.get(refs[0])?.fields?.[quadrantField])
        : "";
      return QUADRANT_LABELS[value];
    };
    const result = selected.map((r) => {
      const link = r.fields[this.config.taskField],
        refs = linkedRecordIds(link, linkedTable);
      const title = taskTitle(refs, link);
      const quadrant = taskQuadrant(refs);
      const ledger = readLedger(r.fields);
      const free = plain(r.fields["番茄"]) === FREE_TITLE;
      const h = harvest.get(harvestOf(r));
      return {
        id: r.record_id,
        planId: r.record_id,
        taskId: refs[0] || "",
        title: free
          ? FREE_TITLE
          : `${title} · 第 ${plain(r.fields["番茄"]) || "?"} 个番茄`,
        source: "feishu",
        sourceKey: connectionKey(this.config),
        creditedSeconds: ledgerSeconds(ledger),
        appliedSessionIds: ledger?.entries.map((e) => e.id) || [],
        ...(ledger ? { goalSeconds: ledger.target } : {}),
        ...(free ? { kind: "free" } : {}),
        // 象限缺失或标签无法识别时归入“不紧急不重要”
        quadrant: quadrant || "unu",
        ...(h ? { doneToday: h.done, plannedToday: h.planned } : {}),
      };
    });
    // 今日番茄全部完成的任务不再有待办行；补一行占位让“已收 y/y ✓”可见。
    // 自由番茄与无关联行不补占位（维持现状：完成即从看板消失）
    const visible = new Set(result.map((t) => t.taskId || t.id));
    harvest.forEach((h, key) => {
      if (!h.planned || h.done < h.planned || visible.has(key)) return;
      const sample = inRange.find((r) => harvestOf(r) === key);
      if (!sample || !harvestKey(sample)) return;
      if (plain(sample.fields?.["番茄"]) === FREE_TITLE) return;
      const refs = linkedRecordIds(
        sample.fields[this.config.taskField],
        linkedTable
      );
      result.push({
        id: `done-${key}`,
        planId: "",
        taskId: key,
        title: taskTitle(refs, sample.fields[this.config.taskField]),
        source: "feishu",
        sourceKey: connectionKey(this.config),
        kind: "done",
        quadrant: taskQuadrant(refs) || "unu",
        doneToday: h.done,
        plannedToday: h.planned,
      } as any);
    });
    return result;
  }
  // 生成今日番茄：移植 Invoke-FeishuTodayPomodoroGeneration.ps1 的幂等算法；
  // 字段缺失/歧义直接报错，不在 App 内自动改表结构
  async generateToday(
    now = new Date(),
    progress?: (p: GenerateProgress) => void
  ) {
    progress?.({ stage: "connect" });
    const { path, fields } = await this.planSchema();
    await this.guardRecordMoves({ path, fields });
    const seqFields = fields.filter(
      (f: any) => f.field_name === "番茄" && f.type === 1
    );
    if (seqFields.length !== 1)
      throw new Error("专注记录表缺少「番茄」文本字段，请到飞书检查");
    const link = fields.find(
      (f: any) => f.field_name === this.config.taskField
    );
    const taskTableId = link?.property?.table_id;
    if (link?.type !== 21 || !taskTableId)
      throw new Error(
        "专注记录表的「任务」字段不是单向关联，请到飞书检查"
      );
    const taskPath = `${this.root()}/tables/${id(taskTableId)}`;
    progress?.({ stage: "tasks" });
    const taskFields = await this.list(`${taskPath}/fields`);
    for (const [name, type] of [["任务名称", 1]] as [
      string,
      number
    ][]) {
      const f = taskFields.filter((f: any) => f.field_name === name);
      if (f.length !== 1 || f[0].type !== type)
        throw new Error(
          `任务表字段「${name}」缺失或类型不符，请到飞书检查`
        );
    }
    const planningMode = resolvePlanningMode(taskFields);
    const resolution = resolveTodayCountField(taskFields);
    if (!resolution.field)
      throw new Error(
        `任务表缺少「${resolution.name}」数字字段，请到飞书添加后重试`
      );
    if (resolution.field.type !== 2)
      throw new Error(
        `任务表「${resolution.name}」不是数字字段，请到飞书检查`
      );
    const dayMs = dayStart(now),
      dateKey = dateKeyOf(dayMs);
    const taskRecords = await this.list(`${taskPath}/records`);
    progress?.({ stage: "records" });
    const pomodoroRecords = await this.list(`${path}/records`);
    const { plans, invalid } = collectTaskPlans(
      taskRecords,
      resolution.name,
      dayMs,
      MAX_PER_TASK,
      planningMode
    );
    if (invalid > 0)
      throw new Error(
        `${invalid} 个今日任务的「${resolution.name}」不是 0–${MAX_PER_TASK} 的整数，未写入；请到飞书修正后重试`
      );
    const known = new Set(
      taskRecords.map((r: any) => String(r.record_id))
    );
    const candidates = new Set(plans.map((p) => p.recordId));
    const scan = scanExisting(pomodoroRecords, {
      dayMs,
      dateKey,
      dateField: this.config.dateField,
      taskField: this.config.taskField,
      seqField: "番茄",
      knownTaskIds: known,
      candidateTaskIds: candidates,
      linkIds: (v: any) => linkedRecordIds(v, taskTableId),
    });
    progress?.({ stage: "plan" });
    const plan = pomodoroPlan(
      plans,
      scan.keyCounts,
      scan.blocked,
      dateKey
    );
    let created = 0;
    const batches = Math.ceil(plan.specs.length / BATCH_SIZE);
    for (
      let offset = 0, batch = 0;
      offset < plan.specs.length;
      offset += BATCH_SIZE, batch++
    ) {
      const chunk = plan.specs.slice(offset, offset + BATCH_SIZE);
      const token = clientToken(
        `today-pomodoro-create|${this.config.appToken}|${chunk
          .map((s) => s.key)
          .join(";")}`
      );
      const r = await this.call(
        "POST",
        `${path}/records/batch_create?client_token=${token}`,
        {
          records: chunk.map((s) => ({
            fields: {
              番茄: String(s.sequence),
              [this.config.taskField]: [s.taskRecordId],
              [this.config.dateField]: dayMs,
            },
          })),
        }
      );
      const made = r.data?.records;
      if (!Array.isArray(made) || made.length !== chunk.length)
        throw new Error("飞书生成返回数量不符，请到飞书核对后重试");
      created += made.length;
      progress?.({
        stage: "write",
        done: created,
        total: plan.specs.length,
        batch: batch + 1,
        batches,
      });
    }
    if (plan.specs.length) {
      // readback：生成的每个幂等键都必须存在且唯一
      progress?.({ stage: "verify" });
      const readback = await this.list(`${path}/records`);
      const counts = new Map<string, number>();
      for (const r of readback) {
        if (localDayOf(r.fields?.[this.config.dateField]) !== dayMs)
          continue;
        const ids = linkedRecordIds(
          r.fields?.[this.config.taskField],
          taskTableId
        );
        if (ids.length !== 1) continue;
        const sequence = pomodoroSequence(
          textValue(r.fields?.["番茄"])
        );
        if (sequence <= 0) continue;
        const key = `${ids[0]}|${dateKey}|${sequence}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      if (plan.specs.some((s) => counts.get(s.key) !== 1))
        throw new Error(
          "生成后回读校验未通过（缺失或重复），请到飞书核对"
        );
    }
    return {
      created,
      desired: plan.desired,
      alreadyPresent: plan.alreadyPresent,
      blocked: scan.blocked.size,
      excess: plan.excess,
      capacityExceeded: plan.desired > DAILY_CAPACITY,
      capacityOverage: Math.max(0, plan.desired - DAILY_CAPACITY),
      fieldResolution: resolution.resolution,
      planningMode,
      eligibleTasks: plans.length,
    };
  }
  // 悬浮 ± 临时加减今日番茄：chips 的真相源是专注记录表的已生成行
  // （每行一个番茄），不是任务表的「今日计划番茄数」字段——因此加号按
  // 生成器同一幂等键规范（任务recordId|yyyy-MM-dd|序号）补建行，减号删除
  // 最高序号的未完成行；任务表计数字段保持不动
  async adjustToday(taskRecordId: any, delta: any, now = new Date()) {
    id(taskRecordId);
    if (delta !== 1 && delta !== -1)
      throw new Error("番茄调整幅度无效");
    const { path, fields } = await this.planSchema();
    await this.guardRecordMoves({ path, fields });
    const seqFields = fields.filter(
      (f: any) => f.field_name === "番茄" && f.type === 1
    );
    if (seqFields.length !== 1)
      throw new Error("专注记录表缺少「番茄」文本字段，请到飞书检查");
    const linkedTable = fields.find(
      (f: any) => f.field_name === this.config.taskField
    )?.property?.table_id;
    const dayMs = dayStart(now),
      dateKey = dateKeyOf(dayMs);
    const mine = (r: any) =>
      localDayOf(r.fields?.[this.config.dateField]) === dayMs &&
      linkedRecordIds(r.fields?.[this.config.taskField], linkedTable)
        .length === 1 &&
      linkedRecordIds(
        r.fields?.[this.config.taskField],
        linkedTable
      )[0] === taskRecordId;
    const rows = (await this.list(`${path}/records`)).filter(mine);
    const keyed = rows
      .map((r) => ({
        r,
        sequence: pomodoroSequence(textValue(r.fields?.["番茄"])),
      }))
      .filter((x) => x.sequence > 0);
    if (delta === 1) {
      const max = keyed.reduce((m, x) => Math.max(m, x.sequence), 0);
      if (max >= MAX_PER_TASK)
        throw new Error(`单个任务每日最多 ${MAX_PER_TASK} 个番茄`);
      const sequence = max + 1,
        key = `${taskRecordId}|${dateKey}|${sequence}`;
      const created = await this.call(
        "POST",
        `${path}/records?client_token=${clientToken(
          `today-pomodoro-create|${this.config.appToken}|${key}`
        )}`,
        {
          fields: {
            番茄: String(sequence),
            [this.config.taskField]: [taskRecordId],
            [this.config.dateField]: dayMs,
          },
        }
      );
      const recordId = created.data?.record?.record_id;
      if (!recordId)
        throw new Error("新增番茄未返回标识，请刷新后核对");
      // readback：该幂等键必须恰好存在一次
      const count = (await this.list(`${path}/records`)).filter(
        (r) =>
          mine(r) &&
          pomodoroSequence(textValue(r.fields?.["番茄"])) === sequence
      ).length;
      if (count !== 1)
        throw new Error(
          "新增后回读校验未通过（缺失或重复），请到飞书核对"
        );
      return { action: "added", sequence, recordId };
    }
    // 减号：只删最高序号的待办行；已勾选完成或已有专注分钟的行不删，
    // 避免丢掉已发生的专注记录
    const removable = keyed.filter((x) => {
      if (x.r.fields?.[this.config.completedField] === true)
        return false;
      try {
        return ledgerSeconds(readLedger(x.r.fields)) === 0;
      } catch {
        // 台账无法解析的行按已有数据对待，不删
        return false;
      }
    });
    if (!removable.length) throw new Error("没有可减去的待办番茄");
    const target = removable.reduce((a, b) =>
      b.sequence > a.sequence ? b : a
    );
    await this.call(
      "DELETE",
      `${path}/records/${id(target.r.record_id)}`
    );
    const still = (await this.list(`${path}/records`)).some(
      (r) => r.record_id === target.r.record_id
    );
    if (still) throw new Error("删除后回读仍存在该番茄，请到飞书核对");
    return {
      action: "removed",
      sequence: target.sequence,
      recordId: target.r.record_id,
    };
  }
  // 右键「标记完成」：只把该行「已完成」勾选置 true——不建专注记录、
  // 不写分钟台账。PUT 同值幂等，重试安全；mergePlan 对已勾选行只会保持
  // 勾选（已完成===true 时 patch 继续带 true），不会被后续同步刷回
  async completePlan(recordId: any, now = new Date()) {
    id(recordId);
    const { path, fields } = await this.planSchema();
    await this.guardRecordMoves({ path, fields });
    const row = (
      await this.call("GET", `${path}/records/${id(recordId)}`)
    ).data?.record;
    if (!row?.fields || row.record_id !== recordId)
      throw new Error("所选番茄已不存在，请刷新后重试");
    if (localDayOf(row.fields[this.config.dateField]) !== dayStart(now))
      throw new Error("只能完成今天的番茄");
    if (row.fields[this.config.completedField] === true)
      return { completed: true, recordId };
    await this.call("PUT", `${path}/records/${id(recordId)}`, {
      fields: { [this.config.completedField]: true },
    });
    const actual = (
      await this.call("GET", `${path}/records/${id(recordId)}`)
    ).data?.record;
    if (actual?.fields?.[this.config.completedField] !== true)
      throw new Error("完成回读未通过，请到飞书核对");
    return { completed: true, recordId };
  }
  async setup() {
    let table = await this.findTable(SESSION_TABLE, false);
    if (!table) {
      await this.call("POST", `${this.root()}/tables`, {
        table: {
          name: SESSION_TABLE,
          default_view_name: "全部专注",
          fields: SESSION_FIELDS,
        },
      });
      table = await this.findTable(SESSION_TABLE);
    }
    const fields = await this.list(
      `${this.root()}/tables/${id(table.table_id)}/fields`
    );
    for (const f of SESSION_FIELDS)
      if (
        !fields.some(
          (actual) =>
            actual.field_name === f.field_name && actual.type === f.type
        )
      )
        throw new Error(
          "专注会话表字段不匹配，请按文档检查；未修改现有字段"
        );
    return { ready: true };
  }
  // Metadata migration never replays minute accounting or completion writes.
  async archiveHistory(input: any) {
    const key = connectionKey(this.config);
    let record = input;
    if (input?.task?.source === "local" && input.sync === "local") {
      record = {
        ...input,
        syncTarget: "plan",
        task: {
          id: input.task.id,
          title: input.task.title,
          kind: "free",
          source: "feishu",
          sourceKey: key,
          ...(input.task.quadrant
            ? { quadrant: input.task.quadrant }
            : {}),
        },
      };
      historyRecord(record, key); // Validate before any external side effect.
      const receipt = await this.sync(record);
      record = {
        ...record,
        syncedPlanId: receipt.planId,
        sync: "synced",
      };
    }
    const snapshot = historyRecord(record, key);
    if (record.sync !== "synced")
      throw Error("请先完成该记录的飞书记账，再共享成果");
    const schema = await this.planSchema();
    await this.guardRecordMoves(schema, record);
    const column = schema.fields.filter(
      (f) => f.field_name === HISTORY_FIELD
    );
    if (
      column.length > 1 ||
      (column.length === 1 && column[0].type !== 1)
    )
      throw Error("跨端专注记录字段必须是文本，未覆盖");
    let planId = record.syncedPlanId || record.task.planId;
    if (!planId && record.task.kind === "free") {
      const matches = (
        await this.list(`${schema.path}/records`)
      ).filter((r) =>
        readLedger(r.fields)?.entries.some((e) => e.id === record.id)
      );
      if (matches.length !== 1)
        throw Error("无法定位自由番茄原行，请在原电脑核对");
      planId = matches[0].record_id;
    }
    const route = `${schema.path}/records/${id(planId)}`;
    let row;
    try {
      row = (await this.call("GET", route)).data?.record;
    } catch (e: any) {
      if (/代码 1254043\b/.test(e.message || ""))
        throw Error(
          "历史番茄原行不存在，记录保留本机；请恢复飞书原行后重试"
        );
      throw e;
    }
    if (!row?.fields || row.record_id !== planId)
      throw Error("历史番茄原行不存在，未创建替代行");
    const linkedTable = schema.fields.find(
      (f) => f.field_name === this.config.taskField
    )?.property?.table_id;
    if (
      record.task.taskId &&
      !linkedRecordIds(
        row.fields[this.config.taskField],
        linkedTable
      ).includes(record.task.taskId)
    )
      throw Error("历史番茄的关联任务已改变，未覆盖");
    if (record.syncTarget === "plan") {
      const entry = readLedger(row.fields)?.entries.find(
        (e) => e.id === record.id
      );
      if (
        !entry ||
        entry.seconds !== record.acceptedSeconds ||
        entry.start !== record.startedAt ||
        entry.end !== record.endedAt
      )
        throw Error("原表记账与本机历史不一致，未重复累计；请核对");
    } else {
      const table = await this.findTable(SESSION_TABLE);
      const originals = (
        await this.list(
          `${this.root()}/tables/${id(table.table_id)}/records`
        )
      ).filter((r) => plain(r.fields?.["会话 ID"]) === record.id);
      if (
        originals.length !== 1 ||
        !fieldsAgree(originals[0].fields, sessionFields(record))
      )
        throw Error("旧会话历史无法核对，未重复记账");
    }
    const before = textValue(row.fields[HISTORY_FIELD]);
    const merged = mergeHistory(before, snapshot, key);
    if (!column.length) {
      await this.call(
        "POST",
        `${schema.path}/fields?client_token=${this.stableToken(
          `${schema.table.table_id}|history-v1`
        )}`,
        { field_name: HISTORY_FIELD, type: 1 }
      );
      const fields = await this.list(`${schema.path}/fields`);
      if (
        !fields.some(
          (f) => f.field_name === HISTORY_FIELD && f.type === 1
        )
      )
        throw Error("跨端字段创建回读失败");
    }
    if (before !== merged) {
      // Detect changes since the read. Feishu PUT is not a cross-device CAS;
      // this release supports sequential devices, not simultaneous writers.
      const latest = (await this.call("GET", route)).data?.record;
      if (textValue(latest?.fields?.[HISTORY_FIELD]) !== before)
        throw Error("另一台电脑已更新此记录，请重新同步");
      await this.call("PUT", route, {
        fields: { [HISTORY_FIELD]: merged },
      });
    }
    const actual = (await this.call("GET", route)).data?.record;
    if (textValue(actual?.fields?.[HISTORY_FIELD]) !== merged)
      throw Error("跨端记录回读不符，请重新同步");
    return { ...snapshot, syncedPlanId: planId, cloudSynced: true };
  }

  async history() {
    const { path, fields } = await this.planSchema(),
      key = connectionKey(this.config);
    const column = fields.filter((f) => f.field_name === HISTORY_FIELD);
    if (column.length > 1 || (column.length && column[0].type !== 1))
      throw Error("跨端专注记录字段类型不符");
    const rows = await this.list(`${path}/records`),
      records: any[] = [],
      ids = new Set<string>();
    const moving = new Map<string, any>();
    for (const row of rows) {
      const move = readMove(
        row.fields?.[MOVE_FIELD],
        key,
        this.config.completedField
      );
      if (move) {
        if (moving.has(move.before.id))
          throw Error("重复任务迁移，未合并");
        moving.set(move.before.id, {
          ...move.before,
          syncedPlanId: row.record_id,
          cloudSynced: true,
        });
      }
    }
    // Other computers see one consistent old record until all move steps commit.
    for (const record of Array.from(moving.values())) {
      ids.add(record.id);
      records.push(record);
    }
    for (const row of rows) {
      for (const record of readHistory(
        row.fields?.[HISTORY_FIELD],
        key
      )) {
        if (moving.has(record.id)) continue;
        if (ids.has(record.id))
          throw Error("云端不同番茄行包含重复专注 ID，请核对；未合并");
        ids.add(record.id);
        records.push({
          ...record,
          syncedPlanId: row.record_id,
          cloudSynced: true,
        });
      }
    }
    const missing = rows.reduce(
      (n, row) =>
        n +
        (readLedger(row.fields)?.entries.filter((e) => !ids.has(e.id))
          .length || 0),
      0
    );
    return { sourceKey: key, records, missing };
  }
  async sync(record: any) {
    if (record?.syncTarget === "plan") {
      // Validate the common immutable session envelope, including free focus.
      sessionFields({
        ...record,
        task: {
          ...record.task,
          planId:
            record.task?.planId ||
            (record.task?.kind === "free" ? "free" : ""),
        },
      });
      if (record.task.sourceKey !== connectionKey(this.config))
        throw Error("记录属于另一份多维表格，请切回原连接后同步");
      if (
        record.task.goalSeconds != null &&
        (!Number.isFinite(record.task.goalSeconds) ||
          record.task.goalSeconds < 60 ||
          record.task.goalSeconds > 10800)
      )
        throw Error("番茄目标时长无效");
      const work = this.planQueue.then(() => this.writePlan(record));
      this.planQueue = work.catch(() => {});
      return work;
    }
    const fields = sessionFields(record);
    if (record.task.sourceKey !== connectionKey(this.config))
      throw new Error("记录属于另一份多维表格，请切回原连接后同步");
    if (this.inFlight.has(record.id))
      return this.inFlight.get(record.id);
    const work = this.write(record.id, fields);
    this.inFlight.set(record.id, work);
    try {
      return await work;
    } finally {
      this.inFlight.delete(record.id);
    }
  }
  private stableToken(purpose: string) {
    const h = createHash("sha256")
      .update(`${this.root()}|${purpose}`)
      .digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(
      13,
      16
    )}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  }
  async setupPlans() {
    const schema = await this.planSchema();
    const conflicts = PLAN_FIELDS.filter((w) =>
      schema.fields.some(
        (f) => f.field_name === w.field_name && f.type !== w.type
      )
    );
    if (conflicts.length)
      throw Error(
        `原表字段类型不符：${conflicts
          .map((f) => f.field_name)
          .join("、")}；未修改`
      );
    for (const f of PLAN_FIELDS)
      if (!schema.fields.some((x) => x.field_name === f.field_name)) {
        await this.call(
          "POST",
          `${schema.path}/fields?client_token=${this.stableToken(
            `${schema.table.table_id}|field|${f.field_name}`
          )}`,
          f
        );
      }
    const actual = await this.list(`${schema.path}/fields`);
    if (
      !PLAN_FIELDS.every((f) =>
        actual.some(
          (x) => x.field_name === f.field_name && x.type === f.type
        )
      )
    )
      throw Error("原表专注字段回读未通过");
    return { ready: true };
  }
  private async freeTask(linkedTable: string) {
    const path = `${this.root()}/tables/${id(linkedTable)}`;
    const fields = await this.list(`${path}/fields`);
    const primary =
      fields.find((f) => f.is_primary) ||
      fields.find((f) => f.field_name === "任务名称");
    if (!primary || primary.type !== 1)
      throw Error("任务表主字段不能用于自由番茄，未创建记录");
    const find = async () =>
      (await this.list(`${path}/records`)).filter(
        (r) => plain(r.fields?.[primary.field_name]) === FREE_TITLE
      );
    let rows = await find();
    if (rows.length > 1)
      throw Error("任务表有多个自由番茄，请先保留唯一关联任务");
    if (!rows.length) {
      await this.call(
        "POST",
        `${path}/records?client_token=${this.stableToken(
          `${linkedTable}|free-task`
        )}`,
        { fields: { [primary.field_name]: FREE_TITLE } }
      );
      rows = await find();
    }
    if (rows.length !== 1) throw Error("自由番茄关联回读未通过");
    return rows[0].record_id;
  }
  private async writePlan(record: any) {
    const { path, fields } = await this.planSchema();
    await this.guardRecordMoves({ path, fields }, record);
    if (
      !PLAN_FIELDS.every((f) =>
        fields.some(
          (x) => x.field_name === f.field_name && x.type === f.type
        )
      )
    )
      throw Error("请在设置中启用原表专注记录字段，记录已保留本机");
    const linkedTable = fields.find(
      (f) => f.field_name === this.config.taskField
    )?.property?.table_id;
    let row: any;
    if (record.task.planId) {
      row = (
        await this.call(
          "GET",
          `${path}/records/${id(record.task.planId)}`
        )
      ).data?.record;
      if (!row?.fields || row.record_id !== record.task.planId)
        throw Error("所选番茄已不存在，未写入其他行");
      const refs = linkedRecordIds(
        row.fields[this.config.taskField],
        linkedTable
      );
      if (record.task.taskId && !refs.includes(record.task.taskId))
        throw Error("所选番茄的关联任务已改变，未覆盖");
    } else {
      if (record.task.kind !== "free") throw Error("缺少计划记录 ID");
      const matches = (await this.list(`${path}/records`)).filter(
        (r) =>
          textValue(r.fields?.[ledgerField]).includes(record.id) &&
          readLedger(r.fields)?.entries.some((e) => e.id === record.id)
      );
      if (matches.length > 1)
        throw Error("发现重复的自由番茄记录，未继续写入");
      row = matches[0];
    }
    const merged = mergePlan(
      row?.fields || {},
      record,
      this.config.completedField
    );
    if (!row) {
      const taskId = await this.freeTask(linkedTable);
      const createFields = {
        ...merged.patch,
        [this.config.taskField]: [taskId],
        [this.config.dateField]: record.startedAt,
        番茄: FREE_TITLE,
      };
      const created = await this.call(
        "POST",
        `${path}/records?client_token=${record.id}`,
        { fields: createFields }
      );
      const recordId = created.data?.record?.record_id;
      if (!recordId) throw Error("新增自由番茄未返回标识，待重试核对");
      row = { record_id: recordId };
    } else if (
      merged.duplicate &&
      !fieldsAgree(row.fields, merged.patch)
    ) {
      throw Error("该记录已同步，但原行完成状态已改变；未覆盖人工修改");
    } else if (!merged.duplicate) {
      await this.call("PUT", `${path}/records/${id(row.record_id)}`, {
        fields: merged.patch,
      });
    }
    const actual = (
      await this.call("GET", `${path}/records/${id(row.record_id)}`)
    ).data?.record;
    if (!actual?.fields || !fieldsAgree(actual.fields, merged.patch))
      throw Error("原表回读未通过，记录仍保留待同步");
    const completion = await this.completePlanRows(record, actual);
    return {
      synced: true,
      syncTarget: "plan",
      planId: row.record_id,
      completedCount: merged.count,
      completionOwnedPlanIds: Array.from(
        new Set([
          ...(merged.count ? [row.record_id] : []),
          ...(completion?.ownedPlanIds || []),
        ])
      ),
      ...(completion ? { completion } : {}),
    };
  }
  // 手动确认 N 个番茄：从被选中行起，把其后连续序号共 N 行标记「已完成」
  //（已勾选的幂等跳过，不扩展区间）；当天缺的行按生成器同一幂等键规范
  //（任务recordId|yyyy-MM-dd|序号，client_token 与 generate/adjust 同规范）
  // 补建并直接勾选——生成器看到键已存在会跳过，不会重复建行。
  // 分钟台账仍只记在被选中行，不拆分到多行；mergePlan 的「已勾选保持
  // 勾选」语义保证后续同步不会刷回。逐行写入失败不中断，统一回读后把
  // 未成的序号放进返回值，由渲染层提示；列表/回读等环境异常照旧抛出，
  // 让整条记录留在待同步队列重试
  private async completePlanRows(record: any, selectedRow: any) {
    const count = record.completedCount;
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      record.task.kind === "free" ||
      !record.task.taskId ||
      !record.task.planId
    )
      return null;
    const first = pomodoroSequence(
      textValue(selectedRow.fields?.["番茄"])
    );
    if (first <= 0) return null;
    const { path, fields } = await this.planSchema();
    const linkedTable = fields.find(
      (f: any) => f.field_name === this.config.taskField
    )?.property?.table_id;
    const dayMs =
      localDayOf(selectedRow.fields?.[this.config.dateField]) ??
      dayStart(new Date());
    const dateKey = dateKeyOf(dayMs);
    const mine = (r: any) =>
      localDayOf(r.fields?.[this.config.dateField]) === dayMs &&
      linkedRecordIds(r.fields?.[this.config.taskField], linkedTable)
        .length === 1 &&
      linkedRecordIds(
        r.fields?.[this.config.taskField],
        linkedTable
      )[0] === record.task.taskId;
    const bySequence = new Map<number, any>();
    for (const r of (await this.list(`${path}/records`)).filter(mine)) {
      const s = pomodoroSequence(textValue(r.fields?.["番茄"]));
      if (s > 0 && !bySequence.has(s)) bySequence.set(s, r);
    }
    const targets = Array.from({ length: count }, (_, i) => first + i);
    const writeError = new Map<number, string>();
    const newlyOwned = new Set<number>();
    for (const s of targets) {
      const row = bySequence.get(s);
      if (row?.fields?.[this.config.completedField] === true) continue;
      newlyOwned.add(s);
      try {
        if (s > MAX_PER_TASK)
          throw new Error(`超过单任务每日上限 ${MAX_PER_TASK} 个`);
        if (row) {
          await this.call(
            "PUT",
            `${path}/records/${id(row.record_id)}`,
            {
              fields: { [this.config.completedField]: true },
            }
          );
        } else {
          await this.call(
            "POST",
            `${path}/records?client_token=${clientToken(
              `today-pomodoro-create|${this.config.appToken}|${record.task.taskId}|${dateKey}|${s}`
            )}`,
            {
              fields: {
                番茄: String(s),
                [this.config.taskField]: [record.task.taskId],
                [this.config.dateField]: dayMs,
                [this.config.completedField]: true,
              },
            }
          );
        }
      } catch (e: any) {
        writeError.set(s, e?.message || "写入失败");
      }
    }
    // 统一回读：每个目标序号都必须恰好一行且已勾选；丢失响应但实际
    // 已生效的写入在这里被读到，不算失败
    const after = (await this.list(`${path}/records`)).filter(mine);
    const failed: { sequence: number; reason: string }[] = [];
    for (const s of targets) {
      const hit = after.filter(
        (r) => pomodoroSequence(textValue(r.fields?.["番茄"])) === s
      );
      if (
        hit.length !== 1 ||
        hit[0].fields?.[this.config.completedField] !== true
      )
        failed.push({
          sequence: s,
          reason: writeError.get(s) || "回读校验未通过，请到飞书核对",
        });
    }
    return {
      marked: targets.length - failed.length,
      failed,
      ownedPlanIds: after
        .filter(
          (r) =>
            newlyOwned.has(
              pomodoroSequence(textValue(r.fields?.番茄))
            ) && r.fields?.[this.config.completedField] === true
        )
        .map((r) => r.record_id),
    };
  }
  private async write(key: string, fields: Record<string, any>) {
    const table = await this.findTable(SESSION_TABLE),
      path = `${this.root()}/tables/${id(table.table_id)}/records`;
    const find = async () =>
      (await this.list(path)).filter(
        (r) => plain(r.fields?.["会话 ID"]) === key
      );
    const verify = (rows: any[]) => {
      if (rows.length !== 1)
        throw new Error("同步回读数量不符，记录仍保留待同步");
      for (const [name, value] of Object.entries(fields)) {
        const actual = rows[0].fields[name];
        // Number fields in list-records may be numeric strings; dates remain timestamps.
        const numeric =
          typeof actual === "number"
            ? actual
            : typeof actual === "string" &&
              /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(actual)
            ? Number(actual)
            : NaN;
        if (
          typeof value === "number"
            ? !Number.isFinite(numeric) ||
              Math.abs(numeric - value) > 0.00001
            : plain(actual) !== value
        )
          throw new Error(
            "已存在同一会话，但内容不一致；未覆盖飞书记录"
          );
      }
      return { synced: true };
    };
    const existing = await find();
    if (existing.length) return verify(existing);
    await this.call("POST", `${path}?client_token=${key}`, { fields });
    return verify(await find());
  }
}
