import type { EntityId, GameDate, GameState, GuildQuestDraft, Quest } from "../../types/game";
import { getWorldEventDefinitionById } from "../../data/worldEventData";

const DRAFT_EXPIRY_DAYS = 7;
const DRAFT_COOLDOWN_DAYS = 14;
const PERIODIC_EXPLORATION_INTERVAL = 30;
const DANGEROUS_EVENT_TYPES = new Set(["monster_surge", "bandit_surge", "war", "border_conflict"]);

function toAbsoluteDay(date: GameDate): number {
  const si = ["spring", "summer", "autumn", "winter"].indexOf(date.season);
  return date.year * 120 + si * 30 + date.day;
}

function makeDraftId(needType: string, day: number): EntityId {
  return `gqd-${needType}-${day}`;
}

function isCoolingDown(cooldowns: Partial<Record<string, number>>, needType: string, todayAbsDay: number): boolean {
  const lastDay = cooldowns[needType];
  if (lastDay === undefined) return false;
  return todayAbsDay - lastDay < DRAFT_COOLDOWN_DAYS;
}

function createResourceGatheringDraft(state: GameState, todayAbsDay: number): GuildQuestDraft {
  return {
    id: makeDraftId("low_gold", todayAbsDay),
    needType: "low_gold",
    reason: `길드 자금 부족 (현재 ${state.guild.gold}G)`,
    expectedReward: "판매 가능한 전리품 및 자원 확보",
    estimatedCost: 150,
    createdDay: todayAbsDay,
    expiresDay: todayAbsDay + DRAFT_EXPIRY_DAYS,
    questTitle: "창고 자원 수집 의뢰",
    questDescription: "길드 운영 자금 확보를 위해 인근 지역에서 판매 가능한 자원을 수집해 주십시오.",
    questCategory: "search",
    questGrade: "E",
    regionId: "region-westfield",
    durationDays: 3,
    dangerLevel: 1,
    recommendedPartySize: 2,
    enemyHint: null,
    riskTags: ["수집 작업", "소동물"],
  };
}

function createThreatEliminationDraft(
  state: GameState,
  todayAbsDay: number,
  eventName: string,
  sourceEventId: EntityId,
): GuildQuestDraft {
  return {
    id: makeDraftId("dangerous_world_event", todayAbsDay),
    needType: "dangerous_world_event",
    reason: `위협 증가 — ${eventName}`,
    expectedReward: "지역 위협 감소 및 안전 확보",
    estimatedCost: 400,
    createdDay: todayAbsDay,
    expiresDay: todayAbsDay + DRAFT_EXPIRY_DAYS,
    questTitle: "위협 제거 의뢰",
    questDescription: `${eventName}로 인해 인근 지역의 위협이 증가하고 있습니다. 위협 요소를 조사하고 제거해 주십시오.`,
    questCategory: "hunt",
    questGrade: "D",
    regionId: "region-darkforest",
    durationDays: 4,
    dangerLevel: 3,
    recommendedPartySize: 3,
    enemyHint: "위협 세력",
    riskTags: ["전투 위험", "무장 적대세력"],
    sourceEventId,
  };
}

function createExplorationDraft(state: GameState, todayAbsDay: number): GuildQuestDraft {
  return {
    id: makeDraftId("periodic_exploration", todayAbsDay),
    needType: "periodic_exploration",
    reason: "정기 탐사 — 지역 현황 파악 필요",
    expectedReward: "지역 정보 수집 및 잠재 위협 파악",
    estimatedCost: 200,
    createdDay: todayAbsDay,
    expiresDay: todayAbsDay + DRAFT_EXPIRY_DAYS,
    questTitle: "정기 탐사 의뢰",
    questDescription: "인근 지역의 현황 파악을 위한 정기 탐사 의뢰입니다. 지역 정보와 잠재 위협을 조사하여 보고해 주십시오.",
    questCategory: "exploration",
    questGrade: "E",
    regionId: "region-oldmine",
    durationDays: 4,
    dangerLevel: 2,
    recommendedPartySize: 2,
    enemyHint: null,
    riskTags: ["미지 지형", "함정"],
  };
}

