// Real installed Edge, isolated profile; no personal profile, native registration,
// external page navigation or downloaded browser. DNR's own test API evaluates rules.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(require('node:os').tmpdir(),'p089-edge-'+randomUUID()),ext=path.join(dir,'extension');
const exe=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
if(!exe)throw Error('Installed Edge required');
fs.mkdirSync(ext,{recursive:true});fs.cpSync(path.join(root,'app/electron/src/assets/browser-control'),ext,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(ext,'manifest.json')));const expectedId=require("node:crypto").createHash("sha256").update(Buffer.from(manifest.key,"base64")).digest("hex").slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));manifest.permissions.push('declarativeNetRequestFeedback');fs.writeFileSync(path.join(ext,'manifest.json'),JSON.stringify(manifest));
const http=require('node:http');let hits=0,port=0;const server=http.createServer((_req,res)=>{hits++;res.writeHead(200,{'Content-Type':'text/plain'});res.end('synthetic research work')});
const wait=ms=>new Promise(r=>setTimeout(r,ms));let child,ws,closeBrowser;const deadline=setTimeout(()=>{child?.kill();process.exitCode=2;},45000);
async function start(){
 const profile=path.join(dir,'profile'),portFile=path.join(profile,'DevToolsActivePort');if(fs.existsSync(portFile))fs.unlinkSync(portFile);
 child=spawn(exe,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--mute-audio','--no-proxy-server','--host-resolver-rules=MAP store.steampowered.com 127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,`--disable-extensions-except=${ext}`,`--load-extension=${ext}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 for(let i=0;!fs.existsSync(portFile)&&i<100;i++)await wait(100);
 assert.ok(fs.existsSync(portFile),'isolated Edge devtools endpoint');const [port,browserPath]=fs.readFileSync(portFile,'utf8').trim().split(/\r?\n/);
 ws=new WebSocket(`ws://127.0.0.1:${port}${browserPath}`);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej});let id=0;const pending=new Map();
 ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.id&&pending.has(v.id)){const p=pending.get(v.id);pending.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result)}};
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params,...(sessionId?{sessionId}:{})}));});
 let worker;for(let i=0;i<100;i++){worker=(await call('Target.getTargets')).targetInfos.find(x=>x.type==='service_worker'&&x.url===`chrome-extension://${expectedId}/background.js`);if(worker)break;await wait(100)}assert.ok(worker,'real extension service worker');
 closeBrowser=()=>call('Browser.close');const {sessionId}=await call('Target.attachToTarget',{targetId:worker.targetId,flatten:true});
 await call('Runtime.enable',{},sessionId);await wait(300);const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 return {call,evaluate};
}
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
 let b=await start();
 await b.evaluate('chrome.storage.local.set({strict:true})');
 await b.call('Browser.close');await wait(700);ws.close();b=await start();
 console.log(JSON.stringify(await b.call('Browser.getVersion')));console.log('restored',JSON.stringify(await b.evaluate('(async()=>({local:await chrome.storage.local.get("strict"),rules:await chrome.declarativeNetRequest.getDynamicRules(),permissions:chrome.runtime.getManifest().permissions}))()')));
 for(const type of ['main_frame','xmlhttprequest','other']){
  const out=await b.evaluate(`chrome.declarativeNetRequest.testMatchOutcome({url:'https://store.steampowered.com/download/setup.exe',type:${JSON.stringify(type)}})`);console.log('match',type,JSON.stringify(out));assert.ok(out.matchedRules.some(x=>x.ruleId===10001));
 }
 for(const url of ['https://example.org/research','https://notsteampowered.com','https://steampowered.com.example.org']){const out=await b.evaluate(`chrome.declarativeNetRequest.testMatchOutcome({url:${JSON.stringify(url)},type:'main_frame'})`);assert.equal(out.matchedRules.length,0);}
 const page=await b.call('Target.createTarget',{url:'about:blank'});const attached=await b.call('Target.attachToTarget',{targetId:page.targetId,flatten:true});
 const blocked=await b.call('Page.navigate',{url:`http://store.steampowered.com:${port}/setup.exe`},attached.sessionId);assert.match(blocked.errorText||'',/BLOCKED_BY_CLIENT/);assert.equal(hits,0);
 const normal=await b.call('Page.navigate',{url:`http://127.0.0.1:${port}/research.txt`},attached.sessionId);assert.equal(normal.errorText,undefined);assert.ok(hits>0);
 await b.call('Browser.close');await wait(700);ws.close();
 b=await start();const rules=await b.evaluate('chrome.declarativeNetRequest.getDynamicRules()');assert.ok(rules.some(r=>r.id===10001));
 assert.equal(await b.evaluate('(async()=>!!(await chrome.storage.local.get("strict")).strict)()'),true);
 console.log('PASS real Edge DNR: gaming document/download requests blocked, research and suffix neighbours allowed, strict rules persist restart');
 await b.call('Browser.close');
 }finally{clearTimeout(deadline);server.close();try{await closeBrowser?.()}catch(_){}ws?.close();if(child&&child.exitCode===null)child.kill();}})().catch(e=>{console.error(e.message);process.exitCode=1});
