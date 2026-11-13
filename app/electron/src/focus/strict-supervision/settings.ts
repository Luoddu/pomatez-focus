import fs from 'fs';
import path from 'path';

const OWNER='pomatez-strict-supervision-v1';
export class StrictSettings {
  enabled=false;
  error='';
  directories:string[]=[];
  private file:string;
  constructor(directory:string){
    this.file=path.join(directory,'strict-supervision.json');
    if(fs.existsSync(this.file))try{
      if(fs.statSync(this.file).size>262144)throw Error('size');
      const v=JSON.parse(fs.readFileSync(this.file,'utf8'));
      if(v.owner!==OWNER||v.v!==1||v.enabled!==true)throw Error('format');
      if(v.directories!==undefined&&(!Array.isArray(v.directories)||v.directories.length>128||v.directories.some((p:any)=>typeof p!=='string'||!validGameDirectory(p))))throw Error('directories');
      this.directories=v.directories||[];
      this.enabled=true;
    }catch(_){this.enabled=true;this.error='严格督促配置无法读取，保持限制，请恢复配置';}
  }
  enable(){
    if(this.error)throw Error(this.error);
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    fs.writeFileSync(this.file+'.tmp',JSON.stringify({owner:OWNER,v:1,enabled:true,directories:this.directories}),{mode:0o600});
    fs.renameSync(this.file+'.tmp',this.file);this.enabled=true;
  }
  addDirectory(directory:string,protectedRoots:string[],protectedTrees:string[]=[]){
    if(!this.enabled)throw Error('请先启用严格督促');
    const resolved=fs.realpathSync(directory),key=path.win32.normalize(resolved).toLowerCase().replace(/\\+$/,'');
    if(!validGameDirectory(resolved)||protectedRoots.some(p=>{const root=path.win32.normalize(p).toLowerCase().replace(/\\+$/,'');return root===key||root.startsWith(key+'\\')}))throw Error('请选择具体游戏目录，不能选择系统、用户或工作目录根');
    if(protectedTrees.some(p=>{const root=path.win32.normalize(p).toLowerCase().replace(/\\+$/,'');return key===root||key.startsWith(root+'\\')}))throw Error('不能限制系统或农场自身的目录');
    if(this.directories.some(p=>p.toLowerCase()===resolved.toLowerCase()))return resolved;
    if(this.directories.length>=128)throw Error('游戏目录数量已达上限');
    const before=this.directories;this.directories=[...before,resolved];try{this.enable();}catch(e){this.directories=before;throw e;}return resolved;
  }
}
function validGameDirectory(p:string){return p.length<500&&/^[a-z]:[\\/].+/i.test(p)&&path.win32.normalize(p).replace(/\\+$/,'').length>3&&!/[\x00-\x1f]/.test(p);}
export function isWeekday(now:number){const d=new Date(now).getDay();return d>=1&&d<=5;}
