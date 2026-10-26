const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {stage}=require('../scripts/stage-local-update.cjs'),{LocalUpdate}=require('../app/electron/build/focus/localUpdate');
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pomo-local-update-')),folder=path.join(dir,'package'),profile=path.join(dir,'profile');fs.mkdirSync(folder);const version='0.1.0-preview.104',name=`Pomatez-Focus-v${version}-win-x64-setup.exe`,bytes=Buffer.alloc(8192,42),sha512=crypto.createHash('sha512').update(bytes).digest('base64');fs.writeFileSync(path.join(folder,name),bytes);fs.writeFileSync(path.join(folder,'source-version.json'),JSON.stringify({version,head:'a'.repeat(40),dirty:false}));fs.writeFileSync(path.join(folder,'preview.yml'),JSON.stringify({version,path:name,sha512,files:[{url:name,size:bytes.length,sha512}]}));return {dir,folder,profile,version,name,bytes};}
const get=url=>new Promise((resolve,reject)=>http.get(url,r=>{const b=[];r.on('data',x=>b.push(x));r.on('end',()=>resolve({status:r.statusCode,body:Buffer.concat(b)}));}).on('error',reject));
test('local delivery is repeatable and fixed; loopback supplies only exact token feed/installer then closes',async()=>{
 const f=fixture();assert.deepEqual(stage(f.folder,f.profile),{version:f.version,alreadyPrepared:false});assert.equal(stage(f.folder,f.profile).alreadyPrepared,true);
 const u=new LocalUpdate(f.profile,'0.1.0-preview.103');assert.equal(u.snapshot().available,true);const local=await u.serve();try{const feed=await get(local.url+'preview.yml?noCache=123');assert.equal(feed.status,200);assert.equal(JSON.parse(feed.body).version,f.version);assert.deepEqual((await get(local.url+f.name)).body,f.bytes);assert.equal((await get(new URL('/preview.yml',local.url))).status,404);assert.equal((await get(local.url+'manifest.json')).status,404);assert.equal((await get(local.url+'../manifest.json')).status,404);}finally{await local.close();}
 await assert.rejects(get(local.url+'preview.yml'));assert.equal(new LocalUpdate(f.profile,f.version).snapshot().available,false);await assert.rejects(new LocalUpdate(f.profile,f.version).serve(),/更新的版本/);
});
test('bad digest, old version, foreign marker and path escape refuse without changing valid source',async()=>{
 const f=fixture();stage(f.folder,f.profile);const file=path.join(f.profile,'local-update',f.name),original=fs.readFileSync(file);fs.writeFileSync(file,Buffer.alloc(original.length,1));await assert.rejects(new LocalUpdate(f.profile,'0.1.0-preview.103').serve(),/校验失败/);assert.throws(()=>stage(f.folder,f.profile),/changed/);
 const meta=path.join(f.profile,'local-update/manifest.json'),m=JSON.parse(fs.readFileSync(meta));m.file='../escape.exe';fs.writeFileSync(meta,JSON.stringify(m));assert.equal(new LocalUpdate(f.profile,'0.1.0-preview.103').snapshot().available,false);await assert.rejects(new LocalUpdate(f.profile,'0.1.0-preview.103').serve());
 fs.writeFileSync(meta,JSON.stringify({owner:'foreign'}));const before=fs.readFileSync(meta);assert.throws(()=>stage(f.folder,f.profile),/Foreign/);assert.deepEqual(fs.readFileSync(meta),before);assert.deepEqual(fs.readFileSync(path.join(f.folder,f.name)),original);
});
test('first staging failure cleans only its owned temporary directory and a valid retry still works',()=>{
 const f=fixture(),copy=fs.copyFileSync;
 try{fs.copyFileSync=()=>{throw Error('synthetic disk full')};assert.throws(()=>stage(f.folder,f.profile),/synthetic disk full/);}finally{fs.copyFileSync=copy;}
 assert.equal(fs.existsSync(path.join(f.profile,'local-update')),false);assert.deepEqual(fs.readdirSync(f.profile),[]);assert.equal(stage(f.folder,f.profile).alreadyPrepared,false);
});
test('manifest write/commit failures keep prior ready update and permit exact-byte retry',()=>{
 for(const method of ['writeFileSync','renameSync']){
  const f=fixture(),original=fs[method];
  try{fs[method]=(file,...args)=>{if(String(file).includes('manifest.json'))throw Error('synthetic manifest failure');return original(file,...args)};assert.throws(()=>stage(f.folder,f.profile),/synthetic manifest failure/);}finally{fs[method]=original;}
  assert.equal(fs.existsSync(path.join(f.profile,'local-update')),false);stage(f.folder,f.profile);
  const manifest=path.join(f.profile,'local-update/manifest.json'),before=fs.readFileSync(manifest),newVersion='0.1.0-preview.105',newName=`Pomatez-Focus-v${newVersion}-win-x64-setup.exe`,feed=JSON.parse(fs.readFileSync(path.join(f.folder,'preview.yml')));fs.copyFileSync(path.join(f.folder,f.name),path.join(f.folder,newName));feed.version=newVersion;feed.path=newName;feed.files[0].url=newName;fs.writeFileSync(path.join(f.folder,'preview.yml'),JSON.stringify(feed));fs.writeFileSync(path.join(f.folder,'source-version.json'),JSON.stringify({version:newVersion,head:'b'.repeat(40),dirty:false}));
  try{fs[method]=(file,...args)=>{if(String(file).includes('manifest.json'))throw Error('synthetic manifest failure');return original(file,...args)};assert.throws(()=>stage(f.folder,f.profile),/synthetic manifest failure/);}finally{fs[method]=original;}
  assert.deepEqual(fs.readFileSync(manifest),before);assert.equal(new LocalUpdate(f.profile,'0.1.0-preview.103').snapshot().version,f.version);assert.equal(stage(f.folder,f.profile).version,newVersion);assert.equal(new LocalUpdate(f.profile,'0.1.0-preview.103').snapshot().version,newVersion);
 }
});
