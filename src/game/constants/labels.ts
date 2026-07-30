import type { Adventurer, AdventurerStatus, Gender, Race, Stats } from "../../types/game";

export const raceLabels: Record<Race, string> = {
  human: "인간",
  elf: "엘프",
  dwarf: "드워프",
};

export const genderLabels: Record<Gender, string> = {
  male: "남",
  female: "여",
};

export const adventurerStatusLabels: Record<AdventurerStatus, string> = {
  idle: "대기",
  dispatched: "의뢰 수행",
  injured: "부상",
  training: "훈련 중",
  recovering: "휴식",
};

export const seasonLabels = {
  spring: "봄",
  summer: "늦여름",
  autumn: "가을",
  winter: "겨울",
} as const;

export const statLabels: Record<keyof Stats, string> = {
  strength:     "근력",
  agility:      "민첩",
  endurance:    "체력",
  intelligence: "지력",
  perception:   "인지",
  willpower:    "의지",
};

export function getPotentialGrade(potential: number): "S" | "A" | "B" | "C" | "D" {
  if (potential >= 88) return "S";
  if (potential >= 72) return "A";
  if (potential >= 56) return "B";
  if (potential >= 40) return "C";
  return "D";
}

export function getStatusTone(adv: Adventurer): "active" | "warning" | "idle" {
  if (adv.status === "dispatched") return "active";
  if (adv.injuryIds.length > 0 || adv.status === "injured") return "warning";
  return "idle";
}
