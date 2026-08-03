import type { EntityId, GameState } from "../../types/game";
import { getReputationEventForTier } from "../../data/reputationEventData";

export function tryTriggerReputationEvent(
  state: GameState,
  tierLabel: string,
  day: number,
): GameState {
  const def = getReputationEventForTier(tierLabel);
  if (!def) return state;
  if (state.pendingReputationEvents.some((e) => e.id === def.id)) return state;
  return {
    ...state,
    pendingReputationEvents: [...state.pendingReputationEvents, { id: def.id, day }],
  };
}

export function dismissReputationEvent(state: GameState, eventId: EntityId): GameState {
  return {
    ...state,
    pendingReputationEvents: state.pendingReputationEvents.filter((e) => e.id !== eventId),
  };
}
