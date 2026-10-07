const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const packagesDirectory = `${path.resolve(__dirname, "../../packages")}${path.sep}`;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (context.originModulePath.startsWith(packagesDirectory) && moduleName.endsWith(".js")) {
    return context.resolveRequest(context, moduleName.slice(0, -3), platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
