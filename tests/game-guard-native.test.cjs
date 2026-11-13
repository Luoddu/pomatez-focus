const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const {nativeGameRequest}=require('../app/electron/build/focus/strict-supervision/gameGuard');
const {GameGuard}=require('../app/electron/build/focus/strict-supervision/gameGuard');
test('real Windows adapter acts only on owned fixture identity; stale identity denied and neighbour survives',{skip:process.platform!=='win32',timeout:30000},async t=>{
 const exe=path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
 const start=()=>new Promise((resolve,reject)=>{const p=spawn(exe,['-NoLogo','-NoProfile','-NonInteractive','-Command','[Console]::WriteLine("READY"); Start-Sleep -Seconds 60'],{windowsHide:true,stdio:['ignore','pipe','ignore']});t.after(()=>{if(p.exitCode===null)p.kill()});p.on('error',reject);p.stdout.once('data',()=>resolve(p));});
 const target=await start(),neighbour=await start();
 const list=await nativeGameRequest({mode:'list',ownPid:process.pid,names:['powershell.exe'],directories:[]});
 const identity=list.items.find(p=>p.pid===target.pid);assert.ok(identity);assert.ok(list.items.some(p=>p.pid===neighbour.pid));
 const send=actions=>nativeGameRequest({mode:'act',ownPid:process.pid,actions});
 let r=await send([{kind:'terminate',process:{...identity,startedAt:'invalid'}}]);assert.equal(r.results[0].ok,false);assert.equal(target.exitCode,null);
 r=await send([{kind:'ask',process:identity}]);assert.equal(r.results[0].ok,true);
 const exited=new Promise(resolve=>target.once('exit',resolve));
 r=await send([{kind:'terminate',process:identity}]);assert.equal(r.results[0].ok,true);await exited;
 assert.equal(neighbour.exitCode,null);
});
test('full GameGuard to Windows process chain closes only uniquely named owned game fixture',{skip:process.platform!=='win32',timeout:30000},async t=>{
 const fs=require('node:fs'),os=require('node:os'),{spawnSync}=require('node:child_process'),{randomUUID}=require('node:crypto');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p089-native-')),name='p089-game-'+randomUUID()+'.exe',targetFile=path.join(dir,name),workFile=path.join(dir,'p089-work-'+randomUUID()+'.exe');
 t.after(()=>{try{fs.rmSync(dir,{recursive:true,force:true})}catch(_){}});
 const compiler=path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
 const made=spawnSync(compiler,['-NoProfile','-NonInteractive','-Command',`$p=[Console]::In.ReadToEnd();Add-Type -TypeDefinition 'public class Fixture { public static void Main(){ System.Console.WriteLine("READY"); System.Threading.Thread.Sleep(60000); } }' -OutputAssembly $p -OutputType ConsoleApplication`],{input:targetFile,encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(made.status,0,made.stderr);fs.copyFileSync(targetFile,workFile);
 const start=file=>new Promise((resolve,reject)=>{const p=spawn(file,[],{windowsHide:true,stdio:['ignore','pipe','ignore']});t.after(()=>{if(p.exitCode===null)p.kill()});p.on('error',reject);p.stdout.once('data',()=>resolve(p));});
 const game=await start(targetFile),work=await start(workFile);let now=0;
 const guard=new GameGuard(()=>true,{executables:[name],directories:[]},nativeGameRequest,()=>now);guard.stopped=false;
 await guard.tick();assert.equal(guard.status.blocked,1);assert.equal(guard.status.error,'');assert.equal(game.exitCode,null);
 const gone=new Promise(r=>game.once('exit',r));now=30000;await guard.tick();await gone;await guard.tick();assert.equal(guard.status.blocked,0);assert.equal(guard.status.error,'');assert.equal(work.exitCode,null);guard.close();
});
