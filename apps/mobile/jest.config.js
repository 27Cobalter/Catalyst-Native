const path = require("node:path");

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // react-native-worklets (react-native-reanimated 4 の依存) はネイティブバインディング無しでは
  // import できないため、jest では .native 拡張子の解決をスキップして JS 実装側を使わせる
  resolver: "react-native-worklets/jest/resolver.js",
  setupFiles: ["<rootDir>/jest.setup.js"],
  // node_modules 配下には ESM-only なパッケージ (unified/remark/rehype エコシステム,
  // @natsuneko-laboratory 系, uniwind など) が多く、許可リスト方式では網羅しきれない。
  // そのため既定の「node_modules は変換しない」を外し、babel プラグインとして
  // 直接 require される 2 パッケージだけを除外リストにする
  transformIgnorePatterns: [
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // nodeLinker: hoisted のモノレポでは apps/macos などが別バージョンの react / jotai を持ち込み、
    // 一部の依存の配下にネストされたコピーが解決されて "Invalid hook call" になる。
    // apps/mobile が宣言しているバージョンに固定してシングルトンを保証する
    "^react$": require.resolve("react", { paths: [__dirname] }),
    "^react/(.*)$": `${path.dirname(require.resolve("react/package.json", { paths: [__dirname] }))}/$1`,
    "^jotai$": require.resolve("jotai", { paths: [__dirname] }),
    "^jotai/(.*)$": `${path.dirname(require.resolve("jotai/package.json", { paths: [__dirname] }))}/$1`,
  },
  testMatch: ["<rootDir>/**/*.test.ts", "<rootDir>/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/", "/.expo/"],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "models/**/*.{ts,tsx}",
    "!lib/licenses.ts",
    "!lib/emojis.ts",
  ],
};
