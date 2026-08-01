import type { EntityId, QuestProgress, QuestStage } from "../../types/game";

export function calcQuestStage(progress: number): QuestStage {
  if (progress < 20) return "traveling";
  if (progress < 50) return "searching";
  if (progress < 75) return "executing";
  return "returning";
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
  };
}
