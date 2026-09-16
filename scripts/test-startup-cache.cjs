const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const env = {
  ...process.env,
  POMATEZ_PROFILE: path.join(
    __dirname,
    "../artifacts/test-profiles",
    randomUUID()
  ),
};
delete env.ELECTRON_RUN_AS_NODE;
for (const phase of ["seed", "restart"]) {
  const result = spawnSync(
    require("electron"),
    [path.join(__dirname, "../tests/startup-cache-desktop.cjs"), phase],
    {
      env,
      windowsHide: true,
      stdio: "inherit",
      timeout: 45000,
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
