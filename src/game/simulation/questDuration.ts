import type {
  EntityId,
  GameDate,
  QuestCategory,
  QuestDurationChange,
  QuestDurationChangeSourceType,
  QuestProgress,
} from "../../types/game";
import { checkMandatoryProgress } from "./questValidation";

// ── Extension limits ──────────────────────────────────────────────────────────

const MAX_EXTENSION_RATIO = 0.5;  // max 50% of initial duration
const MAX_EXTENSION_DAYS  = 10;   // absolute cap regardless of ratio

// ── Event → duration delta mapping ───────────────────────────────────────────
//
// Positive  = delay (days added)
// Negative  = shortcut (days removed)
// Events not listed here have no duration effect.

export const DURATION_DELTA_BY_EVENT: Record<string, number> = {
  // Delays — environment events causing detours or halts
  "ev-env-001": 1,  // 폭우 — 시야 감소, 이동 지연
  "ev-env-002": 1,  // 짙은 안개 — 탐색 속도 저하
  "ev-env-003": 1,  // 낙석 — 우회로 탐색
  "ev-env-004": 2,  // 경로 붕괴 — 새 경로 확보 필요
  "ev-env-005": 2,  // 갑작스러운 폭설 — 이동 속도 급감
  "ev-env-006": 2,  // 강물 범람 — 예정 도하 지점 봉쇄

  // Shortcuts — information or discovery events
  "ev-explore-010": -1,  // 오래된 지도 발견 — 경로 최적화
  "ev-person-004":  -1,  // 지역 주민 정보 입수 — 목표 위치 확인
};

// ── Dedup check ───────────────────────────────────────────────────────────────

export function isDurationChangeApplied(
  prog: QuestProgress,
  sourceType: QuestDurationChangeSourceType,
  sourceId: EntityId,
): boolean {
  return prog.durationChanges.some(
    (c) => c.sourceType === sourceType && c.sourceId === sourceId,
  );
}

// ── Duration delta lookup ─────────────────────────────────────────────────────

export function getEventDurationDelta(definitionId: string): number {
  return DURATION_DELTA_BY_EVENT[definitionId] ?? 0;
}

// ── Cap / floor helpers ───────────────────────────────────────────────────────

function calcMaxExtensionDays(initialEstimatedDays: number): number {
  return Math.min(
    Math.floor(initialEstimatedDays * MAX_EXTENSION_RATIO),
    MAX_EXTENSION_DAYS,
  );
}

function calcMinRemainingDays(questType: QuestCategory, prog: QuestProgress): number {
  const { pending } = checkMandatoryProgress(questType, prog.events, prog.currentStage);
  // Reserve at least 1 day per pending mandatory step + 1 day for the return phase
  return Math.max(1, pending.length + 1);
}

// ── Core application ──────────────────────────────────────────────────────────

export interface DurationChangeParams {
  questType: QuestCategory;
  // quest.remainingDays as it stands at the moment of the call:
  //   • in advance.ts (events): after today's decrement
  //   • in questDecisions.ts (decisions): before decrement
  currentRemainingDays: number;
  prog: QuestProgress;
  requestedDelta: number;   // positive = extend, negative = shorten
  sourceType: QuestDurationChangeSourceType;
  sourceId: EntityId;
  reason: string;
  date: GameDate;
}

export interface DurationChangeResult {
  updatedProg: QuestProgress;
  actualDelta: number;
}

export function tryApplyDurationChange(
  params: DurationChangeParams,
): DurationChangeResult | null {
  const {
    questType, currentRemainingDays, prog,
    requestedDelta, sourceType, sourceId, reason, date,
  } = params;

  // 1. Dedup: same source never applies twice
  if (isDurationChangeApplied(prog, sourceType, sourceId)) return null;

  if (requestedDelta === 0) return null;

  // 2. Clamp to allowed range
  let clampedDelta = requestedDelta;

  if (requestedDelta > 0) {
    // Extension: honour the per-quest cap
    const totalExtension = prog.currentEstimatedDays - prog.initialEstimatedDays;
    const maxExtension   = calcMaxExtensionDays(prog.initialEstimatedDays);
    const remainingRoom  = maxExtension - totalExtension;
    if (remainingRoom <= 0) return null;
    clampedDelta = Math.min(requestedDelta, remainingRoom);
  } else {
    // Shortening: keep enough days for mandatory flow and return phase
    const minRemaining = calcMinRemainingDays(questType, prog);
    const maxReduction = Math.max(0, currentRemainingDays - minRemaining);
    if (maxReduction <= 0) return null;
    clampedDelta = -Math.min(-requestedDelta, maxReduction);
  }

  if (clampedDelta === 0) return null;

  // 3. Build the change record
  const previousEstimatedDays = prog.currentEstimatedDays;
  const nextEstimatedDays     = prog.currentEstimatedDays + clampedDelta;

  const change: QuestDurationChange = {
    id:                   `qdc-${prog.questId}-${sourceType}-${sourceId}`,
    questId:              prog.questId,
    date,
    deltaDays:            clampedDelta,
    reason,
    sourceType,
    sourceId,
    previousEstimatedDays,
    nextEstimatedDays,
    stage: prog.currentStage,
  };

  // 4. Return updated progress (caller updates quest.remainingDays separately)
  const updatedProg: QuestProgress = {
    ...prog,
    currentEstimatedDays: nextEstimatedDays,
    totalDays:            nextEstimatedDays, // Quest Director urgency uses totalDays
    durationChanges:      [...prog.durationChanges, change],
  };

  return { updatedProg, actualDelta: clampedDelta };
}
