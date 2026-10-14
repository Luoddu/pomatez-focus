import React, { useEffect, useState } from "react";
import { WEIGHT_CATEGORIES, TomatoWeights, formatEffective } from "../weights";
import { PROJECT_LABELS, PROJECT_TONES } from "../week";

export default function WeightSettings({ weights, onSave, loadError }: {
  weights: TomatoWeights;
  onSave: (value: TomatoWeights) => void;
  loadError: string;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(WEIGHT_CATEGORIES.map(k => [k, String(weights[k])])));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty,setDirty]=useState(false);
  useEffect(()=>{if(!dirty)setDraft(Object.fromEntries(WEIGHT_CATEGORIES.map(k=>[k,String(weights[k])])));},[weights,dirty]);
  const save = () => {
    try {
      const value = {} as TomatoWeights;
      WEIGHT_CATEGORIES.forEach(k => {
        if (!draft[k].trim()) throw Error("请填写所有类别的比例");
        value[k] = Number(draft[k]);
      });
      onSave(value); setError(""); setSaved(true);setDirty(false);
    } catch (e) { setError((e as Error).message); setSaved(false); }
  };
  return <div className="card settings-card s-weights">
    <h3>有效番茄</h3>
    <p className="field-hint">按类别折算目标与累计进度。实际完成数、记录和专注时长完整保留。</p>
    <div className="weight-fields">
      {WEIGHT_CATEGORIES.map(k => <label key={k} className="weight-field">
        <span><i style={{background: k === "unclassified" ? "#cfd5dc" : PROJECT_TONES[k]}} />{k === "unclassified" ? "未分类 / 自由番茄" : PROJECT_LABELS[k]}</span>
        <input type="number" min="0" max="1" step="0.01" aria-label={`${k === "unclassified" ? "未分类" : PROJECT_LABELS[k]}番茄比例`} value={draft[k]} onChange={e => {setDraft({...draft, [k]:e.target.value});setSaved(false);setDirty(true);}} />
      </label>)}
    </div>
    <p className="field-hint">比例 0.6：完成 10 个，计为 6 个有效番茄。保存后按新比例重新计算已有记录。</p>
    <div className="sync-row">
      <button className="btn-small outline" onClick={() => {setDraft({...draft, misc:"0.6"});setSaved(false);setDirty(true);}}>杂事按 0.6</button>
      <button className="btn-small outline" onClick={() => {setDraft(Object.fromEntries(WEIGHT_CATEGORIES.map(k=>[k,"1"])));setSaved(false);setDirty(true);}}>全部按 1</button>
      <div className="spacer" /><button className="btn-small outline" onClick={save}>保存比例</button>
    </div>
    {(error || loadError) && <p role="alert" className="weekgoal-error">{error || loadError}</p>}
    {saved && <p role="status" className="field-hint">比例已保存 · 杂事 {formatEffective(weights.misc)}</p>}
    <p className="field-hint">启用全局偏好同步后，其他电脑会使用同一份比例。</p>
  </div>;
}
