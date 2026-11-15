import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import {performance} from 'perf_hooks';
import {safeStorage} from 'electron';

// All permits are server-reserved. The local file contains only encrypted
// connection material; it never contains a resettable daily allowance.
export class SharedEntertainment {
  private config:{url:string;token:string}|null=null;
  private enabled=false;
  private error='';
  private data:any=null;
  private received=0;
  private busy=false;
  private lastAttempt=-Infinity;
  private lastUpload=-Infinity;
  private reminder='';
  private file:string;
  constructor(directory:string,private mono=()=>performance.now()){
    this.file=path.join(directory,'shared-entertainment.enc');
    this.enabled=fs.existsSync(this.file);
  }
  private load(){
    if(!this.enabled||this.config||this.error)return;
    try{
      if((!safeStorage.isEncryptionAvailable()||(process.platform==='linux'&&safeStorage.getSelectedStorageBackend()==='basic_text'))||fs.statSync(this.file).size>16384)throw Error();
      this.config=this.validate(JSON.parse(safeStorage.decryptString(fs.readFileSync(this.file))));
    }catch(_){this.error='共享连接读取失败，暂不发放娱乐额度';}
  }
  private validate(v:any){
    if(!v||typeof v.url!=='string'||typeof v.token!=='string'||!/^[a-fA-F0-9]{64}$/.test(v.token))throw Error('请输入服务地址与本设备连接码');
    const url=new URL(v.url);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('共享服务须使用根路径HTTPS地址');
    return {url:url.origin,token:v.token};
  }
  async configure(v:any){
    if(this.busy)throw Error('正在验证共享连接，请稍后重试');
    this.busy=true;
    try{
    if(this.enabled)throw Error('共享连接已绑定；更换服务须迁移原有额度，不能在此重置');
    const next=this.validate(v);
    if((!safeStorage.isEncryptionAvailable()||(process.platform==='linux'&&safeStorage.getSelectedStorageBackend()==='basic_text')))throw Error('系统凭据加密不可用，未保存连接');
    const start=this.mono(),data=await this.request('state',{},next);
    this.check(data);
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    fs.writeFileSync(this.file+'.tmp',safeStorage.encryptString(JSON.stringify(next)),{mode:0o600});
    fs.renameSync(this.file+'.tmp',this.file);
    this.config=next;this.enabled=true;this.accept(data,start);return this.snapshot();
    }finally{this.busy=false;}
  }
  private request(action:string,body:any,config=this.config):Promise<any>{
    if(!config)return Promise.reject(Error('共享连接不可用'));
    return new Promise((resolve,reject)=>{
      const payload=Buffer.from(JSON.stringify(body));
      const request=https.request(config.url+'/v1/'+action,{method:'POST',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json','Content-Length':payload.length},timeout:5000},res=>{
        let parts:Buffer[]=[],size=0;
        res.on('data',chunk=>{size+=chunk.length;if(size>1024*1024)request.destroy(Error('response too large'));else parts.push(chunk);});
        res.on('end',()=>{try{if(res.statusCode!==200)throw Error('shared service rejected request');resolve(JSON.parse(Buffer.concat(parts).toString('utf8')));}catch(e){reject(e);}});
        res.on('error',reject);
      });
      const timer=setTimeout(()=>request.destroy(Error('shared service timeout')),6000);
      request.on('close',()=>clearTimeout(timer));request.on('timeout',()=>request.destroy(Error('shared service timeout')));request.on('error',reject);request.end(payload);
    });
  }
  private check(v:any){
    if(v?.v!==1||v.timeZone!=='Asia/Shanghai'||!/^\d{4}-\d{2}-\d{2}$/.test(v.day))throw Error('invalid authority response');
    for(const key of ['serverNow','dayEndsAt','quotaMs','reservedMs','remainingMs','permitUntil','releaseUntil','cooldownUntil'])if(!Number.isSafeInteger(v[key])||v[key]<0)throw Error('invalid authority response');
    if(v.reservedMs+v.remainingMs!==v.quotaMs||v.permitUntil>v.serverNow+20000||v.dayEndsAt<=v.serverNow||v.releaseUntil>v.dayEndsAt)throw Error('invalid authority bounds');
  }
  private accept(v:any,start:number){this.check(v);this.data=v;this.received=start;this.error='';}
  snapshot(){
    const age=this.mono()-this.received,d=this.data;
    const serverNow=d?d.serverNow+Math.max(0,age):0;
    const fresh=!!d&&age>=0&&age<20000;
    const remaining=(key:string)=>d?Math.max(0,d[key]-serverNow):0;
    return {enabled:this.enabled,connected:!!this.config&&fresh&&!this.error,error:this.error,
      day:d?.day||'',quotaMs:d?.quotaMs||0,reservedMs:d?.reservedMs||0,remainingMs:d?.remainingMs||0,
      allowedMs:fresh?Math.min(20000,remaining('permitUntil'),remaining('releaseUntil'),remaining('dayEndsAt')):0,
      releaseMs:remaining('releaseUntil'),cooldownMs:remaining('cooldownUntil'),serverNow};
  }
  async tick(state:any,eligible:boolean,cooldown:boolean){
    this.load();
    if(!this.enabled||!this.config||this.busy||this.mono()-this.lastAttempt<4000)return;
    this.busy=true;this.lastAttempt=this.mono();
    try{
      let start=this.mono();this.accept(await this.request('state',{}),start);
      const day=this.data.day;
      if(cooldown&&state.reminder){
        const key=crypto.createHash('sha256').update(day+':'+state.reminder.key).digest('hex');
        if(key!==this.reminder){start=this.mono();this.accept(await this.request('cooldown',{day,id:crypto.randomUUID(),key}),start);this.reminder=key;}
      }
      if(eligible&&state.status==='recording'&&state.live?.site&&state.live.expiresAt>Date.now()){
        start=this.mono();this.accept(await this.request('grant',{day,id:crypto.randomUUID()}),start);
      }
      if(this.mono()-this.lastUpload>=30000&&state.usage?.day===day){
        const intervals=state.usage.sessions.filter((x:any)=>x.end<=this.data.serverNow).map((x:any)=>({start:Math.ceil(x.start),end:Math.floor(x.end),site:x.site})).filter((x:any)=>x.end>x.start);
        start=this.mono();this.accept(await this.request('usage',{day,intervals}),start);this.lastUpload=this.mono();
      }
    }catch(_){this.error='共享服务暂不可达，不发新额度；原倒计时继续';}
    finally{this.busy=false;}
  }
  async action(action:'release'|'resume'){
    if(!this.enabled)throw Error('尚未连接共享服务');
    if(this.busy)throw Error('正在核对共享状态，请稍后重试');
    this.busy=true;
    try{let start=this.mono();this.accept(await this.request('state',{}),start);start=this.mono();this.accept(await this.request(action,{day:this.data.day,id:crypto.randomUUID()}),start);return this.snapshot();}
    catch(_){this.error='共享服务暂不可达，不发新额度；原倒计时继续';throw Error(this.error);}
    finally{this.busy=false;}
  }
  async statistics(days:number){return this.request('statistics',{days});}
}
