import type { GameState } from "../types/game";

export const initialGameState: GameState = {
  version: 1,
  currentDate: { year: 317, season: "summer", day: 12 },
  guild: {
    id: "guild-westwind",
    name: "서풍 길드",
    gold: 18420,
    reputation: 1286,
    reputationTier: 3,
    facilityIds: ["facility-counter", "facility-training", "facility-smithy", "facility-infirmary"],
    adventurerIds: ["adv-ella", "adv-lien", "adv-dorgan", "adv-marien"],
    partyIds: ["party-silverhawk", "party-bluelantern"],
  },
  classes: {
    swordsman: { id: "swordsman", name: "검사", role: "vanguard", primaryStats: ["strength", "endurance"] },
    ranger: { id: "ranger", name: "정찰자", role: "scout", primaryStats: ["agility", "perception"] },
    guardian: { id: "guardian", name: "수호자", role: "vanguard", primaryStats: ["endurance", "willpower"] },
    healer: { id: "healer", name: "치유사", role: "support", primaryStats: ["intelligence", "willpower"] },
  },
  injuries: {
    "injury-ella-bruise": {
      id: "injury-ella-bruise",
      adventurerId: "adv-ella",
      name: "갈비뼈 타박상",
      severity: "minor",
      recoveryDays: 3,
    },
  },
  adventurers: {
    "adv-ella": {
      id: "adv-ella", name: "엘라 빈터", race: "human", gender: "female", age: 24,
      classId: "swordsman", rank: "B", portraitId: null,
      stats: { strength: 13, agility: 11, endurance: 12, intelligence: 7, perception: 9, willpower: 14 },
      potential: 82, traits: [{ id: "trait-brave", revealed: true }], belonging: 76,
      status: "recovering", partyId: null, currentQuestId: null,
      injuryIds: ["injury-ella-bruise"], joinedAt: { year: 315, season: "spring", day: 4 }, isArchived: false,
    },
    "adv-lien": {
      id: "adv-lien", name: "리엔 아르벨", race: "elf", gender: "male", age: 91,
      classId: "ranger", rank: "B", portraitId: null,
      stats: { strength: 8, agility: 15, endurance: 9, intelligence: 11, perception: 16, willpower: 10 },
      potential: 79, traits: [{ id: "trait-keen-eye", revealed: true }], belonging: 68,
      status: "dispatched", partyId: "party-silverhawk", currentQuestId: "quest-caravan",
      injuryIds: [], joinedAt: { year: 314, season: "autumn", day: 19 }, isArchived: false,
    },
    "adv-dorgan": {
      id: "adv-dorgan", name: "도르간 맥주먹", race: "dwarf", gender: "male", age: 57,
      classId: "guardian", rank: "C", portraitId: null,
      stats: { strength: 12, agility: 6, endurance: 15, intelligence: 8, perception: 8, willpower: 13 },
      potential: 66, traits: [{ id: "trait-stubborn", revealed: true }], belonging: 84,
      status: "training", partyId: null, currentQuestId: null,
      injuryIds: [], joinedAt: { year: 316, season: "winter", day: 2 }, isArchived: false,
    },
    "adv-marien": {
      id: "adv-marien", name: "마리엔 로우", race: "human", gender: "female", age: 29,
      classId: "healer", rank: "C", portraitId: null,
      stats: { strength: 5, agility: 8, endurance: 8, intelligence: 15, perception: 11, willpower: 14 },
      potential: 73, traits: [{ id: "trait-calm", revealed: true }], belonging: 72,
      status: "dispatched", partyId: "party-bluelantern", currentQuestId: "quest-missing",
      injuryIds: [], joinedAt: { year: 316, season: "summer", day: 11 }, isArchived: false,
    },
  },
  parties: {
    "party-silverhawk": {
      id: "party-silverhawk", name: "은빛매 파티", leaderId: "adv-lien", memberIds: ["adv-lien"],
      rank: "B", status: "dispatched", activeQuestId: "quest-caravan", experience: 640,
    },
    "party-bluelantern": {
      id: "party-bluelantern", name: "푸른등불 파티", leaderId: "adv-marien", memberIds: ["adv-marien"],
      rank: "C", status: "returning", activeQuestId: "quest-missing", experience: 295,
    },
  },
  quests: {
    "quest-caravan": {
      id: "quest-caravan", title: "회색등성이 상단 호위", grade: "B", regionId: "region-grayridge",
      type: "escort", status: "assigned", rewardGold: 1850, durationDays: 4, progress: 68,
      assignedPartyId: "party-silverhawk", expectedReturnAt: { year: 317, season: "summer", day: 14 },
      riskTags: ["산적", "낙석"],
    },
    "quest-missing": {
      id: "quest-missing", title: "서부 수로의 실종자 수색", grade: "C", regionId: "region-westcanal",
      type: "search", status: "assigned", rewardGold: 920, durationDays: 2, progress: 91,
      assignedPartyId: "party-bluelantern", expectedReturnAt: { year: 317, season: "summer", day: 12 },
      riskTags: ["침수", "야간"],
    },
  },
  regions: {
    "region-grayridge": { id: "region-grayridge", name: "회색등성이", danger: 54, control: "contested" },
    "region-westcanal": { id: "region-westcanal", name: "서부 수로", danger: 31, control: "kingdom" },
  },
  facilities: {
    "facility-counter": { id: "facility-counter", name: "길드 카운터", level: 2, status: "active" },
    "facility-training": { id: "facility-training", name: "훈련장", level: 2, status: "active" },
    "facility-smithy": { id: "facility-smithy", name: "대장간", level: 3, status: "active" },
    "facility-infirmary": { id: "facility-infirmary", name: "치료실", level: 2, status: "active" },
  },
  chronicle: [
    {
      id: "chronicle-317-0811-ella", date: { year: 317, season: "summer", day: 11 }, scope: "adventurer",
      category: "quest", title: "위험 속의 구조", description: "엘라 빈터가 첫 B등급 의뢰에서 부상당한 동료를 구출했다.",
      relatedEntityIds: ["adv-ella"],
    },
    {
      id: "chronicle-317-0809-reputation", date: { year: 317, season: "summer", day: 9 }, scope: "guild",
      category: "reputation", title: "지역 공인 3단계", description: "길드 명성이 지역 공인 3단계에 도달했다.",
      relatedEntityIds: ["guild-westwind"],
    },
    {
      id: "chronicle-317-0807-smithy", date: { year: 317, season: "summer", day: 7 }, scope: "guild",
      category: "facility", title: "대장간 증축", description: "대장간 증축이 완료되어 희귀 장비 제작이 가능해졌다.",
      relatedEntityIds: ["guild-westwind", "facility-smithy"],
    },
  ],
  reports: [
    {
      id: "report-medical-ella", kind: "medical", title: "부상자 치료 방침",
      description: "엘라 빈터의 고급 치료제 사용 여부", relatedEntityIds: ["adv-ella", "injury-ella-bruise"], priority: "high",
    },
    {
      id: "report-rescue-mine", kind: "emergency", title: "긴급 구조 의뢰",
      description: "북부 광산에서 다른 길드가 지원을 요청했다.", relatedEntityIds: [], priority: "critical",
    },
    {
      id: "report-recruits", kind: "recruitment", title: "신입 가입 심사",
      description: "오늘 도착한 지원자 2명을 검토한다.", relatedEntityIds: [], priority: "normal",
    },
  ],
};
