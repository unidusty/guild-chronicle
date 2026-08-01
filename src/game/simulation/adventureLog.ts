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
  default:     ["{party}가 의뢰를 위해 길드를 출발하였다.", "{party}이(가) 임무를 시작하였다.", "{party}가 의뢰에 나섰다."],
  escort:      ["{party}가 상단과 합류하여 {region}을(를) 향해 출발하였다.", "호위 임무를 맡은 {party}이(가) {region}으로 출발하였다.", "{party}가 상단의 안전을 책임지고 길을 나섰다.", "의뢰인을 만난 {party}이(가) 호위 대형을 갖추고 출발하였다."],
  hunt:        ["{party}가 토벌 임무를 위해 {region}으로 출발하였다.", "{party}이(가) {enemy}을(를) 처리하기 위해 길드를 떠났다.", "{party}가 위협 제거를 위해 출발하였다.", "{party}이(가) {region}의 위협에 대응하러 나섰다."],
  search:      ["{party}가 수색을 위해 {region}으로 향했다.", "{party}이(가) 단서를 따라 출발하였다.", "{party}가 목표물 수색 임무를 시작하였다.", "{party}이(가) {region} 일대 수색에 나섰다."],
  delivery:    ["{party}가 의뢰물을 안전히 전달하기 위해 출발하였다.", "{party}이(가) {region}으로 배달 임무를 시작하였다.", "의뢰물을 맡은 {party}가 길을 나섰다."],
  rescue:      ["{party}가 구조를 위해 신속히 출발하였다.", "시간이 촉박한 상황에서 {party}이(가) {region}으로 달려갔다.", "{party}가 구조 임무를 위해 길드를 떠났다.", "실종자를 찾기 위해 {party}이(가) 서둘러 출발하였다."],
  exploration: ["{party}가 {region} 탐사를 위해 출발하였다.", "미지의 지역을 조사하기 위해 {party}이(가) 나섰다.", "{party}가 탐사 의뢰를 위해 길을 나섰다.", "{party}이(가) {region}의 비밀을 밝히기 위해 출발하였다."],
};

// ── Stage travel templates ────────────────────────────────────────────────────

const TRAVEL: Partial<Record<QuestCategory, string[]>> & { default: string[] } = {
  default:     ["파티는 목적지를 향해 이동하였다.", "먼 길을 묵묵히 나아가고 있다.", "별다른 이변 없이 이동이 계속되고 있다.", "{party}이(가) {region}을(를) 향해 묵묵히 전진하였다."],
  escort:      ["호위 행렬이 순조롭게 이동하고 있다.", "{party}는 상단을 이끌며 목적지를 향해 나아가고 있다.", "주변을 경계하며 호위 임무가 진행되고 있다.", "{party}이(가) 상단의 안전을 확인하며 이동을 이어갔다."],
  hunt:        ["파티는 목표 지역을 향해 이동하였다.", "흔적을 따라 파티가 전진하였다.", "{party}가 {enemy}의 위치를 확인하며 이동 중이다.", "{party}이(가) {region}을(를) 향해 신중하게 전진하였다."],
  search:      ["파티는 수색 범위를 좁혀가고 있다.", "{party}이(가) 단서를 분석하며 이동하였다.", "{party}가 목표 지역으로 접근하고 있다.", "{party}이(가) 수색 경로를 따라 전진하였다."],
  delivery:    ["의뢰물을 안전하게 운반하며 이동하고 있다.", "파티가 최단 경로로 목적지를 향해 나아가고 있다.", "{party}가 의뢰물 보호에 만전을 기하며 이동하였다."],
  rescue:      ["{party}는 실종자의 마지막 목격지를 향해 빠르게 이동하였다.", "시간을 절약하기 위해 파티가 서둘러 이동하였다.", "{party}이(가) 생존자를 찾기 위해 빠르게 이동하고 있다."],
  exploration: ["파티는 탐사 지역으로 이동하고 있다.", "{party}이(가) 미지의 구역을 향해 나아가고 있다.", "{party}가 {region}의 입구에 다가서고 있다."],
};

// ── Stage executing templates ─────────────────────────────────────────────────

