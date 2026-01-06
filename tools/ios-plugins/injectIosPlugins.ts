/**
 * CLI runner for NovaBridge iOS plugin injection
 *
 * Usage:
 *  node injectIosPlugins.js \
 *    --infoPlist path/to/Info.plist \
 *    --entitlements path/to/App.entitlements \
 *    --plugins '{"camera":true,"gps":true,"push":true,"secure_storage":false,"biometric":true}'
 */

import { readPlistFile, writePlistFile } from "./plistIO.js";
import { applyIOSPluginPatches } from "./iosPlugins.js";

function arg(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

const infoPlistPath = arg("infoPlist");
const entitlementsPath = arg("entitlements");
const pluginsJson = arg("plugins");

if (!infoPlistPath || !entitlementsPath || !pluginsJson) {
  console.error("❌ Missing args. Required: --infoPlist --entitlements --plugins");
  process.exit(1);
}

let plugins: any;
try {
  plugins = JSON.parse(pluginsJson);
} catch {
  console.error("❌ Invalid JSON passed to --plugins");
  process.exit(1);
}

const infoObj = readPlistFile(infoPlistPath);
const entObj = readPlistFile(entitlementsPath);

const res = applyIOSPluginPatches(infoObj, entObj, plugins);

if (res.infoPlistChanged) {
  writePlistFile(infoPlistPath, res.nextInfoPlist);
}

if (res.entitlementsChanged) {
  writePlistFile(entitlementsPath, res.nextEntitlements);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      infoPlistChanged: res.infoPlistChanged,
      entitlementsChanged: res.entitlementsChanged,
      addedInfoPlistKeys: res.addedInfoPlistKeys,
      addedEntitlementKeys: res.addedEntitlementKeys
    },
    null,
    2
  )
);
