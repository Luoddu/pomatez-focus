import {spawn} from 'child_process';
import path from 'path';
import {GameCloser,matchesGame,ProcessIdentity,CloseAction,AppRules} from './focuserAdapter';

export const GAME_EXECUTABLES=['steam.exe','steamwebhelper.exe','battle.net.exe','battle.net launcher.exe','blizzard battle.net.exe','wegame.exe','wegameapp.exe','tgp_daemon.exe','tgp.exe','epicgameslauncher.exe','epicwebhelper.exe','riotclientservices.exe','riotclientux.exe','ubisoftconnect.exe','upc.exe','eadesktop.exe','ealauncher.exe','origin.exe','galaxyclient.exe'];
// Process API implementation, with identity checked on the same open Process
// instance before acting. No taskkill, arbitrary command or renderer-supplied PID.
const script=String.raw`$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$request=[Console]::In.ReadToEnd()|ConvertFrom-Json
$session=[Diagnostics.Process]::GetCurrentProcess().SessionId
function Identity($p){@{pid=$p.Id;name=([IO.Path]::GetFileName($p.MainModule.FileName));executable=$p.MainModule.FileName;startedAt=$p.StartTime.ToUniversalTime().Ticks.ToString()}}
if($request.mode -eq 'list'){
 $items=@();$denied=0
 foreach($p in [Diagnostics.Process]::GetProcesses()){
  try{if($p.Id -le 4 -or $p.Id -eq $request.ownPid -or $p.SessionId -ne $session){continue}
   $name=$p.ProcessName+'.exe';$candidate=$request.names -contains $name
   if($candidate -or $request.directories.Count -gt 0){try{$item=Identity $p;if($candidate){$items+=,$item}else{foreach($root in $request.directories){if($item.executable.StartsWith($root.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){$items+=,$item;break}}}}catch{if($candidate){$denied++}}}
  }catch{}finally{$p.Dispose()}
 }
 [Console]::Write((@{ok=$true;items=$items;denied=$denied}|ConvertTo-Json -Depth 5 -Compress))
}elseif($request.mode -eq 'act'){
 $results=@()
 foreach($a in $request.actions){$p=$null;try{
  if($a.process.pid -le 4 -or $a.process.pid -eq $request.ownPid){throw 'protected'}
  $p=[Diagnostics.Process]::GetProcessById([int]$a.process.pid)
  $null=$p.Handle
  if($p.SessionId -ne $session){throw 'session'}
  $actual=Identity $p
  if($actual.startedAt -cne $a.process.startedAt -or $actual.executable -ine $a.process.executable -or $actual.name -ine $a.process.name){throw 'identity'}
  if($a.kind -eq 'ask'){$delivered=$p.CloseMainWindow();$results+=,@{pid=$p.Id;kind='ask';ok=$true;delivered=$delivered}}
  elseif($a.kind -eq 'terminate'){$p.Kill();$results+=,@{pid=$p.Id;kind='terminate';ok=$true}}
  else{throw 'action'}
 }catch{$results+=,@{pid=$a.process.pid;kind=$a.kind;ok=$false}}finally{if($null -ne $p){$p.Dispose()}}}
 [Console]::Write((@{ok=$true;results=$results}|ConvertTo-Json -Depth 5 -Compress))
}else{exit 2}`;

export function nativeGameRequest(request:any):Promise<any>{
  return new Promise((resolve,reject)=>{
    const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const child=spawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',done=false;
    const finish=(error?:Error,value?:any)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
    const timer=setTimeout(()=>{child.kill();finish(Error('游戏拦截检查超时'));},8000);
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;if(output.length>256000){child.kill();finish(Error('游戏拦截检查输出过大'));}});
    child.stderr.resume();child.stdin.on('error',()=>{});
    child.on('error',()=>finish(Error('无法启动游戏拦截检查')));
    child.on('close',code=>{try{const value=JSON.parse(output);if(code!==0||value.ok!==true)throw Error();finish(undefined,value);}catch(_){finish(Error('游戏拦截检查未完成'));}});
    child.stdin.end(JSON.stringify(request));
  });
}

export class GameGuard{
  private closer=new GameCloser();
  private timer:ReturnType<typeof setTimeout>|null=null;
  private stopped=true;
  private busy=false;
  private failed=new Set<string>();
  status={running:false,checkedAt:0,blocked:0,error:''};
  constructor(private enabled:()=>boolean,private rules:AppRules,private request=nativeGameRequest,private now=()=>Number(process.hrtime.bigint()/BigInt(1000000))){}
  async tick(){
    if(this.busy||!this.enabled())return;
    this.busy=true;
    try{
      const list=await this.request({mode:'list',ownPid:process.pid,names:this.rules.executables,directories:this.rules.directories});
      if(this.stopped||!this.enabled())return;
      if(!Array.isArray(list.items))throw Error('游戏列表无效');
      const targets:ProcessIdentity[]=list.items.filter((p:any)=>p&&typeof p.executable==='string'&&typeof p.name==='string'&&typeof p.startedAt==='string'&&matchesGame(p,this.rules,process.pid));
      const key=(p:ProcessIdentity)=>`${p.pid}:${p.startedAt}:${p.executable.toLowerCase()}`;
      const present=new Set(targets.map(key));for(const k of Array.from(this.failed))if(!present.has(k))this.failed.delete(k);
      const actions=this.closer.update(targets,this.now());
      let error=list.denied?'部分游戏平台权限不足，未确认拦截':'';
      if(actions.length){for(const a of actions)this.failed.add(key(a.process));const reply=await this.request({mode:'act',ownPid:process.pid,actions});if(Array.isArray(reply.results)&&reply.results.length===actions.length)for(let i=0;i<actions.length;i++)if(reply.results[i].pid===actions[i].process.pid&&reply.results[i].kind===actions[i].kind&&reply.results[i].ok===true)this.failed.delete(key(actions[i].process));}
      if(this.failed.size)error='部分游戏关闭未确认，请检查拦截状态';
      this.status={running:true,checkedAt:Date.now(),blocked:targets.length,error};
    }catch(e:any){this.status={...this.status,running:false,error:e.message||'游戏拦截未确认'};}finally{this.busy=false;}
  }
  start(){if(!this.stopped)return;this.stopped=false;const loop=async()=>{await this.tick();if(!this.stopped)this.timer=setTimeout(loop,3000);};void loop();}
  close(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.timer=null;this.status.running=false;}
}
