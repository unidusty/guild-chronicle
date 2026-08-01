import type {
  Adventurer,
  AdventureLogCategory,
  AdventureLogEntry,
  AdventureLogImportance,
  AdventurerClass,
  EntityId,
  GameDate,
  Party,
  Quest,
  QuestCategory,
  QuestDecision,
  QuestDecisionType,
  QuestEvent,
  QuestEventCategory,
  QuestProgress,
  QuestResult,
  QuestResultGrade,
  QuestStage,
} from "../../types/game";

// ── Stable hash selection ─────────────────────────────────────────────────────

function pickByHash<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

// ── Variable substitution ─────────────────────────────────────────────────────

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? k);
}

// ── Actor selection ───────────────────────────────────────────────────────────

type ActorRole = AdventurerClass["role"];

function selectActor(
  members: Adventurer[],
  classes: Record<EntityId, AdventurerClass>,
  preferredRoles: ActorRole[],
  seed: string,
  exclude?: EntityId,
): Adventurer | null {
  const available = exclude ? members.filter(m => m.id !== exclude) : members;
  if (available.length === 0) return null;
  const preferred = available.filter(m => {
    const cls = classes[m.classId];
    return cls !== undefined && preferredRoles.includes(cls.role as ActorRole);
  });
  const pool = preferred.length > 0 ? preferred : available;
  return pickByHash(pool, seed);
}

// ── Departure templates ───────────────────────────────────────────────────────

const DEPARTURE: Partial<Record<QuestCategory, string[]>> & { default: string[] } = {
  default:     ["{party}가 의뢰를 위해 길드를 출발하였다.", "{party}이(가) 임무를 시작하였다."],
  escort:      ["{party}가 상단과 합류하여 {region}을(를) 향해 출발하였다.", "호위 임무를 맡은 {party}이(가) {region}으로 출발하였다.", "{party}가 상단의 안전을 책임지고 길을 나섰다."],
  hunt:        ["{party}가 토벌 임무를 위해 {region}으로 출발하였다.", "{party}이(가) 목표를 처리하기 위해 길드를 떠났다.", "{party}가 위협 제거를 위해 출발하였다."],
  search:      ["{party}가 수색을 위해 {region}으로 향했다.", "{party}이(가) 단서를 따라 출발하였다.", "{party}가 목표물 수색 임무를 시작하였다."],
  delivery:    ["{party}가 의뢰물을 안전히 전달하기 위해 출발하였다.", "{party}이(가) {region}으로 배달 임무를 시작하였다.", "의뢰물을 맡은 {party}가 길을 나섰다."],
  rescue:      ["{party}가 실종자 구조를 위해 신속히 출발하였다.", "시간이 촉박한 상황에서 {party}이(가) {region}으로 달려갔다.", "{party}가 구조 임무를 위해 길드를 떠났다."],
  exploration: ["{party}가 {region} 탐사를 위해 출발하였다.", "미지의 지역을 조사하기 위해 {party}이(가) 나섰다.", "{party}가 탐사 의뢰를 위해 길을 나섰다."],
};

// ── Stage travel templates ────────────────────────────────────────────────────

const TRAVEL: Partial<Record<QuestCategory, string[]>> & { default: string[] } = {
  default:     ["파티는 목적지를 향해 이동하였다.", "먼 길을 묵묵히 나아가고 있다.", "별다른 이변 없이 이동이 계속되고 있다."],
  escort:      ["호위 행렬이 순조롭게 이동하고 있다.", "{party}는 상단을 이끌며 목적지를 향해 나아가고 있다.", "주변을 경계하며 호위 임무가 진행되고 있다."],
  hunt:        ["파티는 목표 지역을 향해 이동하였다.", "흔적을 따라 파티가 전진하였다.", "{party}가 토벌 지점으로 이동 중이다."],
  search:      ["파티는 수색 범위를 좁혀가고 있다.", "{party}이(가) 단서를 분석하며 이동하였다.", "{party}가 목표 지역으로 접근하고 있다."],
  delivery:    ["의뢰물을 안전하게 운반하며 이동하고 있다.", "파티가 최단 경로로 목적지를 향해 나아가고 있다."],
  rescue:      ["{party}는 실종자의 마지막 목격지를 향해 빠르게 이동하였다.", "시간을 절약하기 위해 파티가 서둘러 이동하였다."],
  exploration: ["파티는 탐사 지역으로 이동하고 있다.", "{party}이(가) 미지의 구역을 향해 나아가고 있다."],
};

