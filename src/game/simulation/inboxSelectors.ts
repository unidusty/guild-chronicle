import type { GameDate, GameState, InboxItem, InboxPriority, RecruitmentEventType } from "../../types/game";
import { getDirectorState } from "./questDirector";
import { getReputationEventById } from "../../data/reputationEventData";
import { getWorldEventDefinitionById } from "../../data/worldEventData";

const PRIORITY_ORDER: Record<InboxPriority, number> = {
  critical: 0,
  urgent: 1,
  important: 2,
  normal: 3,
};

function toAbsoluteDay(date: GameDate): number {
  const si = ["spring", "summer", "autumn", "winter"].indexOf(date.season);
  return date.year * 120 + si * 30 + date.day;
}

const BASIC_EVENT_TYPES = new Set<RecruitmentEventType>([
  "basic_newcomer", "new_start", "first_guild", "stable_membership", "quiet_proof",
]);

const RECRUITMENT_EVENT_NAMES: Record<RecruitmentEventType, string> = {
  siblings:                    "형제 지원",
  fallen_noble:                "귀족 출신",
  rival_guild_origin:          "라이벌 길드",
  royal_recommendation:        "왕실 추천",
  retired_knight:              "은퇴 기사",
  suspicious_applicant:        "수상한 지원자",
  famous_adventurer_apprentice:"제자",
  orphan_background:           "고아 출신",
  injury_comeback:             "부상 후 재기",
  debt_motivated:              "빚 동기",
  basic_newcomer:              "성실한 신입",
  new_start:                   "새로운 출발",
  first_guild:                 "첫 길드",
  stable_membership:           "안정적인 소속",
  quiet_proof:                 "조용한 증명",
  rival:                       "라이벌",
  mentor:                      "스승의 귀환",
  apprentice:                  "스승을 잃은 제자",
  lover:                       "연인을 따라",
  noble_family:                "귀족 가문",
  fallen_knight:               "몰락한 기사",
  retired_adventurer:          "은퇴한 모험가",
  famous_party_disbandment:    "유명 파티 해산",
  guild_survivor:              "멸망한 길드 생존자",
  young_prodigy:               "어린 천재",
  late_starter:                "늦깎이 모험가",
};

export function getInboxItems(state: GameState): InboxItem[] {
  const items: InboxItem[] = [];
  const todayAbsolute = toAbsoluteDay(state.currentDate);

  // ── Return Reports ──────────────────────────────────────────────────────────
  for (const rr of state.returnReports) {
    items.push({
      id: `inbox-return-${rr.id}`,
      type: "return_report",
      priority: "important",
      title: "귀환 보고가 도착했습니다",
      summary: `${rr.questTitle} · ${rr.partyNameSnapshot}`,
      sourceId: rr.id,
      target: { page: "guildHall" },
      createdDay: toAbsoluteDay(rr.completedAt),
      requiresAction: true,
      isUrgent: false,
    });
  }

  // ── Recruitment Applicants (pending only — held = processed today) ──────────
  for (const applicant of state.recruitment.applicants) {
    if (applicant.status !== "pending") continue;

    const eventType = applicant.recruitmentEvent?.eventType;
    const isSpecial = eventType != null && !BASIC_EVENT_TYPES.has(eventType);
    const priority: InboxPriority = isSpecial ? "important" : "normal";

    const className = state.classes[applicant.classId]?.name ?? "모험가";
    const eventSuffix = eventType ? ` · ${RECRUITMENT_EVENT_NAMES[eventType] ?? eventType}` : "";

    items.push({
      id: `inbox-recruitment-${applicant.id}`,
      type: "recruitment_application",
      priority,
      title: "새로운 가입 신청",
      summary: `${applicant.name} · ${className}${eventSuffix}`,
      sourceId: applicant.id,
      target: { page: "guildHall", tab: "recruitment" },
      createdDay: applicant.appliedDay,
      requiresAction: true,
      isUrgent: false,
    });
  }

  // ── Quest Decision Events (unread = no decision yet) ────────────────────────
  for (const prog of Object.values(state.questProgress)) {
    const quest = state.quests[prog.questId];
    if (!quest) continue;

    const undecided = prog.events.filter(e => !e.read);
    if (undecided.length === 0) continue;

    const dirState = getDirectorState(quest, prog);

    for (const event of undecided) {
      const isCritical = dirState.urgencyLevel === "critical";
      const priority: InboxPriority = isCritical ? "critical" : "urgent";

      items.push({
        id: `inbox-quest-${prog.questId}-${event.eventId}`,
        type: "quest_decision",
        priority,
        title: "현장 보고",
        summary: `${quest.title} · ${event.title}`,
        sourceId: event.eventId,
        target: { page: "quests", entityId: prog.questId },
        createdDay: todayAbsolute,
        requiresAction: true,
        isUrgent: isCritical,
      });
    }
  }

  // ── Reputation Events (informational — do not block day-end) ─────────────────
  for (const pending of state.pendingReputationEvents) {
    const def = getReputationEventById(pending.id);
    if (!def) continue;
    items.push({
      id: `inbox-reputation-${pending.id}`,
      type: "reputation_event",
      priority: def.priority,
      title: def.inboxTitle,
      summary: def.inboxSummary,
      sourceId: pending.id,
      target: { page: "guildHall" },
      createdDay: pending.day,
      requiresAction: false,
      isUrgent: false,
    });
  }

  // ── World Event Notifications (informational — do not block day-end) ──────────
  for (const notif of state.pendingWorldEventNotifications) {
    const def = getWorldEventDefinitionById(notif.definitionId);
    if (!def?.inboxTitle) continue;
    // Only show if the event is still active
    const isActive = state.activeWorldEvents.some((e) => e.id === notif.id);
    if (!isActive) continue;
    items.push({
      id: `inbox-world-event-${notif.id}`,
      type: "world_event",
      priority: def.inboxPriority ?? "normal",
      title: def.inboxTitle,
      summary: def.description,
      sourceId: notif.id,
      target: { page: "guildHall" },
      createdDay: notif.day,
      requiresAction: false,
      isUrgent: (def.inboxPriority === "urgent" || def.inboxPriority === "critical"),
    });
  }

  // Sort: priority (critical first), then older items first within same priority
  items.sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.createdDay - b.createdDay;
  });

  return items;
}

export function canEndDay(state: GameState): boolean {
  return !getInboxItems(state).some(item => item.requiresAction);
}

export function getInboxCount(state: GameState): number {
  return getInboxItems(state).filter(item => item.requiresAction).length;
}
