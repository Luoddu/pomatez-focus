export const PROJECT_TYPES = [
  "research",
  "delivery",
  "longterm",
  "software",
  "personal",
  "misc",
];
export const recordCategory = (record) =>
  record.colorOverride || record.task.projectType || "unclassified";

export function recolorSession(record, type) {
  if (
    record.status !== "saved" ||
    (type != null && !PROJECT_TYPES.includes(type))
  )
    throw Error("请选择已保存番茄的有效分类");
  return {
    ...record,
    colorOverride: type,
    colorRevision: (record.colorRevision || 0) + 1,
  };
}

export function mergeRecordColor(local, remote) {
  const version = (record) => {
    const revision = record.colorRevision || 0;
    if (
      !Number.isInteger(revision) ||
      revision < 0 ||
      (record.colorOverride != null &&
        (!PROJECT_TYPES.includes(record.colorOverride) ||
          revision === 0))
    )
      throw Error("番茄颜色版本无效");
    return revision;
  };
  const a = version(local),
    b = version(remote);
  if (a === b && local.colorOverride !== remote.colorOverride)
    throw Error("同一条番茄颜色存在冲突，请同步后重试");
  const chosen = a > b ? local : remote;
  return {
    ...remote,
    colorOverride: chosen.colorOverride,
    colorRevision: chosen.colorRevision,
  };
}
