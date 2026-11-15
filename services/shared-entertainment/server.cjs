/* Single-user authority. Node 24.22.1; no framework or cloud-specific dependency. */
'use strict';
const {DatabaseSync}=require('node:sqlite');
const http=require('node:http');
const crypto=require('node:crypto');
const DAY=86400000, OFFSET=8*3600000;
const dateOf=n=>new Date(n+OFFSET).toISOString().slice(0,10);
const endOf=n=>Math.floor((n+OFFSET)/DAY)*DAY+DAY-OFFSET;
const identifier=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(x);
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function union(items){
  const result=[];
  for(const site of ['bilibili','xiaohongshu'])for(const item of items.filter(x=>x.site===site).sort((a,b)=>a.start-b.start||a.end-b.end)){
    const last=result[result.length-1];
    if(last&&last.site===site&&item.start<=last.end)last.end=Math.max(last.end,item.end);
    else result.push({...item});
  }
  return result;
}
class Authority{
  constructor(file,{now=Date.now,weekdaySeconds=900,weekendSeconds=3600,releaseSeconds=900,cooldownSeconds=120}={}){
    for(const n of [weekdaySeconds,weekendSeconds,releaseSeconds,cooldownSeconds])if(!Number.isSafeInteger(n)||n<1||n>28800)fail('invalid server policy');
    this.now=now;this.policy={weekdaySeconds,weekendSeconds,releaseSeconds,cooldownSeconds};
    this.db=new DatabaseSync(file,{timeout:5000});
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS policy(id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS clock(id INTEGER PRIMARY KEY CHECK(id=1), time INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS days(day TEXT PRIMARY KEY, quota INTEGER NOT NULL, spent INTEGER NOT NULL DEFAULT 0, permit INTEGER NOT NULL DEFAULT 0, release INTEGER NOT NULL DEFAULT 0, cooldown INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS usage(device TEXT NOT NULL, day TEXT NOT NULL, intervals TEXT NOT NULL, received INTEGER NOT NULL, PRIMARY KEY(device,day));`);
    const policy=JSON.stringify(this.policy),old=this.db.prepare('SELECT json FROM policy WHERE id=1').get();
    if(old&&old.json!==policy){this.db.close();fail('policy mismatch: explicit migration required',409);}
    this.db.prepare('INSERT OR IGNORE INTO policy VALUES(1,?)').run(policy);
  }
  close(){this.db.close();}
  transact(fn){
    this.db.exec('BEGIN IMMEDIATE');
    try{
      let now=this.now();if(!Number.isSafeInteger(now)||now<0)fail('invalid authority clock',503);
      const old=this.db.prepare('SELECT time FROM clock WHERE id=1').get();
      if(old&&now<old.time-1000)fail('authority clock moved backwards',503);
      now=Math.max(now,old?.time||0);
      this.db.prepare('INSERT INTO clock VALUES(1,?) ON CONFLICT(id) DO UPDATE SET time=excluded.time').run(now);
      const day=dateOf(now),weekday=new Date(now+OFFSET).getUTCDay();
      const cooldown=this.db.prepare('SELECT MAX(cooldown) AS deadline FROM days').get().deadline||0;
      this.db.prepare('INSERT OR IGNORE INTO days(day,quota,cooldown) VALUES(?,?,?)').run(day,1000*(weekday>=1&&weekday<=5?this.policy.weekdaySeconds:this.policy.weekendSeconds),cooldown);
      const value=fn(now,day);this.db.exec('COMMIT');return value;
    }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  snapshot(now,day){const d=this.db.prepare('SELECT * FROM days WHERE day=?').get(day);return {v:1,serverNow:now,timeZone:'Asia/Shanghai',day,dayEndsAt:endOf(now),quotaMs:d.quota,reservedMs:d.spent,remainingMs:d.quota-d.spent,permitUntil:d.permit,releaseUntil:d.release,cooldownUntil:d.cooldown};}
  call(action,device,body={}){
    if(!identifier(device)||!body||typeof body!=='object'||Array.isArray(body))fail('invalid request');
    return this.transact((now,day)=>{
      if(action==='state')return this.snapshot(now,day);
      if(action==='statistics'){
        const days=body.days??30;if(![1,7,30].includes(days))fail('invalid range');
        const start=endOf(now)-days*DAY;
        const rows=this.db.prepare('SELECT device,intervals,received FROM usage WHERE day>=? AND day<=?').all(dateOf(start),day);
        return {v:1,start,end:now,timeZone:'Asia/Shanghai',sessions:rows.flatMap(r=>JSON.parse(r.intervals)),devices:[...new Set(rows.map(r=>r.device))].map(id=>({id,lastReceived:Math.max(...rows.filter(r=>r.device===id).map(r=>r.received))})),coverage:'reported-only'};
      }
      if(action==='usage'){
        if(body.day!==day||!Array.isArray(body.intervals)||body.intervals.length>3000)fail('invalid usage day or size');
        const start=endOf(now)-DAY;
        const intervals=body.intervals.map(x=>{
          if(!x||!['bilibili','xiaohongshu'].includes(x.site)||!Number.isSafeInteger(x.start)||!Number.isSafeInteger(x.end)||x.start<start||x.end>x.start+DAY||x.end<=x.start||x.end>now)fail('invalid usage interval');
          return {start:x.start,end:x.end,site:x.site};
        });
        const prior=this.db.prepare('SELECT intervals FROM usage WHERE device=? AND day=?').get(device,day);
        const merged=union([...(prior?JSON.parse(prior.intervals):[]),...intervals]);
        if(merged.length>5000)fail('usage fragmentation limit');
        this.db.prepare('INSERT INTO usage VALUES(?,?,?,?) ON CONFLICT(device,day) DO UPDATE SET intervals=excluded.intervals,received=excluded.received').run(device,day,JSON.stringify(merged),now);
        return this.snapshot(now,day);
      }
      if(!['grant','release','cooldown','resume'].includes(action)||body.day!==day||!identifier(body.id))fail('invalid action, day or request id');
      const id=device+':'+body.id,fingerprint=JSON.stringify([action,day,body.key||'']);
      const previous=this.db.prepare('SELECT * FROM requests WHERE id=?').get(id);
      if(previous){if(previous.fingerprint!==fingerprint)fail('idempotency conflict',409);return {...this.snapshot(now,day),operation:JSON.parse(previous.result)};}
      const d=this.db.prepare('SELECT * FROM days WHERE day=?').get(day);
      let deadline=0;
      if(action==='release'){
        deadline=d.release>now?d.release:Math.min(endOf(now),now+1000*this.policy.releaseSeconds);
        this.db.prepare('UPDATE days SET release=? WHERE day=?').run(deadline,day);
      }
      if(action==='resume')this.db.prepare('UPDATE days SET release=0,permit=0 WHERE day=?').run(day);
      if(action==='cooldown'){
        if(!identifier(body.key))fail('invalid reminder key');
        // Global reminder identity survives device changes and replay, even after expiry.
        const key='cooldown:'+day+':'+body.key;
        const seen=this.db.prepare('SELECT result FROM requests WHERE id=?').get(key);
        deadline=seen?JSON.parse(seen.result).deadline:(d.cooldown>now?d.cooldown:now+1000*this.policy.cooldownSeconds);
        if(!seen){this.db.prepare('UPDATE days SET cooldown=?,permit=0 WHERE day=?').run(deadline,day);this.db.prepare('INSERT INTO requests VALUES(?,?,?)').run(key,key,JSON.stringify({deadline}));}
      }
      if(action==='grant'){
        if(d.cooldown<=now&&d.release>now){
          deadline=Math.min(d.permit,d.release);
          if(deadline<=now){const size=Math.max(0,Math.min(20000,d.quota-d.spent,d.release-now,endOf(now)-now));deadline=size>0?now+size:0;
            if(size>0)this.db.prepare('UPDATE days SET spent=spent+?,permit=? WHERE day=?').run(size,deadline,day);
          }
        }
      }
      const operation={action,deadline};
      this.db.prepare('INSERT INTO requests VALUES(?,?,?)').run(id,fingerprint,JSON.stringify(operation));
      return {...this.snapshot(now,day),operation};
    });
  }
}
function createServer(authority,tokens,{tls}={}){
  // Map random bearer token -> registered device; tokens never enter the database/logs.
  const entries=Object.entries(tokens).map(([token,device])=>{
    if(typeof token!=='string'||token.length<32||!identifier(device))fail('invalid authentication configuration');
    return [crypto.createHash('sha256').update(token).digest(),device];
  });
  if(!entries.length)fail('authentication required');
  const transport=tls?require('node:https'):http;
  const server=transport.createServer({...tls,requestTimeout:5000,headersTimeout:5000,maxHeaderSize:8192},(req,res)=>{
    const reply=(status,value)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
    const supplied=crypto.createHash('sha256').update(String(req.headers.authorization||'').replace(/^Bearer /,'')).digest();
    const device=entries.find(([digest])=>crypto.timingSafeEqual(digest,supplied))?.[1];
    if(!device)return reply(401,{error:'unauthorized'});
    if(req.method!=='POST'||!/^\/v1\/(state|grant|release|resume|cooldown|usage|statistics)$/.test(req.url||''))return reply(404,{error:'not found'});
    if(req.headers.origin||req.headers['content-type']!=='application/json')return reply(400,{error:'invalid headers'});
    let chunks=[],length=0;const timeout=setTimeout(()=>req.destroy(),5000);req.on('close',()=>clearTimeout(timeout));
    req.on('data',chunk=>{length+=chunk.length;if(length>512000){reply(413,{error:'request too large'});req.destroy();}else chunks.push(chunk);});
    req.on('end',()=>{clearTimeout(timeout);try{reply(200,authority.call(req.url.slice(4),device,JSON.parse(Buffer.concat(chunks).toString('utf8'))));}catch(e){reply(e.status||503,{error:e.status?e.message:'authority unavailable'});}});
    req.on('error',()=>{});
  });
  server.maxConnections=16;return server;
}
module.exports={Authority,createServer,dateOf};
// No default production launcher: deployment must supply device tokens, durable
// storage, TLS/private ingress and an explicit lifecycle after deployment review.

if(require.main===module){
  try{
    if(process.versions.node!=='24.22.1')fail('Use validated Node 24.22.1');
    const fs=require('node:fs'),path=require('node:path');
    const file=process.env.POMATEZ_SHARED_DATABASE;
    if(!file||!path.isAbsolute(file)||!fs.statSync(path.dirname(file)).isDirectory())fail('Explicit existing local data directory required');
    const host=process.env.POMATEZ_SHARED_BIND||'127.0.0.1';
    const port=Number(process.env.POMATEZ_SHARED_PORT||8787);
    if(!Number.isInteger(port)||port<1024||port>65535)fail('Invalid port');
    const cert=process.env.POMATEZ_SHARED_TLS_CERT,key=process.env.POMATEZ_SHARED_TLS_KEY;
    if(host!=='127.0.0.1'&&(!cert||!key))fail('Non-loopback requires TLS');
    const tls=cert&&key?{cert:fs.readFileSync(cert),key:fs.readFileSync(key)}:undefined;
    const tokens=JSON.parse(process.env.POMATEZ_SHARED_DEVICE_TOKENS||'{}');
    delete process.env.POMATEZ_SHARED_DEVICE_TOKENS;
    const authority=new Authority(file),server=createServer(authority,tokens,{tls});
    server.on('error',()=>{console.error('Shared service failed to listen');authority.close();process.exitCode=1;});
    server.listen(port,host,()=>console.log('Shared entertainment authority ready'));
    const close=()=>{server.closeAllConnections();server.close(()=>{authority.close();process.exit(0);});};
    process.on('SIGINT',close);process.on('SIGTERM',close);
  }catch(_){console.error('Shared service configuration invalid; no credential details logged');process.exitCode=1;}
}
