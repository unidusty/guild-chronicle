import { assetManifest } from "../../generated/assetManifest";
import type { Race, Gender } from "../../types/game";

// swordsman portrait files have a typo variant ("swordman") — check both.
const CLASS_PORTRAIT_IDS: Record<string, string[]> = {
  swordsman: ["swordsman", "swordman"],
};

function resolvePortraitClassIds(classId: string): string[] {
  return CLASS_PORTRAIT_IDS[classId] ?? [classId];
}

export function getPortraitsByRaceGender(race: Race, gender: Gender) {
  return assetManifest.portraits.filter((p) => p.race === race && p.gender === gender);
}

export function getPortraitsByClass(race: Race, gender: Gender, classId: string) {
  const all = getPortraitsByRaceGender(race, gender);
  const candidates = resolvePortraitClassIds(classId);
  for (const cid of candidates) {
    const matched = all.filter((p) => p.classId === cid);
    if (matched.length > 0) return matched;
  }
  return all; // fallback: any portrait for this race+gender
}

export function getRandomPortraitPath(race: Race, gender: Gender, classId?: string): string | null {
  const pool = classId
    ? getPortraitsByClass(race, gender, classId)
    : getPortraitsByRaceGender(race, gender);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].path;
}

export function getRandomPortraitId(race: Race, gender: Gender, classId?: string): string | null {
  const pool = classId
    ? getPortraitsByClass(race, gender, classId)
    : getPortraitsByRaceGender(race, gender);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// Resolves a stored portrait path — just returns it directly since we store paths.
export function getPortraitPath(path: string | null): string | null {
  return path;
}
