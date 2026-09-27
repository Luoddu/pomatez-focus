// Official builder custom-sign extension + pinned @electron/osx-sign 1.3.1.
// Ad-hoc integrity signature only: no Developer ID and no notarization claim.
const { signAsync } = require("@electron/osx-sign");
exports.sign = async (options) => signAsync({
  ...options,
  identity: "-",
  identityValidation: false,
  preAutoEntitlements: false,
  preEmbedProvisioningProfile: false,
  optionsForFile: () => ({ hardenedRuntime: false, timestamp: "none" }),
});
