import { spawnSync } from 'child_process';
import path from 'path';

export const NATIVE_REGISTRY_KEY='Software\\Microsoft\\Edge\\NativeMessagingHosts\\io.github.luoddu.pomatez_focus';
type Run = (script:string,input?:string)=>{status:number|null;stdout?:string;error?:Error};
const run:Run=(script,input)=>spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),
  ['-NoLogo','-NoProfile','-NonInteractive','-Command',script],
  {windowsHide:true,encoding:'utf8',input,timeout:10000,maxBuffer:16384});
const prefix="$ErrorActionPreference='Stop'; [Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false); [Console]::InputEncoding=New-Object System.Text.UTF8Encoding($false); $key=$null; try { ";
const suffix=" } catch { [Console]::Write((@{ok=$false;errorType=$_.Exception.GetBaseException().GetType().FullName}|ConvertTo-Json -Compress)); exit 2 } finally { if($null -ne $key){$key.Dispose()} }";

// Structured RegistryKey API results, never localized reg.exe error prose.
// The alternative key/runner are internal test seams, absent from renderer IPC.
export function nativeRegistry(key=NATIVE_REGISTRY_KEY, runner:Run=run) {
  if(key!==NATIVE_REGISTRY_KEY && !/^Software\\PomatezFocusTests\\p055-[0-9a-f-]{36}$/.test(key)) throw Error('Unsupported native registry key');
  const exec=(body:string,input?:string)=>{
    const result=runner(prefix+body+suffix,input);
    if(result.error) throw Error('无法启动本机注册检查，请确认Windows PowerShell可用');
    let value:any;try{value=JSON.parse(result.stdout||'');}catch(_){throw Error('浏览器注册检查未返回有效结果');}
    if(result.status!==0 || value?.ok!==true) {
      if(/^(System\.(UnauthorizedAccessException|Security\.SecurityException))$/.test(value?.errorType||'')) throw Error('当前用户无权访问浏览器配套注册项');
      if(value?.errorType==='System.InvalidOperationException') throw Error('已有其他来源或无效的浏览器注册，未覆盖');
      throw Error('浏览器配套注册检查失败，请重试');
    }
    return value;
  };
  return {
    read:()=>{
      const result=exec(`$key=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('${key}',$false); if($null -eq $key){$result=@{ok=$true;found=$false}} else { $value=$key.GetValue('', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); if($null -eq $value){$result=@{ok=$true;found=$false}}else{$result=@{ok=$true;found=$true;value=$value;kind=$key.GetValueKind('').ToString()}} }; [Console]::Write(($result|ConvertTo-Json -Compress))`);
      if(result.found===false) return null;
      if(result.found!==true || result.kind!=='String' || typeof result.value!=='string' || !result.value || result.value.length>8192) throw Error('已有浏览器注册格式无效，未覆盖');
      return result.value;
    },
    write:(manifest:string)=>{
      if(typeof manifest!=='string' || !path.isAbsolute(manifest) || manifest.length>8192 || /[\r\n\0]/.test(manifest)) throw Error('浏览器配套注册路径无效');
      exec(`$value=[Console]::In.ReadToEnd(); $key=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('${key}',$true); $old=$key.GetValue('', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); if($null -ne $old -and ($key.GetValueKind('') -ne [Microsoft.Win32.RegistryValueKind]::String -or -not [string]::Equals([IO.Path]::GetFullPath([string]$old),[IO.Path]::GetFullPath($value),[StringComparison]::OrdinalIgnoreCase))){throw [InvalidOperationException]::new('Foreign registration')}; $key.SetValue('',$value,[Microsoft.Win32.RegistryValueKind]::String); [Console]::Write('{"ok":true}')`,manifest);
    },
  };
}
