const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {JourneyGateway}=require('../app/electron/build/focus/journeyGateway');
test('bounded fixed user-file gateway and matched response; malformed paths/instance rejected, valid still passes',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'journey-gw-'));let sent=[],gw=new JourneyGateway(dir,v=>{sent.push(v);gw.complete({ticket:v.ticket,response:{protocol:1,day:v.request.day}})});gw.start(process.execPath);
 const id=randomUUID(),input=path.join(gw.directory,'requests',id+'.json'),output=path.join(gw.directory,'responses',id+'.json');
 fs.writeFileSync(input,JSON.stringify({instance:'foreign',request:{requestId:id}}));await gw.dispatch(id);assert.equal(JSON.parse(fs.readFileSync(output)).error.code,'INVALID');assert.equal(sent.length,0);
 fs.writeFileSync(input,JSON.stringify({instance:gw.instance,request:{requestId:id,day:'2026-10-12'}}));await gw.dispatch(id);assert.equal(JSON.parse(fs.readFileSync(output)).day,'2026-10-12');assert.equal(sent.length,1);
 await gw.dispatch('../outside');assert.equal(sent.length,1);
 fs.writeFileSync(input,'x'.repeat(32769));await gw.dispatch(id);assert.equal(sent.length,1);assert.equal(JSON.parse(fs.readFileSync(output)).error.code,'INVALID');
 assert.equal(gw.complete({ticket:id,response:'not object'}),false);gw.close();assert.equal(fs.existsSync(path.join(gw.directory,'status.json')),false);
});
