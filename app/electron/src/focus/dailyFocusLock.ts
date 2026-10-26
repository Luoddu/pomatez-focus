import fs from "fs";
import path from "path";
import { dayKey } from "./activitywatch";
import type { RestState, RestSettings } from "./activitywatch";

const OWNER="pomatez-daily-focus-lock-v1";
type Data={v:1;owner:string;enabled:boolean;releaseMinutes:number;day:{date:string;enabled:boolean;goal:number;quotaMinutes:number;releaseMinutes:number;until:number}};
const minutes=(v:any)=>Number.isInteger(v)&&v>=1&&v<=60;
const quota=(v:any)=>Number.isInteger(v)&&v>=5&&v<=480&&v%5===0;
const goal=(state:RestState|null)=>state?.settings.pomodoroGoal || 12;
const endOfDay=(now:number)=>{const d=new Date(now);d.setHours(24,0,0,0);return d.getTime();};

// Only the commitment and release deadline live here. Progress remains the
// original confirmed-record projection; no second tomato or website counter.
export class DailyFocusLock {
  private data:Data={v:1,owner:OWNER,enabled:false,releaseMinutes:15,day:{date:"",enabled:false,goal:12,quotaMinutes:60,releaseMinutes:15,until:0}};
  private error="";
  private foreign=false;
  private file:string;
  constructor(directory:string,private now=Date.now){
    this.file=path.join(directory,"daily-focus-lock.json");
    if(fs.existsSync(this.file))try{
      if(fs.statSync(this.file).size>8192)throw Error("size");
      const v=JSON.parse(fs.readFileSync(this.file,"utf8"));
      if(v.owner!==OWNER){this.foreign=true;throw Error("owner");}
      if(v.v!==1||typeof v.enabled!=="boolean"||!minutes(v.releaseMinutes)||!v.day||typeof v.day.enabled!=="boolean"||!minutes(v.day.goal)||!quota(v.day.quotaMinutes)||!minutes(v.day.releaseMinutes)||!/^\d{4}-\d{2}-\d{2}$/.test(v.day.date)||!Number.isSafeInteger(v.day.until)||v.day.until<0)throw Error("format");
      const start=new Date(v.day.date+"T00:00:00").getTime();
      if(!Number.isFinite(start)||dayKey(start)!==v.day.date||(v.day.until!==0&&(v.day.until<start||v.day.until>endOfDay(start))))throw Error("date");
      this.data=v;
    }catch(_){this.error="每日专注锁状态读取失败，拦截尚未确认，请重新保存策略";}
  }
  private save(next:Data){
    if(this.foreign)throw Error("每日锁配置来源不符，未覆盖");
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    fs.writeFileSync(this.file+".tmp",JSON.stringify(next),{mode:0o600});fs.renameSync(this.file+".tmp",this.file);
    this.data=next;this.error="";
  }
  private roll(state:RestState|null){
    if(!state)return;
    const date=dayKey(this.now());if(this.data.day.date===date)return;
    const next:Data={...this.data,day:{date,enabled:this.data.enabled,goal:goal(state),quotaMinutes:state.settings.quotaMinutes,releaseMinutes:this.data.releaseMinutes,until:0}};
    // Disabled defaults need no writes. On failure retain an explicit error,
    // do not retry disk writes on every heartbeat or claim active enforcement.
    if(!this.error&&(this.data.enabled||fs.existsSync(this.file)))try{this.save(next);return;}catch(_){this.error="每日专注锁状态保存失败，拦截尚未确认";}
    this.data=next;
  }
  snapshot(state:RestState|null){
    this.roll(state);const now=this.now(),d=this.data.day.date===dayKey(now)?this.data.day:{...this.data.day,date:dayKey(now),enabled:this.data.enabled,until:0},p=state?.progress;
    const count=p?.day===d.date?(p.effectiveCount??p.completedCount):null;
    const reached=count!==null&&count>=d.goal;
    const usage=state?.usage?.day===d.date?state.usage:null;
    const quotaSpent=!!usage&&usage.totalSeconds>=d.quotaMinutes*60;
    const enabled=d.enabled&&!this.error;
    const releasing=enabled&&reached&&!quotaSpent&&now<d.until;
    return {enabled,plannedEnabled:this.data.enabled,goal:d.goal,quotaMinutes:d.quotaMinutes,releaseMinutes:d.releaseMinutes,plannedReleaseMinutes:this.data.releaseMinutes,day:d.date,
      count,reached,lockedForChanges:enabled&&!reached,releasing,until:releasing?d.until:0,
      blocked:enabled&&!releasing,quotaSpent,error:this.error};
  }
  configure(value:any,state:RestState|null){
    if(!value||Object.keys(value).sort().join("|")!=="enabled|releaseMinutes"||typeof value.enabled!=="boolean"||!minutes(value.releaseMinutes))throw Error("每日锁策略无效，临时放行须为1–60分钟");
    const current=this.snapshot(state);
    if(current.lockedForChanges&&(value.enabled!==this.data.enabled||value.releaseMinutes!==this.data.releaseMinutes))throw Error("今日目标尚未完成，每日锁策略已锁定");
    if(value.enabled&&(!state||!minutes(state.settings.pomodoroGoal)))throw Error("请先保存1–60个番茄的每日目标，再开启每日锁");
    const next:Data={...this.data,enabled:value.enabled,releaseMinutes:value.releaseMinutes,day:{...this.data.day}};
    if(value.enabled&&!next.day.enabled)next.day={date:dayKey(this.now()),enabled:true,goal:state!.settings.pomodoroGoal,quotaMinutes:state!.settings.quotaMinutes,releaseMinutes:value.releaseMinutes,until:0};
    this.save(next);return this.snapshot(state);
  }
  release(state:RestState|null){
    const current=this.snapshot(state);
    if(!current.enabled||!current.reached)throw Error("请先完成今日有效番茄目标，再临时放行");
    if(state?.status!=="recording"||state.usage?.day!==current.day)throw Error("网站用时尚未确认，请恢复监测后再放行");
    if(current.quotaSpent)throw Error("今日网站额度已用完，不能临时放行");
    // An already-running pass is idempotent, never extended by repeated clicks.
    if(current.releasing)return current;
    this.save({...this.data,day:{...this.data.day,until:Math.min(endOfDay(this.now()),this.now()+current.releaseMinutes*60000)}});
    return this.snapshot(state);
  }
  resume(state:RestState|null){if(!this.snapshot(state).enabled)throw Error("每日锁尚未开启");this.save({...this.data,day:{...this.data.day,until:0}});return this.snapshot(state);}
  guardSettings(next:RestSettings,state:RestState){
    const current=this.snapshot(state);
    if((this.data.enabled||current.enabled)&&next.pomodoroGoal<1)throw Error("每日锁启用时，番茄目标至少为1个");
    if(current.lockedForChanges&&(!next.supervise||next.pomodoroGoal<current.goal))throw Error("今日目标尚未完成，不能关闭督促或降低目标");
  }
}
