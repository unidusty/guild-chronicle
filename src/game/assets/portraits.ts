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

// Picks a portrait for race/gender/classId, preferring paths not in usedPaths.
// Fallback order: same class (unused) → same class (any) → any same race/gender (unused)
//               → any same race/gender (any) → null
export function getPortraitAvoiding(
  race: Race,
  gender: Gender,
  classId: string,
  usedPaths: Set<string>,
): string | null {
  const pick = (arr: { path: string }[]) =>
    arr[Math.floor(Math.random() * arr.length)].path;

  const byClass = getPortraitsByClass(race, gender, classId);
  const byClassUnused = byClass.filter((p) => !usedPaths.has(p.path));
  if (byClassUnused.length > 0) return pick(byClassUnused);
  if (byClass.length > 0)       return pick(byClass);

  const all = getPortraitsByRaceGender(race, gender);
  const allUnused = all.filter((p) => !usedPaths.has(p.path));
  if (allUnused.length > 0) return pick(allUnused);
  if (all.length > 0)       return pick(all);

  return null;
}

// Resolves a stored portrait path — just returns it directly since we store paths.
export function getPortraitPath(path: string | null): string | null {
  return path;
}
