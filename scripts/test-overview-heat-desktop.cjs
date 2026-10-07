const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const env = {
  ...process.env,
  POMATEZ_HEADLESS: "1",
  POMATEZ_PROFILE: path.join(
    root,
    "artifacts/test-profiles",
    randomUUID()
  ),
};
delete env.ELECTRON_RUN_AS_NODE;
const result = spawnSync(
  require("electron"),
  [path.join(root, "tests/overview-heat-desktop.cjs")],
  {
    cwd: root,
    env,
    windowsHide: true,
    stdio: "inherit",
    timeout: 60000,
  }
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
