/**
 * NovaBridge iOS Plugins — Injection Layer (Phase 2 parity)
 * --------------------------------------------------------
 * Additive + idempotent patcher for:
 *  - Info.plist usage description keys
 *  - App.entitlements keys
 *
 * Plugins:
 *  camera, gps, push, secure_storage, biometric
 */

export type PluginFlags = {
  camera?: boolean;
  gps?: boolean;
  push?: boolean;
  secure_storage?: boolean;
  biometric?: boolean;
};

export type IOSPatchResult = {
  infoPlistChanged: boolean;
  entitlementsChanged: boolean;
  addedInfoPlistKeys: string[];
  addedEntitlementKeys: string[];
};

const DEFAULT_STRINGS = {
  camera: "This app requires camera access.",
  location: "This app uses your location to provide location-based features.",
  faceId: "This app uses Face ID to protect your data."
};

export function buildIOSInfoPlistAdditions(plugins: PluginFlags) {
  const add: Record<string, any> = {};

  if (plugins.camera) {
    add.NSCameraUsageDescription = DEFAULT_STRINGS.camera;
  }

  if (plugins.gps) {
    add.NSLocationWhenInUseUsageDescription = DEFAULT_STRINGS.location;
  }

  if (plugins.biometric) {
    add.NSFaceIDUsageDescription = DEFAULT_STRINGS.faceId;
  }

  if (plugins.push) {
    add.UIBackgroundModes = ["remote-notification"];
  }

  return add;
}

export function buildIOSEntitlementsAdditions(plugins: PluginFlags) {
  const add: Record<string, any> = {};

  if (plugins.push) {
    add["aps-environment"] = "development";
  }

  if (plugins.secure_storage) {
    add["keychain-access-groups"] = [
      "$(AppIdentifierPrefix)$(PRODUCT_BUNDLE_IDENTIFIER)"
    ];
  }

  return add;
}

function mergeValue(existing: any, incoming: any): { merged: any; changed: boolean } {
  if (incoming == null) return { merged: existing, changed: false };

  if (Array.isArray(incoming)) {
    const base = Array.isArray(existing) ? existing : [];
    const set = new Set(base.map(String));
    let changed = false;

    for (const v of incoming) {
      const s = String(v);
      if (!set.has(s)) {
        set.add(s);
        changed = true;
      }
    }
    return { merged: Array.from(set), changed };
  }

  if (typeof incoming === "object") {
    const base = typeof existing === "object" && existing ? existing : {};
    const out: Record<string, any> = { ...base };
    let changed = false;

    for (const [k, v] of Object.entries(incoming)) {
      if (out[k] === undefined) {
        out[k] = v;
        changed = true;
      }
    }
    return { merged: out, changed };
  }

  if (existing === undefined || existing === null || existing === "") {
    return { merged: incoming, changed: true };
  }

  return { merged: existing, changed: false };
}

export function applyAdditivePatch(
  target: Record<string, any>,
  additions: Record<string, any>
): { next: Record<string, any>; changed: boolean; addedKeys: string[] } {
  const next = { ...(target || {}) };
  const addedKeys: string[] = [];
  let changed = false;

  for (const [key, incoming] of Object.entries(additions)) {
    if (next[key] === undefined) addedKeys.push(key);

    const res = mergeValue(next[key], incoming);
    next[key] = res.merged;
    if (res.changed) changed = true;
  }

  return { next, changed, addedKeys };
}

export function applyIOSPluginPatches(
  infoPlistObj: Record<string, any>,
  entitlementsObj: Record<string, any>,
  plugins: PluginFlags
): IOSPatchResult & {
  nextInfoPlist: Record<string, any>;
  nextEntitlements: Record<string, any>;
} {
  const infoAdd = buildIOSInfoPlistAdditions(plugins);
  const entAdd = buildIOSEntitlementsAdditions(plugins);

  const infoRes = applyAdditivePatch(infoPlistObj, infoAdd);
  const entRes = applyAdditivePatch(entitlementsObj, entAdd);

  return {
    nextInfoPlist: infoRes.next,
    nextEntitlements: entRes.next,
    infoPlistChanged: infoRes.changed,
    entitlementsChanged: entRes.changed,
    addedInfoPlistKeys: infoRes.addedKeys,
    addedEntitlementKeys: entRes.addedKeys
  };
}
