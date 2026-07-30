import type { Adventurer, AdventurerClass, EntityId, GameDate, Race, Gender, Stats } from "../../types/game";
import { getPortraitsByRaceGender } from "../assets/portraits";
import { generateName } from "./names";
import { pickTraits } from "./traits";
import { clamp, pick, roll } from "./util";

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

function pickPortraitId(race: Race, gender: Gender): string | null {
  const available = getPortraitsByRaceGender(race, gender);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)].id;
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

  return {
    id,
    name:           generateName(race, gender),
    race,
    gender,
    age:            roll(ageMin, ageMax),
    classId,
    rank:           "D",
    portraitId:     pickPortraitId(race, gender),
    stats:          generateStats(classData, race),
    potential:      roll(30, 90),
    traits:         pickTraits(roll(1, 3)),
    belonging:      roll(28, 55),
    status:         "idle",
    partyId:        null,
    currentQuestId: null,
    injuryIds:      [],
    joinedAt:       currentDate,
    isArchived:     false,
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
