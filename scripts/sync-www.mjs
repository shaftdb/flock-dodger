/**
 * Copy static web assets into www/ for Capacitor Android packaging.
 * Keeps GitHub Pages root layout intact.
 */
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const www = join(root, "www");

const FILES = ["index.html", "privacy.html", "manifest.json", "sw.js", "css", "js", "icons", "ANDROID.md"];

if (existsSync(www)) {
  rmSync(www, { recursive: true, force: true });
}
mkdirSync(www, { recursive: true });

for (const name of FILES) {
  const src = join(root, name);
  if (!existsSync(src)) {
    console.warn("skip missing", name);
    continue;
  }
  cpSync(src, join(www, name), { recursive: true });
}

// Capacitor apps load from local files — relative paths already used.
// Ensure .nojekyll not required; add a tiny marker for debugging builds.
writeFileSync(
  join(www, "build-info.json"),
  JSON.stringify({ builtAt: new Date().toISOString(), target: "capacitor-android" }, null, 2)
);

console.log("www/ ready for Capacitor");
