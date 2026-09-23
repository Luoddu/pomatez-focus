const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const esbuild = require("esbuild");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.resolve(__dirname, "..");
const output = esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ["app/renderer/src/focus/components/FarmField.tsx"],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  external: ["react"],
}).outputFiles[0].text;
const compiled = new module.constructor(
  path.join(__dirname, "farm-field.bundle.cjs"),
  module
);
compiled.filename = path.join(__dirname, "farm-field.bundle.cjs");
compiled.paths = module.paths;
compiled._compile(output, compiled.filename);
const FarmField = compiled.exports.default;
const now = Date.UTC(2026, 8, 23, 12);
const render = (props) =>
  renderToStaticMarkup(
    React.createElement(FarmField, {
      total: 0,
      week: 39,
      tones: ["#e57368", "#f2cd73"],
      pileTones: [],
      now,
      ...props,
    })
  );

test("fruit at the setting stage already shows its saved project colors", () => {
  const html = render();
  assert.match(html, /本周收获 39 个/);
  assert.match(html, /fill="url\(#farm-tomato-research\)"/);
  assert.match(html, /fill="url\(#farm-tomato-delivery\)"/);
  assert.doesNotMatch(html, /farm-tomato-unripe/);
});

test("basket keeps the cumulative count without the technical color caption", () => {
  const html = render({ total: 139 });
  assert.match(html, /累计收获 139/);
  assert.doesNotMatch(html, /颗配色|farm-pile-detail/);
});