// ── Stage executing templates ─────────────────────────────────────────────────

const EXECUTING: Partial<Record<QuestCategory, string[]>> & { default: string[] } = {
  default:     ["임무가 진행 중이다.", "파티가 의뢰를 수행하고 있다.", "현장에서 임무가 계속되고 있다."],
  escort:      ["호위 임무가 계속되고 있다.", "{party}는 상단의 안전을 지키며 임무를 수행하고 있다.", "파티는 주변을 경계하며 이동을 이어가고 있다."],
  hunt:        ["{party}는 목표를 추적하고 있다.", "파티가 사냥을 이어가고 있다.", "{party}이(가) 적을 몰아붙이며 토벌을 진행하고 있다."],
  search:      ["{party}는 지역을 꼼꼼히 수색하고 있다.", "단서를 따라 파티가 수색 범위를 넓혀가고 있다."],
  exploration: ["{party}는 지역을 탐사하고 있다.", "발견된 단서를 바탕으로 탐사가 이어지고 있다.", "{party}이(가) 미지의 구역을 조사하고 있다."],
  rescue:      ["{party}는 실종자의 흔적을 추적하고 있다.", "파티가 생존 신호를 찾아 수색을 계속하고 있다."],
  delivery:    ["의뢰물을 보호하며 이동 중이다.", "방해 없이 배달이 진행되고 있다."],
};

// ── Return stage templates ────────────────────────────────────────────────────

const RETURN_TMPL: string[] = [
  "임무를 마친 파티가 길드로 귀환하고 있다.",
  "파티가 귀환 행로에 올랐다.",
  "{party}이(가) 임무를 마치고 돌아오고 있다.",
  "귀환 중인 파티는 특별한 이상 없이 이동을 계속하고 있다.",
];

// ── Actor sentence templates by role ─────────────────────────────────────────

const COMBAT_ACTOR: Record<ActorRole, string[]> = {
  vanguard: [
    "{actor}는 선두에서 적의 접근을 막아냈다.",
    "{actor}이(가) 전열을 지키며 파티를 이끌었다.",
    "{actor}는 몸으로 공격을 받아내며 동료들의 시간을 벌었다.",
    "{actor}이(가) 선봉에 서서 적의 기세를 꺾었다.",
  ],
  damage: [
    "{actor}는 결정적인 일격으로 적을 쓰러뜨렸다.",
    "{actor}이(가) 위협 대상을 빠르게 제거하였다.",
    "{actor}는 정확한 판단으로 전투의 흐름을 바꾸었다.",
    "{actor}이(가) 빈틈을 노려 적에게 일격을 가하였다.",
  ],
  support: [
    "{actor}는 부상당한 동료를 치료하며 전열을 유지하였다.",
    "{actor}이(가) 후방에서 동료들을 지원하였다.",
    "{actor}는 동료들의 상태를 회복시켜 임무를 이어갈 수 있게 하였다.",
    "{actor}이(가) 위기 상황에서 동료의 부상을 응급 처치하였다.",
  ],
  scout: [
    "{actor}는 적의 위치를 먼저 파악해 파티를 위기에서 구하였다.",
    "{actor}이(가) 정찰을 통해 최적의 경로를 확보하였다.",
    "{actor}는 빠른 이동으로 위협을 제거하였다.",
    "{actor}이(가) 원거리 지원으로 아군의 피해를 줄였다.",
  ],
};

