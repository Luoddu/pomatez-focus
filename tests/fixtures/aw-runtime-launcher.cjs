// Synthetic manager owns its server child; only fixture-owned lifecycle.
const { spawn } = require("node:child_process"),
  path = require("node:path");
const child = spawn(
  process.execPath,
  [
    path.join(__dirname, "aw-runtime-server.cjs"),
    ...process.argv.slice(2),
  ],
  { stdio: "ignore", windowsHide: true }
);
child.on("error", () => process.exit(1));
child.on("exit", (code) => process.exit(code ?? 1));
setTimeout(() => {
  child.kill();
  process.exit(2);
}, 20000).unref();
