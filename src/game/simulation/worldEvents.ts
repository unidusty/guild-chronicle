import type { ActiveWorldEvent, EntityId, GameDate, GameState, WorldEventHistoryEntry } from "../../types/game";
import { WORLD_EVENT_DEFINITIONS } from "../../data/worldEventData";
import { toAbsoluteDay } from "./recruitment";

const SPAWN_CHANCE = 0.30;
const MAX_CONCURRENT_EVENTS = 3;
const MAX_HISTORY_ENTRIES = 30;

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

export function tickWorldEvents(state: GameState, currentDate: GameDate): {
  state: GameState;
  expired: ActiveWorldEvent[];
  historyEntries: WorldEventHistoryEntry[];
} {
  const stillActive: ActiveWorldEvent[] = [];
  const expired: ActiveWorldEvent[] = [];
  const historyEntries: WorldEventHistoryEntry[] = [];

  for (const event of state.activeWorldEvents) {
    if (event.remainingDays <= 1) {
      expired.push(event);
      historyEntries.push({
        id: `weh-${event.id}`,
        definitionId: event.definitionId,
        startedAt: event.startedAt,
        endedAt: currentDate,
      });
    } else {
      stillActive.push({ ...event, remainingDays: event.remainingDays - 1 });
    }
  }

  // Clean up pending notifications for expired events
  const expiredIds = new Set(expired.map((e) => e.id));
  const pendingWorldEventNotifications = state.pendingWorldEventNotifications.filter(
    (n) => !expiredIds.has(n.id),
  );

  const newHistory = [
    ...historyEntries,
    ...state.worldEventHistory,
  ].slice(0, MAX_HISTORY_ENTRIES);

  return {
    state: {
      ...state,
      activeWorldEvents: stillActive,
      worldEventHistory: newHistory,
      pendingWorldEventNotifications,
    },
    expired,
    historyEntries,
  };
}

function spawnEvent(
  state: GameState,
  definitionId: EntityId,
  date: GameDate,
): { state: GameState; spawned: ActiveWorldEvent } {
  const def = WORLD_EVENT_DEFINITIONS.find((d) => d.id === definitionId)!;
  const range = def.maxDurationDays - def.minDurationDays;
  const duration = def.minDurationDays + Math.floor(Math.random() * (range + 1));
  const id = `awe-${def.id}-${date.year}${date.season[0]}${date.day}`;
  const spawned: ActiveWorldEvent = {
    id,
    definitionId: def.id,
    startedAt: date,
    remainingDays: duration,
    effects: [...def.effects],
  };

  const notification = def.inboxTitle
    ? [{ id, definitionId: def.id, day: toAbsoluteDay(date) }]
    : [];

  return {
    state: {
      ...state,
      activeWorldEvents: [...state.activeWorldEvents, spawned],
      pendingWorldEventNotifications: [...state.pendingWorldEventNotifications, ...notification],
    },
    spawned,
  };
}

export function trySpawnFollowUpEvent(
  state: GameState,
  followUpIds: EntityId[],
  date: GameDate,
): { state: GameState; spawned: ActiveWorldEvent | null } {
  if (state.activeWorldEvents.length >= MAX_CONCURRENT_EVENTS) {
    return { state, spawned: null };
  }

  const activeDefIds = new Set(state.activeWorldEvents.map((e) => e.definitionId));
  const activeGroups = new Set(
    state.activeWorldEvents
      .map((e) => getWorldEventDefinition(e.definitionId)?.conflictGroup)
      .filter((g): g is string => g !== undefined),
  );

  const validId = followUpIds.find((fid) => {
    if (activeDefIds.has(fid)) return false;
    const def = WORLD_EVENT_DEFINITIONS.find((d) => d.id === fid);
    if (!def) return false;
    if (def.conflictGroup && activeGroups.has(def.conflictGroup)) return false;
    return true;
  });

  if (!validId) return { state, spawned: null };

  const { state: next, spawned } = spawnEvent(state, validId, date);
  return { state: next, spawned };
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

  const { state: next, spawned } = spawnEvent(state, selected.id, date);
  return { state: next, spawned };
}

export function dismissWorldEventNotification(state: GameState, eventId: EntityId): GameState {
  return {
    ...state,
    pendingWorldEventNotifications: state.pendingWorldEventNotifications.filter(
      (n) => n.id !== eventId,
    ),
  };
}
