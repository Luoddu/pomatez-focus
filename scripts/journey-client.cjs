// Source checkout entry; the installed App also ships this stdio client.
const {call}=require('../app/electron/src/assets/journey-client.cjs');
let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',s=>{input+=s;if(Buffer.byteLength(input)>30000)process.exit(1)});
process.stdin.on('end',async()=>{try{const reply=await call(JSON.parse(input));process.stdout.write(JSON.stringify(reply)+'\n');process.exitCode=reply.error?1:0;}catch(e){process.stdout.write(JSON.stringify({error:{code:'TRANSPORT',message:e.message}})+'\n');process.exitCode=1;}});
