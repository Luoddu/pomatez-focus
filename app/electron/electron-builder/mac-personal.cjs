// Independent Mac snapshot; never change the Windows preview counter/feed.
module.exports = {
  extends: null,
  appId: "io.github.luoddu.pomatezfocus",
  productName: "Pomatez Focus",
  copyright: "Pomatez contributors and Luoddu, MIT",
  files: ["build"],
  directories: { output: "dist-mac-personal" },
  extraMetadata: { version: "0.1.0-mac.1" },
  buildVersion: "1",
  publish: null,
  mac: {
    target: [{ target: "dmg", arch: ["arm64"] }, { target: "zip", arch: ["arm64"] }],
    artifactName: "Tomato-Farm-${version}-mac-${arch}.${ext}",
    category: "public.app-category.productivity",
    icon: "build/assets/logo-dark@2x.png",
    minimumSystemVersion: "12.0.0",
    hardenedRuntime: false,
    notarize: false,
    sign: "electron-builder/sign-personal.cjs",
  },
};
