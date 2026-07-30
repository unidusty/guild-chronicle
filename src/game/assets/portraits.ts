import { assetManifest } from "../../generated/assetManifest";
import type { Race, Gender } from "../../types/game";

export function getPortraitsByRaceGender(race: Race, gender: Gender) {
  return assetManifest.portraits.filter((p) => p.race === race && p.gender === gender);
}

// portraitId는 `${race}-${gender}-${basename}` 형식으로 전역 유일.
// race/gender 인자는 방어적 검증용: 저장 데이터와 초상화 불일치를 조기 탐지.
export function getPortraitPath(portraitId: string | null, race: Race, gender: Gender): string | null {
  if (!portraitId) return null;
  const entry = assetManifest.portraits.find((p) => p.id === portraitId);
  if (!entry) return null;
  if (entry.race !== race || entry.gender !== gender) {
    console.warn(
      `[portraits] Mismatch: "${portraitId}" is ${entry.race}/${entry.gender}, adventurer is ${race}/${gender}`
    );
    return null;
  }
  return entry.path;
}

export function getRandomPortraitId(race: Race, gender: Gender): string | null {
  const available = getPortraitsByRaceGender(race, gender);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)].id;
}
