import type { DailyReport, DailyReportItem, GameState } from "../../types/game";
import { advanceDay } from "./advance";
import { advanceFacilityConstruction } from "./facilities";

export function processDayEnd(state: GameState): { newState: GameState; report: DailyReport } {
  const previousDate = state.currentDate;
  const prevPendingCount = state.pendingResults.length;

  // Snapshot finishing-today items before advancing
  const finishingInjuryIds = Object.values(state.injuries)
    .filter((inj) => inj.recoveryDays <= 1)
    .map((inj) => inj.id);

  const finishingTrainingIds = Object.values(state.adventurers)
    .filter((a) => a.status === "training" && a.trainingDays <= 1)
    .map((a) => a.id);

  // 1. Advance facility construction
  const { state: afterFacilities, completed: completedFacilities } =
    advanceFacilityConstruction(state);

  // 2. Advance day (quests, injuries, training, party formations, date)
  const newState = advanceDay(afterFacilities);

  // 3. Collect report items
  const items: DailyReportItem[] = [];

  // Completed quests
  for (const result of newState.pendingResults.slice(prevPendingCount)) {
    items.push({
      kind: "quest_completed",
      title: `의뢰 완료 — ${result.questTitle}`,
      description: `${result.partyName}이(가) 귀환했습니다.`,
    });
  }

  // Completed facility constructions
  for (const f of completedFacilities) {
    items.push({
      kind: "facility_completed",
      title: `시설 완공 — ${f.name}`,
      description: `${f.name} 공사가 완료되었습니다.`,
    });
  }

  // Recovered injuries
  for (const injuryId of finishingInjuryIds) {
    if (!newState.injuries[injuryId]) {
      const injury = state.injuries[injuryId];
      const adv = injury ? newState.adventurers[injury.adventurerId] : null;
      if (adv && injury) {
        items.push({
          kind: "injury_recovered",
          title: `부상 회복 — ${adv.name}`,
          description: `${injury.name}이(가) 완치되었습니다.`,
        });
      }
    }
  }

  // Completed training
  for (const advId of finishingTrainingIds) {
    const adv = newState.adventurers[advId];
    if (adv && adv.status === "idle") {
      items.push({
        kind: "training_completed",
        title: `훈련 완료 — ${adv.name}`,
        description: `${adv.name}이(가) 훈련을 마쳤습니다.`,
      });
    }
  }

  return {
    newState,
    report: { previousDate, nextDate: newState.currentDate, items },
  };
}
