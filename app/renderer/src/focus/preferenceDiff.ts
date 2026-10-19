import { PreferenceKey, preferenceJSON } from "./preferences";
import { PROJECT_LABELS } from "./week";

const labels: Record<string,string> = {
  ...PROJECT_LABELS, unclassified:"未分类／自由番茄",
  focusMinutes:"默认番茄时长",restMinutes:"休息时长",quotaMinutes:"每日休闲额度",
  supervise:"开启督促",pomodoroGoal:"每日有效番茄目标",reminderMinutes:"提醒间隔",
  mode:"浏览器干预挡位",cooldownMinutes:"冷静时间",autoRaise:"浏览时农场原屏幕置顶",
};
const modes: Record<string,string> = {mirror:"时间镜子",pause:"暂停挡",cooldown:"冷静挡",quota:"额度锁定挡"};
const weightOrder=["research","delivery","longterm","software","personal","misc","unclassified"];
export function preferenceDifferences(key: PreferenceKey,values: any[]) {
  const field=(v:any,name:string)=>v && typeof v==="object" ? v[name] : undefined;
  const names=Array.from(new Set(values.flatMap(v=>v && typeof v==="object" ? Object.keys(v) : [])));
  if(key==="weights")names.sort((a,b)=>weightOrder.indexOf(a)-weightOrder.indexOf(b));else names.sort();
  return names.filter(name=>values.some(v=>preferenceJSON(field(v,name))!==preferenceJSON(field(values[0],name))))
    .map(name=>({field:name,label:key==="weekGoals" || key==="researchGoals" ? `${name.replace(/^(\d{4})-(\d{2})-(\d{2})$/,"$1年$2月$3日")}当周目标` : labels[name] || "其他设置",
      values:values.map(v=>{
        const value=field(v,name);
        if(value===undefined)return "未设置";
        if(typeof value==="boolean")return value ? "开启" : "关闭";
        if(key==="weights")return `${value} 倍（${Math.round(value*100)}%）`;
        if(name==="mode")return modes[value] || "未知挡位";
        if(key==="weekGoals" || key==="researchGoals" || name==="pomodoroGoal")return `${value} 个有效番茄`;
        return `${value} 分钟`;
      })}));
}
