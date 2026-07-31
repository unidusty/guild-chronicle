import type {
  AdventurerRank,
  Adventurer,
  AdventurerClass,
  FormationSlot,
  FormationRow,
  Formation,
  Party,
  Quest,
  Stats,
} from "../../types/game";

// ── Class preferred positions ────────────────────────────────────────────────

export const CLASS_PREFERRED_ROWS: Record<string, FormationRow[]> = {
  warrior:   ["front"],
  guardian:  ["front"],
  paladin:   ["front"],
  swordsman: ["front", "mid"],
  spearman:  ["front", "mid"],
  archer:    ["back", "mid"],
  mage:      ["back", "mid"],
  priest:    ["back", "mid"],
  rogue:     ["back", "mid"],
};

// ── Rank helpers ─────────────────────────────────────────────────────────────

const RANK_ORDER: AdventurerRank[] = ["F", "E", "D", "C", "B", "A", "S"];

export function rankToNum(rank: AdventurerRank): number {
  return RANK_ORDER.indexOf(rank);
}

export function numToRank(n: number): AdventurerRank {
  return RANK_ORDER[Math.max(0, Math.min(RANK_ORDER.length - 1, n))];
}

// ── Party rank (median) ───────────────────────────────────────────────────────

export function computePartyRank(
  memberIds: string[],
  adventurers: Record<string, Adventurer>,
): AdventurerRank {
  if (memberIds.length === 0) return "F";
  const sorted = [...memberIds]
    .map((id) => rankToNum(adventurers[id]?.rank ?? "F"))
    .sort((a, b) => b - a);
  return numToRank(sorted[Math.floor((sorted.length - 1) / 2)]);
}

// ── Individual member combat power ───────────────────────────────────────────
//
// Formula: classWeightedStatSum * 1.2 + ratingSum * 2
//   - Primary stats (from AdventurerClass.primaryStats): weight 1.5
//   - Other stats: weight 0.75
//
// Target individual ranges (with rebalanced stats):
//   F-rank recruit: ~55-65   C-rank: ~80-95   B-rank: ~100-115   S-rank: ~140-160

export function calcMemberCombatPower(adv: Adventurer, cls?: AdventurerClass): number {
  const primaryStats: Array<keyof Stats> = cls?.primaryStats ?? [];
  const stats = adv.stats;

  let weightedSum = 0;
  for (const [key, val] of Object.entries(stats) as [keyof Stats, number][]) {
    const weight = primaryStats.includes(key) ? 1.5 : 0.75;
    weightedSum += val * weight;
  }

  const { attack, defense, evasion, accuracy, survival, leadership } = adv.combatRatings;
  const ratingSum = attack + defense + evasion + accuracy + survival + leadership;

  return Math.round(weightedSum * 1.2 + ratingSum * 2);
}

// ── Synergy (flat adjustments) ────────────────────────────────────────────────

export interface SynergyResult {
  adjustment: number;
  bonuses: string[];
  penalties: string[];
}

export function calcSynergy(
  members: Adventurer[],
  classes: Record<string, AdventurerClass>,
): SynergyResult {
  let adjustment = 0;
  const bonuses: string[] = [];
  const penalties: string[] = [];

  if (members.length === 0) return { adjustment: 0, bonuses, penalties };

  const roles = members.map((m) => classes[m.classId]?.role ?? "damage");
  const hasVanguard = roles.some((r) => r === "vanguard");
  const hasSupport  = roles.some((r) => r === "support");
  const roleSet     = new Set(roles);
  const hasMelee    = members.some((m) => ["warrior", "guardian", "paladin", "swordsman", "spearman"].includes(m.classId));
  const hasRanged   = members.some((m) => ["archer", "mage", "rogue"].includes(m.classId));

  if (hasVanguard) { adjustment += 10; bonuses.push("탱커 +10"); }
  if (hasSupport)  { adjustment += 20; bonuses.push("힐러 +20"); }
  if (roleSet.size >= 3) { adjustment += 10; bonuses.push("역할 다양성 +10"); }
  if (hasMelee && hasRanged) { adjustment += 5; bonuses.push("균형 편성 +5"); }

  if (!hasVanguard && members.length >= 2) { adjustment -= 20; penalties.push("탱커 없음 -20"); }
  if (!hasSupport  && members.length >= 3) { adjustment -= 15; penalties.push("힐러 없음 -15"); }

  const classCounts: Record<string, number> = {};
  for (const m of members) classCounts[m.classId] = (classCounts[m.classId] ?? 0) + 1;
  const dupePenalty = Math.min(
    15,
    Object.values(classCounts).filter((c) => c >= 2).reduce((s, c) => s + (c - 1) * 5, 0),
  );
  if (dupePenalty > 0) { adjustment -= dupePenalty; penalties.push(`직업 중복 -${dupePenalty}`); }

  return { adjustment, bonuses, penalties };
}

// ── Formation adjustment (flat per member) ────────────────────────────────────
//   Correct position: +5 per member
//   Wrong position:   -3 per member

function slotToRow(slot: FormationSlot): FormationRow {
  return slot.split("-")[0] as FormationRow;
}

export function calcFormationAdjustment(
  formation: Formation,
  members: Adventurer[],
): number {
  const assigned = Object.entries(formation) as [FormationSlot, string][];
  if (assigned.length === 0) return 0;

  let adj = 0;
  for (const [slot, advId] of assigned) {
    const adv = members.find((m) => m.id === advId);
    if (!adv) continue;
    const preferred = CLASS_PREFERRED_ROWS[adv.classId] ?? ["front", "mid", "back"];
    adj += preferred.includes(slotToRow(slot)) ? 5 : -3;
  }
  return adj;
}

// ── Party combat power ───────────────────────────────────────────────────────
//
// partyPower = memberBasePowerSum + synergyAdjustment + formationAdjustment
//
// Target party ranges:
//   Early (F-rank, 3-4 members):    100–300
//   Mid   (C-rank, 4 members):      300–500
//   Late  (B-rank, 4-5 members):    400–650
//   Top   (S-rank, 6 members):      850–1000

export function calcPartyCombatPower(
  party: Party,
  members: Adventurer[],
  classes: Record<string, AdventurerClass>,
): number {
  if (members.length === 0) return 0;
  const memberBase = members.reduce((sum, m) => sum + calcMemberCombatPower(m, classes[m.classId]), 0);
  const { adjustment: synergyAdj } = calcSynergy(members, classes);
  const formationAdj = calcFormationAdjustment(party.formation, members);
  return Math.max(0, memberBase + synergyAdj + formationAdj);
}

// ── Quest recommended power ──────────────────────────────────────────────────

const RANK_BASE_POWER: Record<AdventurerRank, number> = {
  F: 120, E: 220, D: 330, C: 450, B: 580, A: 720, S: 880,
};

export function getQuestRecommendedPower(quest: Quest): number {
  return RANK_BASE_POWER[quest.grade] + (quest.dangerLevel - 3) * 25;
}

// ── Success rate ─────────────────────────────────────────────────────────────

export function isChallengeMode(partyRank: AdventurerRank, questGrade: AdventurerRank): boolean {
  return rankToNum(partyRank) === rankToNum(questGrade) - 1;
}

export function calcQuestSuccessRate(
  combatPower: number,
  partyRank: AdventurerRank,
  quest: Quest,
): number {
  const questPower = getQuestRecommendedPower(quest);
  const ratio = questPower > 0 ? combatPower / questPower : 1;
  let rate = Math.round(30 + ratio * 55);
  if (isChallengeMode(partyRank, quest.grade)) rate -= 35;
  return Math.max(10, Math.min(95, rate));
}
