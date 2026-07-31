import type { ChronicleEntry, GameDate, GameState } from "../../types/game";
import { seasonLabels } from "../constants/labels";

// ── Date arithmetic ─────────────────────────────────────────────────────────

const SEASON_ORDER = ["spring", "summer", "autumn", "winter"] as const;
type Season = typeof SEASON_ORDER[number];

export function advanceDate(date: GameDate): GameDate {
  if (date.day < 30) return { ...date, day: date.day + 1 };

  const idx     = SEASON_ORDER.indexOf(date.season as Season);
  const nextIdx = (idx + 1) % 4;
  const next    = SEASON_ORDER[nextIdx];
  return { year: next === "spring" ? date.year + 1 : date.year, season: next, day: 1 };
}

// ── Chronicle entry for the new day ────────────────────────────────────────

function makeDayEntry(date: GameDate): ChronicleEntry {
  const label = `${seasonLabels[date.season]} ${date.day}일`;
  return {
    id: `chronicle-day-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
    date,
    scope:            "guild",
    category:         "world",
    title:            label,
    description:      `왕국력 ${date.year}년 ${label}이 시작되었습니다.`,
    relatedEntityIds: [],
  };
}

// ── Daily update stubs (fill in as game systems are built) ──────────────────

function updateQuests    (state: GameState): GameState { return state; }
function updateParties   (state: GameState): GameState { return state; }
function updateRecovery  (state: GameState): GameState { return state; }
function checkDailyEvents(state: GameState): GameState { return state; }

// ── Main advance function ───────────────────────────────────────────────────

export function advanceDay(state: GameState): GameState {
  const newDate = advanceDate(state.currentDate);
  const entry   = makeDayEntry(newDate);

  let next: GameState = {
    ...state,
    currentDate: newDate,
    chronicle:   [entry, ...state.chronicle],
  };

  next = updateQuests(next);
  next = updateParties(next);
  next = updateRecovery(next);
  next = checkDailyEvents(next);

  return next;
}
