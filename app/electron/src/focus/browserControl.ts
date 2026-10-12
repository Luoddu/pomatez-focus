import fs from "fs";
import path from "path";
import crypto from "crypto";
import { nativeRegistry } from './nativeRegistry';
import type { RestState } from "./activitywatch";

export type BrowserPolicy = { mode: "mirror" | "pause" | "cooldown" | "quota"; cooldownMinutes: number; autoRaise: boolean };
export const HOST = "io.github.luoddu.pomatez_focus";
const OWNER = "pomatez-browser-control-v1";
export const defaultBrowserPolicy: BrowserPolicy = { mode: "pause", cooldownMinutes: 2, autoRaise: true };
export function validBrowserPolicy(v: any): BrowserPolicy {
  if (!v || !["mirror","pause","cooldown","quota"].includes(v.mode) || !Number.isInteger(v.cooldownMinutes) || v.cooldownMinutes < 1 || v.cooldownMinutes > 30 || typeof v.autoRaise !== "boolean") throw Error("干预挡位或冷静时间无效（1–30分钟）");
  return { mode:v.mode, cooldownMinutes:v.cooldownMinutes, autoRaise:v.autoRaise };
}
function atomic(file: string, value: any) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file+".tmp",JSON.stringify(value)); fs.renameSync(file+".tmp",file); }
function json(file: string) { if (fs.statSync(file).size > 8192) throw Error("控制状态过大"); return JSON.parse(fs.readFileSync(file,"utf8")); }
export class BrowserControl {
  policy = { ...defaultBrowserPolicy };
  private error = "";
  constructor(readonly directory: string, readonly build: string, private now = Date.now) {
    const file=path.join(directory,"browser-control-settings.json");
    if (fs.existsSync(file)) try { this.policy=validBrowserPolicy(json(file)); } catch (_) { this.policy={...defaultBrowserPolicy,autoRaise:false,mode:"mirror"}; this.error="干预策略损坏，保留原文件，请重新保存"; }
  }
  configure(v: any) {
    const next=validBrowserPolicy(v); atomic(path.join(this.directory,"browser-control-settings.json"),next);
    this.policy=next; this.error=""; return this.snapshot();
  }
  snapshot() {
    let connected=false, pausedCount=0, pauseKey="", checkedAt: number|null=null;
    try { const v=json(path.join(this.directory,"browser-control-receipt.json")); const age=this.now()-v.checkedAt;
      if(v.owner===OWNER && v.connected===true && age>=0 && age<=12000) { connected=true; checkedAt=v.checkedAt; if (Number.isInteger(v.pausedCount)&&v.pausedCount>=0&&v.pausedCount<=100) pausedCount=v.pausedCount; if(typeof v.pauseKey==="string"&&v.pauseKey.length<=100) pauseKey=v.pauseKey; }
    } catch (_) {}
    return { policy:{...this.policy}, connected, pausedCount, pauseKey, checkedAt, error:this.error,
      installed:fs.existsSync(path.join(this.directory,"browser-control","host-config.json")) };
  }
  publish(state: RestState) {
    const now=this.now(), live=state.live;
    const ready=state.status==="recording" && !!live && now>=live.checkedAt && now<=live.expiresAt && live.expiresAt<=live.checkedAt+7000 && state.usage?.day===localDay(now);
    try { atomic(path.join(this.directory,"browser-control-projection.json"),{
      owner:OWNER,v:1,ready,expiresAt:ready?live!.expiresAt:0,day:localDay(now),supervise:state.settings.supervise,
      mode:this.policy.mode,cooldownMinutes:this.policy.cooldownMinutes,reminderKey:ready?(state.reminder?.key||""):"",
      quotaSpent:ready && !!state.usage && state.usage.totalSeconds>=state.settings.quotaMinutes*60,
    }); } catch (_) { this.error="浏览器控制状态未写入，暂停尚未确认"; }
    return this.snapshot();
  }
  close() { try { atomic(path.join(this.directory,"browser-control-projection.json"),{owner:OWNER,v:1,ready:false,expiresAt:0}); } catch (_) {} }
  // Only an explicit trusted farm action installs the per-user host. Tests
  // inject a registry adapter and never touch the real browser registration.
  install(executable: string, registry = nativeRegistry()) {
    if(process.platform!=="win32") throw Error("配套安装目前支持Windows Edge");
    if(typeof executable!=="string" || !path.isAbsolute(executable) || !fs.statSync(executable).isFile()) throw Error("配套运行文件无效");
    const target=path.join(this.directory,"browser-control"), manifest=path.join(target,"host-manifest.json"), old=registry.read();
    if(old && path.resolve(old).toLowerCase()!==path.resolve(manifest).toLowerCase()) throw Error("已有其他来源的浏览器注册，未覆盖");
    if(fs.existsSync(target) && (!fs.existsSync(path.join(target,"host-config.json")) || json(path.join(target,"host-config.json")).owner!==OWNER)) throw Error("配套目录不属于本App，未覆盖");
    if(/[\r\n"%!]/.test(executable+target)) throw Error("安装路径含不支持的批处理字符");
    const assets=path.join(this.build,"assets","browser-control");
    const ext=json(path.join(assets,"manifest.json"));
    const id=crypto.createHash("sha256").update(Buffer.from(ext.key,"base64")).digest("hex").slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
    const origin=`chrome-extension://${id}/`;
    const fresh=!fs.existsSync(target), stage=fresh?path.join(this.directory,"browser-control-stage-"+crypto.randomUUID()):target;
    try {
      fs.mkdirSync(path.join(stage,"extension"),{recursive:true});
      atomic(path.join(stage,"host-config.json"),{owner:OWNER,directory:this.directory,origin});
      for(const file of ["manifest.json","background.js","content.js","popup.html","popup.js"]) fs.copyFileSync(path.join(assets,file),path.join(stage,"extension",file));
      fs.copyFileSync(path.join(this.build,"focus","nativeBrowserHost.js"),path.join(stage,"nativeBrowserHost.js"));
      fs.writeFileSync(path.join(stage,"native-host.cmd"),`@echo off\r\nchcp 65001 >nul\r\nset "ELECTRON_RUN_AS_NODE=1"\r\n"${executable}" "%~dp0nativeBrowserHost.js" "%~dp0host-config.json" %*\r\n`);
      atomic(path.join(stage,"host-manifest.json"),{name:HOST,description:"番茄农场本机浏览器督促",path:path.join(target,"native-host.cmd"),type:"stdio",allowed_origins:[origin]});
      if(fresh) fs.renameSync(stage,target);
    } finally {
      if(fresh && fs.existsSync(stage) && path.dirname(path.resolve(stage))===path.resolve(this.directory)) fs.rmSync(stage,{recursive:true});
    }
    registry.write(manifest);
    if(registry.read()?.toLowerCase()!==manifest.toLowerCase()) throw Error("配套注册回读未确认，请重试");
    return { directory:path.join(target,"extension"),extensionId:id };
  }
}
function localDay(now:number) { const d=new Date(now); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
export class FarmPresence {
  private pinned=false; private original=false;
  constructor(private getWindow: ()=>any, private headless:boolean) {}
  update(state: RestState, policy: BrowserPolicy, now=Date.now()) {
    const w=this.getWindow(); if(!w||w.isDestroyed()) return;
    const watching=policy.autoRaise && state.settings.supervise && state.status==="recording" && !!state.live?.site && now>=state.live.checkedAt && now<=state.live.expiresAt;
    if(watching && !this.pinned) { this.original=w.isAlwaysOnTop(); this.pinned=true; w.setAlwaysOnTop(true); if(!this.headless) { w.showInactive(); w.moveTop(); } }
    else if(!watching) this.close();
  }
  close() { const w=this.getWindow(); if(this.pinned && w && !w.isDestroyed()) w.setAlwaysOnTop(this.original); this.pinned=false; }
}
