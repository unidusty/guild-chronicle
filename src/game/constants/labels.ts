import type { AdventurerStatus, Race } from "../../types/game";

export const raceLabels: Record<Race, string> = {
  human: "인간",
  elf: "엘프",
  dwarf: "드워프",
};

export const adventurerStatusLabels: Record<AdventurerStatus, string> = {
  idle: "대기",
  dispatched: "파견",
  injured: "부상",
  training: "훈련",
  recovering: "경상",
};

export const seasonLabels = {
  spring: "봄",
  summer: "늦여름",
  autumn: "가을",
  winter: "겨울",
} as const;
