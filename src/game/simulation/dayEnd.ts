import type { ChronicleEntry, DailyReport, DailyReportItem, GameState, QuestProgress } from "../../types/game";
import { advanceDay } from "./advance";
import { questStageLabels } from "../constants/labels";
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
  const { state: afterFacilitiesRaw, completed: completedFacilities } =
    advanceFacilityConstruction(state);

  // Add chronicle entries for newly completed facilities
  let afterFacilities = afterFacilitiesRaw;
  if (completedFacilities.length > 0) {
    const facilityEntries: ChronicleEntry[] = completedFacilities.map((f) => ({
      id: `chr-facility-${f.id}-${previousDate.year}-${previousDate.season}-${previousDate.day}`,
      date: previousDate,
      scope: "guild" as const,
      category: "facility" as const,
      title: `${f.name} 완공`,
      description: `${f.name} 공사가 완료되어 운영을 시작했습니다.`,
      relatedEntityIds: [state.guild.id],
    }));
    afterFacilities = { ...afterFacilities, chronicle: [...facilityEntries, ...afterFacilities.chronicle] };
  }

  // 2. Expire applicants (based on today's date, before increment)
  const { state: afterExpire, expired: expiredApplicants } = expireApplicants(afterFacilities);

  // 3. Release held applicants whose hold period ended
  const afterRelease = releaseHeldApplicants(afterExpire);

  // 4. Advance day (quests, injuries, training, party formations, date increment)
  const afterAdvance = advanceDay(afterRelease);

  // 5. Generate new applicants for the new day
  const { state: afterGenerate, newApplicants } = generateDailyApplicants(afterAdvance);

  const newState = afterGenerate;

  // 6. Collect report items (order: new → accepted → rejected → expired → facility → quest → injury → training)
  const items: DailyReportItem[] = [];

  // New applicants arrived (next day's applicants)
  if (newApplicants.length > 0) {
    items.push({
      kind: "recruitment_new_applicants",
      title: `신규 지원자 ${newApplicants.length}명 도착`,
      description: `${newApplicants.map((a) => a.name).join(", ")}이(가) 가입을 신청했습니다.`,
    });
  }

  // Accepted applicants (player actions from today)
  for (const h of todayAccepted) {
    items.push({
      kind: "recruitment_accepted",
      title: `가입 승인 — ${h.applicantName}`,
      description: `${h.applicantName}이(가) 서풍 길드 정식 모험가로 등록되었습니다.`,
    });
  }

  // Rejected applicants (grouped)
  if (todayRejectedCount > 0) {
    items.push({
      kind: "recruitment_rejected",
      title: `지원 반려 ${todayRejectedCount}건`,
      description: `오늘 ${todayRejectedCount}명의 지원을 거절했습니다.`,
    });
  }

  // Expired applicants
  for (const a of expiredApplicants) {
    items.push({
      kind: "recruitment_expired",
      title: `지원 만료 — ${a.name}`,
      description: `${a.name}의 지원이 심사 기간 내 처리되지 않아 만료되었습니다.`,
    });
  }

  // Completed facility constructions
  for (const f of completedFacilities) {
    items.push({
      kind: "facility_completed",
      title: `시설 완공 — ${f.name}`,
      description: `${f.name} 공사가 완료되어 운영을 시작했습니다.`,
    });
  }

  // Completed quests
  for (const result of newState.pendingResults.slice(prevPendingCount)) {
    items.push({
      kind: "quest_completed",
      title: `의뢰 완료 — ${result.questTitle}`,
      description: `${result.partyName}이(가) 귀환했습니다. 보상: ${new Intl.NumberFormat("ko-KR").format(result.rewardGold)} G`,
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
          description: `${injury.name}이(가) 완치되어 활동을 재개할 수 있습니다.`,
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
        description: `${adv.name}이(가) 훈련을 마치고 대기 상태로 복귀했습니다.`,
      });
    }
  }

  // Active quest progress reports
  const activeProgressList = Object.values(newState.questProgress);
  for (const prog of activeProgressList) {
    const quest = newState.quests[prog.questId];
    const party = newState.parties[prog.partyId];
    if (!quest || !party) continue;
    const stageLabel = questStageLabels[prog.currentStage];
    const elapsed = prog.currentDay;
    const isNew = !prog.reportRead;
    items.push({
      kind: "quest_progress_update",
      title: `${isNew ? "● " : ""}진행 보고 — ${party.name}`,
      description: `${quest.title} · ${stageLabel} · ${elapsed} / ${prog.totalDays}일`,
    });
  }

  // Mark all quest progress as read in the final state
  let finalState = newState;
  if (activeProgressList.length > 0) {
    const clearedProgress: Record<string, QuestProgress> = {};
    for (const [id, prog] of Object.entries(newState.questProgress)) {
      clearedProgress[id] = { ...prog, reportRead: true };
    }
    finalState = { ...newState, questProgress: clearedProgress };
  }

  return {
    newState: finalState,
    report: { previousDate, nextDate: finalState.currentDate, items },
  };
}
