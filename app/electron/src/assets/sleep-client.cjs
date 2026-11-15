const { call: transport } = require('./journey-client.cjs');
const call = (request, profile) => transport({ ...request, scope: 'sleep' }, profile);
module.exports = { call };
if (require.main === module) {
  let input = ''; process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; if (Buffer.byteLength(input) > 30000) process.exit(1); });
  process.stdin.on('end', async () => {
    try { const reply = await call(JSON.parse(input)); process.stdout.write(JSON.stringify(reply) + '\n'); process.exitCode = reply.error ? 1 : 0; }
    catch (_) { process.stdout.write(JSON.stringify({ error: { code: 'TRANSPORT', message: '农场不可用；确认同用户新版农场运行中，未知提交结果请用原requestId重试' } }) + '\n'); process.exitCode = 1; }
  });
}
