const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),https=require('node:https');
const {Authority,createServer}=require('../services/shared-entertainment/server.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'p095-tls-'));
 const cert=require('selfsigned').generate([{name:'commonName',value:'localhost'}],{days:1,keySize:2048,extensions:[{name:'subjectAltName',altNames:[{type:7,ip:'127.0.0.1'}]}]});
 const ca=path.join(dir,'ca.pem');fs.writeFileSync(ca,cert.cert);
 const token=crypto.randomBytes(32).toString('hex'),second=crypto.randomBytes(32).toString('hex'),authority=new Authority(path.join(dir,'test.sqlite'));
 const server=createServer(authority,{[token]:'first',[second]:'second'},{tls:{key:cert.private,cert:cert.cert}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const env={...process.env,POMATEZ_HEADLESS:'1',POMATEZ_PROFILE:path.join(root,'artifacts/test-profiles',crypto.randomUUID()),NODE_EXTRA_CA_CERTS:ca,P095_SHARED_URL:'https://127.0.0.1:'+server.address().port,P095_SHARED_TOKEN:token,P095_SHARED_SECOND:second};delete env.ELECTRON_RUN_AS_NODE;
 let code=1;
 try{code=await new Promise((resolve,reject)=>{const child=spawn(require('electron'),[path.join(root,'tests/shared-entertainment-desktop.cjs'),'--mute-audio'],{cwd:root,env,windowsHide:true,stdio:'inherit'});const timeout=setTimeout(()=>child.kill(),55000);child.on('error',reject);child.on('exit',c=>{clearTimeout(timeout);resolve(c??1);});});}
 finally{await new Promise(r=>{server.closeAllConnections();server.close(r);});authority.close();fs.rmSync(dir,{recursive:true,force:true});}
 process.exitCode=code;
})().catch(()=>{console.error('Shared desktop runner failed');process.exitCode=1;});
