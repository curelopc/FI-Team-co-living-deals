// Lovable asset sidecars point at /__l5e/assets-v1/<id>/<file>, which only exists
// on Lovable's CDN. Copy the sibling image already in src/assets to that public
// path so the same URLs work in dev and on Vercel.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const assetsDir = path.join(root, "src/assets");
let copied = 0;

for (const name of readdirSync(assetsDir)) {
  if (!name.endsWith(".asset.json")) continue;
  const meta = JSON.parse(readFileSync(path.join(assetsDir, name), "utf8")) as { url?: string };
  const url = meta.url ?? "";
  const parts = url.split("/").filter(Boolean);
  const filename = parts.at(-1);
  const id = parts.at(-2);
  if (!filename || !id || parts[0] !== "__l5e") continue;
  const source = path.join(assetsDir, filename);
  if (!existsSync(source)) {
    console.warn(`missing local asset for ${url}`);
    continue;
  }
  const destDir = path.join(root, "public", ...parts.slice(0, -1));
  mkdirSync(destDir, { recursive: true });
  copyFileSync(source, path.join(destDir, filename));
  copied += 1;
}

console.log(`linked ${copied} local assets under public/__l5e`);
