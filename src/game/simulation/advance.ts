import type { ChronicleEntry, GameDate, GameState } from "../../types/game";

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
        parties[party.id] = { ...party, status: "idle", activeQuestId: null };

        for (const memberId of party.memberIds) {
          if (adventurers[memberId]) {
            adventurers[memberId] = { ...adventurers[memberId], status: "idle", currentQuestId: null };
          }
        }

        newEntries.push({
          id: `chronicle-complete-${quest.id}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
          date,
          scope:            "guild",
          category:         "quest",
          title:            `${quest.title} 완료`,
          description:      `${party.name}가 의뢰를 마치고 길드로 귀환했습니다.`,
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
  };
}

// ── Stubs (filled in as game systems grow) ───────────────────────────────────

function updateRecovery  (state: GameState): GameState { return state; }
function checkDailyEvents(state: GameState): GameState { return state; }

// ── Main advance function ────────────────────────────────────────────────────

export function advanceDay(state: GameState): GameState {
  let next: GameState = { ...state, currentDate: advanceDate(state.currentDate) };
  next = updateQuests(next);
  next = updateRecovery(next);
  next = checkDailyEvents(next);
  return next;
}
