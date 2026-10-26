import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";

const OWNER="pomatez-local-update-v1",MAX=200*1024*1024;
const preview=(v:any)=>typeof v==="string"&&/^0\.1\.0-preview\.[1-9]\d*$/.test(v)?Number(v.split('.').pop()):0;
export class LocalUpdate {
  readonly directory:string;
  constructor(profile:string,private current:string){this.directory=path.join(profile,"local-update");}
  private read(){
    const dir=fs.lstatSync(this.directory);if(!dir.isDirectory()||dir.isSymbolicLink())throw Error("本地更新目录不符");
    const file=path.join(this.directory,"manifest.json"),stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)throw Error("本地更新清单无效");
    const v=JSON.parse(fs.readFileSync(file,"utf8"));
    if(v.owner!==OWNER||!preview(v.version)||v.file!==`Pomatez-Focus-v${v.version}-win-x64-setup.exe`||!Number.isSafeInteger(v.size)||v.size<1||v.size>MAX||!/^[a-f0-9]{40}$/.test(v.sourceHead)||!/^[a-f0-9]{64}$/.test(v.sha256)||typeof v.sha512!=="string"||Buffer.from(v.sha512,"base64").length!==64||Buffer.from(v.sha512,"base64").toString("base64")!==v.sha512)throw Error("本地更新清单无效");
    const setup=path.join(this.directory,v.file),info=fs.lstatSync(setup);
    if(!info.isFile()||info.isSymbolicLink()||info.size!==v.size)throw Error("本地安装包大小或类型不符");
    return {...v,setup};
  }
  snapshot(){
    if(!fs.existsSync(this.directory))return {available:false};
    try{const v=this.read();return {available:preview(v.version)>preview(this.current),version:v.version};}
    catch(_){return {available:false,error:"本地更新未通过检查，请重新准备安装包"};}
  }
  async serve(){
    const v=this.read();if(preview(v.version)<=preview(this.current))throw Error("本地更新不是更新的版本");
    const sha256=crypto.createHash("sha256"),sha512=crypto.createHash("sha512");
    for await(const chunk of fs.createReadStream(v.setup)){sha256.update(chunk);sha512.update(chunk);}
    if(sha256.digest("hex")!==v.sha256||sha512.digest("base64")!==v.sha512)throw Error("本地安装包校验失败，未安装");
    const token=crypto.randomBytes(24).toString("hex");let port=0;
    const server=http.createServer((req,res)=>{
      const url=new URL(req.url||"/","http://127.0.0.1"),base=`/${token}/`;
      if(req.method!=="GET"||req.headers.host!==`127.0.0.1:${port}`||req.socket.remoteAddress!=="127.0.0.1"||!url.pathname.startsWith(base)){res.writeHead(404);res.end();return;}
      if(url.pathname===base+"preview.yml"){
        res.setHeader("Content-Type","application/json");res.end(JSON.stringify({version:v.version,path:v.file,sha512:v.sha512,files:[{url:v.file,size:v.size,sha512:v.sha512}]}));return;
      }
      if(url.pathname!==base+v.file){res.writeHead(404);res.end();return;}
      res.setHeader("Content-Length",v.size);res.setHeader("Content-Type","application/octet-stream");
      const stream=fs.createReadStream(v.setup);stream.on("error",()=>res.destroy());res.on("close",()=>stream.destroy());stream.pipe(res);
    });
    server.requestTimeout=30000;
    await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",()=>{port=(server.address() as any).port;resolve();});});
    return {version:v.version,url:`http://127.0.0.1:${port}/${token}/`,close:()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();})};
  }
}
