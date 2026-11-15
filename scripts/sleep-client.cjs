// Run the same installed/source stdio entry without maintaining a second protocol.
require('node:child_process').spawn(process.execPath, [require('node:path').resolve(__dirname, '../app/electron/src/assets/sleep-client.cjs')], { stdio: 'inherit', windowsHide: true }).on('exit', code => { process.exitCode = code === null ? 1 : code; }).on('error', () => { process.exitCode = 1; });
