import { PreferenceEntry, PreferenceKey, PreferenceValues, PREFERENCE_KEYS, preferenceJSON, validPreferenceValue } from "./preferences";

type Baseline = { ids: string[]; value: any };
type Cache = { version: 1; enabled: boolean; paused?: boolean; foreignKeys?: PreferenceKey[]; baseline: Partial<Record<PreferenceKey,Baseline>>; pending: Partial<Record<PreferenceKey,PreferenceEntry>>; adoptions?: Partial<Record<PreferenceKey,{id:string;expected:any}>> };
export type PreferenceConflict = { key: PreferenceKey; local: any; remote: PreferenceEntry[] };
export type PreferenceSyncStatus = { enabled: boolean; syncing: boolean; message: string; conflicts: PreferenceConflict[]; pending: number };
type Ports = {
  read: () => Promise<PreferenceEntry[]>;
  save: (entry: PreferenceEntry) => Promise<PreferenceEntry[]>;
  local: () => Promise<PreferenceValues>;
  apply: (key: PreferenceKey, value: any, expected: any) => Promise<void>;
  validScope: () => boolean;
  notify: (status: PreferenceSyncStatus) => void;
  uuid: () => string;
};
const same = (a: any,b: any) => preferenceJSON(a) === preferenceJSON(b);
const ids = (entries: PreferenceEntry[]) => entries.map(e=>e.id).sort();
export function preferenceHeads(entries: PreferenceEntry[],key: PreferenceKey) {
  const rows = entries.filter(e=>e.key===key), parents = new Set(rows.flatMap(e=>e.parents));
  return rows.filter(e=>!parents.has(e.id));
}
// A per-connection durable outbox. Wall-clock timestamps never decide a winner.
export class PreferenceSync {
  private cache: Cache;
  private running = false;
  private stopped = false;
  private conflicts: PreferenceConflict[] = [];
  private message = "正在读取飞书偏好";
  private storageKey: string;
  constructor(private storage: Storage, scope: string, private ports: Ports) {
    this.storageKey = `pomatez-focus-preference-sync-v1:${scope}`;
    const raw = storage.getItem(this.storageKey);
    this.cache = raw === null ? {version:1,enabled:false,baseline:{},pending:{}} : JSON.parse(raw);
    const obj=(v:any)=>!!v && typeof v==="object" && !Array.isArray(v);
    const shape=(v:any,keys:string[])=>obj(v) && Object.keys(v).every(k=>keys.includes(k));
    const uuid=(v:any)=>typeof v==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    const list=(v:any)=>Array.isArray(v) && v.length<=64 && v.every(uuid) && new Set(v).size===v.length;
    if (!shape(this.cache,["version","enabled","paused","foreignKeys","baseline","pending","adoptions"]) || this.cache.version!==1 || typeof this.cache.enabled!=="boolean" || (this.cache.paused!==undefined && typeof this.cache.paused!=="boolean") || !obj(this.cache.baseline) || !obj(this.cache.pending)) throw Error("偏好同步缓存损坏，未覆盖");
    if(this.cache.foreignKeys!==undefined && (!Array.isArray(this.cache.foreignKeys) || this.cache.foreignKeys.length>6 || new Set(this.cache.foreignKeys).size!==this.cache.foreignKeys.length || this.cache.foreignKeys.some(k=>!PREFERENCE_KEYS.includes(k))))throw Error("偏好来源缓存损坏");
    for (const key of Object.keys(this.cache.baseline) as PreferenceKey[]) {
      const b=this.cache.baseline[key]!;
      if(!PREFERENCE_KEYS.includes(key) || !shape(b,["ids","value"]) || !list(b.ids))throw Error("偏好同步缓存损坏");
      validPreferenceValue(key,b.value);
    }
    for(const key of Object.keys(this.cache.pending) as PreferenceKey[]){
      const e=this.cache.pending[key]!;
      if(!PREFERENCE_KEYS.includes(key) || !shape(e,["version","id","key","parents","value","at"]) || e.key!==key || e.version!==1 || !uuid(e.id) || !list(e.parents) || !Number.isSafeInteger(e.at) || e.at<0 || e.at>8640000000000000)throw Error("偏好待同步缓存损坏");
      validPreferenceValue(key,e.value);
    }
    if(this.cache.adoptions!==undefined){
      if(!obj(this.cache.adoptions))throw Error("偏好待应用缓存损坏");
      for(const key of Object.keys(this.cache.adoptions) as PreferenceKey[]){
        const a=this.cache.adoptions[key]!;
        if(!PREFERENCE_KEYS.includes(key) || !shape(a,["id","expected"]) || !uuid(a.id) || this.cache.pending[key]?.id!==a.id)throw Error("偏好待应用缓存损坏");
        validPreferenceValue(key,a.expected);
      }
    }
    const marker="pomatez-focus-preference-current-scope-v1";
    const previousScope=storage.getItem(marker);
    if(previousScope!==null && previousScope!==scope){
      this.cache.foreignKeys=[...PREFERENCE_KEYS];this.persist();
    }
    storage.setItem(marker,scope);

  }
  private live() { return !this.stopped && this.ports.validScope(); }
  private persist() { if (!this.live()) throw Error("飞书来源已切换"); const encoded=JSON.stringify(this.cache); this.storage.setItem(this.storageKey,encoded); if(this.storage.getItem(this.storageKey)!==encoded)throw Error("偏好同步状态未能持久保存"); }
  private report() { if(this.live())this.ports.notify({enabled:this.cache.enabled,syncing:this.running,message:this.message,conflicts:this.conflicts,pending:Object.keys(this.cache.pending).length}); }
  stop() { this.stopped=true; }
  disable() { if(this.running)return;this.cache.enabled=false;this.cache.paused=true;this.persist();this.message="已暂停同步，本机偏好保留";this.report(); }
  private prepare(key: PreferenceKey,value: any,parents: string[],expected?: any) {
    this.cache.pending[key]={version:1,id:this.ports.uuid(),key,parents,value:validPreferenceValue(key,value),at:Date.now()};
    if(expected!==undefined){this.cache.adoptions=this.cache.adoptions||{};this.cache.adoptions[key]={id:this.cache.pending[key]!.id,expected};}
    else if(this.cache.adoptions)delete this.cache.adoptions[key];
    this.persist();
  }
  private async acknowledge(entry: PreferenceEntry,rows: PreferenceEntry[]) {
    const adoption=this.cache.adoptions?.[entry.key];
    if(adoption?.id===entry.id){
      const current=(await this.ports.local())[entry.key];
      if(!same(current,entry.value)){
        if(!same(current,adoption.expected)){
          this.conflicts.push({key:entry.key,local:current,remote:preferenceHeads(rows,entry.key)});return false;
        }
        await this.ports.apply(entry.key,entry.value,current);
        if(!same((await this.ports.local())[entry.key],entry.value))throw Error("云端偏好尚未应用，本机设置保留");
      }
      if(!this.live())return false;
      delete this.cache.adoptions![entry.key];
    }
    this.cache.baseline[entry.key]={ids:[entry.id],value:entry.value};
    delete this.cache.pending[entry.key];this.persist();return true;
  }
  async synchronize(enable=false,choice?: {key: PreferenceKey; entryId?: string}) {
    if(this.running || !this.live())return;
    this.running=true;this.message="正在同步偏好";this.report();
    try {
      if(this.cache.paused && !enable){this.message="已暂停同步，本机偏好保留";return;}
      let rows=await this.ports.read();
      if(!this.live())return;
      if(enable){this.cache.enabled=true;this.cache.paused=false;if(!rows.length)this.cache.foreignKeys=[];this.persist();}
      if(!this.cache.enabled && !rows.length){this.message="尚未启用，使用本机偏好";return;}
      // Cloud exists: automatic read is safe only for unchanged/default local values.
      if(rows.length && !this.cache.enabled){this.cache.enabled=true;this.persist();}
      this.conflicts=[];
      for(const key of PREFERENCE_KEYS){
        if(!this.live())return;
        let heads=preferenceHeads(rows,key), pending=this.cache.pending[key];
        let local=(await this.ports.local())[key];
        if(!this.live())return;
        // A local value inherited from another Base is never interpreted as an edit.
        if(this.cache.foreignKeys?.includes(key) && choice?.key!==key){
          if(!pending && heads.length && heads.every(e=>same(e.value,local))){
            this.cache.baseline[key]={ids:ids(heads),value:local};
            this.cache.foreignKeys=this.cache.foreignKeys.filter(k=>k!==key);this.persist();continue;
          }
          this.conflicts.push({key,local,remote:heads});continue;
        }
        // Lost response: acknowledge the exact queued version before doing anything else.
        if(pending && rows.some(e=>e.id===pending!.id)){
          const receipt=rows.find(e=>e.id===pending!.id)!;
          if(!same(receipt,pending))throw Error("偏好版本回读不一致");
          if(choice?.key!==key && !(await this.acknowledge(pending,rows)))continue;
          if(choice?.key!==key){pending=undefined;local=(await this.ports.local())[key];}
        }
        const base=this.cache.baseline[key];
        if(choice?.key===key){
          // Never discard queued or local edits until a chosen replacement is durable.
          const selected=choice.entryId ? heads.find(e=>e.id===choice.entryId) : undefined;
          if(choice.entryId && !selected)throw Error("云端偏好已变化，请重新选择");
          this.cache.foreignKeys=this.cache.foreignKeys?.filter(k=>k!==key);
          this.prepare(key,selected ? selected.value : local,ids(heads),selected ? local : undefined);
          pending=this.cache.pending[key];
        }
        if(pending){
          if(!same(ids(heads),pending.parents.slice().sort())){this.conflicts.push({key,local,remote:heads});continue;}
          this.persist(); // Durable exact-ID barrier before every external write.
          rows=await this.ports.save(pending);
          if(!this.live())return;
          const receipt=rows.find(e=>e.id===pending!.id);
          if(!receipt || !same(receipt,pending))throw Error("偏好保存尚未回读确认，本机修改保留");
          await this.acknowledge(pending,rows);
          continue;
        }
        const equivalent=heads.length && heads.every(e=>same(e.value,heads[0].value));
        const remote=equivalent ? heads[0].value : undefined;
        if(heads.length && (!equivalent || (base && !same(local,base.value) && !same(remote,base.value) && !same(local,remote)))){
          this.conflicts.push({key,local,remote:heads});continue;
        }
        if(!base && heads.length && !same(local,remote)){
          this.conflicts.push({key,local,remote:heads});continue;
        }
        if(heads.length && (!base || same(local,base.value) || same(local,remote))){
          if(!same(local,remote))await this.ports.apply(key,remote,local);
          if(!this.live())return;
          this.cache.baseline[key]={ids:ids(heads),value:remote};this.persist();continue;
        }
        if(!heads.length || (base && !same(local,base.value))){
          // Empty cloud only gets initialized through a user's explicit enable action.
          if(!heads.length && !enable){
            if(!base){this.cache.baseline[key]={ids:[],value:local};this.persist();continue;}
            if(same(local,base.value))continue;
          }
          this.prepare(key,local,ids(heads));
          const entry=this.cache.pending[key]!;
          this.persist();
          rows=await this.ports.save(entry);
          if(!this.live())return;
          const receipt=rows.find(e=>e.id===entry.id);
          if(!receipt || !same(receipt,entry))throw Error("偏好保存尚未回读确认，本机修改保留");
          this.cache.baseline[key]={ids:[entry.id],value:entry.value};delete this.cache.pending[key];this.persist();
        }
      }
      for(const key of PREFERENCE_KEYS){
        const heads=preferenceHeads(rows,key);
        if(heads.length>1 && !heads.every(e=>same(e.value,heads[0].value)) && !this.conflicts.some(c=>c.key===key))this.conflicts.push({key,local:(await this.ports.local())[key],remote:heads});
      }
      this.message=this.conflicts.length ? "部分偏好有不同修改，请选择保留哪一份" : "偏好已与飞书同步";
    } catch(e){if(this.live())this.message=`${(e as Error).message}；本机偏好和待同步修改保留`;}
    finally{this.running=false;this.report();}
  }
}
