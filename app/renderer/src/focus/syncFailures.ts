// Diagnostic metadata only: the original records remain the sync truth.
type RecordLike = {
  id: string; revision?: number; colorRevision?: number;
  startedAt: number; endedAt?: number; acceptedSeconds?: number; completedCount?: number;
  cloudSynced?: boolean; task: { source?: string; sourceKey?: string; quickTask?: unknown };
};
export const recordSyncKey = (source: string, r: RecordLike) =>
  JSON.stringify([source,r.id,r.revision,r.colorRevision,r.startedAt,r.endedAt,r.acceptedSeconds,r.completedCount]);
export class SyncFailures {
  private failures = new Map<string,{source:string;message:string}>();
  has(source:string,r:RecordLike) { return this.failures.has(recordSyncKey(source,r)); }
  add(source:string,r:RecordLike,message:string) {
    this.failures.set(recordSyncKey(source,r),{source,message});
  }
  retry(source:string) {
    for(const [key,value] of Array.from(this.failures)) if(value.source===source) this.failures.delete(key);
  }
  messages(source:string,records:RecordLike[]) {
    const pending = new Set(records.filter(r=>!r.cloudSynced && !r.task.quickTask &&
      (r.task.source==='local'||r.task.sourceKey===source)).map(r=>recordSyncKey(source,r)));
    for(const [key,value] of Array.from(this.failures))
      if(value.source===source&&!pending.has(key)) this.failures.delete(key);
    return Array.from(this.failures).filter(([key,value])=>value.source===source&&pending.has(key)).map(([,v])=>v.message);
  }
}
