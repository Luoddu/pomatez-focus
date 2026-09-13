// Uses the upstream pinned Rollup, TypeScript, CRA and esbuild toolchain.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function run(script, args, cwd = root, env = {}) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, script), ...args],
    {
      cwd,
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        INLINE_RUNTIME_CHUNK: "false",
        GENERATE_SOURCEMAP: "false",
        ...env,
      },
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(
  "node_modules/rollup/dist/bin/rollup",
  ["-c"],
  path.join(root, "app/shareables")
);
run("node_modules/typescript/bin/tsc", [
  "--project",
  "app/electron/tsconfig.json",
]);
const updaterBundle = require("esbuild").buildSync({
  absWorkingDir: root,
  entryPoints: ["app/electron/src/focus/updater.ts"],
  bundle: true, platform: "node", external: ["electron"],
  outfile: "app/electron/build/focus/updater.js", metafile: true,
  legalComments: "eof",
});
// Include the license texts of every npm package actually bundled into the updater.
const bundledPackages = new Set();
for (const input of Object.keys(updaterBundle.metafile.inputs)) {
  if (!input.includes("node_modules/")) continue;
  let dir = path.dirname(path.resolve(root, input));
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw Error("Missing bundled package metadata");
    dir = parent;
  }
  bundledPackages.add(dir);
}
const licenses = [...bundledPackages].sort().map((dir) => {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  const names = fs.readdirSync(dir).filter((n) => /^(licen[sc]e|copying)(\.|$)/i.test(n));
  // lazy-val 1.0.5 declares MIT and its author in package.json but omits LICENSE.
  if (!names.length && pkg.name === "lazy-val" && pkg.version === "1.0.5" && pkg.license === "MIT") {
    const mit = fs.readFileSync(path.join(root, "node_modules/electron-updater/LICENSE"), "utf8");
    return `${pkg.name} ${pkg.version}\nAuthor: ${pkg.author}\nMIT (declared in the published package.json)\n\n${mit.slice(mit.indexOf("Permission is hereby granted"))}`;
  }
  if (!names.length) throw Error(`Missing license for ${pkg.name}`);
  return `${pkg.name} ${pkg.version}\n${names.map((n) => fs.readFileSync(path.join(dir, n), "utf8")).join("\n")}`;
});
fs.writeFileSync(path.join(root, "app/electron/build/LICENSE.updater-dependencies.txt"), licenses.join("\n\n----------------\n\n"));
run("node_modules/esbuild/bin/esbuild", [
  "app/electron/src/preload.ts",
  "--bundle",
  "--platform=node",
  "--external:electron",
  "--outfile=app/electron/build/preload.js",
]);
run(
  "node_modules/react-scripts/scripts/build.js",
  [],
  path.join(root, "app/renderer")
);
fs.cpSync(
  path.join(root, "app/renderer/build"),
  path.join(root, "app/electron/build"),
  { recursive: true }
);
fs.cpSync(
  path.join(root, "app/electron/src/assets"),
  path.join(root, "app/electron/build/assets"),
  { recursive: true }
);
console.log("Pomatez Focus desktop build complete.");
fs.copyFileSync(
  path.join(root, "LICENSE"),
  path.join(root, "app/electron/build/LICENSE.pomatez.txt")
);