const EXPLORE_ACTOR: Record<ActorRole, string[]> = {
  scout: [
    "{actor}이(가) 날카로운 감각으로 중요한 단서를 발견하였다.",
    "{actor}는 주변을 면밀히 살피며 숨겨진 통로를 찾아냈다.",
  ],
  damage: [
    "{actor}이(가) 위험 지역에 먼저 진입하여 안전을 확인하였다.",
    "{actor}는 대담하게 앞장서 길을 열었다.",
  ],
  vanguard: [
    "{actor}이(가) 파티를 이끌며 탐사 범위를 넓혀나갔다.",
    "{actor}는 선두에서 경로를 개척하였다.",
  ],
  support: [
    "{actor}이(가) 수집된 단서들을 분석하여 방향을 잡았다.",
    "{actor}는 체계적인 조사로 탐사를 지원하였다.",
  ],
};

const DANGER_ACTOR: Record<ActorRole, string[]> = {
  vanguard: [
    "{actor}이(가) 위험을 무릅쓰고 동료들을 보호하였다.",
    "{actor}는 위기 상황에서 파티를 이끌었다.",
  ],
  damage:  [
    "{actor}이(가) 신속하게 위협을 처리하였다.",
    "{actor}는 기민한 판단으로 위기를 돌파하였다.",
  ],
  support: [
    "{actor}이(가) 부상자를 돌보며 파티의 전투력을 유지하였다.",
    "{actor}는 침착하게 상황을 수습하였다.",
  ],
  scout:   [
    "{actor}이(가) 위험 요소를 먼저 파악하여 피해를 최소화하였다.",
    "{actor}는 정확한 정보로 파티의 행동을 이끌었다.",
  ],
};

// ── Event category introductions ──────────────────────────────────────────────

const EVENT_INTRO: Record<QuestEventCategory, string[]> = {
  combat:      ["교전이 발생하였다.", "적과의 전투가 벌어졌다.", "무리와의 접전이 시작되었다.", "기습 공격을 받았다."],
  exploration: ["예상치 못한 지점이 발견되었다.", "새로운 구역이 나타났다.", "조사 중 중요한 단서를 발견하였다."],
  environment: ["환경 이변이 발생하였다.", "날씨와 지형이 임무를 방해하기 시작하였다.", "예상치 못한 자연 현상이 발생하였다."],
  reward:      ["예상치 못한 발견이 있었다.", "이동 중 귀중한 것이 발견되었다.", "뜻밖의 성과가 생겼다."],
  person:      ["현장에서 뜻밖의 인물과 조우하였다.", "예상치 못한 인물을 만났다.", "낯선 자가 나타났다."],
  danger:      ["파티가 위험한 상황에 직면하였다.", "예상치 못한 위기가 발생하였다.", "돌발 상황이 발생하였다."],
};

// ── Decision narrative templates ──────────────────────────────────────────────

const DECISION_NARRATIVE: Record<QuestDecisionType, string[]> = {
  continue:         ["길드장은 위험을 감수하고 임무를 계속할 것을 지시하였다.", "상황을 검토한 길드장이 임무 지속을 결정하였다.", "길드장의 명령에 따라 파티는 전진하였다."],
  withdraw:         ["길드장은 파티의 안전을 우선해 철수를 명령하였다.", "상황을 판단한 길드장이 조기 귀환을 지시하였다.", "길드장의 철수 명령에 따라 파티가 귀환을 시작하였다."],
  support_dispatch: ["길드장은 상황에 대응하기 위해 지원 파티를 현장으로 파견하였다.", "길드장이 지원대를 파견하여 추가 전력이 이동을 시작하였다.", "위기 상황에 대응하기 위해 길드장이 지원을 결정하였다."],
  extra_explore:    ["길드장은 발견된 기회를 활용하도록 추가 탐사를 승인하였다.", "길드장의 지시에 따라 파티는 예정에 없던 구역을 추가 조사하기로 하였다.", "길드장이 추가 탐사를 허가하였다."],
  abandon:          ["길드장은 의뢰를 포기하고 즉시 귀환할 것을 명령하였다.", "상황이 악화되어 길드장이 임무 포기를 결정하였다.", "길드장의 명령으로 파티는 의뢰를 포기하고 귀환하였다."],
};

// ── Completion narrative templates ────────────────────────────────────────────

