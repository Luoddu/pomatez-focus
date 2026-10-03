const { spawnSync } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const result = spawnSync(
  require("electron"),
  ["--mute-audio", path.join(root, "tests/companion-desktop.cjs")],
  {
    cwd: root,
    env,
    windowsHide: true,
    stdio: "inherit",
    timeout: 110000,
  }
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
