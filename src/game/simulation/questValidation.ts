import type { QuestCategory, QuestEvent, QuestEventCategory, QuestStage } from "../../types/game";

export interface MandatoryStep {
  id: string;
  description: string;
  triggerCategories: QuestEventCategory[];
  minimumStage: QuestStage;
}

const MANDATORY_SEQUENCES: Record<QuestCategory, MandatoryStep[]> = {
  hunt: [
    { id: "hunt-track",     description: "목표 추적",   triggerCategories: ["exploration", "combat"], minimumStage: "searching" },
    { id: "hunt-encounter", description: "목표 조우",   triggerCategories: ["combat"],               minimumStage: "executing" },
    { id: "hunt-result",    description: "전투 결말",   triggerCategories: ["combat", "danger"],      minimumStage: "executing" },
  ],
  escort: [
    { id: "escort-threat",    description: "위협 발생",     triggerCategories: ["combat", "danger", "environment"], minimumStage: "searching" },
  ],
  exploration: [
    { id: "explore-discover", description: "발견",          triggerCategories: ["exploration", "reward"],            minimumStage: "searching" },
    { id: "explore-examine",  description: "정밀 탐사",     triggerCategories: ["exploration", "combat", "danger"],  minimumStage: "executing" },
  ],
  search: [
    { id: "search-clue",      description: "단서 확보",     triggerCategories: ["exploration", "person"],            minimumStage: "searching" },
    { id: "search-target",    description: "목표 발견",     triggerCategories: ["exploration", "person", "danger"],  minimumStage: "executing" },
  ],
  rescue: [
    { id: "rescue-locate",    description: "생존자 위치 파악", triggerCategories: ["exploration", "person"],            minimumStage: "searching" },
    { id: "rescue-attempt",   description: "구조 시도",        triggerCategories: ["person", "combat", "danger"],       minimumStage: "executing" },
  ],
  delivery: [
    { id: "deliver-obstacle", description: "장애 발생",     triggerCategories: ["combat", "environment", "danger"],   minimumStage: "searching" },
  ],
};

const STAGE_ORDER: QuestStage[] = ["traveling", "searching", "executing", "returning"];

export function getMandatorySequence(questType: QuestCategory): MandatoryStep[] {
  return MANDATORY_SEQUENCES[questType] ?? [];
}

export function checkMandatoryProgress(
  questType: QuestCategory,
  events: QuestEvent[],
  currentStage: QuestStage,
): { fulfilled: MandatoryStep[]; pending: MandatoryStep[]; allFulfilled: boolean } {
  const sequence        = getMandatorySequence(questType);
  const currentStageIdx = STAGE_ORDER.indexOf(currentStage);

  const fulfilled: MandatoryStep[] = [];
  const pending:   MandatoryStep[] = [];

  for (const step of sequence) {
    const stepStageIdx = STAGE_ORDER.indexOf(step.minimumStage);
    if (currentStageIdx < stepStageIdx) continue; // Not yet in scope
    const met = events.some(e => (step.triggerCategories as string[]).includes(e.category));
    if (met) fulfilled.push(step);
    else     pending.push(step);
  }

  return { fulfilled, pending, allFulfilled: pending.length === 0 };
}

export function getPendingMandatoryCategories(
  questType: QuestCategory,
  events: QuestEvent[],
  currentStage: QuestStage,
): Set<QuestEventCategory> {
  const { pending } = checkMandatoryProgress(questType, events, currentStage);
  const cats = new Set<QuestEventCategory>();
  for (const step of pending) {
    for (const cat of step.triggerCategories) cats.add(cat);
  }
  return cats;
}

export function getMandatoryUrgencyMultiplier(
  questType: QuestCategory,
  events: QuestEvent[],
  currentStage: QuestStage,
  currentDay: number,
  totalDays: number,
  eventCategory: QuestEventCategory,
): number {
  const pendingCats = getPendingMandatoryCategories(questType, events, currentStage);
  if (!pendingCats.has(eventCategory)) return 1;

  const daysLeft = getReturnStartDay(totalDays) - currentDay;
  if (daysLeft <= 0) return 3;
  if (daysLeft === 1) return 2.5;
  if (daysLeft <= 2) return 2;
  return 1.5;
}

export function getReturnStartDay(totalDays: number): number {
  const returnDays = totalDays <= 5 ? 1 : 2;
  return Math.max(1, totalDays - returnDays);
}

export function isEventCategoryAllowedInReturn(category: QuestEventCategory): boolean {
  return category === "environment" || category === "danger";
}

export function validateQuestCompletion(
  questType: QuestCategory,
  events: QuestEvent[],
  currentStage: QuestStage,
): { valid: boolean; warnings: string[] } {
  const { pending } = checkMandatoryProgress(questType, events, currentStage);
  const warnings = pending.map(
    s => `[018-M] Quest type "${questType}": mandatory step "${s.id}" (${s.description}) was never triggered.`,
  );
  return { valid: warnings.length === 0, warnings };
}