export function detectAndCreateDrafts(
  state: GameState,
  todayAbsDay: number,
): { newState: GameState; created: GuildQuestDraft[] } {
  let s = state;
  const created: GuildQuestDraft[] = [];
  const existingNeedTypes = new Set(s.pendingGuildQuestDrafts.map(d => d.needType));
  const cooldowns = s.guildQuestDraftCooldowns;

  if (
    !existingNeedTypes.has("low_gold") &&
    !isCoolingDown(cooldowns, "low_gold", todayAbsDay) &&
    state.guild.gold < 300
  ) {
    const draft = createResourceGatheringDraft(state, todayAbsDay);
    s = {
      ...s,
      pendingGuildQuestDrafts: [...s.pendingGuildQuestDrafts, draft],
      guildQuestDraftCooldowns: { ...s.guildQuestDraftCooldowns, low_gold: todayAbsDay },
    };
    existingNeedTypes.add("low_gold");
    created.push(draft);
  }

  if (
    !existingNeedTypes.has("dangerous_world_event") &&
    !isCoolingDown(cooldowns, "dangerous_world_event", todayAbsDay)
  ) {
    for (const event of state.activeWorldEvents) {
      const def = getWorldEventDefinitionById(event.definitionId);
      if (def && DANGEROUS_EVENT_TYPES.has(def.type)) {
        const draft = createThreatEliminationDraft(state, todayAbsDay, def.name, event.definitionId);
        s = {
          ...s,
          pendingGuildQuestDrafts: [...s.pendingGuildQuestDrafts, draft],
          guildQuestDraftCooldowns: { ...s.guildQuestDraftCooldowns, dangerous_world_event: todayAbsDay },
        };
        existingNeedTypes.add("dangerous_world_event");
        created.push(draft);
        break;
      }
    }
  }

  if (
    !existingNeedTypes.has("periodic_exploration") &&
    !isCoolingDown(cooldowns, "periodic_exploration", todayAbsDay) &&
    todayAbsDay % PERIODIC_EXPLORATION_INTERVAL === 0
  ) {
    const draft = createExplorationDraft(state, todayAbsDay);
    s = {
      ...s,
      pendingGuildQuestDrafts: [...s.pendingGuildQuestDrafts, draft],
      guildQuestDraftCooldowns: { ...s.guildQuestDraftCooldowns, periodic_exploration: todayAbsDay },
    };
    created.push(draft);
  }

  return { newState: s, created };
}

export function expireGuildQuestDrafts(
  state: GameState,
  todayAbsDay: number,
): { newState: GameState; expired: GuildQuestDraft[] } {
  const expired = state.pendingGuildQuestDrafts.filter(d => d.expiresDay <= todayAbsDay);
  if (expired.length === 0) return { newState: state, expired: [] };

  const remaining = state.pendingGuildQuestDrafts.filter(d => d.expiresDay > todayAbsDay);
  const newCooldowns = { ...state.guildQuestDraftCooldowns };
  for (const d of expired) {
    newCooldowns[d.needType] = todayAbsDay;
  }

  return {
    newState: { ...state, pendingGuildQuestDrafts: remaining, guildQuestDraftCooldowns: newCooldowns },
    expired,
  };
}

export function approveGuildQuestDraft(
  state: GameState,
  draftId: EntityId,
  todayAbsDay: number,
): GameState {
  const draft = state.pendingGuildQuestDrafts.find(d => d.id === draftId);
  if (!draft) return state;
  if (state.guild.gold < draft.estimatedCost) return state;

  const questId = `quest-guild-${draft.needType}-${todayAbsDay}`;
  const quest: Quest = {
    id: questId,
    title: draft.questTitle,
    grade: draft.questGrade,
    regionId: draft.regionId,
    type: draft.questCategory,
    questType: "normal",
    status: "available",
    description: draft.questDescription,
    clientName: "서풍 길드 (내부 의뢰)",
    dangerLevel: draft.dangerLevel,
    recommendedPartySize: draft.recommendedPartySize,
    expiresInDays: 7,
    rewardGold: draft.estimatedCost,
    durationDays: draft.durationDays,
    remainingDays: draft.durationDays,
    progress: 0,
    assignedPartyId: null,
    expectedReturnAt: null,
    riskTags: draft.riskTags ?? [],
    enemyHint: draft.enemyHint ?? null,
    issuer: "guild",
  };

  const remaining = state.pendingGuildQuestDrafts.filter(d => d.id !== draftId);
  return {
    ...state,
    quests: { ...state.quests, [questId]: quest },
    pendingGuildQuestDrafts: remaining,
  };
}

export function rejectGuildQuestDraft(state: GameState, draftId: EntityId): GameState {
  const remaining = state.pendingGuildQuestDrafts.filter(d => d.id !== draftId);
  return { ...state, pendingGuildQuestDrafts: remaining };
}
