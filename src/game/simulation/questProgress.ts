import type { EntityId, GameState, QuestDecision, QuestProgress, QuestStage } from "../../types/game";

export type { QuestDecision };

export function calcQuestStage(currentDay: number, totalDays: number): QuestStage {
  const returnDays     = totalDays <= 5 ? 1 : 2;
  const returnStartDay = Math.max(1, totalDays - returnDays);
  if (currentDay >= returnStartDay) return "returning";
  const activeRange = returnStartDay - 1;
  const travelEnd   = Math.max(1, Math.ceil(activeRange * 0.25));
  const searchEnd   = Math.max(travelEnd + 1, Math.ceil(activeRange * 0.55));
  if (currentDay <= travelEnd) return "traveling";
  if (currentDay <= searchEnd) return "searching";
  return "executing";
}

export function createQuestProgress(
  questId: EntityId,
  partyId: EntityId,
  startDay: number,
  expectedEndDay: number,
  totalDays: number,
): QuestProgress {
  return {
    questId,
    partyId,
    startDay,
    expectedEndDay,
    currentDay: 0,
    totalDays,
    currentStage: "traveling",
    reportRead: true,
    hasIncident: false,
    incidentId: null,
    events: [],
    decisions: [],
  };
}

export function markQuestEventsRead(state: GameState, questId: EntityId): GameState {
  const prog = state.questProgress[questId];
  if (!prog || !prog.hasIncident) return state;
  return {
    ...state,
    questProgress: {
      ...state.questProgress,
      [questId]: {
        ...prog,
        hasIncident: false,
        events: prog.events.map(e => ({ ...e, read: true })),
      },
    },
  };
}
