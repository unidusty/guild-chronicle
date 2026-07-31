#!/usr/bin/env node
// Scans public/portraits and public/mods/portraits,
// then writes src/generated/assetManifest.ts.
//
// Filename rule: {race}_{m|f}_{classId}_{number}.ext
// ID rule: `${race}-${gender}-${basename}` — globally unique in manifest.
// Base/mod conflict: mod overrides base. Logs on conflict.
import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTPUT = join(ROOT, "src", "generated", "assetManifest.ts");

const SUPPORTED_EXT = new Set([".png", ".webp", ".jpg", ".jpeg"]);
const VALID_FILENAME = /^[a-z][a-z0-9_-]*\.(png|webp|jpg|jpeg)$/;
const RACES = ["human", "elf", "dwarf"];
const GENDERS = ["male", "female"];
const GENDER_SHORT = { male: "m", female: "f" };

function parseClassId(file, race, gender) {
  const nameWithoutExt = basename(file, extname(file));
  const parts = nameWithoutExt.split("_");
  // Expected format: {race}_{m|f}_{classId}_{number}
  // Validate: parts[0] matches race, parts[1] matches gender short
  if (parts.length < 4) return "";
  if (parts[0] !== race) return "";
  if (parts[1] !== GENDER_SHORT[gender]) return "";
  // classId is everything between index 2 and the last part (number)
  return parts.slice(2, parts.length - 1).join("_");
}

function scanPortraits(baseDir, source) {
  const entries = [];
  if (!existsSync(baseDir)) return entries;

  for (const race of RACES) {
    for (const gender of GENDERS) {
      const dir = join(baseDir, race, gender);
      if (!existsSync(dir)) continue;

      let files;
      try {
        files = readdirSync(dir);
      } catch {
        console.warn(`[manifest] Cannot read directory: ${dir}`);
        continue;
      }

      for (const file of files.sort()) {
        const ext = extname(file).toLowerCase();
        if (!SUPPORTED_EXT.has(ext)) continue;

        if (!VALID_FILENAME.test(file)) {
          console.warn(`[manifest] Skipped (invalid filename, use lowercase + underscores): ${file}`);
          continue;
        }

        const classId = parseClassId(file, race, gender);
        const id = `${race}-${gender}-${basename(file, extname(file))}`;
        const urlBase = source === "base" ? "/portraits" : "/mods/portraits";
        entries.push({ id, path: `${urlBase}/${race}/${gender}/${file}`, race, gender, classId, source });
      }
    }
  }

  return entries;
}

const basePortraits = scanPortraits(join(ROOT, "public", "portraits"), "base");
const modPortraits = scanPortraits(join(ROOT, "public", "mods", "portraits"), "mod");

// Map으로 중복 제거: base를 먼저 등록하고 mod가 같은 id를 가지면 덮어씀 (mod 우선)
const portraitMap = new Map();

for (const entry of basePortraits) {
  portraitMap.set(entry.id, entry);
}

for (const entry of modPortraits) {
  if (portraitMap.has(entry.id)) {
    console.log(`[manifest] Mod override: "${entry.id}" (base → mod)`);
  }
  portraitMap.set(entry.id, entry);
}

const all = [...portraitMap.values()];
const overrideCount = modPortraits.filter((e) => basePortraits.some((b) => b.id === e.id)).length;

console.log(
  `[manifest] ${all.length} portrait(s) found` +
  ` (${basePortraits.length} base, ${modPortraits.length} mod` +
  (overrideCount > 0 ? `, ${overrideCount} override(s)` : "") +
  `)`
);

// Summary by race/gender/classId
const summary = {};
for (const e of all) {
  const key = `${e.race}/${e.gender}`;
  if (!summary[key]) summary[key] = {};
  if (!summary[key][e.classId]) summary[key][e.classId] = 0;
  summary[key][e.classId]++;
}
for (const [key, classes] of Object.entries(summary)) {
  const parts = Object.entries(classes).map(([c, n]) => `${c}(${n})`).join(", ");
  console.log(`[manifest]   ${key}: ${parts}`);
}

const generatedAt = new Date().toISOString();
const portraitsJson = JSON.stringify(all, null, 2).split("\n").join("\n  ");

const content = `// AUTO-GENERATED — do not edit manually. Run: npm run manifest
// Generated: ${generatedAt}
// Filename rule: {race}_{m|f}_{classId}_{number}.ext
// ID format: \`{race}-{gender}-{basename}\` — globally unique in manifest.
// Base/mod conflict: mod overrides base.

export type PortraitSource = "base" | "mod";

export interface PortraitEntry {
  id: string;
  path: string;
  race: string;
  gender: string;
  classId: string;
  source: PortraitSource;
}

export interface AssetManifest {
  generatedAt: string;
  portraits: PortraitEntry[];
}

export const assetManifest: AssetManifest = {
  generatedAt: "${generatedAt}",
  portraits: ${portraitsJson},
};
`;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, content, "utf8");
console.log("[manifest] Written → src/generated/assetManifest.ts");
