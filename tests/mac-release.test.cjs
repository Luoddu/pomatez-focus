const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const {EventEmitter} = require("node:events");
const root = path.resolve(__dirname, "..");
function controller() {
  let constructed = 0;
  class NsisUpdater extends EventEmitter { constructor() { super(); constructed++; } }
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, "app/electron/build/focus/updater.js"), "utf8"), {
    exports, process, require: name => name === "electron-updater" ? {NsisUpdater} : {app: {getVersion: () => "0.1.0-mac.1"}, shell: {}},
  });
  return {FocusUpdater: exports.FocusUpdater, count: () => constructed};
}
test("Mac never constructs NSIS, downloads or installs; manual link works and reports failure", async () => {
  const {FocusUpdater, count} = controller(); let opened = 0, installed = 0;
  const u = new FocusUpdater(()=>{}, async()=>{installed++}, undefined, "0.1.0-mac.1", "darwin", async()=>{opened++});
  assert.equal(u.status().manual, true); assert.equal(count(), 0);
  await u.check(); assert.equal(opened, 1); assert.equal(u.status().phase, "idle");
  await u.download(); u.install(); assert.equal(installed, 0);
  const bad = new FocusUpdater(()=>{}, async()=>{}, undefined, "0.1.0-mac.1", "darwin", async()=>{throw Error("browser")});
  await bad.check(); assert.equal(bad.status().phase, "error");
});
test("Windows retains NSIS and preview settings", () => {
  const {FocusUpdater, count} = controller();
  const u = new FocusUpdater(()=>{}, async()=>{}, undefined, "0.1.0-preview.62", "win32");
  assert.equal(count(), 1); assert.equal(u.status().manual, undefined);
});
test("actual electron-updater 6.8.3 ignores newer Mac release in Windows feed", async () => {
  const {GitHubProvider} = require("electron-updater/out/providers/GitHubProvider");
  const semver = require("semver"); const requested = [];
  const provider = new GitHubProvider({owner:"Luoddu",repo:"pomatez-focus",channel:"preview"}, {
    allowPrerelease:true,channel:"preview",currentVersion:new semver.SemVer("0.1.0-preview.61"),fullChangelog:false,
  }, {platform:"win32",executor:{request:async o => {
    requested.push(o.path);
    if (o.path.endsWith(".atom")) return '<feed>' + ["0.1.0-mac.1","0.1.0-preview.62"].map(v=>`<entry><title>${v}</title><link href="https://github.com/Luoddu/pomatez-focus/releases/tag/v${v}"/><content>snapshot</content></entry>`).join("") + '</feed>';
    assert.equal(o.path,"/Luoddu/pomatez-focus/releases/download/v0.1.0-preview.62/preview.yml");
    return JSON.stringify({version:"0.1.0-preview.62",files:[{url:"windows.exe",sha512:"test"}]});
  }}});
  const result = await provider.getLatestVersion();
  assert.equal(result.tag,"v0.1.0-preview.62"); assert.equal(requested.length,2);
});
test("Mac packaging is isolated from Windows version and feed", () => {
  const c = require("../app/electron/electron-builder/mac-personal.cjs");
  const w = require("../app/electron/package.json");
  assert.match(c.extraMetadata.version,/^0\.1\.0-mac\.\d+$/);
  assert.match(w.version,/^0\.1\.0-preview\.\d+$/);
  assert.equal(c.publish,null); assert.equal(w.build.publish.channel,"preview");
  assert.deepEqual(c.mac.target.map(t=>t.arch),[["arm64"],["arm64"]]);
});
