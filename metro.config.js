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

// memora が依存する exifr の既定エントリ (dist/full.umd.js) には、Node 用の
// `import(/* webpackIgnore */ e)` が残っている。この分岐は RN では実行されないが、
// Hermes はパース時点で `Invalid expression encountered` を投げるため、モジュールごと死ぬ。
// 機能セットが同じで動的 import を含まない legacy ビルドへ寄せる。
const exifrEntryPoint = path.join(
  path.dirname(
    require.resolve("exifr/package.json", {
      paths: [fs.realpathSync(path.join(__dirname, "node_modules/@natsuneko-laboratory/memora"))],
    }),
  ),
  "dist/full.legacy.umd.js",
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@natsuneko-laboratory/catalyst-sdk") {
    return { type: "sourceFile", filePath: catalystSdkEntryPoint };
  }

  if (moduleName === "exifr") {
    return { type: "sourceFile", filePath: exifrEntryPoint };
  }

  return defaultResolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "uniwind-types.d.ts",
});