const EXECUTING: Partial<Record<QuestCategory, string[]>> & { default: string[] } = {
  default:     ["임무가 진행 중이다.", "파티가 의뢰를 수행하고 있다.", "현장에서 임무가 계속되고 있다.", "{party}이(가) 의뢰 현장에서 임무를 이어가고 있다."],
  escort:      ["호위 임무가 계속되고 있다.", "{party}는 상단의 안전을 지키며 임무를 수행하고 있다.", "파티는 주변을 경계하며 이동을 이어가고 있다.", "{party}이(가) 이변에 대비하며 상단을 보호하고 있다."],
  hunt:        ["{party}는 목표를 추적하고 있다.", "파티가 사냥을 이어가고 있다.", "{party}이(가) {enemy}을(를) 추적하며 토벌을 진행하고 있다.", "{enemy}의 위치를 좁혀가며 {party}이(가) 포위망을 펼쳤다."],
  search:      ["{party}는 지역을 꼼꼼히 수색하고 있다.", "단서를 따라 파티가 수색 범위를 넓혀가고 있다.", "{party}이(가) 흔적을 분석하며 수색을 이어갔다."],
  exploration: ["{party}는 지역을 탐사하고 있다.", "발견된 단서를 바탕으로 탐사가 이어지고 있다.", "{party}이(가) 미지의 구역을 조사하고 있다.", "{party}가 {region}의 깊숙한 곳을 탐사하고 있다."],
  rescue:      ["{party}는 실종자의 흔적을 추적하고 있다.", "파티가 생존 신호를 찾아 수색을 계속하고 있다.", "{party}이(가) 구조 대상의 생사를 확인하며 수색 중이다."],
  delivery:    ["의뢰물을 보호하며 이동 중이다.", "방해 없이 배달이 진행되고 있다.", "{party}가 의뢰물을 안전하게 운반하며 목적지에 접근하고 있다."],
};

// ── Hunt with enemy — executing templates ─────────────────────────────────────

const HUNT_ENEMY_EXEC: string[] = [
  "{party}는 {enemy}의 흔적을 추적하며 토벌 임무를 이어갔다.",
  "{enemy}의 위치를 파악한 {party}이(가) 포위망을 좁혀갔다.",
  "{party}가 {enemy}을(를) 몰아붙이며 사냥을 이어갔다.",
  "{enemy}을(를) 추적 중인 {party}가 목표 지점으로 서서히 다가가고 있다.",
  "{party}는 {region}에서 {enemy}의 거점을 향해 착실히 전진하고 있다.",
];

// ── Return stage templates ────────────────────────────────────────────────────

const RETURN_TMPL: string[] = [
  "임무를 마친 파티가 길드로 귀환하고 있다.",
  "파티가 귀환 행로에 올랐다.",
  "{party}이(가) 임무를 마치고 돌아오고 있다.",
  "귀환 중인 파티는 특별한 이상 없이 이동을 계속하고 있다.",
  "{party}이(가) 임무의 성과를 안고 길드로 향하고 있다.",
];

// ── Class-specific action templates (combat context) ─────────────────────────

const CLASS_COMBAT: Partial<Record<string, string[]>> = {
  warrior: [
    "{actor}이(가) 전열을 지키며 적의 공격을 온몸으로 막아냈다.",
    "{actor}는 방패를 들고 선두에서 버텨내며 동료들의 시간을 벌었다.",
    "{actor}이(가) 선두에서 적의 기세를 꺾었다.",
    "{actor}는 동료들을 보호하며 전선을 유지하였다.",
  ],
  swordsman: [
    "{actor}이(가) 검술로 적장을 쓰러뜨렸다.",
    "{actor}는 날카로운 검격으로 적의 방어를 뚫었다.",
    "{actor}이(가) 빠른 칼놀림으로 적을 제압하였다.",
    "{actor}는 결정적인 일격으로 전투를 이끌었다.",
  ],
  spearman: [
    "{actor}이(가) 창으로 돌격을 저지하였다.",
    "{actor}는 긴 창을 앞세워 적의 접근을 허용하지 않았다.",
    "{actor}이(가) 창격으로 적의 진형을 흐트러뜨렸다.",
    "{actor}는 선봉에서 창을 휘두르며 적군을 몰아냈다.",
  ],
  archer: [
    "{actor}이(가) 후방에서 정확한 화살로 적을 지원하였다.",
    "{actor}는 원거리에서 핵심 위협 대상을 제거하였다.",
    "{actor}이(가) 정밀 사격으로 전황을 유리하게 이끌었다.",
    "{actor}는 빠른 연사로 적의 접근을 차단하였다.",
  ],
  mage: [
    "{actor}이(가) 마법으로 적의 움직임을 봉쇄하였다.",
    "{actor}는 강력한 주문으로 전황을 바꾸었다.",
    "{actor}이(가) 원거리 마법으로 다수의 적을 무력화하였다.",
    "{actor}는 주문을 시전하여 전장의 흐름을 뒤집었다.",
  ],
  paladin: [
    "{actor}이(가) 방어선을 굳건히 유지하였다.",
    "{actor}는 신성한 방어막으로 동료들을 보호하였다.",
    "{actor}이(가) 성스러운 힘으로 파티를 지탱하였다.",
    "{actor}는 동료를 보호하며 적의 공격을 흡수하였다.",
  ],
  rogue: [
    "{actor}이(가) 적의 허를 찔러 치명타를 가하였다.",
    "{actor}는 그림자처럼 움직여 핵심 적을 제거하였다.",
    "{actor}이(가) 기습으로 적 지휘관을 무력화하였다.",
    "{actor}는 기민한 움직임으로 위협 대상을 빠르게 처리하였다.",
  ],
  priest: [
    "{actor}이(가) 부상자를 치료하여 전열을 유지하였다.",
    "{actor}는 축복으로 파티의 전투력을 높였다.",
    "{actor}이(가) 신성 마법으로 동료들을 지원하였다.",
    "{actor}는 위기 상황에서 신속히 동료의 상처를 치료하였다.",
  ],
  guardian: [
    "{actor}이(가) 철벽 방어로 적의 공격을 흡수하였다.",
    "{actor}는 파티의 방패가 되어 동료들을 지켰다.",
    "{actor}이(가) 무거운 갑옷으로 선두에서 버텨냈다.",
    "{actor}는 단단한 방어선으로 파티 전원의 안전을 확보하였다.",
  ],
};

