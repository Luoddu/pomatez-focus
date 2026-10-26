import type { FocusTask, FocusSession } from "./session";

// Use the original ledger IDs and confirmed records. A display title is never
// an accounting identity, and a successful sync may precede the task readback.
export function withTaskCredit(task: FocusTask, records: FocusSession[]): FocusTask {
  const matching = records.filter(r => r.status === "saved" && r.task.source === task.source &&
    (r.task.sourceKey || "") === (task.sourceKey || "") &&
    (task.planId ? (r.task.planId || r.syncedPlanId) === task.planId : r.task.id === task.id));
  const unapplied = matching.filter(r => !task.appliedSessionIds?.includes(r.id));
  const lastDone = !task.planId ? Math.max(0,...matching.filter(r => (r.completedCount || 0)>0).map(r=>r.endedAt || r.startedAt)) : 0;
  const pieces = unapplied.filter(r => !lastDone || r.startedAt>=lastDone);
  const credit = Math.max(0,task.creditedSeconds || 0)+pieces.reduce((n,r)=>n+Math.max(0,r.acceptedSeconds || 0),0);
  const prior = pieces.slice().sort((a,b)=>a.startedAt-b.startedAt)[0];
  return {...task,creditedSeconds:credit,...(task.goalSeconds || prior ? {goalSeconds:task.goalSeconds || prior!.plannedSeconds}: {})};
}

export function partialProgress(task: FocusTask, fallbackSeconds=1500) {
  const goal=task.goalSeconds || fallbackSeconds,credit=task.creditedSeconds || 0;
  return {goal,credit:credit>0&&credit<goal?credit:0,remaining:credit>0&&credit<goal?goal-credit:goal};
}

export function resumableFreeTasks(records:FocusSession[],scope:string) {
  const groups=new Map<string,FocusSession[]>();
  for(const r of records){if(r.status!=="saved"||r.task.kind!=="free"||(r.task.sourceKey||"local")!==scope)continue;const key=r.task.source+":"+r.task.id;groups.set(key,[...(groups.get(key)||[]),r]);}
  return Array.from(groups.values()).flatMap(rows=>{
    if(rows.some(r=>(r.completedCount||0)>0))return [];
    const first=rows.slice().sort((a,b)=>a.startedAt-b.startedAt)[0],planId=rows.find(r=>r.task.planId||r.syncedPlanId);
    const task=withTaskCredit({...first.task,creditedSeconds:0,appliedSessionIds:[],goalSeconds:first.task.goalSeconds||first.plannedSeconds,...(planId?{planId:planId.task.planId||planId.syncedPlanId}: {})},records);
    return partialProgress(task).credit>0?[task]:[];
  });
}
