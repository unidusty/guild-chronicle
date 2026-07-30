import type { Adventurer, ChronicleEntry, EntityId, GameDate, GameState } from "../../types/game";
import { adventurerStatusLabels, raceLabels, seasonLabels } from "../constants/labels";
import { getPortraitPath } from "../assets/portraits";

const PERSONALITY_ADJ: Record<string, string> = {
  "책임감 강함": "책임감 강한",
  "과묵함": "과묵한",
  "거침없음": "거침없는",
  "다정함": "다정한",
  "신중함": "신중한",
  "용감함": "용감한",
  "쾌활함": "쾌활한",
  "냉철함": "냉철한",
  "호기심 많음": "호기심 많은",
  "의리 있음": "의리 있는",
  "고집스러움": "고집스러운",
  "느긋함": "느긋한",
  "예민함": "예민한",
  "낙천적임": "낙천적인",
  "고독을 즐김": "고독을 즐기는",
  "장난기 많음": "장난기 많은",
  "진지함": "진지한",
  "절제된 성격": "절제된",
  "탐구적임": "탐구적인",
  "강인함": "강인한",
};

export function getAdventurerBio(adv: Adventurer, className: string | undefined): string {
  const adj = PERSONALITY_ADJ[adv.personality] ?? adv.personality;
  const cls = className ?? "모험가";
  const bg = adv.background ?? "";
  if (bg) return `${bg} 출신의 ${adj} ${cls}.`;
  return `${adj} ${cls}.`;
}

const formatGold = (value: number) => `${new Intl.NumberFormat("ko-KR").format(value)} G`;

export const formatGameDate = (date: GameDate) => `왕국력 ${date.year}년 · ${seasonLabels[date.season]} ${date.day}일`;
export const formatShortGameDate = (date: GameDate) => `${seasonLabels[date.season]} ${date.day}일`;

export function getActiveAdventurers(state: GameState): Adventurer[] {
  return state.guild.adventurerIds
    .map((id) => state.adventurers[id])
    .filter((adventurer): adventurer is Adventurer => Boolean(adventurer && !adventurer.isArchived));
}

export function getGuildMetrics(state: GameState) {
  const active = getActiveAdventurers(state);
  const dispatched = active.filter((item) => item.status === "dispatched").length;
  const injured = active.filter((item) => item.injuryIds.length > 0).length;
  const waiting = active.length - dispatched - injured;
  const completed = Object.values(state.quests).filter((quest) => quest.status === "completed").length;
  const failed = Object.values(state.quests).filter((quest) => quest.status === "failed").length;
  const resolved = completed + failed;
  const successRate = resolved === 0 ? 78 : Math.round((completed / resolved) * 100);

  return [
    { label: "길드 자금", value: formatGold(state.guild.gold), note: "이번 주 +2,140 G" },
    { label: "소속 모험가", value: `${active.length}명`, note: `파견 ${dispatched} · 대기 ${waiting} · 부상 ${injured}` },
    { label: "길드 명성", value: new Intl.NumberFormat("ko-KR").format(state.guild.reputation), note: `지역 공인 ${state.guild.reputationTier}단계` },
    { label: "의뢰 성공률", value: `${successRate}%`, note: "최근 30건 기준" },
  ];
}

export function getRosterRows(state: GameState) {
  return getActiveAdventurers(state).map((adventurer) => {
    const adventurerClass = state.classes[adventurer.classId];
    const quest = adventurer.currentQuestId ? state.quests[adventurer.currentQuestId] : null;
    const assignment = quest?.title ?? (adventurer.status === "recovering" ? "치료실 회복" : adventurer.status === "training" ? "훈련장" : "대기");
    const initials = adventurer.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

    return {
      id: adventurer.id,
      initials,
      name: adventurer.name,
      race: raceLabels[adventurer.race],
      age: adventurer.age,
      job: adventurerClass?.name ?? "미정",
      rank: adventurer.rank,
      assignment,
      status: adventurerStatusLabels[adventurer.status],
      statusTone: adventurer.status === "dispatched" ? "active" : adventurer.injuryIds.length > 0 ? "warning" : "idle",
      portraitPath: getPortraitPath(adventurer.portraitId, adventurer.race, adventurer.gender),
    };
  });
}

export function getAdventurerLocationLabel(adventurer: Adventurer, state: GameState): string {
  switch (adventurer.status) {
    case "idle":      return "길드 본부";
    case "training":  return "훈련장";
    case "injured":
    case "recovering": return "의무실";
    case "dispatched": {
      if (adventurer.currentQuestId) {
        const quest = state.quests[adventurer.currentQuestId];
        if (quest) {
          const region = state.regions[quest.regionId];
          if (region) return region.name;
        }
      }
      return "파견 중";
    }
  }
}

export function getAdventurerChronicle(
  state: GameState,
  adventurerId: EntityId,
  limit = 5,
): ChronicleEntry[] {
  return state.chronicle
    .filter((entry) => entry.relatedEntityIds.includes(adventurerId))
    .slice(0, limit);
}

export function getActiveQuestRows(state: GameState) {
  return Object.values(state.quests)
    .filter((quest) => quest.status === "assigned")
    .map((quest) => {
      const party = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;
      return {
        ...quest,
        partyName: party?.name ?? "미배정",
        returnLabel: quest.expectedReturnAt?.day === state.currentDate.day ? "예상 귀환 오늘 밤" : `예상 귀환 ${Math.max(1, (quest.expectedReturnAt?.day ?? state.currentDate.day) - state.currentDate.day)}일 후`,
      };
    });
}