// ── Class-specific action templates (exploration context) ─────────────────────

const CLASS_EXPLORE: Partial<Record<string, string[]>> = {
  archer:    ["{actor}이(가) 날카로운 눈으로 중요한 단서를 발견하였다.", "{actor}는 주변을 면밀히 살피며 숨겨진 통로를 찾아냈다."],
  rogue:     ["{actor}이(가) 조심스럽게 앞서 나가 함정 여부를 확인하였다.", "{actor}는 대담하게 앞장서 길을 열었다."],
  mage:      ["{actor}이(가) 수집된 단서들을 분석하여 방향을 잡았다.", "{actor}는 마법적 감지로 이상 징후를 먼저 포착하였다."],
  priest:    ["{actor}이(가) 체계적인 조사로 탐사를 지원하였다.", "{actor}는 신성한 감각으로 위험 지역을 미리 파악하였다."],
  warrior:   ["{actor}이(가) 파티를 이끌며 탐사 범위를 넓혀나갔다.", "{actor}는 선두에서 경로를 개척하였다."],
  guardian:  ["{actor}이(가) 신중하게 구조물을 점검하며 안전을 확인하였다.", "{actor}는 무게 있는 발걸음으로 바닥을 확인하며 전진하였다."],
  swordsman: ["{actor}이(가) 위험 지역에 먼저 진입하여 안전을 확인하였다.", "{actor}는 반사적인 움직임으로 위험 요소를 제거하였다."],
  spearman:  ["{actor}이(가) 긴 창으로 어두운 곳을 살피며 전진하였다.", "{actor}는 사거리를 활용해 위험 지역을 안전하게 탐색하였다."],
  paladin:   ["{actor}이(가) 신성한 빛으로 어둠 속의 위험을 밝혀냈다.", "{actor}는 파티를 보호하며 탐사를 이끌었다."],
};

// ── Class-specific action templates (travel context) ─────────────────────────

const CLASS_TRAVEL: Partial<Record<string, string[]>> = {
  archer:    ["{actor}이(가) 주변을 경계하며 이상 징후를 살폈다.", "{actor}는 앞서 정찰하며 파티의 안전을 확보하였다."],
  rogue:     ["{actor}이(가) 빠르게 앞서 나가 경로를 확인하였다.", "{actor}는 소리 없이 이동하며 주변 상황을 파악하였다."],
  mage:      ["{actor}이(가) 마법으로 주변의 이상 기운을 탐지하였다.", "{actor}는 이동 중에도 방어 주문을 유지하였다."],
  priest:    ["{actor}이(가) 동료들의 상태를 확인하며 행군을 이어갔다.", "{actor}는 파티의 피로를 줄이기 위해 회복 기도를 올렸다."],
  warrior:   ["{actor}이(가) 선두에서 경계를 서며 파티를 이끌었다.", "{actor}는 묵묵히 앞장서 이동 속도를 유지하였다."],
  guardian:  ["{actor}이(가) 후미에서 파티를 지키며 이동하였다.", "{actor}는 이동 중에도 방어 태세를 유지하였다."],
  swordsman: ["{actor}이(가) 칼자루에 손을 얹고 주변을 경계하였다.", "{actor}는 예리한 눈으로 이상 징후를 살폈다."],
  spearman:  ["{actor}이(가) 창을 앞세워 선두에서 경계를 섰다.", "{actor}는 넓은 사거리를 활용하며 주변을 통제하였다."],
  paladin:   ["{actor}이(가) 신성한 감각으로 주변의 위험을 감지하였다.", "{actor}는 파티의 사기를 북돋우며 행군을 이끌었다."],
};

