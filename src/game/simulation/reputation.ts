import type {
  EntityId,
  GameDate,
  GameState,
  ReputationChange,
  ReputationChangeType,
} from "../../types/game";
import { getReputationTier } from "../constants/reputation";
import { tryTriggerReputationEvent } from "./reputationEvents";

interface ReputationChangeParams {
  type: ReputationChangeType;
  delta: number;
  description: string;
  date: GameDate;
  sourceId?: EntityId;
  questId?: EntityId;
}

// Apply a reputation change to state. Idempotent by sourceId.
export function applyReputationChange(
  state: GameState,
  params: ReputationChangeParams,
): GameState {
  const { type, delta, description, date, sourceId, questId } = params;

  // Dedup: skip if we already have a change from this source
  if (sourceId && state.reputationChanges.some((c) => c.sourceId === sourceId)) {
    return state;
  }

  const before = state.guild.reputation;
  const raw = before + delta;
  const after = Math.max(0, raw);
  const actualDelta = after - before;

  if (actualDelta === 0 && delta === 0) return state;

  const change: ReputationChange = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date,
    type,
    delta: actualDelta,
    reputationBefore: before,
    reputationAfter: after,
    description,
    sourceId,
  };

  const tierBefore = getReputationTier(before);
  const tierAfter  = getReputationTier(after);
  const tierChanged = tierBefore.label !== tierAfter.label;

  // Chronicle entry: on tier change or large swing (|delta| >= 20)
  const isSignificant = tierChanged || Math.abs(actualDelta) >= 20;
  let chronicle = state.chronicle;
  if (isSignificant) {
    const chronicleId = `rep-chr-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}-${change.id.slice(-4)}`;
    const title = tierChanged
      ? `${tierAfter.label} 달성`
      : actualDelta > 0 ? "길드 명성 상승" : "길드 명성 하락";
    const desc = tierChanged
      ? `길드가 '${tierBefore.label}'에서 '${tierAfter.label}'(으)로 성장했습니다. 현재 명성 ${after}.`
      : `${description} (${actualDelta > 0 ? "+" : ""}${actualDelta}, 현재 ${after})`;
    chronicle = [
      {
        id: chronicleId,
        date,
        scope: "guild",
        category: "reputation",
        title,
        description: desc,
        relatedEntityIds: questId ? [questId] : [],
      },
      ...state.chronicle,
    ];
  }

  let next: GameState = {
    ...state,
    guild: { ...state.guild, reputation: after },
    reputationChanges: [change, ...state.reputationChanges],
    chronicle,
  };

  if (tierChanged) {
    const si = ["spring", "summer", "autumn", "winter"].indexOf(date.season);
    const absoluteDay = date.year * 120 + si * 30 + date.day;
    next = tryTriggerReputationEvent(next, tierAfter.label, absoluteDay);
  }

  return next;
}
