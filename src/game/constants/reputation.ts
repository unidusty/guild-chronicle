import type { AdventurerRank, QuestResultGrade } from "../../types/game";

export interface ReputationTierDef {
  label: string;
  min: number;
}

export const REPUTATION_TIERS: ReputationTierDef[] = [
  { label: "무명 길드",  min: 0     },
  { label: "신생 길드",  min: 50    },
  { label: "소규모 길드", min: 200  },
  { label: "지역 길드",  min: 600   },
  { label: "유명 길드",  min: 1500  },
  { label: "명문 길드",  min: 3500  },
  { label: "전설의 길드", min: 7000 },
];

export interface ReputationTierInfo {
  label: string;
  min: number;
  nextMin: number | null;
  toNext: number | null;
}

export function getReputationTier(reputation: number): ReputationTierInfo {
  let current = REPUTATION_TIERS[0];
  for (const tier of REPUTATION_TIERS) {
    if (reputation >= tier.min) current = tier;
    else break;
  }
  const idx = REPUTATION_TIERS.indexOf(current);
  const next = REPUTATION_TIERS[idx + 1] ?? null;
  return {
    label: current.label,
    min: current.min,
    nextMin: next?.min ?? null,
    toNext: next ? next.min - reputation : null,
  };
}

// Base reputation delta per quest result grade, scaled by quest rank.
// Positive = gain, negative = loss.
const BASE_DELTA: Record<QuestResultGrade, number> = {
  great_success:  15,
  success:         8,
  narrow_success:  3,
  retreat:        -3,
  failure:        -8,
  great_failure: -15,
};

const RANK_MULTIPLIER: Record<AdventurerRank, number> = {
  F: 1.0,
  E: 1.2,
  D: 1.5,
  C: 2.0,
  B: 3.0,
  A: 4.5,
  S: 7.0,
};

export function calcQuestReputation(
  questGrade: AdventurerRank,
  resultGrade: QuestResultGrade,
): number {
  const base = BASE_DELTA[resultGrade];
  const mult = RANK_MULTIPLIER[questGrade];
  return Math.round(base * mult);
}
