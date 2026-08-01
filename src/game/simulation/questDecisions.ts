import type {
  ChronicleEntry,
  EntityId,
  GameDate,
  GameState,
  QuestDecision,
  QuestDecisionType,
  QuestEventCategory,
} from "../../types/game";

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

    return {
      ...state,
      quests: { ...state.quests, [questId]: updatedQuest },
      parties: updatedParties,
      adventurers,
      questProgress,
      chronicle: [chronicleEntry, ...state.chronicle],
    };
  }

  // continue / extra_explore / support_dispatch: record decision and mark event read
  const updatedProgress = {
    ...prog,
    hasIncident: prog.events.some(e => !e.read && e.eventId !== eventId),
    events: prog.events.map(e => e.eventId === eventId ? { ...e, read: true } : e),
    decisions: [...prog.decisions, decisionEntry],
  };

  return {
    ...state,
    questProgress: { ...state.questProgress, [questId]: updatedProgress },
  };
}
