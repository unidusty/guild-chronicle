import type { ActiveWorldEvent, GameDate, GameState } from "../../types/game";
import { WORLD_EVENT_DEFINITIONS } from "../../data/worldEventData";

const SPAWN_CHANCE = 0.30;
const MAX_CONCURRENT_EVENTS = 3;

export function getWorldEventDefinition(definitionId: string) {
  return WORLD_EVENT_DEFINITIONS.find((d) => d.id === definitionId) ?? null;
}

export function getWarehouseSaleModifier(state: GameState): number {
  return state.activeWorldEvents.reduce(
    (sum, event) =>
      sum + event.effects.filter((e) => e.target === "warehouse_sale").reduce((s, e) => s + e.modifier, 0),
    0,
  );
}

export function getQuestRewardModifier(state: GameState): number {
  return state.activeWorldEvents.reduce(
    (sum, event) =>
      sum + event.effects.filter((e) => e.target === "quest_reward").reduce((s, e) => s + e.modifier, 0),
    0,
  );
}

export function getRecruitmentModifier(state: GameState): number {
  return state.activeWorldEvents.reduce(
    (sum, event) =>
      sum + event.effects.filter((e) => e.target === "recruitment").reduce((s, e) => s + e.modifier, 0),
    0,
  );
}

export function tickWorldEvents(state: GameState): {
  state: GameState;
  expired: ActiveWorldEvent[];
} {
  const stillActive: ActiveWorldEvent[] = [];
  const expired: ActiveWorldEvent[] = [];

  for (const event of state.activeWorldEvents) {
    if (event.remainingDays <= 1) {
      expired.push(event);
    } else {
      stillActive.push({ ...event, remainingDays: event.remainingDays - 1 });
    }
  }

  return { state: { ...state, activeWorldEvents: stillActive }, expired };
}

export function trySpawnWorldEvent(
  state: GameState,
  date: GameDate,
): { state: GameState; spawned: ActiveWorldEvent | null } {
  if (state.activeWorldEvents.length >= MAX_CONCURRENT_EVENTS) {
    return { state, spawned: null };
  }

  if (Math.random() >= SPAWN_CHANCE) {
    return { state, spawned: null };
  }

  const activeDefIds = new Set(state.activeWorldEvents.map((e) => e.definitionId));
  const activeGroups = new Set(
    state.activeWorldEvents
      .map((e) => getWorldEventDefinition(e.definitionId)?.conflictGroup)
      .filter((g): g is string => g !== undefined),
  );

  const candidates = WORLD_EVENT_DEFINITIONS.filter((def) => {
    if (activeDefIds.has(def.id)) return false;
    if (def.conflictGroup && activeGroups.has(def.conflictGroup)) return false;
    return true;
  });

  if (candidates.length === 0) {
    return { state, spawned: null };
  }

  const totalWeight = candidates.reduce((s, d) => s + d.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected = candidates[candidates.length - 1];
  for (const def of candidates) {
    roll -= def.weight;
    if (roll <= 0) {
      selected = def;
      break;
    }
  }

  const range = selected.maxDurationDays - selected.minDurationDays;
  const duration = selected.minDurationDays + Math.floor(Math.random() * (range + 1));

  const id = `awe-${selected.id}-${date.year}${date.season[0]}${date.day}`;
  const spawned: ActiveWorldEvent = {
    id,
    definitionId: selected.id,
    startedAt: date,
    remainingDays: duration,
    effects: [...selected.effects],
  };

  return {
    state: { ...state, activeWorldEvents: [...state.activeWorldEvents, spawned] },
    spawned,
  };
}