const COMPLETION_NARRATIVE: Record<QuestResultGrade, string[]> = {
  great_success:  ["{party}는 {quest} 의뢰를 완벽히 완수하고 길드로 귀환하였다.", "{party}이(가) 기대 이상의 성과를 거두며 임무를 마쳤다.", "{party}의 압도적인 활약으로 임무가 대성공으로 마무리되었다."],
  success:        ["{party}는 {quest} 의뢰를 성공적으로 완수하고 귀환하였다.", "{party}이(가) 임무를 마치고 무사히 돌아왔다.", "{party}가 의뢰를 완수하고 길드로 귀환하였다."],
  narrow_success: ["{party}는 어려운 상황에서도 간신히 임무를 완수하였다.", "고전 끝에 {party}이(가) 의뢰를 마무리하였다.", "{party}는 상당한 어려움을 겪으며 임무를 완수하였다."],
  retreat:        ["길드장의 명령에 따라 {party}는 임무를 중단하고 귀환하였다.", "{party}이(가) 안전을 위해 철수하였다.", "상황 판단에 따라 {party}는 임무를 중단하였다."],
  failure:        ["{party}는 임무를 완수하지 못하고 귀환하였다.", "{party}이(가) 목표 달성에 실패하고 돌아왔다.", "아쉽게도 {party}는 의뢰를 완수하지 못하였다."],
  great_failure:  ["{party}는 큰 어려움을 겪으며 임무를 중단하였다.", "심각한 상황에서 {party}이(가) 간신히 귀환하였다.", "{party}는 예상치 못한 강적에 맞서 상당한 피해를 입었다."],
};

const COMPLETION_ACTOR: Record<ActorRole, string[]> = {
  vanguard: ["{actor}이(가) 전열을 지키며 파티를 이끌었다.", "{actor}는 선두에서 활약하였다."],
  damage:   ["{actor}이(가) 결정적인 순간에 활약하였다.", "{actor}는 임무에서 중요한 역할을 하였다."],
  support:  ["{actor}이(가) 팀을 지원하며 임무 완수에 기여하였다.", "{actor}는 동료들을 돌보며 파티를 유지하였다."],
  scout:    ["{actor}이(가) 정찰과 지원으로 활약하였다.", "{actor}는 정보 수집으로 파티를 이끌었다."],
};

// ── Importance determination ──────────────────────────────────────────────────

function determineImportance(
  category: AdventureLogCategory,
  hasNamedActor: boolean,
): AdventureLogImportance {
  switch (category) {
    case "completion":
    case "retreat":
    case "failure":
    case "death":
      return "major";
    case "combat":
      return hasNamedActor ? "notable" : "normal";
    case "incident":
      return "notable";
    case "decision":
      return "notable";
    case "departure":
      return "normal";
    default:
      return "normal";
  }
}

// ── Entry ID helpers ──────────────────────────────────────────────────────────

function dateKey(d: GameDate): string {
  return `${d.year}-${d.season}-${String(d.day).padStart(2, "0")}`;
}

// ── Departure log ─────────────────────────────────────────────────────────────

export function generateDepartureLog(
  quest: Quest,
  party: Party,
  members: Adventurer[],
  classes: Record<EntityId, AdventurerClass>,
  regionName: string,
  date: GameDate,
): AdventureLogEntry {
  const seed = `${quest.id}-depart`;
  const templates = DEPARTURE[quest.type] ?? DEPARTURE.default;
  const raw = pickByHash(templates, seed);
  const narrative = applyVars(raw, { party: party.name, region: regionName, quest: quest.title });

  // Pick a leader-type actor to mention (optional, just store in actorIds)
  const actor = selectActor(members, classes, ["vanguard", "damage"], seed + "-actor");
  const actorIds = actor ? [actor.id] : [];

  return {
    id: `al-${quest.id}-depart-${dateKey(date)}`,
    questId: quest.id,
    partyId: party.id,
    date,
    questDay: 0,
    category: "departure",
    importance: "normal",
    title: "출발",
    narrative,
    actorIds,
    targetIds: [],
    tags: [quest.type, "departure"],
  };
}

// ── Daily log ─────────────────────────────────────────────────────────────────