// ── Role-based fallback templates ─────────────────────────────────────────────

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
  scout:   ["{actor}이(가) 날카로운 감각으로 중요한 단서를 발견하였다.", "{actor}는 주변을 면밀히 살피며 숨겨진 통로를 찾아냈다."],
  damage:  ["{actor}이(가) 위험 지역에 먼저 진입하여 안전을 확인하였다.", "{actor}는 대담하게 앞장서 길을 열었다."],
  vanguard:["{actor}이(가) 파티를 이끌며 탐사 범위를 넓혀나갔다.", "{actor}는 선두에서 경로를 개척하였다."],
  support: ["{actor}이(가) 수집된 단서들을 분석하여 방향을 잡았다.", "{actor}는 체계적인 조사로 탐사를 지원하였다."],
};

const DANGER_ACTOR: Record<ActorRole, string[]> = {
  vanguard:["{actor}이(가) 위험을 무릅쓰고 동료들을 보호하였다.", "{actor}는 위기 상황에서 파티를 이끌었다."],
  damage:  ["{actor}이(가) 신속하게 위협을 처리하였다.", "{actor}는 기민한 판단으로 위기를 돌파하였다."],
  support: ["{actor}이(가) 부상자를 돌보며 파티의 전투력을 유지하였다.", "{actor}는 침착하게 상황을 수습하였다."],
  scout:   ["{actor}이(가) 위험 요소를 먼저 파악하여 피해를 최소화하였다.", "{actor}는 정확한 정보로 파티의 행동을 이끌었다."],
};

// ── Enemy-aware combat introductions ─────────────────────────────────────────

const ENEMY_COMBAT_INTRO: string[] = [
  "{enemy}와(과) 교전이 발생하였다.",
  "{party}는 {region}에서 {enemy}의 기습을 받았다.",
  "{enemy}이(가) 파티 앞을 가로막았다.",
  "잠복해 있던 {enemy}이(가) 공격을 개시하였다.",
  "예상했던 {enemy}이(가) 마침내 모습을 드러냈다.",
  "{region}에서 {enemy}과(와) 조우하였다.",
];

// ── Event category introductions ──────────────────────────────────────────────

const EVENT_INTRO: Record<QuestEventCategory, string[]> = {
  combat:      ["교전이 발생하였다.", "적과의 전투가 벌어졌다.", "무리와의 접전이 시작되었다.", "기습 공격을 받았다.", "전투가 불가피한 상황이 되었다."],
  exploration: ["예상치 못한 지점이 발견되었다.", "새로운 구역이 나타났다.", "조사 중 중요한 단서를 발견하였다.", "탐사 중 이상한 구조물이 발견되었다."],
  environment: ["환경 이변이 발생하였다.", "날씨와 지형이 임무를 방해하기 시작하였다.", "예상치 못한 자연 현상이 발생하였다.", "지형 변화로 진로가 막혔다."],
  reward:      ["예상치 못한 발견이 있었다.", "이동 중 귀중한 것이 발견되었다.", "뜻밖의 성과가 생겼다.", "탐사 중 값진 것을 발견하였다."],
  person:      ["현장에서 뜻밖의 인물과 조우하였다.", "예상치 못한 인물을 만났다.", "낯선 자가 나타났다.", "임무 중 예상치 못한 만남이 있었다."],
  danger:      ["파티가 위험한 상황에 직면하였다.", "예상치 못한 위기가 발생하였다.", "돌발 상황이 발생하였다.", "중대한 위험이 파티 앞을 가로막았다."],
};

// ── Decision narrative templates ──────────────────────────────────────────────

