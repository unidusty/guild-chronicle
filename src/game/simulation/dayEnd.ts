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
import { getWorldEventDefinition, tickWorldEvents, trySpawnWorldEvent } from "./worldEvents";
import { applyDailyOperatingCost } from "./operatingCost";

export function processDayEnd(state: GameState): { newState: GameState; report: DailyReport } {
  const previousDate = state.currentDate;
  const prevReturnReportCount = state.returnReports.length;
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

  // 3.5. Apply daily operating costs (before advanceDay so currentDate = previousDate)
  const { newState: afterOpCost, result: opCostResult } = applyDailyOperatingCost(afterRelease);

  // 4. Advance day (quests, injuries, training, party formations, date increment)
  const afterAdvance = advanceDay(afterOpCost);

  // 5. Generate new applicants for the new day
  const { state: afterGenerate, newApplicants } = generateDailyApplicants(afterAdvance);

  // 6. Tick world events (decrement remaining days, collect expired)
  const { state: afterTick, expired: expiredEvents } = tickWorldEvents(afterGenerate);

  // 7. Try to spawn a new world event for the new day
  const { state: afterWorldEvents, spawned: spawnedEvent } = trySpawnWorldEvent(afterTick, afterTick.currentDate);

  // Add chronicle entries for world event changes
  let afterChronicle = afterWorldEvents;
  const worldEventChronicleEntries: ChronicleEntry[] = [];
  for (const event of expiredEvents) {
    const def = getWorldEventDefinition(event.definitionId);
    if (def) {
      worldEventChronicleEntries.push({
        id: `chr-we-end-${event.id}`,
        date: afterChronicle.currentDate,
        scope: "world",
        category: "world",
        title: `${def.name} 종료`,
        description: def.endNotification,
        relatedEntityIds: [],
      });
    }
  }
  if (spawnedEvent) {
    const def = getWorldEventDefinition(spawnedEvent.definitionId);
    if (def) {
      worldEventChronicleEntries.push({
        id: `chr-we-start-${spawnedEvent.id}`,
        date: afterChronicle.currentDate,
        scope: "world",
        category: "world",
        title: `${def.name} 발생`,
        description: def.startNotification,
        relatedEntityIds: [],
      });
    }
  }
  if (worldEventChronicleEntries.length > 0) {
    afterChronicle = {
      ...afterChronicle,
      chronicle: [...worldEventChronicleEntries, ...afterChronicle.chronicle],
    };
  }

  const newState = afterChronicle;

  // 6. Collect report items (order: operating cost → new → accepted → rejected → expired → facility → quest → injury → training)
  const items: DailyReportItem[] = [];

  // Operating costs summary
  if (opCostResult.totalCost > 0) {
    const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
    const mainParts = opCostResult.facilityMaintenanceEntries.map(
      (e) => `${e.facilityName} ${fmt(e.cost)}G`,
    );
    const parts = [`운영비 ${fmt(opCostResult.baseOperatingCost)}G`, ...mainParts];
    items.push({
      kind: "guild_operating_cost",
      title: `오늘의 운영비 — ${fmt(opCostResult.totalCost)}G`,
      description: parts.join(" · ") + (opCostResult.unpaidAmount > 0 ? ` / 실제 지불 ${fmt(opCostResult.paidAmount)}G` : ""),
    });
    if (opCostResult.unpaidAmount > 0) {
      items.push({
        kind: "operating_cost_unpaid",
        title: `자금 부족 — 운영비 미납 ${fmt(opCostResult.unpaidAmount)}G`,
        description: `자금이 부족하여 ${fmt(opCostResult.unpaidAmount)}G가 미납 처리되었습니다. 누적 미납: ${fmt(newState.guild.unpaidOperatingCost)}G`,
      });
    }
  }

  // New applicants arrived (next day's applicants)
  if (newApplicants.length > 0) {
    const eventNote = newApplicants[0].recruitmentEvent?.originNote;
    const eventSuffix = eventNote ? ` (${eventNote})` : "";
    items.push({
      kind: "recruitment_new_applicants",
      title: `신규 지원자 ${newApplicants.length}명 도착`,
      description: `${newApplicants.map((a) => a.name).join(", ")}이(가) 가입을 신청했습니다.${eventSuffix}`,
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

  // Newly returned quests (awaiting settlement)
  for (const report of newState.returnReports.slice(prevReturnReportCount)) {
    items.push({
      kind: "quest_returned",
      title: `귀환 보고 — ${report.partyNameSnapshot}`,
      description: `${report.questTitle}이(가) 완료되었습니다. 결재 대기.`,
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

  // World events ended
  for (const event of expiredEvents) {
    const def = getWorldEventDefinition(event.definitionId);
    items.push({
      kind: "world_event_ended",
      title: `이벤트 종료 — ${def?.name ?? event.definitionId}`,
      description: def?.endNotification ?? "세계 이벤트가 종료되었습니다.",
    });
  }

  // World events started
  if (spawnedEvent) {
    const def = getWorldEventDefinition(spawnedEvent.definitionId);
    items.push({
      kind: "world_event_started",
      title: `세계 이벤트 — ${def?.name ?? spawnedEvent.definitionId}`,
      description: `${def?.startNotification ?? ""} (${spawnedEvent.remainingDays}일간 지속)`,
    });
  }

  // Quest duration changes that occurred during this advance
  for (const [questId, newProg] of Object.entries(afterAdvance.questProgress)) {
    const oldProg = afterOpCost.questProgress[questId];
    if (!oldProg) continue;
    const addedCount = newProg.durationChanges.length - oldProg.durationChanges.length;
    if (addedCount <= 0) continue;
    const quest = afterAdvance.quests[questId];
    if (!quest) continue;
    const latestChange = newProg.durationChanges[newProg.durationChanges.length - 1];
    const sign = latestChange.deltaDays > 0 ? "+" : "";
    items.push({
      kind: "quest_duration_changed",
      title: `기간 변경 — ${quest.title}`,
      description: `${sign}${latestChange.deltaDays}일 (${latestChange.reason}) · 현재 예상: ${newProg.currentEstimatedDays}일`,
    });
  }

  // Active quest progress & event reports
  const activeProgressList = Object.values(newState.questProgress);
  for (const prog of activeProgressList) {
    const quest = newState.quests[prog.questId];
    const party = newState.parties[prog.partyId];
    if (!quest || !party) continue;
    const stageLabel = questStageLabels[prog.currentStage];
    const elapsed = prog.currentDay;
    const newEvents = prog.events.filter(e => !e.read);
    const isStageNew = !prog.reportRead;
    const prefix = isStageNew ? "● " : newEvents.length > 0 ? "⚠ " : "";
    items.push({
      kind: "quest_progress_update",
      title: `${prefix}진행 보고 — ${party.name}`,
      description: `${quest.title} · ${stageLabel} · ${elapsed} / ${prog.totalDays}일`,
    });
    for (const event of newEvents) {
      items.push({
        kind: "quest_event",
        title: `⚠ ${event.title}`,
        description: `[${party.name}] ${event.description}`,
      });
    }
  }

  // Mark reportRead=true for stage changes; events remain unread (cleared by player action)
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
