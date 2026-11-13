import fs from 'fs';
import path from 'path';
import {dayKey} from '../activitywatch';

export class BedtimeReminder{
  private shown='';
  private busy=false;
  private failedDay='';
  private timer:ReturnType<typeof setInterval>|null=null;
  error='';
  constructor(private directory:string,private enabled:()=>boolean,private present:()=>Promise<void>,private now=Date.now){
    try{const v=JSON.parse(fs.readFileSync(path.join(directory,'bedtime-receipt.json'),'utf8'));if(v.owner==='pomatez-bedtime-v1'&&/^\d{4}-\d{2}-\d{2}$/.test(v.day))this.shown=v.day;}catch(_){}
  }
  async tick(){
    const now=this.now(),d=new Date(now),day=dayKey(now);
    const minutes=d.getHours()*60+d.getMinutes();
    if(!this.enabled()||this.busy||this.shown===day||this.failedDay===day||minutes<22*60+59)return;
    this.busy=true;
    try{
      await this.present();
      this.shown=day;
      fs.mkdirSync(this.directory,{recursive:true});
      const file=path.join(this.directory,'bedtime-receipt.json');
      fs.writeFileSync(file+'.tmp',JSON.stringify({owner:'pomatez-bedtime-v1',day}));fs.renameSync(file+'.tmp',file);this.error='';
    }catch(_){this.failedDay=day;this.error='晚间提醒未确认';}finally{this.busy=false;}
  }
  start(){if(this.timer)return;void this.tick();this.timer=setInterval(()=>void this.tick(),1000);}
  close(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
