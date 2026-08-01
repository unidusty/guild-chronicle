import type {
  ChronicleEntry,
  EntityId,
  GameDate,
  GameState,
  QuestDecision,
  QuestDecisionType,
  QuestEventCategory,
  QuestResult,
} from "../../types/game";
import { calcCurrentDangerLevel } from "./questResult";
import { buildQuestChronicleEntry } from "./questChronicle";
import { generateDecisionLog, generateCompletionLog } from "./adventureLog";

export const DECISION_LABELS: Record<QuestDecisionType, string> = {
  continue:         "계속 진행",
  withdraw:         "조기 귀환",
  support_dispatch: "지원 파견",
  extra_explore:    "추가 탐색",
  abandon:          "의뢰 포기",
};

export const CHOICES_BY_CATEGORY: Record<QuestEventCategory, QuestDecisionType[]> = {
  exploration: ["continue", "extra_explore", "withdraw"],
  combat:      ["continue", "support_dispatch", "withdraw", "abandon"],
  environment: ["continue", "withdraw"],
  reward:      ["continue", "extra_explore"],
  person:      ["continue", "withdraw"],
  danger:      ["continue", "support_dispatch", "withdraw", "abandon"],
};

function absDay(date: GameDate): number {
  const si = ["spring", "summer", "autumn", "winter"].indexOf(date.season);
  return date.year * 120 + si * 30 + date.day;
}

export function applyQuestDecision(
  state: GameState,
  questId: EntityId,
  eventId: EntityId,
  decision: QuestDecisionType,
  supportPartyId?: EntityId,
): GameState {
  const prog = state.questProgress[questId];
  const quest = state.quests[questId];
  if (!prog || !quest) return state;

  const date = state.currentDate;
  const party = state.parties[prog.partyId];

  const decisionEntry: QuestDecision = {
    decisionId: `decision-${questId}-${eventId}-${absDay(date)}`,
    eventId,
    questId,
    partyId: prog.partyId,
    day: prog.currentDay,
    decision,
    supportPartyId: supportPartyId ?? null,
  };

  if (decision === "withdraw" || decision === "abandon") {
    const adventurers = { ...state.adventurers };
    if (party) {
      for (const memberId of party.memberIds) {
        if (adventurers[memberId]) {
          adventurers[memberId] = {
            ...adventurers[memberId],
            status: "idle",
            currentQuestId: null,
          };
        }
      }
    }

    const updatedParties = party
      ? { ...state.parties, [prog.partyId]: { ...party, status: "idle" as const, activeQuestId: null } }
      : state.parties;

    const questProgress = { ...state.questProgress };
    delete questProgress[questId];

    const updatedQuest = decision === "withdraw"
      ? { ...quest, status: "available" as const, assignedPartyId: null, remainingDays: quest.durationDays, progress: 0 }
      : { ...quest, status: "failed" as const, assignedPartyId: null };

    const chronicleEntry: ChronicleEntry = {
      id: `chronicle-${decision}-${questId}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
      date,
      scope: "guild",
      category: "quest",
      title: decision === "withdraw"
        ? `${quest.title} 조기 귀환`
        : `${quest.title} 포기`,
      description: decision === "withdraw"
        ? `${party?.name ?? "파티"}이(가) 의뢰를 중단하고 귀환을 결정했습니다.`
        : `${party?.name ?? "파티"}이(가) 의뢰를 포기했습니다.`,
      relatedEntityIds: party ? [party.id, ...party.memberIds] : [],
    };

    const questResult: QuestResult = {
      questId:      quest.id,
      partyId:      prog.partyId,
      resultGrade:  decision === "withdraw" ? "retreat" : "failure",
      successRate:  0,
      success:      false,
      dangerLevel:  calcCurrentDangerLevel(quest, prog),
      supportUsed:  prog.decisions.some(d => d.decision === "support_dispatch"),
      retreat:      decision === "withdraw",
      extraExplore: prog.decisions.some(d => d.decision === "extra_explore"),
      completedAt:  date,
    };

    const questChronicleEntry = buildQuestChronicleEntry(quest, prog, party ?? null, questResult, state);

    // Generate decision + completion adventure logs
    const decLog = generateDecisionLog(quest, decisionEntry, prog, party ?? null, null, date);
    const members = party ? party.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][] : [];
    const withdrawSupportParties = prog.decisions
      .filter(d => d.decision === "support_dispatch" && d.supportPartyId && (prog.currentDay - d.day) >= 2)
      .map(d => state.parties[d.supportPartyId!])
      .filter((p): p is typeof p & object => p !== undefined);
    const compLog = generateCompletionLog(quest, questResult, prog, party ?? null, members, state.classes, date, state.regions[quest.regionId]?.name ?? "", withdrawSupportParties);
    const existingLogs = state.adventureLogs[questId] ?? [];
    const updatedAdventureLogs = {
      ...state.adventureLogs,
      [questId]: [...existingLogs, decLog, compLog],
    };

    return {
      ...state,
      quests: { ...state.quests, [questId]: updatedQuest },
      parties: updatedParties,
      adventurers,
      questProgress,
      questResults: { ...state.questResults, [questId]: questResult },
      questChronicle: [questChronicleEntry, ...state.questChronicle],
      chronicle: [chronicleEntry, ...state.chronicle],
      adventureLogs: updatedAdventureLogs,
    };
  }

  // continue / extra_explore / support_dispatch: record decision and mark event read
  const updatedProgress = {
    ...prog,
    hasIncident: prog.events.some(e => !e.read && e.eventId !== eventId),
    events: prog.events.map(e => e.eventId === eventId ? { ...e, read: true } : e),
    decisions: [...prog.decisions, decisionEntry],
  };

  // Generate decision adventure log entry
  const decisionLog = generateDecisionLog(
    quest,
    decisionEntry,
    updatedProgress,
    party ?? null,
    supportPartyId ? (state.parties[supportPartyId]?.name ?? null) : null,
    date,
  );
  const existingLogsForContinue = state.adventureLogs[questId] ?? [];

  // Dispatch support party immediately (they travel, but are committed)
  if (decision === "support_dispatch" && supportPartyId) {
    const supportParty = state.parties[supportPartyId];
    if (supportParty && supportParty.status === "idle") {
      const updatedAdventurers = { ...state.adventurers };
      for (const memberId of supportParty.memberIds) {
        if (updatedAdventurers[memberId]) {
          updatedAdventurers[memberId] = {
            ...updatedAdventurers[memberId],
            status: "dispatched",
            currentQuestId: questId,
          };
        }
      }
      return {
        ...state,
        parties: {
          ...state.parties,
          [supportPartyId]: { ...supportParty, status: "dispatched", activeQuestId: questId },
        },
        adventurers: updatedAdventurers,
        questProgress: { ...state.questProgress, [questId]: updatedProgress },
        adventureLogs: { ...state.adventureLogs, [questId]: [...existingLogsForContinue, decisionLog] },
      };
    }
  }

  return {
    ...state,
    questProgress: { ...state.questProgress, [questId]: updatedProgress },
    adventureLogs: { ...state.adventureLogs, [questId]: [...existingLogsForContinue, decisionLog] },
  };
}
