import type { ChronicleEntry, GameDate, GameState, QuestCompletionResult } from "../../types/game";

// ── Date arithmetic ─────────────────────────────────────────────────────────

const SEASON_ORDER = ["spring", "summer", "autumn", "winter"] as const;
type Season = typeof SEASON_ORDER[number];

export function advanceDate(date: GameDate): GameDate {
  if (date.day < 30) return { ...date, day: date.day + 1 };

  const idx  = SEASON_ORDER.indexOf(date.season as Season);
  const next = SEASON_ORDER[(idx + 1) % 4];
  return { year: next === "spring" ? date.year + 1 : date.year, season: next, day: 1 };
}

// ── Quest & adventurer update ────────────────────────────────────────────────

const DAILY_PROGRESS = 15;

function updateQuests(state: GameState): GameState {
  const newEntries: ChronicleEntry[] = [];
  const newResults: QuestCompletionResult[] = [];
  const quests      = { ...state.quests };
  const adventurers = { ...state.adventurers };
  const parties     = { ...state.parties };
  const date        = state.currentDate;

  for (const quest of Object.values(state.quests)) {
    if (quest.status !== "assigned") continue;

    const remaining = quest.remainingDays - 1;

    if (remaining <= 0) {
      quests[quest.id] = { ...quest, remainingDays: 0, progress: 100, status: "completed" };

      const party = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;
      if (party) {
        parties[party.id] = {
          ...party,
          status: "idle",
          activeQuestId: null,
          currentFormationQuestCount: party.currentFormationQuestCount + 1,
          questsCompleted: party.questsCompleted + 1,
          totalActivityDays: party.totalActivityDays + quest.durationDays,
        };

        for (const memberId of party.memberIds) {
          if (adventurers[memberId]) {
            adventurers[memberId] = {
              ...adventurers[memberId],
              status: "idle",
              currentQuestId: null,
              questsCompleted: adventurers[memberId].questsCompleted + 1,
              totalActivityDays: adventurers[memberId].totalActivityDays + quest.durationDays,
            };
          }
        }

        newResults.push({
          questId:        quest.id,
          questTitle:     quest.title,
          grade:          quest.grade,
          partyId:        party.id,
          partyName:      party.name,
          adventurerIds:  [...party.memberIds],
          durationDays:   quest.durationDays,
          rewardGold:     quest.rewardGold,
          completedAt:    date,
        });

        newEntries.push({
          id: `chronicle-complete-${quest.id}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
          date,
          scope:            "guild",
          category:         "quest",
          title:            `${quest.title} 완료`,
          description:      `${party.name}이(가) 의뢰를 마치고 길드로 귀환했습니다.`,
          relatedEntityIds: [party.id, ...party.memberIds],
        });
      }
    } else {
      quests[quest.id] = {
        ...quest,
        remainingDays: remaining,
        progress:      Math.min(99, quest.progress + DAILY_PROGRESS),
      };
    }
  }

  return {
    ...state,
    quests,
    adventurers,
    parties,
    chronicle: [...newEntries, ...state.chronicle],
    pendingResults: [...state.pendingResults, ...newResults],
  };
}

// ── Injury recovery ──────────────────────────────────────────────────────────

function updateInjuries(state: GameState): GameState {
  const newEntries: ChronicleEntry[] = [];
  const injuries    = { ...state.injuries };
  const adventurers = { ...state.adventurers };
  const date        = state.currentDate;

  for (const injury of Object.values(state.injuries)) {
    const remaining = injury.recoveryDays - 1;

    if (remaining <= 0) {
      delete injuries[injury.id];

      const adv = adventurers[injury.adventurerId];
      if (adv) {
        const newInjuryIds = adv.injuryIds.filter((id) => id !== injury.id);
        adventurers[adv.id] = {
          ...adv,
          injuryIds: newInjuryIds,
          status:    newInjuryIds.length === 0 ? "idle" : adv.status,
        };

        newEntries.push({
          id: `chronicle-recover-${adv.id}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
          date,
          scope:            "adventurer",
          category:         "injury",
          title:            "부상 회복 완료",
          description:      `${adv.name}의 ${injury.name}이(가) 완전히 회복되었습니다.`,
          relatedEntityIds: [adv.id],
        });
      }
    } else {
      injuries[injury.id] = { ...injury, recoveryDays: remaining };
    }
  }

  return {
    ...state,
    injuries,
    adventurers,
    chronicle: [...newEntries, ...state.chronicle],
  };
}

// ── Training progress ────────────────────────────────────────────────────────

function updateTraining(state: GameState): GameState {
  const newEntries: ChronicleEntry[] = [];
  const adventurers = { ...state.adventurers };
  const date        = state.currentDate;

  for (const adv of Object.values(state.adventurers)) {
    if (adv.status !== "training") continue;

    const remaining = adv.trainingDays - 1;

    if (remaining <= 0) {
      adventurers[adv.id] = { ...adv, trainingDays: 0, status: "idle" };

      newEntries.push({
        id: `chronicle-train-${adv.id}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
        date,
        scope:            "adventurer",
        category:         "growth",
        title:            "훈련 완료",
        description:      `${adv.name}이(가) 훈련을 마치고 대기 상태로 복귀했습니다.`,
        relatedEntityIds: [adv.id],
      });
    } else {
      adventurers[adv.id] = { ...adv, trainingDays: remaining };
    }
  }

  return {
    ...state,
    adventurers,
    chronicle: [...newEntries, ...state.chronicle],
  };
}

// ── Party formation days ────────────────────────────────────────────────────

function updatePartyFormations(state: GameState): GameState {
  const parties = { ...state.parties };
  for (const party of Object.values(state.parties)) {
    parties[party.id] = { ...party, currentFormationDays: party.currentFormationDays + 1 };
  }
  return { ...state, parties };
}

// ── Age increment (year change only) ────────────────────────────────────────

function updateAges(state: GameState): GameState {
  const adventurers = { ...state.adventurers };

  for (const adv of Object.values(state.adventurers)) {
    if (!adv.isArchived) {
      adventurers[adv.id] = { ...adv, age: adv.age + 1 };
    }
  }

  return { ...state, adventurers };
}

// ── Main advance function ────────────────────────────────────────────────────

export function advanceDay(state: GameState): GameState {
  const newDate = advanceDate(state.currentDate);
  const yearChanged = newDate.year > state.currentDate.year;

  let next: GameState = { ...state, currentDate: newDate };
  next = updateQuests(next);
  next = updateInjuries(next);
  next = updateTraining(next);
  next = updatePartyFormations(next);
  if (yearChanged) next = updateAges(next);
  return next;
}