export function generateDailyLog(
  quest: Quest,
  prog: QuestProgress,
  party: Party,
  members: Adventurer[],
  classes: Record<EntityId, AdventurerClass>,
  date: GameDate,
): AdventureLogEntry | null {
  const stage: QuestStage = prog.currentStage;
  const day = prog.currentDay;
  const seed = `${quest.id}-daily-${day}-${stage}`;

  let rawTemplate: string;
  let category: AdventureLogCategory;
  let title: string;

  if (stage === "traveling") {
    const pool = TRAVEL[quest.type] ?? TRAVEL.default;
    rawTemplate = pickByHash(pool, seed);
    category = "travel";
    title = "이동";
  } else if (stage === "returning") {
    rawTemplate = pickByHash(RETURN_TMPL, seed);
    category = "return";
    title = "귀환 중";
  } else {
    // searching or executing
    const pool = EXECUTING[quest.type] ?? EXECUTING.default;
    rawTemplate = pickByHash(pool, seed);
    category = quest.type === "exploration" || quest.type === "search" ? "exploration" : "travel";
    title = "임무 수행";
  }

  const narrative = applyVars(rawTemplate, { party: party.name });

  // Only generate if this day hasn't already generated a log with the exact same text
  // (deduplication handled by having unique seed per day)
  return {
    id: `al-${quest.id}-day-${day}-${dateKey(date)}`,
    questId: quest.id,
    partyId: party.id,
    date,
    questDay: day,
    category,
    importance: "normal",
    title,
    narrative,
    actorIds: [],
    targetIds: [],
    tags: [quest.type, stage],
  };
}

// ── Incident log ──────────────────────────────────────────────────────────────

