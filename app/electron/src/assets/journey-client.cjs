// Local stdin/stdout adapter. No server, network, shell or App auto-start.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function bounded(file,max){const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.size>max)throw Error('Invalid API file');return JSON.parse(fs.readFileSync(file,'utf8'));}
async function call(request, profile=path.join(process.env.APPDATA||'', 'pomatez-focus')) {
 if(process.platform!=='win32'||!process.env.APPDATA) throw Error('Windows current-user AppData required');
 if(!request||!idPattern.test(request.requestId||'')||Buffer.byteLength(JSON.stringify(request))>30000)throw Error('Invalid/big request');
 const directory=path.join(profile,'journey-api');
 if(!path.isAbsolute(directory)||directory.startsWith('\\\\'))throw Error('Local profile required');
 for(const folder of [profile,directory,path.join(directory,'requests'),path.join(directory,'responses')]){const s=fs.lstatSync(folder);if(s.isSymbolicLink()||!s.isDirectory())throw Error('Linked profile refused');}
 const status=bounded(path.join(directory,'status.json'),8192);
 if(status.owner!=='pomatez-journey-api-v1'||status.protocol!==1||!idPattern.test(status.instance||'')||!Number.isInteger(status.pid)||status.pid<=0||!path.isAbsolute(status.executable)||status.executable.startsWith('\\\\')||!fs.statSync(status.executable).isFile())throw Error('App is not available');
 process.kill(status.pid,0);
 const transportId=randomUUID(),input=path.join(directory,'requests',transportId+'.json'),output=path.join(directory,'responses',transportId+'.json');
 if(fs.existsSync(output))throw Error('Transport slot collision');
 fs.writeFileSync(input,JSON.stringify({instance:status.instance,request}),{flag:'wx',mode:0o600});
 let child;
 try {
   const args=[...(status.entry?[status.entry]:[]),'--journey-api',transportId];
   const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
   child=spawn(status.executable,args,{env,windowsHide:true,stdio:'ignore',shell:false});
   let spawnError;child.on('error',e=>spawnError=e);
   const until=Date.now()+12000;
   while(Date.now()<until){if(spawnError)throw spawnError;if(fs.existsSync(output)){const reply=bounded(output,200000);if(reply.requestId!==request.requestId||reply.transportId!==transportId)throw Error('Response mismatch');return reply;}await new Promise(r=>setTimeout(r,100));}
   throw Error('App response timeout; reread/retry same request ID, never regenerate a write');
 } finally {if(child&&child.exitCode===null&&!child.killed)child.kill();if(fs.existsSync(input))fs.unlinkSync(input);if(fs.existsSync(output))fs.unlinkSync(output);}
}
module.exports={call};
if(require.main===module){let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',s=>{input+=s;if(Buffer.byteLength(input)>30000){process.stderr.write('Request too large\n');process.exit(1);}});process.stdin.on('end',async()=>{try{const reply=await call(JSON.parse(input));process.stdout.write(JSON.stringify(reply)+'\n');process.exitCode=reply.error?1:0;}catch(e){process.stdout.write(JSON.stringify({error:{code:'TRANSPORT',message:e.message}})+'\n');process.exitCode=1;}});}
