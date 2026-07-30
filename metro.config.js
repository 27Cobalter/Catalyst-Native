const fs = require("fs");
const path = require("path");
const { withUniwindConfig } = require("uniwind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts.push("txt");

const defaultResolveRequest = config.resolver.resolveRequest;
const catalystSdkEntryPoint = path.join(
  fs.realpathSync(path.join(__dirname, "node_modules/@natsuneko-laboratory/catalyst-sdk")),
  "dist/index.js",
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@natsuneko-laboratory/catalyst-sdk") {
    return { type: "sourceFile", filePath: catalystSdkEntryPoint };
  }

  return defaultResolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "uniwind-types.d.ts",
});
