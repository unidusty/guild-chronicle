import type { EntityId, QuestCategory, QuestEvent, QuestEventCategory, QuestStage } from "../../types/game";

interface EventTemplate {
  category: QuestEventCategory;
  title: string;
  description: string;
  questTypes?: QuestCategory[];
}

const EVENT_TEMPLATES: EventTemplate[] = [
  // Exploration
  { category: "exploration", title: "더 깊은 구조물 발견", description: "의뢰 지역 내에서 예상보다 깊은 구조물이 발견되었습니다. 지도에 없는 구역입니다.", questTypes: ["exploration", "search"] },
  { category: "exploration", title: "숨겨진 통로 발견", description: "지도에 표시되지 않은 숨겨진 통로가 발견되었습니다.", questTypes: ["exploration", "search", "rescue"] },
  { category: "exploration", title: "새로운 조사 지점 발견", description: "조사 중 예상치 못한 흔적을 발견했습니다. 추가 확인이 필요해 보입니다." },
  // Combat
  { category: "combat", title: "강한 개체 출현", description: "목표 구역에서 예상보다 강한 개체가 확인되었습니다.", questTypes: ["hunt", "escort"] },
  { category: "combat", title: "몬스터 무리 증가", description: "교전 중 추가 개체들이 합류했습니다. 예상보다 수가 많습니다.", questTypes: ["hunt", "escort"] },
  { category: "combat", title: "정예 개체 발견", description: "일반 개체와 다른 특이 개체가 발견되었습니다. 주의가 필요합니다.", questTypes: ["hunt"] },
  { category: "combat", title: "기습 공격", description: "이동 중 매복한 무리에게 기습을 당했습니다. 피해 없이 격퇴했습니다.", questTypes: ["escort", "delivery"] },
  // Environment
  { category: "environment", title: "폭우", description: "갑작스러운 폭우로 시야가 좁아지고 이동이 어려워졌습니다." },
  { category: "environment", title: "짙은 안개", description: "새벽부터 짙은 안개가 이어져 탐색 속도가 느려지고 있습니다." },
  { category: "environment", title: "낙석", description: "이동 중 낙석이 발생하여 우회로를 탐색하는 중입니다." },
  { category: "environment", title: "경로 붕괴", description: "일부 경로가 붕괴되어 새 경로를 확보해야 합니다.", questTypes: ["exploration", "rescue"] },
  // Reward
  { category: "reward", title: "유물 발견", description: "의뢰 지역에서 예상치 못한 고대 유물이 발견되었습니다.", questTypes: ["exploration"] },
  { category: "reward", title: "희귀 광물 발견", description: "채굴 흔적 근처에서 희귀 광물 맥이 발견되었습니다.", questTypes: ["exploration", "search"] },
  { category: "reward", title: "귀중한 약초 발견", description: "이동 중 시장에서 고가에 거래되는 약초 군락을 발견했습니다." },
  { category: "reward", title: "은닉된 재화 발견", description: "탐색 중 누군가 숨겨둔 재화를 발견했습니다. 소유주를 확인 중입니다." },
  // Person
  { category: "person", title: "실종 모험가 흔적 발견", description: "의뢰 지역에서 소식이 두절된 모험가의 흔적을 발견했습니다.", questTypes: ["rescue", "search"] },
  { category: "person", title: "생존자 발견", description: "의뢰 지역에서 예상치 못한 생존자를 발견했습니다. 안전을 확보하는 중입니다.", questTypes: ["rescue", "search", "exploration"] },
  { category: "person", title: "의문의 인물 조우", description: "정체를 알 수 없는 인물과 마주쳤습니다. 적대적이지는 않았습니다." },
  { category: "person", title: "지역 주민 정보 입수", description: "현지 주민으로부터 의뢰 목표에 관한 유용한 정보를 얻었습니다." },
  // Danger
  { category: "danger", title: "파티원 경상", description: "교전 또는 이동 중 파티원 일부가 경상을 입었습니다. 임무 수행에는 지장이 없습니다." },
  { category: "danger", title: "장비 파손", description: "거친 지형 이동 중 장비 일부가 손상되었습니다. 임시 수리를 완료했습니다." },
  { category: "danger", title: "식량 부족", description: "예상보다 긴 탐색으로 식량이 부족해지고 있습니다. 현지 조달이 필요합니다.", questTypes: ["exploration", "rescue"] },
];

// Category weights per quest type
const WEIGHTS: Record<QuestCategory, Record<QuestEventCategory, number>> = {
  escort:      { combat: 3, person: 2, environment: 2, danger: 2, exploration: 1, reward: 1 },
  search:      { exploration: 3, person: 3, environment: 2, combat: 1, danger: 1, reward: 1 },
  hunt:        { combat: 4, danger: 2, environment: 1, exploration: 1, person: 1, reward: 2 },
  delivery:    { environment: 3, danger: 2, person: 2, combat: 2, exploration: 1, reward: 1 },
  rescue:      { person: 4, danger: 2, environment: 2, combat: 1, exploration: 2, reward: 1 },
  exploration: { exploration: 4, reward: 3, environment: 2, combat: 1, person: 2, danger: 1 },
};

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function rollEventForQuest(dangerLevel: number, questType: QuestCategory, _stage: QuestStage): boolean {
  const base = 0.10;
  const bonus = Math.max(0, dangerLevel - 2) * 0.04;
  return Math.random() < Math.min(base + bonus, 0.28);
}

export function generateQuestEvent(
  questId: EntityId,
  partyId: EntityId,
  day: number,
  questType: QuestCategory,
): QuestEvent {
  const catWeights = WEIGHTS[questType];
  const categories = Object.keys(catWeights) as QuestEventCategory[];
  const weights = categories.map(c => catWeights[c]);
  const category = pickWeighted(categories, weights);

  const pool = EVENT_TEMPLATES.filter(
    t => t.category === category && (!t.questTypes || t.questTypes.includes(questType))
  );
  const fallback = EVENT_TEMPLATES.filter(t => t.category === category);
  const template = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : fallback[Math.floor(Math.random() * fallback.length)];

  const eventId = `ev-${questId}-${day}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    eventId,
    questId,
    partyId,
    day,
    category: template.category,
    title: template.title,
    description: template.description,
    read: false,
  };
}
