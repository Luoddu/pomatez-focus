const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  profile = path.join(root, "artifacts/test-profiles", randomUUID());
for (const phase of ["plan", "resume"]) {
  const env = {
    ...process.env,
    POMATEZ_HEADLESS: "1",
    POMATEZ_PROFILE: profile,
    JOURNEY_PHASE: phase,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const r = spawnSync(
    require("electron"),
    [path.join(root, "tests/journey-desktop.cjs")],
    {
      cwd: root,
      env,
      windowsHide: true,
      stdio: "inherit",
      timeout: 60000,
    }
  );
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}
