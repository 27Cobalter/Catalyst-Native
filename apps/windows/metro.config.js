const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const fs = require("fs");
const path = require("node:path");

const rnwPath = fs.realpathSync(path.resolve(require.resolve("react-native-windows/package.json"), ".."));

//

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */

const config = {
  //
  watchFolders: [path.resolve(__dirname, "../..")],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, "node_modules"), path.resolve(__dirname, "../../node_modules")],
    disableHierarchicalLookup: true,
    blockList: [
      // This stops "npx @react-native-community/cli run-windows" from causing the metro server to crash if its already running
      new RegExp(`${path.resolve(__dirname, "windows").replace(/[/\\]/g, "/")}.*`),
      // This prevents "npx @react-native-community/cli run-windows" from hitting: EBUSY: resource busy or locked, open msbuild.ProjectImports.zip or other files produced by msbuild
      new RegExp(`${rnwPath}/build/.*`),
      new RegExp(`${rnwPath}/target/.*`),
      /.*\.ProjectImports\.zip/,
    ],
    //
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

const uniwindConfig = withUniwindConfig(mergeConfig(getDefaultConfig(__dirname), config), {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});

// Mirror the "@/*" -> "./src/*" path mapping from tsconfig.json, which Metro does not read.
// This wraps uniwind's resolver from the outside so that the resolver chain it builds is left untouched.
const baseResolveRequest = uniwindConfig.resolver.resolveRequest;

uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    return baseResolveRequest(context, path.resolve(__dirname, "src", moduleName.slice(2)), platform);
  }
  return baseResolveRequest(context, moduleName, platform);
};

module.exports = uniwindConfig;
