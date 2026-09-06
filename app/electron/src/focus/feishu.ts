import { createHash } from "crypto";
export type Connection = {
  appId: string;
  appSecret: string;
  baseUrl: string;
  planTable: string;
  dateField: string;
  taskField: string;
  completedField: string;
  appToken?: string;
};
export type Request = (
  method: "GET" | "POST",
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
    : "";
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
  return {
    appId: value.appId.trim(),
    appSecret: value.appSecret.trim(),
    baseUrl: u.origin + u.pathname,
    planTable: value.planTable.trim(),
    dateField: value.dateField.trim(),
    taskField: value.taskField.trim(),
    completedField: value.completedField.trim(),
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
  constructor(public config: Connection, private request: Request) {}
  private async call(method: "GET" | "POST", path: string, body?: any) {
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
    const selected = rows.filter((r) => {
      const f = r.fields || {};
      return (
        typeof f[this.config.dateField] === "number" &&
        f[this.config.dateField] >= start &&
        f[this.config.dateField] < end &&
        f[this.config.completedField] !== true
      );
    });
    const linkedTable = fields.find(
      (f) => f.field_name === this.config.taskField
    )?.property?.table_id;
    const linked =
      linkedTable && selected.length
        ? await this.list(
            `${this.root()}/tables/${id(linkedTable)}/records`
          )
        : [];
    const titles = new Map(
      linked.map((r) => [
        r.record_id,
        plain(r.fields?.["任务名称"]) ||
          plain(Object.values(r.fields || {})[0]),
      ])
    );
    return selected.map((r) => {
      const link = r.fields[this.config.taskField],
        refs = Array.isArray(link)
          ? link.map((v) => (typeof v === "string" ? v : v.record_id))
          : link?.record_ids || [];
      const title =
        refs
          .map((ref: string) => titles.get(ref))
          .filter(Boolean)
          .join("、") ||
        plain(link) ||
        "未命名任务";
      return {
        id: r.record_id,
        planId: r.record_id,
        taskId: refs[0] || "",
        title: `${title} · 第 ${plain(r.fields["番茄"]) || "?"} 个番茄`,
        source: "feishu",
        sourceKey: connectionKey(this.config),
      };
    });
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
  async sync(record: any) {
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
