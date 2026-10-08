import React, { useState } from "react";
import {
  Journey,
  JourneyTemplate,
  TemplateLibrary,
  RestKind,
  REST_LABELS,
  defaultJourneyTemplate,
  readTemplateLibrary,
  writeTemplateLibrary,
  validateTemplate,
  templateFromJourney,
} from "../journey.js";
import { JourneyOutline, JourneyRestIcon } from "./JourneyIcons";

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const kinds: RestKind[] = ["meal", "nap", "gym", "night", "break"];
export default function JourneyTemplates({
  plan,
  today,
  activeToday,
  onApply,
}: {
  plan: Journey;
  today: boolean;
  activeToday: boolean;
  onApply: (t: JourneyTemplate) => void;
}) {
  const [library, setLibrary] = useState<TemplateLibrary | null>(() => {
    try {
      return readTemplateLibrary(localStorage, plan.scope);
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(
      library ? "" : "模板无法读取；原数据已保留。请先检查模板存储。"
    ),
    [removeConfirm, setRemoveConfirm] = useState(false);
  const [draft, setDraft] = useState<JourneyTemplate>(() =>
    copy(
      library?.templates.find((t) => t.id === library.defaultId) ||
        defaultJourneyTemplate()
    )
  );
  const [asDefault, setAsDefault] = useState(
    library?.defaultId === draft.id
  );
  const saved = library?.templates.find((t) => t.id === draft.id);
  const dirty =
    JSON.stringify(saved) !== JSON.stringify(draft) ||
    asDefault !== (library?.defaultId === draft.id);
  const run = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (e: any) {
      setError(e.message || "模板未保存，请重试");
    }
  };
  const select = (t: JourneyTemplate) => {
    setDraft(copy(t));
    setAsDefault(library?.defaultId === t.id);
    setError("");
    setRemoveConfirm(false);
  };
  const update = (
    i: number,
    patch: Partial<JourneyTemplate["stages"][number]>
  ) =>
    setDraft({
      ...draft,
      stages: draft.stages.map((s, n) =>
        n === i ? { ...s, ...patch } : s
      ),
    });
  const save = () =>
    run(() => {
      if (!library) throw Error("模板无法读取；原数据已保留");
      const t = validateTemplate(draft),
        exists = library.templates.some((v) => v.id === t.id);
      if (!exists && library.templates.length >= 12)
        throw Error("最多保存12个模板，请先移除不用的模板");
      const next = writeTemplateLibrary(localStorage, {
        ...library,
        defaultId: asDefault ? t.id : library.defaultId,
        templates: exists
          ? library.templates.map((v) => (v.id === t.id ? t : v))
          : [...library.templates, t],
      });
      setLibrary(next);
      setDraft(copy(t));
      setAsDefault(next.defaultId === t.id);
    });
  const create = (fromPlan = false) =>
    run(() => {
      if (!library || library.templates.length >= 12)
        throw Error("最多保存12个模板");
      const t = fromPlan
        ? templateFromJourney(plan, "当前旅程")
        : {
            ...copy(draft),
            id: crypto.randomUUID(),
            name: draft.name.slice(0, 35) + " 副本",
          };
      setDraft(t);
      setAsDefault(false);
      setRemoveConfirm(false);
    });
  const remove = () =>
    run(() => {
      if (!library) throw Error("模板不可用");
      if (!saved) {
        select(
          library.templates.find((t) => t.id === library.defaultId)!
        );
        return;
      }
      if (library.templates.length === 1)
        throw Error("至少保留一个模板；可先新建其他模板");
      const templates = library.templates.filter(
        (t) => t.id !== draft.id
      );
      const next = writeTemplateLibrary(localStorage, {
        ...library,
        templates,
        defaultId:
          library.defaultId === draft.id
            ? templates[0].id
            : library.defaultId,
      });
      setLibrary(next);
      setDraft(copy(templates[0]));
      setAsDefault(next.defaultId === templates[0].id);
      setRemoveConfirm(false);
    });
  if (!library)
    return (
      <p className="journey-error" role="alert">
        {error}
      </p>
    );
  return (
    <div className="journey-template-editor">
      <div className="journey-template-picker">
        <label>
          模板
          <select
            aria-label="选择旅程模板"
            value={saved ? draft.id : "__new__"}
            onChange={(e) =>
              select(
                library.templates.find((t) => t.id === e.target.value)!
              )
            }
          >
            {library.templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.id === library.defaultId ? " · 默认" : ""}
              </option>
            ))}
            {!saved && <option value="__new__">未保存的新模板</option>}
          </select>
        </label>
        <button className="btn-text" onClick={() => create()}>
          复制新建
        </button>
        <button className="btn-text" onClick={() => create(true)}>
          从当前旅程新建
        </button>
      </div>
      <div className="journey-template-meta">
        <label>
          名称
          <input
            aria-label="模板名称"
            value={draft.name}
            maxLength={40}
            onChange={(e) =>
              setDraft({ ...draft, name: e.target.value })
            }
          />
        </label>
        <label className="journey-default">
          <input
            type="checkbox"
            aria-label="设为默认模板"
            checked={asDefault}
            disabled={library.defaultId === draft.id}
            onChange={(e) => setAsDefault(e.target.checked)}
          />
          设为默认模板
        </label>
      </div>
      <p className="journey-note">
        时间只作参照，可留空。默认模板用于未来新日；今天的安排需手动应用。
      </p>
      <div
        className="journey-template-preview"
        aria-label="模板实时预览"
      >
        <div className="journey-stages">
          {draft.stages.map((s, i) => (
            <div className="journey-stage" key={i}>
              <div className="journey-slots">
                {Array.from(
                  {
                    length: Math.max(
                      0,
                      Math.min(100, Math.floor(s.count) || 0)
                    ),
                  },
                  (_, n) => (
                    <span className="journey-preview-tomato" key={n}>
                      {n === 0 && s.time !== null && (
                        <small className="journey-time-corner">
                          {s.time}
                        </small>
                      )}
                      <JourneyOutline size={22} />
                    </span>
                  )
                )}
              </div>
              <div className="journey-rest">
                {s.restActions.map((k, n) => (
                  <span key={n} title={REST_LABELS[k]}>
                    <JourneyRestIcon kind={k} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {draft.endHour !== null && (
          <small className="journey-end-hour">{draft.endHour}</small>
        )}
      </div>
      <div className="journey-template-steps">
        {draft.stages.map((s, i) => (
          <div className="journey-template-step" key={i}>
            <div className="journey-step-controls">
              <span>第{i + 1}段</span>
              <label>
                参考时间
                <input
                  type="number"
                  min="0"
                  max="24"
                  placeholder="留空"
                  aria-label={`第${i + 1}段参考时间`}
                  value={s.time ?? ""}
                  onChange={(e) =>
                    update(i, {
                      time:
                        e.target.value === ""
                          ? null
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                番茄
                <input
                  type="number"
                  min="0"
                  max="100"
                  aria-label={`第${i + 1}段番茄数量`}
                  value={s.count}
                  onChange={(e) =>
                    update(i, { count: Number(e.target.value) })
                  }
                />
              </label>
              <button
                className="btn-text"
                disabled={i === 0}
                aria-label={`上移第${i + 1}段`}
                onClick={() => {
                  const a = draft.stages.slice();
                  [a[i - 1], a[i]] = [a[i], a[i - 1]];
                  setDraft({ ...draft, stages: a });
                }}
              >
                ↑
              </button>
              <button
                className="btn-text"
                disabled={draft.stages.length === 1}
                aria-label={`移除第${i + 1}段`}
                onClick={() =>
                  setDraft({
                    ...draft,
                    stages: draft.stages.filter((_, n) => n !== i),
                  })
                }
              >
                ×
              </button>
            </div>
            <div className="journey-break-editor">
              <span>休息顺序</span>
              <div className="journey-chosen-breaks">
                {s.restActions.map((kind, n) => (
                  <button
                    key={n}
                    className="journey-break-choice"
                    aria-label={`第${i + 1}段移除第${n + 1}个${
                      REST_LABELS[kind]
                    }`}
                    title={`${REST_LABELS[kind]} · 点击移除`}
                    onClick={() =>
                      update(i, {
                        restActions: s.restActions.filter(
                          (_, j) => j !== n
                        ),
                      })
                    }
                  >
                    <JourneyRestIcon kind={kind} />
                    <small>×</small>
                  </button>
                ))}
              </div>
              <div className="journey-break-palette">
                {kinds.map((kind) => (
                  <button
                    key={kind}
                    className="journey-break-choice"
                    disabled={s.restActions.length >= 8}
                    aria-label={`第${i + 1}段添加${REST_LABELS[kind]}`}
                    title={`添加${REST_LABELS[kind]}`}
                    onClick={() =>
                      update(i, {
                        restActions: [...s.restActions, kind],
                      })
                    }
                  >
                    <JourneyRestIcon kind={kind} />
                    <small>＋</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="journey-template-bottom">
        <button
          className="btn-text"
          disabled={draft.stages.length >= 20}
          onClick={() =>
            setDraft({
              ...draft,
              stages: [
                ...draft.stages,
                { count: 3, time: null, restActions: ["nap"] },
              ],
            })
          }
        >
          添加一段
        </button>
        <label>
          结束参照
          <input
            type="number"
            min="0"
            max="24"
            placeholder="留空"
            aria-label="旅程结束参照时间"
            value={draft.endHour ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                endHour:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <span>
          {draft.stages.reduce((n, s) => n + s.count, 0)} 个番茄
        </span>
      </div>
      {error && (
        <p className="journey-error" role="alert">
          {error}
        </p>
      )}
      <div className="journey-dialog-actions">
        <button
          className="btn-text"
          onClick={() =>
            removeConfirm ? remove() : setRemoveConfirm(true)
          }
        >
          {removeConfirm ? "确认移除" : "移除模板"}
        </button>
        <button
          className="btn-primary"
          disabled={!dirty}
          onClick={save}
        >
          保存模板
        </button>
        <button
          className="btn-primary"
          disabled={dirty || activeToday}
          title={
            dirty
              ? "先保存模板"
              : activeToday
              ? "先结束并确认当前番茄"
              : "保留已完成番茄和关联任务"
          }
          onClick={() => run(() => onApply(validateTemplate(draft)))}
        >
          应用到{today ? "今日" : "明日"}
        </button>
      </div>
    </div>
  );
}