const DECISION_NARRATIVE: Record<QuestDecisionType, string[]> = {
  continue:         ["길드장은 위험을 감수하고 임무를 계속할 것을 지시하였다.", "상황을 검토한 길드장이 임무 지속을 결정하였다.", "길드장의 명령에 따라 파티는 전진하였다.", "길드장은 파티의 역량을 믿고 전진 명령을 내렸다."],
  withdraw:         ["길드장은 파티의 안전을 우선해 철수를 명령하였다.", "상황을 판단한 길드장이 조기 귀환을 지시하였다.", "길드장의 철수 명령에 따라 파티가 귀환을 시작하였다.", "더 이상의 진행이 무리라 판단한 길드장이 철수를 결정하였다."],
  support_dispatch: ["길드장은 상황에 대응하기 위해 지원 파티를 현장으로 파견하였다.", "길드장이 지원대를 파견하여 추가 전력이 이동을 시작하였다.", "위기 상황에 대응하기 위해 길드장이 지원을 결정하였다.", "길드장은 전력 보강을 위해 즉시 지원 파티 파견을 결정하였다."],
  extra_explore:    ["길드장은 발견된 기회를 활용하도록 추가 탐사를 승인하였다.", "길드장의 지시에 따라 파티는 예정에 없던 구역을 추가 조사하기로 하였다.", "길드장이 추가 탐사를 허가하였다.", "더 나은 성과를 위해 길드장이 추가 탐사를 지시하였다."],
  abandon:          ["길드장은 의뢰를 포기하고 즉시 귀환할 것을 명령하였다.", "상황이 악화되어 길드장이 임무 포기를 결정하였다.", "길드장의 명령으로 파티는 의뢰를 포기하고 귀환하였다.", "모든 것을 고려한 끝에 길드장은 포기를 결정하였다."],
};

// ── Completion narrative templates ────────────────────────────────────────────

const COMPLETION_NARRATIVE: Record<QuestResultGrade, string[]> = {
  great_success:  [
    "{party}는 {quest} 의뢰에서 압도적인 실력으로 대성공을 거두었다.",
    "{party}이(가) 기대를 훨씬 뛰어넘는 성과를 거두며 임무를 마쳤다.",
    "{party}의 활약으로 의뢰가 완벽히 완수되었다.",
    "{party}는 이번 의뢰에서 길드의 이름을 드높였다.",
  ],
  success:        [
    "{party}는 {quest} 의뢰를 성공적으로 완수하고 귀환하였다.",
    "{party}이(가) 임무를 마치고 무사히 돌아왔다.",
    "{party}가 의뢰를 완수하고 길드로 귀환하였다.",
    "어려움 없이 {party}이(가) 의뢰를 완수하였다.",
  ],
  narrow_success: [
    "{party}는 어려운 상황에서도 간신히 임무를 완수하였다.",
    "고전 끝에 {party}이(가) 의뢰를 마무리하였다.",
    "{party}는 상당한 어려움을 겪으며 임무를 완수하였다.",
    "가까스로 목표를 달성한 {party}이(가) 길드로 돌아왔다.",
  ],
  retreat:        [
    "길드장의 명령에 따라 {party}는 임무를 중단하고 귀환하였다.",
    "{party}이(가) 안전을 위해 철수하였다.",
    "상황 판단에 따라 {party}는 임무를 중단하였다.",
    "더 이상의 진행이 무리라 판단하여 {party}이(가) 귀환을 선택하였다.",
  ],
  failure:        [
    "{party}는 임무를 완수하지 못하고 귀환하였다.",
    "{party}이(가) 목표 달성에 실패하고 돌아왔다.",
    "아쉽게도 {party}는 의뢰를 완수하지 못하였다.",
    "예상보다 어려운 상황에 직면한 {party}이(가) 빈손으로 돌아왔다.",
  ],
  great_failure:  [
    "{party}는 강적과의 전투 끝에 더 이상의 진행이 불가능하다고 판단하였다. 길드는 철수를 명령하였다.",
    "전력을 크게 잃은 {party}이(가) 간신히 길드로 귀환하였다.",
    "심각한 피해를 입은 {party}는 임무를 포기하고 귀환을 택하였다.",
    "{party}는 한계에 이른 끝에 귀환을 결정하였다. 이번 의뢰는 무거운 교훈을 남겼다.",
  ],
};

// ── Heroic great success by quest category ────────────────────────────────────

