import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
const OWNER='pomatez-journey-api-v1';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function read(file:string, max:number) { const stat=fs.lstatSync(file); if(!stat.isFile()||stat.isSymbolicLink()||stat.size>max) throw Error('Invalid request file'); return JSON.parse(fs.readFileSync(file,'utf8')); }
function atomic(file:string,value:any) { const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value),{mode:0o600});fs.renameSync(temp,file); }
export class JourneyGateway {
  readonly directory:string; readonly instance=crypto.randomUUID();
  private pending=new Map<string,{id:string;resolve:(v:any)=>void;timer:ReturnType<typeof setTimeout>}>();
  private active=false;
  constructor(userData:string, private send:(value:any)=>void) { this.directory=path.join(userData,'journey-api'); }
  start(executable:string, entry?:string) {
    if (process.platform!=='win32') return;
    if (!path.isAbsolute(this.directory)||this.directory.startsWith('\\\\')||executable.startsWith('\\\\')) throw Error('Local current-user paths required');
    for(const folder of [this.directory,path.join(this.directory,'requests'),path.join(this.directory,'responses')]) {
      fs.mkdirSync(folder,{recursive:true,mode:0o700});const stat=fs.lstatSync(folder);if(!stat.isDirectory()||stat.isSymbolicLink()) throw Error('Linked API directory refused');
    }
    atomic(path.join(this.directory,'status.json'),{owner:OWNER,protocol:1,instance:this.instance,pid:process.pid,executable,entry:entry||null});this.active=true;
  }
  async dispatch(id:any) {
    if (!ID.test(id||'') || !this.active) return;
    let reply:any,requestId:string|null=null;
    try {
      if(this.pending.size>=16) throw Error('API queue full');
      const envelope=read(path.join(this.directory,'requests',id+'.json'),32768);
      if(!envelope||Object.keys(envelope).some(k=>!['instance','request'].includes(k))||envelope.instance!==this.instance||!ID.test(envelope.request?.requestId||'')) throw Error('Request instance mismatch');
      requestId=envelope.request.requestId;
      const ticket=crypto.randomUUID();
      reply=await new Promise(resolve=>{
        const timer=setTimeout(()=>{this.pending.delete(ticket);resolve({error:{code:'TIMEOUT',message:'旅程页面未就绪或操作超时'}})},10000);
        this.pending.set(ticket,{id,resolve,timer});
        try { this.send({ticket,request:envelope.request}); } catch (_) { clearTimeout(timer);this.pending.delete(ticket);resolve({error:{code:'NOT_READY',message:'农场页面未就绪'}}); }
      });
    } catch(e:any) { reply={error:{code:'INVALID',message:e.message}}; }
    try { if(this.active) atomic(path.join(this.directory,'responses',id+'.json'),{transportId:id,requestId,...reply}); } catch (_) { /* caller times out; no replay */ }
  }
  complete(value:any) {
    if(!value || !ID.test(value.ticket||'') || JSON.stringify(value).length>200000) throw Error('Invalid API response');
    const pending=this.pending.get(value.ticket);if(!pending) return false;
    if(!value.response||typeof value.response!=='object') throw Error('Missing API response');
    clearTimeout(pending.timer);this.pending.delete(value.ticket);pending.resolve(value.response);return true;
  }
  close() {
    this.active=false;
    this.pending.forEach(p=>{clearTimeout(p.timer);p.resolve({error:{code:'NOT_READY',message:'农场已关闭'}});});this.pending.clear();
    const status=path.join(this.directory,'status.json');try {if(read(status,8192).instance===this.instance) fs.unlinkSync(status);} catch (_) {}
  }
}
