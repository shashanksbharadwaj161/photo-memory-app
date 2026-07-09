// Metro config for Expo + Firebase JS SDK.
//
// The Firebase JS SDK (v10) ships modern "exports" maps and .cjs files that
// Metro's default resolver mishandles, producing the classic
//   "Component auth has not been registered yet"
// runtime error. Adding `cjs` to sourceExts and disabling the experimental
// package-exports resolution is the documented, stable workaround.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
