// Regenerates the LT+tomato display icons from the design SVG, offline.
// Renders the mark at each size in a hidden transparent window and wraps
// the PNGs into a minimal ICO (PNG entries, Vista+). No new dependencies.
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const logos = path.join(root, "app", "renderer", "src", "assets", "logos");
const electronAssets = path.join(root, "app", "electron", "src", "assets");

app.commandLine.appendSwitch("force-device-scale-factor", "1");

const svg = (withText) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<circle cx="32" cy="36" r="26" fill="#e64545"/>
<path d="M32 12c-3.2-4.3-8-5.9-12.3-4.8 1.6 3.7 4.8 6.4 9.1 7.5-2.1-2.7-3.2-5.9 3.2-2.7z" fill="#3faf62"/>
<path d="M32 14.7c.8-4.8 4-8 8.5-9.1.5 4.3-1.6 8-5.3 10.1" fill="#3faf62"/>
${
  withText
    ? '<text x="32" y="45" font-size="21" text-anchor="middle" fill="#ffffff" font-family="Segoe UI,Microsoft YaHei,sans-serif" font-weight="700">LT</text>'
    : ""
}
</svg>`;

const page = (size) =>
  "data:text/html;charset=utf-8," +
  encodeURIComponent(
    `<!DOCTYPE html><html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${svg(
      size >= 48
    )}</body></html>`
  );

const ico = (entries) => {
  // entries: [{ size, png }] sorted small to large
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((entry, i) => {
    const at = 16 * i;
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, at);
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, at + 1);
    dir.writeUInt8(0, at + 2);
    dir.writeUInt8(0, at + 3);
    dir.writeUInt16LE(1, at + 4);
    dir.writeUInt16LE(32, at + 6);
    dir.writeUInt32LE(entry.png.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
};

const deadline = setTimeout(() => {
  console.error("gen-logo timed out");
  app.exit(2);
}, 60000);

app
  .whenReady()
  .then(async () => {
    const win = new BrowserWindow({
      show: false,
      width: 512,
      height: 512,
      useContentSize: true,
      transparent: true,
      backgroundColor: "#00000000",
      webPreferences: { offscreen: true, sandbox: true },
    });
    const render = async (size) => {
      win.setContentSize(size, size);
      await win.loadURL(page(size));
      await wait(120);
      return (await win.capturePage()).toPNG();
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const png256 = await render(256);
    const png512 = await render(512);
    const png48 = await render(48);
    const png32 = await render(32);
    const png16 = await render(16);
    win.destroy();
    const files = {
      "logo-dark.png": png256,
      "logo-dark@2x.png": png512,
      "tray-dark.png": png16,
      "logo-dark.ico": ico([
        { size: 16, png: png16 },
        { size: 32, png: png32 },
        { size: 48, png: png48 },
        { size: 256, png: png256 },
      ]),
    };
    for (const [name, data] of Object.entries(files)) {
      fs.writeFileSync(path.join(logos, name), data);
      fs.writeFileSync(path.join(electronAssets, name), data);
    }
    console.log(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(files).map(([name, data]) => [name, data.length])
        ),
        null,
        2
      )
    );
    clearTimeout(deadline);
    app.quit();
  })
  .catch((e) => {
    console.error(e.stack || e);
    clearTimeout(deadline);
    app.exit(1);
  });
