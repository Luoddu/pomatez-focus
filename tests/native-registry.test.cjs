const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),{randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {nativeRegistry,NATIVE_REGISTRY_KEY}=require('../app/electron/build/focus/nativeRegistry');
const {BrowserControl}=require('../app/electron/build/focus/browserControl');
const root=path.resolve(__dirname,'..'),build=path.join(root,'app/electron/build');
const ps=(script,input)=>spawnSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,encoding:'utf8',input,timeout:10000});
test('actual OEM missing-key bytes reject old UTF8 prose parser; typed read returns missing normally',()=>{
 const key='Software\\PomatezFocusTests\\p055-'+randomUUID(),raw=spawnSync('reg.exe',['query','HKCU\\'+key,'/ve'],{windowsHide:true});assert.equal(raw.status,1);
 const utf=raw.stderr.toString('utf8');if(utf.includes('\ufffd'))assert.equal(/找不到|unable to find|cannot find/i.test(utf),false);
 assert.equal(nativeRegistry(key).read(),null);
});
test('typed missing/Unicode values accepted; true denied, malformed/unknown type still fail closed; stdin never code',()=>{
 let script,input,calls=0;const file=path.resolve(os.tmpdir(),"中文 空格 '+$() 🥣.json");
 const registry=nativeRegistry(NATIVE_REGISTRY_KEY,(s,i)=>{script=s;input=i;calls++;return {status:0,stdout:JSON.stringify(i===undefined?{ok:true,found:true,kind:'String',value:file}:{ok:true})}});
 assert.equal(registry.read(),file);registry.write(file);assert.equal(input,file);assert.equal(script.includes(file),false);assert.equal(calls,2);
 for(const errorType of ['System.UnauthorizedAccessException','System.Security.SecurityException'])assert.throws(()=>nativeRegistry(NATIVE_REGISTRY_KEY,()=>({status:2,stdout:JSON.stringify({ok:false,errorType})})).read(),/无权/);
 assert.throws(()=>nativeRegistry(NATIVE_REGISTRY_KEY,()=>({status:1,stdout:'not found'})).read(),/未返回/);
 assert.throws(()=>nativeRegistry(NATIVE_REGISTRY_KEY,()=>({status:0,stdout:JSON.stringify({ok:true,found:true,kind:'DWord',value:1})})).read(),/无效/);
 assert.throws(()=>nativeRegistry("Software\\foreign';throw"),/Unsupported/);
});
test('real scratch HKCU Unicode installation/default readback, idempotent update; foreign overwrite refused and marker-checked cleanup',()=>{
 const id=randomUUID(),key='Software\\PomatezFocusTests\\p055-'+id,dir=fs.mkdtempSync(path.join(os.tmpdir(),'pomo-reg-'));
 const unicode=path.join(dir,'中文 空格 🥣'),registry=nativeRegistry(key),c=new BrowserControl(unicode,build);
 assert.equal(registry.read(),null);
 const marker=ps(`$k=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('${key}',$true);$k.SetValue('TestOwner','${id}');$k.Dispose()`);assert.equal(marker.status,0,marker.stderr);
 try {
   const result=c.install(process.execPath,registry);assert.ok(fs.existsSync(path.join(result.directory,'manifest.json')));
   const expected=path.join(unicode,'browser-control/host-manifest.json');assert.equal(registry.read(),expected);assert.equal(c.install(process.execPath,registry).extensionId,result.extensionId);
   assert.throws(()=>registry.write(path.join(dir,'foreign.json')),/其他来源/);assert.equal(registry.read(),expected);
 }finally{
   assert.match(key,/^Software\\PomatezFocusTests\\p055-[a-f0-9-]{36}$/);
   const cleanup=ps(`$base=[Microsoft.Win32.Registry]::CurrentUser;$k=$base.OpenSubKey('${key}',$false);if($null -eq $k -or $k.GetValue('TestOwner') -ne '${id}'){throw 'Foreign marker'};$k.Dispose();$base.DeleteSubKeyTree('${key}',$false)`);assert.equal(cleanup.status,0,cleanup.stderr);
 }
 assert.equal(registry.read(),null);
});
