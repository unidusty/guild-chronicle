#!/usr/bin/env node
// Scans public/game-assets/portraits and public/mods/portraits,
// then writes src/generated/assetManifest.ts.
//
// ID 규칙: `${race}-${gender}-${basename}` — 전체 매니페스트에서 전역 유일.
// Base/mod 충돌 시 mod 우선 (덮어쓰기). 충돌 발생 시 로그로 알림.
import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTPUT = join(ROOT, "src", "generated", "assetManifest.ts");

const SUPPORTED_EXT = new Set([".png", ".webp", ".jpg", ".jpeg"]);
const VALID_FILENAME = /^[a-z][a-z0-9-]*\.(png|webp|jpg|jpeg)$/;
const RACES = ["human", "elf", "dwarf"];
const GENDERS = ["male", "female"];

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
          console.warn(`[manifest] Skipped (invalid filename, use lowercase + hyphens): ${file}`);
          continue;
        }

        // ID는 race-gender-basename 형식으로 전역 유일성 보장
        const id = `${race}-${gender}-${basename(file, extname(file))}`;
        const urlBase = source === "base" ? "/game-assets/portraits" : "/mods/portraits";
        entries.push({ id, path: `${urlBase}/${race}/${gender}/${file}`, race, gender, source });
      }
    }
  }

  return entries;
}

const basePortraits = scanPortraits(join(ROOT, "public", "game-assets", "portraits"), "base");
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

const generatedAt = new Date().toISOString();
const portraitsJson = JSON.stringify(all, null, 2).split("\n").join("\n  ");

const content = `// AUTO-GENERATED — do not edit manually. Run: npm run manifest
// Generated: ${generatedAt}
// ID 형식: \`{race}-{gender}-{basename}\` — 전체 매니페스트에서 전역 유일.
// Base/mod 동일 ID 충돌 시 mod 우선.

export type PortraitSource = "base" | "mod";

export interface PortraitEntry {
  id: string;
  path: string;
  race: string;
  gender: string;
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
