import type { Quest, QuestEventCategory, QuestProgress } from "../../types/game";
import { EVENT_POOL, type EventDefinition, type QuestTag } from "./eventEngine";
import {
  checkMandatoryProgress,
  getReturnStartDay,
  isEventCategoryAllowedInReturn,
  type MandatoryStep,
} from "./questValidation";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UrgencyLevel = "none" | "low" | "high" | "critical";

export interface DirectorState {
  fulfilledSteps: MandatoryStep[];
  pendingSteps:   MandatoryStep[];
  daysUntilReturn: number;
  urgencyLevel:   UrgencyLevel;
}

export interface DirectorResult {
  forcedEvent:  EventDefinition;
  targetStep:   MandatoryStep;
  reason:       string;
  urgencyLevel: "high" | "critical";
}

// ── Director state assessment ─────────────────────────────────────────────────

export function getDirectorState(quest: Quest, prog: QuestProgress): DirectorState {
  const { fulfilled, pending } = checkMandatoryProgress(quest.type, prog.events, prog.currentStage);
  const returnStartDay  = getReturnStartDay(prog.totalDays);
  const daysUntilReturn = returnStartDay - prog.currentDay;

  let urgencyLevel: UrgencyLevel = "none";
  if (pending.length > 0) {
    if (daysUntilReturn <= 0)                         urgencyLevel = "critical";
    else if (daysUntilReturn <= pending.length)        urgencyLevel = "critical";
    else if (daysUntilReturn <= pending.length + 1)    urgencyLevel = "high";
    else                                               urgencyLevel = "low";
  }

  return { fulfilledSteps: fulfilled, pendingSteps: pending, daysUntilReturn, urgencyLevel };
}

// ── Event scoring ─────────────────────────────────────────────────────────────

function scoreEvent(def: EventDefinition, tags: Set<QuestTag>): number {
  let w = def.rarity === "epic" ? 0.1 : def.rarity === "rare" ? 0.5 : def.weight;
  if (def.boostedByTags) {
    for (const tag of def.boostedByTags) {
      if (tags.has(tag)) w += 2;
    }
  }
  return w;
}

// ── Director evaluation ───────────────────────────────────────────────────────
//
// Returns a forced event when urgency is "critical" (not enough remaining days
// to rely on random rolls to fulfil all pending mandatory steps).
// Returns null when urgency is "none", "low", or "high" — the normal
// selectEvent() flow with urgency weight boosts handles those cases.

export function evaluateDirector(
  quest: Quest,
  prog: QuestProgress,
  tags: Set<QuestTag>,
): DirectorResult | null {
  const state = getDirectorState(quest, prog);
  if (state.urgencyLevel !== "critical") return null;
  if (state.pendingSteps.length === 0)   return null;

  const targetStep = state.pendingSteps[0];

  const candidates = EVENT_POOL.filter(def => {
    if (def.rarity === "epic") return false;
    if (def.allowedQuestTypes && !def.allowedQuestTypes.includes(quest.type)) return false;
    if (def.blockedTags  && def.blockedTags.some(t => tags.has(t)))    return false;
    if (def.requiredTags && !def.requiredTags.every(t => tags.has(t))) return false;
    if (def.requiredStage && def.requiredStage !== prog.currentStage)  return false;
    if (prog.currentStage === "returning" && !isEventCategoryAllowedInReturn(def.category as QuestEventCategory)) return false;
    return (targetStep.triggerCategories as string[]).includes(def.category);
  });

  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => scoreEvent(a, tags) >= scoreEvent(b, tags) ? a : b);

  return {
    forcedEvent:  best,
    targetStep,
    reason:       `필수 단계 "${targetStep.id}" (${targetStep.description}) — 귀환까지 ${state.daysUntilReturn}일, 미완료 ${state.pendingSteps.length}개`,
    urgencyLevel: "critical",
  };
}
