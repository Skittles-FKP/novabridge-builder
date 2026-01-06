import fs from "node:fs";
import path from "node:path";
import plist from "plist";

export function readPlistFile(filePath: string): Record<string, any> {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return {};
  return (plist.parse(raw) as Record<string, any>) || {};
}

export function writePlistFile(filePath: string, obj: Record<string, any>) {
  const xml = plist.build(obj || {});
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, xml, "utf8");
}
