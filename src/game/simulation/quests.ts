import type { AdventurerRank, ChronicleEntry, EntityId, GameState } from "../../types/game";
import { rankToNum, isChallengeMode } from "./combatPower";
import { createQuestProgress } from "./questProgress";
import { toAbsoluteDay } from "./recruitment";
import { generateDepartureLog } from "./adventureLog";

export function canAssignParty(partyRank: AdventurerRank, questGrade: AdventurerRank): boolean {
  // allow up to 1 rank below (challenge mode); 2+ ranks below is blocked
  return rankToNum(partyRank) >= rankToNum(questGrade) - 1;
}

export { isChallengeMode };

export function assignQuest(state: GameState, questId: EntityId, partyId: EntityId): GameState {
  const quest = state.quests[questId];
  const party = state.parties[partyId];
  if (!quest || !party) return state;
  if (quest.status !== "available") return state;
  if (party.status !== "idle") return state;
  if (party.activeQuestId !== null) return state;
  if (!canAssignParty(party.rank, quest.grade)) return state;

  const date = state.currentDate;

  const updatedQuest = {
    ...quest,
    status: "assigned" as const,
    assignedPartyId: partyId,
    remainingDays: quest.durationDays,
    progress: 0,
  };

  const updatedParty = {
    ...party,
    status: "dispatched" as const,
    activeQuestId: questId,
    questsDispatched: party.questsDispatched + 1,
  };

  const adventurers = { ...state.adventurers };
  for (const memberId of party.memberIds) {
    if (adventurers[memberId]) {
      adventurers[memberId] = {
        ...adventurers[memberId],
        status: "dispatched" as const,
        currentQuestId: questId,
        questsDispatched: adventurers[memberId].questsDispatched + 1,
      };
    }
  }

  const chronicle: ChronicleEntry = {
    id: `chronicle-depart-${questId}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
    date,
    scope: "guild",
    category: "quest",
    title: `${quest.title} 출발`,
    description: `${party.name}이(가) 의뢰에 출발했습니다.`,
    relatedEntityIds: [party.id, ...party.memberIds],
  };

  const startDay = toAbsoluteDay(date);
  const expectedEndDay = startDay + quest.durationDays;
  const progress = createQuestProgress(questId, partyId, startDay, expectedEndDay, quest.durationDays);

  const members = party.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][];
  const regionName = state.regions[quest.regionId]?.name ?? "해당 지역";
  const departureLog = generateDepartureLog(quest, party, members, state.classes, regionName, date);

  return {
    ...state,
    quests: { ...state.quests, [questId]: updatedQuest },
    parties: { ...state.parties, [partyId]: updatedParty },
    adventurers,
    chronicle: [chronicle, ...state.chronicle],
    questProgress: { ...state.questProgress, [questId]: progress },
    adventureLogs: {
      ...state.adventureLogs,
      [questId]: [departureLog],
    },
  };
}
