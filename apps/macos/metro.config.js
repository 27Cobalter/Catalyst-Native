const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "../..");

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, "node_modules"), path.resolve(workspaceRoot, "node_modules")],
    disableHierarchicalLookup: true,
  },
};

module.exports = withUniwindConfig(mergeConfig(getDefaultConfig(__dirname), config), {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});
