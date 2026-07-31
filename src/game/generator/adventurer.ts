import type { Adventurer, AdventurerClass, CombatRatings, CombatTendencies, EntityId, GameDate, Race, Gender, Stats } from "../../types/game";
import { getRandomPortraitPath } from "../assets/portraits";
import { generateName } from "./names";
import { pickTraits } from "./traits";
import { clamp, pick, roll } from "./util";

const PERSONALITIES = [
  "낙천적", "냉정함", "욕심 많음", "책임감 강함", "소심함",
  "충동적", "신중함", "호기심 많음", "직설적", "다정함",
  "자존심 강함", "과묵함", "명랑함", "독립적", "온화함",
  "의심 많음", "사려깊음", "거침없음", "의리 있음", "집착 강함",
];

const BACKGROUNDS = [
  "농촌", "왕도", "변경 마을", "항구 도시", "산악 부족",
  "광산 도시", "숲 마을", "귀족 가문", "수도원", "상인 가문",
  "슬럼가", "군인 가정", "유랑단", "어촌 마을", "사막 부족",
];

const RACES: Race[] = ["human", "elf", "dwarf"];
const GENDERS: Gender[] = ["male", "female"];

// 영입 화면에서 제공하는 직업 목록 (gameState.classes의 키와 일치해야 함)
const RECRUIT_CLASS_IDS = ["warrior", "ranger", "mage", "priest", "rogue"] as const;

const AGE_RANGE: Record<Race, [number, number]> = {
  human: [17, 45],
  elf:   [60, 200],
  dwarf: [25, 120],
};

// 종족별 능력치 편향: 작은 차이로 조합 다양성을 유도
const RACE_BIAS: Record<Race, Partial<Record<keyof Stats, number>>> = {
  human: { willpower: 1 },
  elf:   { agility: 1, perception: 1, endurance: -1 },
  dwarf: { strength: 1, endurance: 2, agility: -1 },
};

function makeId(): EntityId {
  return `adv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateStats(classData: AdventurerClass, race: Race): Stats {
  const base: Stats = {
    strength:     roll(5, 11),
    agility:      roll(5, 11),
    endurance:    roll(5, 11),
    intelligence: roll(5, 11),
    perception:   roll(5, 11),
    willpower:    roll(5, 11),
  };

  // 직업 핵심 능력치 편향: 주요 스탯을 확연히 높여 직업 정체성 부여
  for (const stat of classData.primaryStats) {
    base[stat] = clamp(base[stat] + roll(3, 6), 4, 18);
  }

  // 종족 편향 적용
  const bias = RACE_BIAS[race];
  for (const key of Object.keys(base) as Array<keyof Stats>) {
    const b = bias[key];
    if (b !== undefined) {
      base[key] = clamp(base[key] + b, 4, 18);
    }
  }

  return base;
}

function statToStars(v: number): number {
  if (v >= 16) return 5;
  if (v >= 13) return 4;
  if (v >= 11) return 3;
  if (v >= 8)  return 2;
  return 1;
}

function avg(...vals: number[]): number {
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function deriveCombatRatings(stats: Stats): CombatRatings {
  return {
    attack:     statToStars(avg(stats.strength, stats.agility)),
    defense:    statToStars(avg(stats.endurance, stats.willpower)),
    evasion:    statToStars(avg(stats.agility, stats.perception)),
    accuracy:   statToStars(avg(stats.perception, stats.agility)),
    survival:   statToStars(avg(stats.endurance, stats.willpower)),
    leadership: statToStars(avg(stats.willpower, stats.intelligence)),
  };
}

export function deriveCombatTendencies(stats: Stats): CombatTendencies {
  return {
    melee:    statToStars(avg(stats.strength, stats.endurance)),
    ranged:   statToStars(avg(stats.agility, stats.perception)),
    magic:    statToStars(avg(stats.intelligence, stats.willpower)),
    survival: statToStars(stats.endurance),
    command:  statToStars(avg(stats.willpower, stats.intelligence)),
  };
}


export function generateAdventurer(
  classes: Record<EntityId, AdventurerClass>,
  currentDate: GameDate,
  usedIds: Set<EntityId>,
): Adventurer {
  const race = pick(RACES);
  const gender = pick(GENDERS);

  const availableClassIds = RECRUIT_CLASS_IDS.filter((id) => classes[id]);
  const classId = pick(availableClassIds.length > 0 ? availableClassIds : (Object.keys(classes) as EntityId[]));
  const classData = classes[classId];

  const [ageMin, ageMax] = AGE_RANGE[race];

  let id: EntityId;
  do { id = makeId(); } while (usedIds.has(id));

  const stats = generateStats(classData, race);

  return {
    id,
    name:             generateName(race, gender),
    race,
    gender,
    age:              roll(ageMin, ageMax),
    classId,
    rank:             "D",
    portrait:         getRandomPortraitPath(race, gender),
    stats,
    potential:        roll(30, 90),
    traits:           pickTraits(roll(1, 3)),
    belonging:        roll(28, 55),
    status:           "idle",
    partyId:          null,
    currentQuestId:   null,
    injuryIds:        [],
    joinedAt:         currentDate,
    isArchived:       false,
    personality:      pick(PERSONALITIES),
    background:       pick(BACKGROUNDS),
    combatRatings:    deriveCombatRatings(stats),
    combatTendencies: deriveCombatTendencies(stats),
  };
}

export function generateCandidates(
  count: number,
  classes: Record<EntityId, AdventurerClass>,
  currentDate: GameDate,
  existingIds: Set<EntityId>,
): Adventurer[] {
  const usedIds = new Set(existingIds);
  const candidates: Adventurer[] = [];
  for (let i = 0; i < count; i++) {
    const adv = generateAdventurer(classes, currentDate, usedIds);
    usedIds.add(adv.id);
    candidates.push(adv);
  }
  return candidates;
}