const GREAT_SUCCESS_HERO: Partial<Record<QuestCategory, string[]>> & { default: string[] } = {
  default:     [
    "압도적인 역량으로 예상보다 훨씬 빠르게 임무를 완수하였다.",
    "파티의 완벽한 협력으로 의뢰가 대성공으로 마무리되었다.",
    "길드의 기대를 뛰어넘는 성과를 남겼다.",
  ],
  hunt:        [
    "{party}는 {enemy}을(를) 완벽히 제압하고 대승을 거두었다.",
    "{enemy}을(를) 예상보다 빠르게 격퇴한 {party}이(가) 영웅으로 귀환하였다.",
    "강적 {enemy}을(를) 상대로 {party}이(가) 완벽한 승리를 거두었다.",
  ],
  escort:      [
    "호위 대상을 단 한 명도 잃지 않고 임무를 완벽히 완수하였다.",
    "{party}이(가) 위기 상황에서도 호위 대상을 안전하게 지켜냈다.",
    "예상치 못한 위협에도 {party}는 완벽한 호위를 수행하였다.",
  ],
  exploration: [
    "미지의 구역을 완전히 탐사하는 데 성공하여 귀중한 정보를 확보하였다.",
    "{party}이(가) {region}의 비밀을 낱낱이 밝혀내는 쾌거를 이루었다.",
    "예상보다 광범위한 탐사를 완료한 {party}이(가) 귀환하였다.",
  ],
  search:      [
    "목표물을 신속히 발견하고 예상보다 이른 시간에 임무를 완수하였다.",
    "{party}이(가) 뛰어난 수색 능력으로 목표를 발빠르게 확보하였다.",
    "난이도 높은 수색에서 {party}이(가) 완벽한 성과를 거두었다.",
  ],
  rescue:      [
    "구조 대상을 전원 생존 상태로 구출하는 쾌거를 이루었다.",
    "{party}이(가) 절박한 상황에서도 모든 생존자를 구출하는 데 성공하였다.",
    "빛나는 활약으로 {party}이(가) 전원 구출이라는 쾌거를 달성하였다.",
  ],
  delivery:    [
    "의뢰물을 완벽한 상태로 신속하게 전달하는 데 성공하였다.",
    "단 하나의 손실도 없이 {party}이(가) 배달 임무를 완수하였다.",
  ],
};

// ── Failure context notes ─────────────────────────────────────────────────────

const FAILURE_CONTEXT: string[] = [
  "예상보다 강한 적에 맞서다 목표를 달성하지 못하였다.",
  "현장 상황이 당초 예상과 크게 달라 의뢰를 완수할 수 없었다.",
  "연이은 사건으로 전력이 소진되어 목표 달성에 실패하였다.",
  "부득이한 상황으로 인해 임무를 중단할 수밖에 없었다.",
  "위험 수준이 예상을 초과하여 목표 달성이 불가능해졌다.",
];

