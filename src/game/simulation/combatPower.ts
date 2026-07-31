import type {
  AdventurerRank,
  Adventurer,
  AdventurerClass,
  FormationSlot,
  FormationRow,
  Formation,
  Party,
  Quest,
} from "../../types/game";

// ── Class preferred positions ────────────────────────────────────────────────

export const CLASS_PREFERRED_ROWS: Record<string, FormationRow[]> = {
  warrior:  ["front"],
  guardian: ["front"],
  paladin:  ["front"],
  swordsman: ["front", "mid"],
  spearman:  ["front", "mid"],
  archer:  ["back", "mid"],
  mage:    ["back", "mid"],
  priest:  ["back", "mid"],
  rogue:   ["back", "mid"],
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

export function calcMemberCombatPower(adv: Adventurer): number {
  const { strength, agility, endurance, intelligence, perception, willpower } = adv.stats;
  const statSum = strength + agility + endurance + intelligence + perception + willpower;
  const { attack, defense, evasion, accuracy, survival, leadership } = adv.combatRatings;
  const ratingSum = attack + defense + evasion + accuracy + survival + leadership;
  return Math.round(statSum * 1.5 + ratingSum * 4);
}

// ── Synergy ──────────────────────────────────────────────────────────────────

export interface SynergyResult {
  multiplier: number;
  bonuses: string[];
  penalties: string[];
}

export function calcSynergy(
  members: Adventurer[],
  classes: Record<string, AdventurerClass>,
): SynergyResult {
  const bonuses: string[] = [];
  const penalties: string[] = [];
  let multiplier = 1.0;

  if (members.length === 0) return { multiplier, bonuses, penalties };

  const roles = members.map((m) => classes[m.classId]?.role ?? "damage");
  const hasVanguard = roles.some((r) => r === "vanguard");
  const hasSupport  = roles.some((r) => r === "support");
  const roleSet     = new Set(roles);
  const hasMelee    = members.some((m) => ["warrior", "guardian", "paladin", "swordsman", "spearman"].includes(m.classId));
  const hasRanged   = members.some((m) => ["archer", "mage", "rogue"].includes(m.classId));

  if (hasVanguard) { multiplier += 0.08; bonuses.push("탱커 보너스 +8%"); }
  if (hasSupport)  { multiplier += 0.10; bonuses.push("힐러 보너스 +10%"); }
  if (roleSet.size >= 3) { multiplier += 0.07; bonuses.push("역할 다양성 +7%"); }
  if (hasMelee && hasRanged) { multiplier += 0.05; bonuses.push("근·원거리 균형 +5%"); }

  if (!hasVanguard && members.length >= 2) {
    multiplier -= 0.10; penalties.push("탱커 없음 -10%");
  }
  if (!hasSupport && members.length >= 3) {
    multiplier -= 0.05; penalties.push("힐러 없음 -5%");
  }

  const classCounts: Record<string, number> = {};
  for (const m of members) classCounts[m.classId] = (classCounts[m.classId] ?? 0) + 1;
  const dupeClasses = Object.values(classCounts).filter((c) => c >= 2).length;
  if (dupeClasses === 1) { multiplier -= 0.05; penalties.push("직업 중복 -5%"); }
  if (dupeClasses >= 2)  { multiplier -= 0.15; penalties.push("직업 중복 과다 -15%"); }

  return { multiplier: Math.max(0.5, multiplier), bonuses, penalties };
}

// ── Formation position multiplier ────────────────────────────────────────────

function slotToRow(slot: FormationSlot): FormationRow {
  return slot.split("-")[0] as FormationRow;
}

export function calcFormationMultiplier(
  formation: Formation,
  members: Adventurer[],
): number {
  const assigned = Object.entries(formation) as [FormationSlot, string][];
  if (assigned.length === 0) return 0.9;

  let correct = 0;
  for (const [slot, advId] of assigned) {
    const adv = members.find((m) => m.id === advId);
    if (!adv) continue;
    const preferred = CLASS_PREFERRED_ROWS[adv.classId] ?? ["front", "mid", "back"];
    if (preferred.includes(slotToRow(slot))) correct++;
  }
  return 0.9 + (correct / assigned.length) * 0.2;
}

// ── Party combat power ───────────────────────────────────────────────────────

export function calcPartyCombatPower(
  party: Party,
  members: Adventurer[],
  classes: Record<string, AdventurerClass>,
): number {
  if (members.length === 0) return 0;
  const base = members.reduce((sum, m) => sum + calcMemberCombatPower(m), 0);
  const { multiplier } = calcSynergy(members, classes);
  const formationMult = calcFormationMultiplier(party.formation, members);
  return Math.round(base * multiplier * formationMult);
}

// ── Quest recommended power ──────────────────────────────────────────────────

const RANK_BASE_POWER: Record<AdventurerRank, number> = {
  F: 200, E: 360, D: 520, C: 680, B: 840, A: 940, S: 1000,
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
