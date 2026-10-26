// Explicit current-user delivery. No network, process termination or install.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),yaml=require('js-yaml');
const OWNER='pomatez-local-update-v1';
function stage(folder,profile){
 folder=path.resolve(folder);profile=path.resolve(profile);
 if(folder.startsWith('\\\\')||profile.startsWith('\\\\'))throw Error('Local paths required');
 const source=JSON.parse(fs.readFileSync(path.join(folder,'source-version.json'),'utf8')),feed=yaml.load(fs.readFileSync(path.join(folder,'preview.yml'),'utf8'));
 if(source.dirty!==false||!/^[a-f0-9]{40}$/.test(source.head)||!/^0\.1\.0-preview\.[1-9]\d*$/.test(source.version)||source.version!==feed.version)throw Error('Clean fixed source/version required');
 const name=`Pomatez-Focus-v${source.version}-win-x64-setup.exe`,file=path.join(folder,name),stat=fs.lstatSync(file);
 if(feed.path!==name||!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>200*1024*1024||feed.files?.length!==1||feed.files[0].url!==name||feed.files[0].size!==stat.size)throw Error('Invalid installer metadata');
 const bytes=fs.readFileSync(file),sha512=crypto.createHash('sha512').update(bytes).digest('base64'),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 if(sha512!==feed.sha512||sha512!==feed.files[0].sha512)throw Error('Installer digest mismatch');
 const manifest={owner:OWNER,version:source.version,sourceHead:source.head,file:name,size:stat.size,sha256,sha512};
 const target=path.join(profile,'local-update'),meta=path.join(target,'manifest.json');
 if(fs.existsSync(target)){
  if(!fs.lstatSync(target).isDirectory()||fs.lstatSync(target).isSymbolicLink()||!fs.existsSync(meta)||fs.lstatSync(meta).isSymbolicLink())throw Error('Foreign update folder refused');
  const old=JSON.parse(fs.readFileSync(meta,'utf8'));if(old.owner!==OWNER)throw Error('Foreign update marker refused');
  if(Number(old.version?.split('.').pop())>Number(source.version.split('.').pop()))throw Error('Newer local update already staged');
  if(old.version===manifest.version){if(JSON.stringify(old)!==JSON.stringify(manifest))throw Error('Same version has different source/bytes');const staged=path.join(target,name),info=fs.lstatSync(staged);if(!info.isFile()||info.isSymbolicLink())throw Error('Linked staged installer refused');const existing=fs.readFileSync(staged);if(crypto.createHash('sha256').update(existing).digest('hex')!==sha256)throw Error('Existing staged bytes changed');return {version:source.version,alreadyPrepared:true};}
 }
 fs.mkdirSync(profile,{recursive:true});
 const first=!fs.existsSync(target),work=first?path.join(profile,'local-update-stage-'+crypto.randomUUID()):target;
 fs.mkdirSync(work,{recursive:true,mode:0o700});
 try{
  const dest=path.join(work,name);
  if(fs.existsSync(dest)){
   if(fs.lstatSync(dest).isSymbolicLink()||crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')!==sha256)throw Error('Unowned installer bytes already exist');
  }else try{fs.copyFileSync(file,dest,fs.constants.COPYFILE_EXCL);}catch(error){if(path.dirname(dest)===work&&fs.existsSync(dest))fs.unlinkSync(dest);throw error;}
  const pending=path.join(work,'manifest.json.tmp');fs.writeFileSync(pending,JSON.stringify(manifest),{mode:0o600});fs.renameSync(pending,path.join(work,'manifest.json'));
  if(first)fs.renameSync(work,target);
 }finally{
  if(first&&fs.existsSync(work)&&path.dirname(work)===profile&&/^local-update-stage-[a-f0-9-]{36}$/.test(path.basename(work)))fs.rmSync(work,{recursive:true});
 }
 return {version:source.version,alreadyPrepared:false};
}
module.exports={stage};
if(require.main===module){try{const args=process.argv.slice(2);if(!args[0]||args.length>2)throw Error('Usage: node scripts/stage-local-update.cjs <verified-package-folder> [isolated-profile]');const profile=args[1]||path.join(process.env.APPDATA,'pomatez-focus');console.log(JSON.stringify(stage(args[0],profile)));}catch(e){console.error(e.message);process.exitCode=1;}}