export function generateIncidentLog(
  quest: Quest,
  event: QuestEvent,
  prog: QuestProgress,
  party: Party,
  members: Adventurer[],
  classes: Record<EntityId, AdventurerClass>,
  date: GameDate,
): AdventureLogEntry {
  const seed = `${quest.id}-ev-${event.eventId}`;
  const day = prog.currentDay;

  // Build situation intro
  const introPool = EVENT_INTRO[event.category];
  const intro = pickByHash(introPool, seed + "-intro");

  // Build actor sentence for combat/danger/exploration events
  let actorSentence = "";
  let actorIds: EntityId[] = [];
  let category: AdventureLogCategory = "incident";
  let importance: AdventureLogImportance = "notable";

  if (event.category === "combat") {
    const actor = selectActor(members, classes, ["vanguard", "damage", "scout"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = COMBAT_ACTOR[role];
      actorSentence = applyVars(pickByHash(pool, seed + "-act"), { actor: actor.name });
      actorIds = [actor.id];
    }
    category = "combat";
    importance = "notable";
  } else if (event.category === "danger") {
    const actor = selectActor(members, classes, ["vanguard", "support"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = DANGER_ACTOR[role];
      actorSentence = applyVars(pickByHash(pool, seed + "-act"), { actor: actor.name });
      actorIds = [actor.id];
    }
    category = "incident";
    importance = "notable";
  } else if (event.category === "exploration" || event.category === "reward") {
    const actor = selectActor(members, classes, ["scout", "damage"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "scout") as ActorRole;
      const pool = EXPLORE_ACTOR[role];
      actorSentence = applyVars(pickByHash(pool, seed + "-act"), { actor: actor.name });
      actorIds = [actor.id];
    }
    category = event.category === "reward" ? "discovery" : "exploration";
    importance = "notable";
  }

  const narrative = actorSentence ? `${intro} ${actorSentence}` : intro;

  return {
    id: `al-${quest.id}-ev-${event.eventId}`,
    questId: quest.id,
    partyId: party.id,
    date,
    questDay: day,
    category,
    importance,
    title: event.title,
    narrative,
    actorIds,
    targetIds: [],
    incidentId: event.eventId,
    tags: [quest.type, event.category, "incident"],
  };
}

// ── Decision log ──────────────────────────────────────────────────────────────

export function generateDecisionLog(
  quest: Quest,
  decision: QuestDecision,
  prog: QuestProgress,
  party: Party | null,
  supportPartyName: string | null,
  date: GameDate,
): AdventureLogEntry {
  const seed = `${quest.id}-dec-${decision.decisionId}`;
  const pool = DECISION_NARRATIVE[decision.decision];
  let narrative = pickByHash(pool, seed);

  if (decision.decision === "support_dispatch" && supportPartyName) {
    narrative += ` ${supportPartyName} 파티가 현장으로 이동을 시작하였다.`;
  }

  const decisionTitles: Record<QuestDecisionType, string> = {
    continue:         "계속 진행 결정",
    withdraw:         "철수 결정",
    support_dispatch: "지원 파견 결정",
    extra_explore:    "추가 탐사 결정",
    abandon:          "의뢰 포기 결정",
  };

  const category: AdventureLogCategory =
    decision.decision === "withdraw" || decision.decision === "abandon" ? "retreat" : "decision";

  return {
    id: `al-${quest.id}-dec-${decision.decisionId}`,
    questId: quest.id,
    partyId: party?.id ?? prog.partyId,
    date,
    questDay: prog.currentDay,
    category,
    importance: "notable",
    title: decisionTitles[decision.decision],
    narrative,
    actorIds: [],
    targetIds: [],
    decisionId: decision.decisionId,
    tags: [quest.type, decision.decision, "decision"],
  };
}

// ── Support arrival log ───────────────────────────────────────────────────────

export function generateSupportArrivalLog(
  quest: Quest,
  prog: QuestProgress,
  mainParty: Party,
  supportPartyName: string,
  date: GameDate,
): AdventureLogEntry {
  const seed = `${quest.id}-support-arrive-${prog.currentDay}`;
  const templates = [
    `${supportPartyName} 파티가 현장에 도착하여 ${mainParty.name}와(과) 합류하였다.`,
    `지원대 ${supportPartyName}이(가) 합류하여 파티의 전력이 강화되었다.`,
    `${supportPartyName}의 지원대가 도착하여 두 파티가 함께 임무를 이어가게 되었다.`,
  ];
  const narrative = pickByHash(templates, seed);

  return {
    id: `al-${quest.id}-support-${prog.currentDay}-${dateKey(date)}`,
    questId: quest.id,
    partyId: mainParty.id,
    date,
    questDay: prog.currentDay,
    category: "decision",
    importance: "notable",
    title: "지원 파티 합류",
    narrative,
    actorIds: [],
    targetIds: [],
    tags: [quest.type, "support", "arrival"],
  };
}

// ── Completion log ────────────────────────────────────────────────────────────

export function generateCompletionLog(
  quest: Quest,
  result: QuestResult,
  prog: QuestProgress,
  party: Party | null,
  members: Adventurer[],
  classes: Record<EntityId, AdventurerClass>,
  date: GameDate,
): AdventureLogEntry {
  const seed = `${quest.id}-complete`;
  const partyName = party?.name ?? "파티";

  const pool = COMPLETION_NARRATIVE[result.resultGrade];
  let narrative = applyVars(pickByHash(pool, seed), { party: partyName, quest: quest.title });

  // Pick a notable actor to mention
  let actorIds: EntityId[] = [];
  if (members.length > 0 && result.success) {
    const actor = selectActor(members, classes, ["vanguard", "damage", "support"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const actorPool = COMPLETION_ACTOR[role];
      const actorSentence = applyVars(pickByHash(actorPool, seed + "-act"), { actor: actor.name });
      narrative += ` ${actorSentence}`;
      actorIds = [actor.id];
    }
  }

  const category: AdventureLogCategory =
    result.retreat ? "retreat" :
    result.success ? "completion" :
    "failure";

  const resultTitles: Record<string, string> = {
    great_success: "대성공 완료",
    success: "임무 완료",
    narrow_success: "간신히 완료",
    retreat: "철수 완료",
    failure: "임무 실패",
    great_failure: "임무 실패",
  };

  return {
    id: `al-${quest.id}-complete-${dateKey(date)}`,
    questId: quest.id,
    partyId: party?.id ?? prog.partyId,
    date,
    questDay: prog.currentDay,
    category,
    importance: "major",
    title: resultTitles[result.resultGrade] ?? "완료",
    narrative,
    actorIds,
    targetIds: [],
    tags: [quest.type, result.resultGrade, "completion"],
  };
}
