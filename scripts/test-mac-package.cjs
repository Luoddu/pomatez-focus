const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, ".."), out = path.join(root, "app/electron/dist-mac-personal");
const app = path.join(out, "mac-arm64/Pomatez Focus.app");
const executable = path.join(app, "Contents/MacOS/Pomatez Focus");
function run(cmd, args, extra = {}) {
  const r = spawnSync(cmd, args, {encoding: "utf8", timeout: 60000, ...extra});
  if (r.error || r.status !== 0) throw r.error || Error(`${cmd}: ${r.stderr}\n${r.stdout}`);
  return `${r.stdout || ""}${r.stderr || ""}`.trim();
}
if (process.platform !== "darwin" || process.arch !== "arm64") throw Error("Native arm64 only");
const arch = run("lipo", ["-archs", executable]);
if (arch !== "arm64") throw Error(`Wrong binary architecture ${arch}`);
const signature = run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app]);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "tomato-mac-smoke-"));
const env = {...process.env, POMATEZ_HEADLESS: "1", POMATEZ_SMOKE_TEST: "1", POMATEZ_PROFILE: profile};
delete env.ELECTRON_RUN_AS_NODE;
const smoke = run(executable, ["--mute-audio"], {env});
if (!smoke.includes("Pomatez Focus ready (hidden)")) throw Error(`Missing renderer smoke confirmation: ${smoke}`);
const asar = require("@electron/asar");
const archive = path.join(app, "Contents/Resources/app.asar");
const provenance = JSON.parse(asar.extractFile(archive, "build/mac-release.json"));
const pkg = JSON.parse(asar.extractFile(archive, "package.json"));
if (pkg.version !== provenance.version) throw Error("Packaged version mismatch");
const entries = asar.listPackage(archive);
if (entries.some(p => /(?:\.enc$|focus-records-|feishu-credentials|test-profiles|\/\.env)/.test(p))) throw Error("Unexpected runtime data in archive");
const assets = fs.readdirSync(out).filter(n => /\.(dmg|zip)$/.test(n));
if (assets.length !== 2 || assets.some(n => !n.includes(provenance.version) || !n.includes("arm64"))) throw Error("Expected DMG + ZIP");
const checksums = assets.map(n => `${createHash("sha256").update(fs.readFileSync(path.join(out, n))).digest("hex")}  ${n}`).join("\n") + "\n";
fs.writeFileSync(path.join(out, "SHA256SUMS.txt"), checksums);
fs.writeFileSync(path.join(out, "mac-build-verification.json"), JSON.stringify({
  ...provenance, arch, signature, smoke: "real packaged renderer ready; hidden and muted",
  runner: process.env.ImageVersion, node: process.version,
  friendDeviceTested: false, notarized: false,
}, null, 2));
console.log(checksums, "Mac package integrity and renderer smoke passed.");
