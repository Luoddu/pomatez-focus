// Official NativeMessaging framing; no network server, timers or dynamic paths.
import fs from "fs";
import path from "path";
const OWNER="pomatez-browser-control-v1";
const configFile=process.argv[2], origin=process.argv[3];
let config:any;
try {
  if(configFile!==path.join(__dirname,"host-config.json") || fs.statSync(configFile).size>8192) throw Error("config");
  config=JSON.parse(fs.readFileSync(configFile,"utf8"));
  if(config.owner!==OWNER || origin!==config.origin || !/^chrome-extension:\/\/[a-p]{32}\/$/.test(origin)) throw Error("origin");
} catch (_) { process.exit(1); }
let input=Buffer.alloc(0), pauseKey="", pausedCount=0;
function receipt(connected:boolean) {
  const file=path.join(config.directory,"browser-control-receipt.json");
  fs.writeFileSync(file+".tmp",JSON.stringify({owner:OWNER,connected,checkedAt:Date.now(),pauseKey,pausedCount})); fs.renameSync(file+".tmp",file);
}
function state() {
  try {
    const file=path.join(config.directory,"browser-control-projection.json");
    if(fs.statSync(file).size>8192) throw Error("size");
    const v=JSON.parse(fs.readFileSync(file,"utf8")),now=Date.now();
    if(v.owner!==OWNER || v.v!==1 || !v.ready || now>v.expiresAt || v.expiresAt>now+7000 || !["mirror","pause","cooldown","quota"].includes(v.mode) || typeof v.supervise!=="boolean" || !Number.isInteger(v.cooldownMinutes) || v.cooldownMinutes<1 || v.cooldownMinutes>30 || typeof v.reminderKey!=="string" || v.reminderKey.length>100 || !/^\d{4}-\d{2}-\d{2}$/.test(v.day)) throw Error("stale");
    return {v:1,ready:true,expiresAt:v.expiresAt,day:v.day,supervise:v.supervise,mode:v.mode,cooldownMinutes:v.cooldownMinutes,reminderKey:v.reminderKey,quotaSpent:v.quotaSpent===true};
  } catch (_) { return {v:1,ready:false,expiresAt:0}; }
}
function send(v:any) { const body=Buffer.from(JSON.stringify(v)),h=Buffer.alloc(4); h.writeUInt32LE(body.length); process.stdout.write(Buffer.concat([h,body])); }
process.stdin.on("data",chunk=>{
  input=Buffer.concat([input,chunk]);
  if(input.length>8192) { process.exit(1); return; }
  while(input.length>=4) {
    const length=input.readUInt32LE(0); if(!length||length>4096) { process.exit(1); return; }
    if(input.length<length+4) return;
    const body=input.subarray(4,length+4); input=input.subarray(length+4);
    try {
      const v=JSON.parse(body.toString("utf8")),current=state();
      if(v.type==="receipt" && current.ready && v.key===current.reminderKey && Number.isInteger(v.pausedCount)&&v.pausedCount>=0&&v.pausedCount<=100) { pauseKey=v.key; pausedCount=v.pausedCount; }
      else if(v.type!=="status") throw Error("message");
      receipt(true); send(current);
    } catch (_) { send({v:1,ready:false,expiresAt:0}); }
  }
});
process.stdin.on("end",()=>{ try { receipt(false); } catch (_) {} process.exit(0); });
process.on("uncaughtException",()=>process.exit(1));
