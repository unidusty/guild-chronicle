import type { DailyReport, DailyReportItem, GameState } from "../../types/game";
import { advanceDay } from "./advance";
import { advanceFacilityConstruction } from "./facilities";
import {
  expireApplicants,
  generateDailyApplicants,
  releaseHeldApplicants,
  toAbsoluteDay,
} from "./recruitment";

export function processDayEnd(state: GameState): { newState: GameState; report: DailyReport } {
  const previousDate = state.currentDate;
  const prevPendingCount = state.pendingResults.length;
  const todayAbsDay = toAbsoluteDay(state.currentDate);

  // Snapshot finishing-today items before advancing
  const finishingInjuryIds = Object.values(state.injuries)
    .filter((inj) => inj.recoveryDays <= 1)
    .map((inj) => inj.id);

  const finishingTrainingIds = Object.values(state.adventurers)
    .filter((a) => a.status === "training" && a.trainingDays <= 1)
    .map((a) => a.id);

  // Snapshot today's recruitment review actions (player already acted before day end)
  const todayAccepted = state.recruitment.history.filter(
    (h) => h.action === "accepted" && h.day === todayAbsDay,
  );
  const todayRejectedCount = state.recruitment.history.filter(
    (h) => h.action === "rejected" && h.day === todayAbsDay,
  ).length;

  // 1. Advance facility construction
  const { state: afterFacilities, completed: completedFacilities } =
    advanceFacilityConstruction(state);

  // 2. Expire applicants (based on today's date, before increment)
  const { state: afterExpire, expired: expiredApplicants } = expireApplicants(afterFacilities);

  // 3. Release held applicants whose hold period ended
  const afterRelease = releaseHeldApplicants(afterExpire);

  // 4. Advance day (quests, injuries, training, party formations, date increment)
  const afterAdvance = advanceDay(afterRelease);

  // 5. Generate new applicants for the new day
  const { state: afterGenerate, newApplicants } = generateDailyApplicants(afterAdvance);

  const newState = afterGenerate;

  // 6. Collect report items
  const items: DailyReportItem[] = [];

  // Accepted applicants
  for (const h of todayAccepted) {
    const adv = h.adventurerId ? newState.adventurers[h.adventurerId] : null;
    items.push({
      kind: "recruitment_accepted",
      title: `신규 입단 — ${h.applicantName}`,
      description: adv
        ? `${h.applicantName}이(가) 서풍 길드에 입단했습니다.`
        : `${h.applicantName}이(가) 합류를 승인 받았습니다.`,
    });
  }

  // Rejected applicants (grouped)
  if (todayRejectedCount > 0) {
    items.push({
      kind: "recruitment_rejected",
      title: `지원자 ${todayRejectedCount}명 반려`,
      description: `오늘 ${todayRejectedCount}명의 지원을 거절했습니다.`,
    });
  }

  // Expired applicants
  for (const a of expiredApplicants) {
    items.push({
      kind: "recruitment_expired",
      title: `지원 기간 만료 — ${a.name}`,
      description: `${a.name}의 지원이 심사 기간 내 처리되지 않아 만료되었습니다.`,
    });
  }

  // New applicants arrived
  if (newApplicants.length > 0) {
    items.push({
      kind: "recruitment_new_applicants",
      title: `신규 지원자 ${newApplicants.length}명 도착`,
      description: `${newApplicants.map((a) => a.name).join(", ")}이(가) 가입을 신청했습니다.`,
    });
  }

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