const COMPLETION_ACTOR: Record<ActorRole, string[]> = {
  vanguard: ["{actor}이(가) 전열을 지키며 파티를 이끌었다.", "{actor}는 선두에서 활약하였다.", "{actor}이(가) 결정적인 순간에 파티를 지탱하였다."],
  damage:   ["{actor}이(가) 결정적인 순간에 활약하였다.", "{actor}는 임무에서 중요한 역할을 하였다.", "{actor}이(가) 목표를 달성하는 데 핵심적으로 기여하였다."],
  support:  ["{actor}이(가) 팀을 지원하며 임무 완수에 기여하였다.", "{actor}는 동료들을 돌보며 파티를 유지하였다.", "{actor}이(가) 끝까지 파티를 지원하였다."],
  scout:    ["{actor}이(가) 정찰과 지원으로 활약하였다.", "{actor}는 정보 수집으로 파티를 이끌었다.", "{actor}이(가) 신속한 판단으로 파티에 기여하였다."],
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

// ── Class action helper ───────────────────────────────────────────────────────

type ActionContext = "combat" | "explore" | "travel";

function getClassAction(
  classId: string,
  context: ActionContext,
  seed: string,
): string {
  const map = context === "combat" ? CLASS_COMBAT : context === "explore" ? CLASS_EXPLORE : CLASS_TRAVEL;
  const pool = map[classId];
  if (pool && pool.length > 0) return pickByHash(pool, seed);
  // Fallback generic
  const fallbacks: Record<ActionContext, string[]> = {
    combat:  ["{actor}이(가) 활약하였다.", "{actor}는 임무에서 중요한 역할을 하였다."],
    explore: ["{actor}이(가) 탐사를 지원하였다.", "{actor}는 조사를 이어갔다."],
    travel:  ["{actor}이(가) 경계를 섰다.", "{actor}는 주변을 살폈다."],
  };
  return pickByHash(fallbacks[context], seed);
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
  const enemy = quest.enemyHint ?? "적";
  const narrative = applyVars(raw, { party: party.name, region: regionName, quest: quest.title, enemy });

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
  regionName: string = "",
): AdventureLogEntry | null {
  const stage: QuestStage = prog.currentStage;
  const day = prog.currentDay;
  const seed = `${quest.id}-daily-${day}-${stage}`;
  const enemy = quest.enemyHint ?? "";
  const region = regionName || "목적지";

  let rawTemplate: string;
  let category: AdventureLogCategory;
  let title: string;
  let actorContext: ActionContext = "travel";

  if (stage === "traveling") {
    const pool = TRAVEL[quest.type] ?? TRAVEL.default;
    rawTemplate = pickByHash(pool, seed);
    category = "travel";
    title = "이동";
    actorContext = "travel";
  } else if (stage === "returning") {
    rawTemplate = pickByHash(RETURN_TMPL, seed);
    category = "return";
    title = "귀환 중";
    actorContext = "travel";
  } else {
    // executing — use hunt+enemy template when available
    if (quest.type === "hunt" && enemy) {
      rawTemplate = pickByHash(HUNT_ENEMY_EXEC, seed + "-hunt");
    } else {
      const pool = EXECUTING[quest.type] ?? EXECUTING.default;
      rawTemplate = pickByHash(pool, seed);
    }
    category = quest.type === "exploration" || quest.type === "search" ? "exploration" : "travel";
    title = "임무 수행";
    actorContext = quest.type === "exploration" || quest.type === "search" ? "explore" : "travel";
  }

  let narrative = applyVars(rawTemplate, { party: party.name, region, enemy });

  // ~25% of days: add a named actor sentence for variety
  const actorIds: EntityId[] = [];
  const addActor = pickByHash([false, false, false, true] as const, seed + "-actor-roll");
  if (addActor && members.length > 0) {
    const preferredRoles: ActorRole[] =
      stage === "executing" && (quest.type === "hunt")
        ? ["vanguard", "damage"]
        : stage === "executing" && (quest.type === "exploration" || quest.type === "search")
        ? ["scout", "support"]
        : ["scout", "vanguard"];
    const actor = selectActor(members, classes, preferredRoles, seed + "-actor");
    if (actor) {
      const actionTemplate = getClassAction(actor.classId, actorContext, seed + "-classact");
      const actionSentence = applyVars(actionTemplate, { actor: actor.name, party: party.name, region, enemy });
      narrative += ` ${actionSentence}`;
      actorIds.push(actor.id);
    }
  }

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
    actorIds,
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
  regionName: string = "",
): AdventureLogEntry {
  const seed = `${quest.id}-ev-${event.eventId}`;
  const day = prog.currentDay;
  const enemy = quest.enemyHint ?? "";
  const region = regionName || "현장";

  // Build situation intro
  let intro: string;
  if (event.category === "combat" && enemy) {
    const pool = ENEMY_COMBAT_INTRO;
    intro = applyVars(pickByHash(pool, seed + "-intro"), { party: party.name, region, enemy });
  } else {
    const introPool = EVENT_INTRO[event.category];
    intro = pickByHash(introPool, seed + "-intro");
  }

  // Build actor sentence — prefer class-specific templates
  let actorSentence = "";
  const actorIds: EntityId[] = [];
  let category: AdventureLogCategory = "incident";
  let importance: AdventureLogImportance = "notable";

  if (event.category === "combat") {
    const actor = selectActor(members, classes, ["vanguard", "damage", "scout"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const actionTemplate = getClassAction(actor.classId, "combat", seed + "-act");
      actorSentence = applyVars(actionTemplate, { actor: actor.name });
      actorIds.push(actor.id);

      // Pick a second actor if party is large enough (support role to mention healing/backup)
      if (members.length >= 3) {
        const actor2 = selectActor(members, classes, ["support", "scout"], seed + "-actor2", actor.id);
        if (actor2 && actor2.id !== actor.id) {
          const cls2 = classes[actor2.classId];
          const role2 = (cls2?.role ?? "support") as ActorRole;
          const pool2 = CLASS_COMBAT[actor2.classId] ?? COMBAT_ACTOR[role2];
          const sentence2 = applyVars(pickByHash(pool2, seed + "-act2"), { actor: actor2.name });
          actorSentence += ` ${sentence2}`;
          actorIds.push(actor2.id);
        }
      }

      void cls;
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
      actorIds.push(actor.id);
    }
    category = "incident";
    importance = "notable";
  } else if (event.category === "exploration" || event.category === "reward") {
    const actor = selectActor(members, classes, ["scout", "damage"], seed + "-actor");
    if (actor) {
      const actionTemplate = getClassAction(actor.classId, "explore", seed + "-act");
      actorSentence = applyVars(actionTemplate, { actor: actor.name });
      actorIds.push(actor.id);
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
    tags: [quest.type, event.category, "incident", ...(enemy ? [enemy] : [])],
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
    `${mainParty.name}의 위기에 달려온 ${supportPartyName}이(가) 마침내 합류하였다.`,
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
  regionName: string = "",
): AdventureLogEntry {
  const seed = `${quest.id}-complete`;
  const partyName = party?.name ?? "파티";
  const enemy = quest.enemyHint ?? "";
  const region = regionName || "현장";

  let narrative: string;
  const actorIds: EntityId[] = [];

  if (result.resultGrade === "great_success") {
    // Heroic great success — use category-specific templates
    const heroPool = GREAT_SUCCESS_HERO[quest.type] ?? GREAT_SUCCESS_HERO.default;
    const heroTmpl = pickByHash(heroPool, seed + "-hero");
    const baseNarrative = applyVars(heroTmpl, { party: partyName, quest: quest.title, enemy, region });

    // Pick a standout actor for the heroic narrative
    if (members.length > 0) {
      const actor = selectActor(members, classes, ["vanguard", "damage", "scout"], seed + "-actor");
      if (actor) {
        const cls = classes[actor.classId];
        const role = (cls?.role ?? "vanguard") as ActorRole;
        const actorPool = CLASS_COMBAT[actor.classId] ?? COMPLETION_ACTOR[role];
        const actorSentence = applyVars(pickByHash(actorPool, seed + "-act"), { actor: actor.name, party: partyName });
        narrative = `${baseNarrative} ${actorSentence}`;
        actorIds.push(actor.id);
      } else {
        narrative = baseNarrative;
      }
    } else {
      narrative = baseNarrative;
    }
  } else if (result.resultGrade === "great_failure") {
    // Heavy great failure
    const pool = COMPLETION_NARRATIVE.great_failure;
    narrative = applyVars(pickByHash(pool, seed), { party: partyName, quest: quest.title, enemy, region });
  } else if (result.resultGrade === "failure") {
    // Failure with context explaining why
    const pool = COMPLETION_NARRATIVE.failure;
    const base = applyVars(pickByHash(pool, seed), { party: partyName, quest: quest.title, enemy, region });
    const context = pickByHash(FAILURE_CONTEXT, seed + "-ctx");
    narrative = `${base} ${context}`;
  } else {
    // success / narrow_success / retreat
    const pool = COMPLETION_NARRATIVE[result.resultGrade];
    const base = applyVars(pickByHash(pool, seed), { party: partyName, quest: quest.title, enemy, region });

    // Add a notable actor mention for successes
    if (result.success && members.length > 0) {
      const actor = selectActor(members, classes, ["vanguard", "damage", "support"], seed + "-actor");
      if (actor) {
        const cls = classes[actor.classId];
        const role = (cls?.role ?? "vanguard") as ActorRole;
        const actorPool = COMPLETION_ACTOR[role];
        const actorSentence = applyVars(pickByHash(actorPool, seed + "-act"), { actor: actor.name });
        narrative = `${base} ${actorSentence}`;
        actorIds.push(actor.id);
      } else {
        narrative = base;
      }
    } else {
      narrative = base;
    }
  }

  const category: AdventureLogCategory =
    result.retreat ? "retreat" :
    result.success ? "completion" :
    "failure";

  const importance: AdventureLogImportance =
    result.resultGrade === "great_success" || result.resultGrade === "great_failure"
      ? "historic"
      : "major";

  const resultTitles: Record<string, string> = {
    great_success: "대성공 완료",
    success: "임무 완료",
    narrow_success: "간신히 완료",
    retreat: "철수 완료",
    failure: "임무 실패",
    great_failure: "대실패",
  };

  return {
    id: `al-${quest.id}-complete-${dateKey(date)}`,
    questId: quest.id,
    partyId: party?.id ?? prog.partyId,
    date,
    questDay: prog.currentDay,
    category,
    importance,
    title: resultTitles[result.resultGrade] ?? "완료",
    narrative,
    actorIds,
    targetIds: [],
    tags: [quest.type, result.resultGrade, "completion", ...(enemy ? [enemy] : [])],
  };
}
