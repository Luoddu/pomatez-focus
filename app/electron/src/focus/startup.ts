import path from "path";

export const STARTUP_ARGUMENT = "--start-in-tray";
export const STARTUP_NAME = "io.github.luoddu.pomatezfocus";
export const startsInTray = (args: string[]) => args.includes(STARTUP_ARGUMENT);
export type StartupStatus = { supported: boolean; enabled: boolean; registered: boolean; blocked: boolean; conflict: boolean; message: string };
type LaunchItem = { name: string; path: string; args: string[]; scope: string; enabled: boolean };
type Native = {
  getLoginItemSettings: (options: {path:string;args:string[]}) => {openAtLogin?: boolean;launchItems?: LaunchItem[]};
  setLoginItemSettings: (options: {name:string;path:string;args:string[];openAtLogin:boolean;enabled:boolean}) => void;
};
type Environment = { platform:string; packaged:boolean; executable:string; portable?:boolean; name?:string };

// Native Electron 34.5.8 API only. No timers, auto-registration or preferences sync.
export class StartupSettings {
  constructor(private native: Native,private environment: Environment) {}
  private get name(){return this.environment.name || STARTUP_NAME;}
  private options(){
    const exe=this.environment.executable;
    if(!path.win32.isAbsolute(exe) || /["\r\n\0]/.test(exe))throw Error("应用启动路径无效");
    // Electron's Win32 implementation concatenates the path and args verbatim.
    return {path:`"${exe}"`,args:[STARTUP_ARGUMENT]};
  }
  status(): StartupStatus {
    if(this.environment.platform!=="win32" || !this.environment.packaged || this.environment.portable)
      return {supported:false,enabled:false,registered:false,blocked:false,conflict:false,message:"请使用 Windows 安装版设置开机自启动"};
    const result=this.native.getLoginItemSettings(this.options());
    if(!Array.isArray(result.launchItems) || typeof result.openAtLogin!=="boolean")throw Error("无法读取 Windows 启动设置，请重试");
    const owned=result.launchItems.filter(x=>x.name===this.name && x.scope==="user");
    const matching=owned.filter(x=>typeof x.path==="string" && path.win32.normalize(x.path).toLowerCase()===path.win32.normalize(this.environment.executable).toLowerCase() && typeof x.enabled==="boolean");
    // Chromium GetArgs() excludes switches. Native openAtLogin compares the
    // complete quoted command against this AppUserModelId, including switches.
    const conflict=owned.length!==matching.length || matching.length>1 || (matching.length===1 && !result.openAtLogin);
    const registered=matching.length===1,enabled=!conflict && registered && matching[0].enabled;
    return {supported:true,enabled,registered,blocked:registered && !enabled && !conflict,conflict,
      message:conflict ? "启动项内容不一致，未自动修改" : registered && !enabled ? "已被 Windows 禁用，可重新开启" : enabled ? "登录 Windows 后在托盘启动" : "开机自启动已关闭"};
  }
  configure(enabled: unknown): StartupStatus {
    if(typeof enabled!=="boolean")throw Error("开机自启动设置无效");
    const before=this.status();
    if(!before.supported)throw Error(before.message);
    if(before.conflict)throw Error(before.message);
    this.native.setLoginItemSettings({...this.options(),name:this.name,openAtLogin:enabled,enabled});
    const after=this.status();
    if(after.conflict || after.enabled!==enabled || (!enabled && after.registered))throw Error("Windows 启动设置尚未保存成功，请重试");
    return after;
  }
}
