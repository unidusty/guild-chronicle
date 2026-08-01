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

// ── Scene builder ─────────────────────────────────────────────────────────────

function buildScene(segments: string[]): string {
  return segments.filter(s => s.trim().length > 0).join("\n\n");
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

// ── Scene segment templates ───────────────────────────────────────────────────

const SCENE_OPENING: Partial<Record<QuestCategory, string[]>> & { default: string[] } = {
  default:     ["파티는 경계를 늦추지 않고 있었다.", "주변은 고요하였다.", "임무가 진행되던 중이었다."],
  hunt:        ["{region}에 불길한 기운이 감돌고 있었다.", "파티는 목표를 추적하며 천천히 전진하고 있었다.", "주변의 기척이 갑자기 멈추었다.", "{enemy}의 흔적이 점점 가까워지고 있었다."],
  escort:      ["호위 행렬이 예민한 분위기 속에서 이동하고 있었다.", "{party}는 상단을 호위하며 주변을 경계하고 있었다.", "길목에 이상한 고요함이 흘렀다."],
  search:      ["{party}는 단서를 쫓아 지역 깊숙이 진입하고 있었다.", "수색이 진행될수록 긴장감이 높아졌다.", "목표물의 흔적이 가까이 있었다."],
  exploration: ["미지의 지역이 파티 앞에 펼쳐졌다.", "탐사가 깊어질수록 예상치 못한 것들이 나타났다.", "알려지지 않은 구역이 파티를 기다리고 있었다."],
  rescue:      ["시간이 촉박하였다.", "생존자의 신호가 점점 희미해지고 있었다.", "{party}는 숨 가쁘게 이동하고 있었다."],
  delivery:    ["의뢰물을 싣고 이동 중이었다.", "평온한 길이 갑자기 위태로워졌다.", "여정은 순조로워 보였지만 긴장을 놓을 수 없었다."],
};

const SCENE_ENEMY_APPEAR: string[] = [
  "{enemy}이(가) 모습을 드러냈다.",
  "{enemy}이(가) 갑작스럽게 나타났다.",
  "예상보다 가까운 곳에서 {enemy}이(가) 튀어나왔다.",
  "{enemy}의 기척이 느껴지는 순간, 공격이 시작되었다.",
  "멀리서 {enemy}의 모습이 나타났다.",
  "{enemy}은(는) 생각보다 훨씬 강하였다.",
];

const SCENE_CONFLICT: string[] = [
  "전투가 시작되었다.",
  "피아가 뒤섞이며 교전이 벌어졌다.",
  "파티는 즉각 전투 대형을 갖추었다.",
  "순식간에 전장이 형성되었다.",
  "물러설 수 없는 상황이었다.",
  "일시에 긴장이 고조되었다.",
];

// Cooperation — uses {actor} and {actor2}
const SCENE_COOP: string[] = [
  "{actor}이(가) 공격을 막는 사이, {actor2}이(가) 전열을 정비하였다.",
  "{actor}이(가) 적의 시선을 끄는 동안, {actor2}이(가) 공격 기회를 잡았다.",
  "{actor2}의 지원 덕분에 {actor}이(가) 다시 전열을 세울 수 있었다.",
  "{actor}과(와) {actor2}이(가) 호흡을 맞추며 집중 공격을 퍼부었다.",
  "{actor}이(가) 선봉에 서고, {actor2}이(가) 후방에서 지원하였다.",
  "{actor}의 공격에 맞추어 {actor2}이(가) 빈틈을 파고들었다.",
];

const SCENE_TURNING_POS: string[] = [
  "전황이 파티에게 유리하게 흘러가기 시작하였다.",
  "적의 기세가 꺾이기 시작하였다.",
  "파티가 주도권을 잡아가고 있었다.",
  "승기가 파티에게 넘어왔다.",
  "흐름이 바뀌었다.",
];

const SCENE_TURNING_NEG: string[] = [
  "상황이 점점 불리해지고 있었다.",
  "적의 압박이 거세졌다.",
  "더 이상 버티기 어려운 상황이 되었다.",
  "파티는 수세에 몰리기 시작하였다.",
  "전선이 흔들리기 시작하였다.",
];

const SCENE_TENSION: string[] = [
  "긴장감이 흘렀다.",
  "파티원 모두 숨을 죽였다.",
  "잠깐의 침묵이 흘렀다.",
  "공기가 무거워졌다.",
];

const SCENE_RELIEF: string[] = [
  "안도의 숨이 새어 나왔다.",
  "위기는 가까스로 넘어갔다.",
  "파티는 잠시 숨을 돌렸다.",
  "비로소 긴장이 풀렸다.",
];

const SCENE_RESOLVE: string[] = [
  "포기할 수 없었다.",
  "파티는 굴하지 않았다.",
  "한 걸음씩 나아가는 것뿐이었다.",
  "아직 끝나지 않았다.",
];

const SCENE_STRUGGLE: string[] = [
  "예상보다 훨씬 강한 상대였다.",
  "파티는 한계를 느끼기 시작하였다.",
  "버티는 것만으로도 벅찬 상황이었다.",
  "전열이 흔들리기 시작하였다.",
];

const SCENE_VICTORY: string[] = [
  "마침내 목표가 달성되었다.",
  "긴 싸움이 끝났다.",
  "임무가 완료되었다.",
  "파티는 해냈다.",
];

const SCENE_AFTERMATH_FAIL: string[] = [
  "이번 의뢰는 길드에 무거운 교훈을 남겼다.",
  "길드는 이번 결과를 오래 기억할 것이었다.",
  "쉽지 않은 귀환이었다.",
];

const SCENE_RETURN_CLOSE: string[] = [
  "길드가 기다리고 있었다.",
  "돌아갈 길이 남아 있었다.",
  "무사한 귀환이었다.",
  "파티는 말없이 길드를 향해 걸었다.",
];

// Support arrival scene segments
const SUPPORT_STRUGGLE: string[] = [
  "{party}는 상황을 버티며 지원을 기다리고 있었다.",
  "전선이 흔들리기 시작할 때였다.",
  "{party}가 한계에 다가서고 있을 때, 지원대가 도착하였다.",
  "상황이 좋지 않았다. 지원이 필요하였다.",
];

const SUPPORT_REACTION: string[] = [
  "{party}는 안도의 숨을 내쉬었다.",
  "{party}의 사기가 다시 살아났다.",
  "지원대의 도착으로 상황이 달라지기 시작하였다.",
  "힘을 합칠 수 있게 되었다.",
];

const SUPPORT_COMBINED: string[] = [
  "두 파티가 힘을 합쳐 반격에 나섰다.",
  "합류한 두 파티는 적에게 집중 공격을 퍼부었다.",
  "전력이 결집되면서 전황이 바뀌기 시작하였다.",
  "함께라면 이길 수 있었다.",
];

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
  const enemy = quest.enemyHint ?? "적";
  const vars = { party: party.name, region: regionName, quest: quest.title, enemy };

  // s0: main departure sentence
  const templates = DEPARTURE[quest.type] ?? DEPARTURE.default;
  const s0 = applyVars(pickByHash(templates, seed), vars);

  // s1: atmospheric opener for destination
  const openPool = SCENE_OPENING[quest.type] ?? SCENE_OPENING.default;
  const s1 = applyVars(pickByHash(openPool, seed + "-open"), vars);

  // s2: actor travel action (always in departure scene)
  const actorIds: EntityId[] = [];
  let s2 = "";
  const actor = selectActor(members, classes, ["vanguard", "scout"], seed + "-actor");
  if (actor) {
    s2 = applyVars(getClassAction(actor.classId, "travel", seed + "-act"), { actor: actor.name, party: party.name, region: regionName });
    actorIds.push(actor.id);
  }

  return {
    id: `al-${quest.id}-depart-${dateKey(date)}`,
    questId: quest.id,
    partyId: party.id,
    date,
    questDay: 0,
    category: "departure",
    importance: "normal",
    title: "출발",
    narrative: buildScene([s0, s1, s2]),
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
  const vars = { party: party.name, region, enemy };

  let s0 = "";
  let s1 = "";
  let s2 = "";
  let category: AdventureLogCategory;
  let title: string;
  let actorContext: ActionContext = "travel";
  const actorIds: EntityId[] = [];

  if (stage === "traveling") {
    const pool = TRAVEL[quest.type] ?? TRAVEL.default;
    s0 = applyVars(pickByHash(pool, seed), vars);
    // Actor travel observation (always in scene mode)
    const actor = selectActor(members, classes, ["scout", "vanguard"], seed + "-actor");
    if (actor) {
      s1 = applyVars(getClassAction(actor.classId, "travel", seed + "-act"), { actor: actor.name, ...vars });
      actorIds.push(actor.id);
    }
    category = "travel";
    title = "이동";
    actorContext = "travel";
  } else if (stage === "returning") {
    s0 = applyVars(pickByHash(RETURN_TMPL, seed), vars);
    s1 = pickByHash(SCENE_RETURN_CLOSE, seed + "-close");
    category = "return";
    title = "귀환 중";
    actorContext = "travel";
  } else {
    // executing
    const openPool = SCENE_OPENING[quest.type] ?? SCENE_OPENING.default;
    s0 = applyVars(pickByHash(openPool, seed + "-open"), vars);

    if (quest.type === "hunt" && enemy) {
      s1 = applyVars(pickByHash(HUNT_ENEMY_EXEC, seed + "-hunt"), vars);
    } else {
      const pool = EXECUTING[quest.type] ?? EXECUTING.default;
      s1 = applyVars(pickByHash(pool, seed), vars);
    }

    category = quest.type === "exploration" || quest.type === "search" ? "exploration" : "travel";
    title = "임무 수행";
    actorContext = quest.type === "exploration" || quest.type === "search" ? "explore" : "travel";

    const preferredRoles: ActorRole[] = quest.type === "hunt"
      ? ["vanguard", "damage"]
      : quest.type === "exploration" || quest.type === "search"
      ? ["scout", "support"]
      : ["scout", "vanguard"];
    const actor = selectActor(members, classes, preferredRoles, seed + "-actor");
    if (actor) {
      s2 = applyVars(getClassAction(actor.classId, actorContext, seed + "-act"), { actor: actor.name, ...vars });
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
    narrative: buildScene([s0, s1, s2]),
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
  const vars = { party: party.name, region, enemy };

  const actorIds: EntityId[] = [];
  let category: AdventureLogCategory = "incident";
  let importance: AdventureLogImportance = "notable";
  const segments: string[] = [];

  if (event.category === "combat") {
    // s0: atmospheric opening
    const openPool = SCENE_OPENING[quest.type] ?? SCENE_OPENING.default;
    segments.push(applyVars(pickByHash(openPool, seed + "-open"), vars));

    // s1: enemy appearance or combat intro
    if (enemy) {
      segments.push(applyVars(pickByHash(SCENE_ENEMY_APPEAR, seed + "-enemy"), { enemy }));
    } else {
      segments.push(applyVars(pickByHash(ENEMY_COMBAT_INTRO, seed + "-intro"), vars));
    }

    // s2: conflict start
    segments.push(pickByHash(SCENE_CONFLICT, seed + "-conf"));

    // s3: actor 1 — primary combatant
    const actor1 = selectActor(members, classes, ["vanguard", "damage"], seed + "-a1");
    if (actor1) {
      segments.push(applyVars(getClassAction(actor1.classId, "combat", seed + "-a1act"), { actor: actor1.name }));
      actorIds.push(actor1.id);
    }

    // s4: actor 2 — support/scout (if party ≥ 3)
    let actor2: Adventurer | null = null;
    if (members.length >= 3) {
      actor2 = selectActor(members, classes, ["support", "scout"], seed + "-a2", actor1?.id);
      if (actor2) {
        segments.push(applyVars(getClassAction(actor2.classId, "combat", seed + "-a2act"), { actor: actor2.name }));
        actorIds.push(actor2.id);
      }
    }

    // s5: cooperation (if both actors found)
    if (actor1 && actor2) {
      const coopTmpl = pickByHash(SCENE_COOP, seed + "-coop");
      segments.push(applyVars(coopTmpl, { actor: actor1.name, actor2: actor2.name }));
    }

    // s6: actor 3 brief mention (if party ≥ 4)
    if (members.length >= 4 && actor1 && actor2) {
      const excluded = new Set([actor1.id, actor2.id]);
      const remaining = members.filter(m => !excluded.has(m.id));
      if (remaining.length > 0) {
        const actor3 = pickByHash(remaining, seed + "-a3");
        const cls3 = classes[actor3.classId];
        const role3 = (cls3?.role ?? "vanguard") as ActorRole;
        const pool3 = CLASS_COMBAT[actor3.classId] ?? COMBAT_ACTOR[role3];
        segments.push(applyVars(pickByHash(pool3, seed + "-a3act"), { actor: actor3.name }));
        actorIds.push(actor3.id);
      }
    }

    // s7: turning point (positive bias when party ≥ 3)
    const turnPool = members.length >= 3 ? SCENE_TURNING_POS : [...SCENE_TURNING_POS, ...SCENE_TURNING_NEG];
    segments.push(pickByHash(turnPool, seed + "-turn"));

    category = "combat";
    importance = "notable";

  } else if (event.category === "danger") {
    // s0: opening
    const openPool = SCENE_OPENING[quest.type] ?? SCENE_OPENING.default;
    segments.push(applyVars(pickByHash(openPool, seed + "-open"), vars));

    // s1: danger description
    segments.push(pickByHash(EVENT_INTRO.danger, seed + "-intro"));

    // s2: tension
    segments.push(pickByHash(SCENE_TENSION, seed + "-tension"));

    // s3: actor response
    const actor = selectActor(members, classes, ["vanguard", "support"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = DANGER_ACTOR[role];
      segments.push(applyVars(pickByHash(pool, seed + "-act"), { actor: actor.name }));
      actorIds.push(actor.id);
    }

    // s4: turning point
    segments.push(pickByHash(SCENE_TURNING_POS, seed + "-turn"));

    category = "incident";
    importance = "notable";

  } else if (event.category === "exploration" || event.category === "reward") {
    // s0: intro
    const introPool = EVENT_INTRO[event.category];
    segments.push(pickByHash(introPool, seed + "-intro"));

    // s1: actor discover action
    const actor = selectActor(members, classes, ["scout", "damage"], seed + "-actor");
    if (actor) {
      segments.push(applyVars(getClassAction(actor.classId, "explore", seed + "-act"), { actor: actor.name }));
      actorIds.push(actor.id);
    }

    // s2: result observation
    segments.push(pickByHash(SCENE_RELIEF, seed + "-relief"));

    category = event.category === "reward" ? "discovery" : "exploration";
    importance = "notable";

  } else {
    // environment / person / other
    const introPool = EVENT_INTRO[event.category] ?? EVENT_INTRO.danger;
    segments.push(pickByHash(introPool, seed + "-intro"));

    const actor = selectActor(members, classes, ["vanguard", "scout"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = DANGER_ACTOR[role];
      segments.push(applyVars(pickByHash(pool, seed + "-act"), { actor: actor.name }));
      actorIds.push(actor.id);
    }

    category = "incident";
    importance = "notable";
  }

  return {
    id: `al-${quest.id}-ev-${event.eventId}`,
    questId: quest.id,
    partyId: party.id,
    date,
    questDay: day,
    category,
    importance,
    title: event.title,
    narrative: buildScene(segments),
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
  const s0 = pickByHash(pool, seed);

  let s1 = "";
  if (decision.decision === "support_dispatch" && supportPartyName) {
    s1 = `${supportPartyName} 파티가 현장으로 이동을 시작하였다.`;
  } else if (decision.decision === "withdraw" || decision.decision === "abandon") {
    s1 = pickByHash(SCENE_TURNING_NEG, seed + "-turn");
  } else if (decision.decision === "continue") {
    s1 = pickByHash(SCENE_RESOLVE, seed + "-resolve");
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
    narrative: buildScene([s0, s1]),
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

  // s0: main party struggling
  const s0 = applyVars(pickByHash(SUPPORT_STRUGGLE, seed + "-struggle"), { party: mainParty.name });

  // s1: support arrival announcement
  const arrivalTemplates = [
    `${supportPartyName} 파티가 현장에 도착하여 ${mainParty.name}와(과) 합류하였다.`,
    `지원대 ${supportPartyName}이(가) 합류하여 파티의 전력이 강화되었다.`,
    `${supportPartyName}의 지원대가 도착하여 두 파티가 함께 임무를 이어가게 되었다.`,
    `${mainParty.name}의 위기에 달려온 ${supportPartyName}이(가) 마침내 합류하였다.`,
  ];
  const s1 = pickByHash(arrivalTemplates, seed);

  // s2: main party reaction
  const s2 = applyVars(pickByHash(SUPPORT_REACTION, seed + "-react"), { party: mainParty.name });

  // s3: combined effort
  const s3 = pickByHash(SUPPORT_COMBINED, seed + "-comb");

  // s4: turning point
  const s4 = pickByHash(SCENE_TURNING_POS, seed + "-turn");

  return {
    id: `al-${quest.id}-support-${prog.currentDay}-${dateKey(date)}`,
    questId: quest.id,
    partyId: mainParty.id,
    date,
    questDay: prog.currentDay,
    category: "teamwork",
    importance: "notable",
    title: "지원 파티 합류",
    narrative: buildScene([s0, s1, s2, s3, s4]),
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
  const vars = { party: partyName, quest: quest.title, enemy, region };

  const actorIds: EntityId[] = [];
  const segments: string[] = [];

  if (result.resultGrade === "great_success") {
    // s0: heroic opening — category-specific
    const heroPool = GREAT_SUCCESS_HERO[quest.type] ?? GREAT_SUCCESS_HERO.default;
    segments.push(applyVars(pickByHash(heroPool, seed + "-hero"), vars));

    // s1: primary actor decisive action
    const actor1 = selectActor(members, classes, ["vanguard", "damage", "scout"], seed + "-a1");
    if (actor1) {
      const actorPool = CLASS_COMBAT[actor1.classId] ?? COMPLETION_ACTOR[(classes[actor1.classId]?.role ?? "vanguard") as ActorRole];
      segments.push(applyVars(pickByHash(actorPool, seed + "-a1act"), { actor: actor1.name, party: partyName }));
      actorIds.push(actor1.id);
    }

    // s2: secondary actor support moment (if party ≥ 2)
    if (members.length >= 2) {
      const actor2 = selectActor(members, classes, ["support", "vanguard"], seed + "-a2", actor1?.id);
      if (actor2) {
        const pool2 = COMPLETION_ACTOR[(classes[actor2.classId]?.role ?? "support") as ActorRole];
        segments.push(applyVars(pickByHash(pool2, seed + "-a2act"), { actor: actor2.name }));
        actorIds.push(actor2.id);
      }
    }

    // s3: turning point
    segments.push(pickByHash(SCENE_TURNING_POS, seed + "-turn"));

    // s4: victory declaration
    segments.push(pickByHash(SCENE_VICTORY, seed + "-victory"));

    // s5: relief
    segments.push(pickByHash(SCENE_RELIEF, seed + "-relief"));

  } else if (result.resultGrade === "great_failure") {
    // s0: struggle opening
    segments.push(pickByHash(SCENE_STRUGGLE, seed + "-struggle"));

    // s1: actor tried but overwhelmed
    const actor = selectActor(members, classes, ["vanguard", "damage"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = CLASS_COMBAT[actor.classId] ?? COMBAT_ACTOR[role];
      segments.push(applyVars(pickByHash(pool, seed + "-act"), { actor: actor.name, party: partyName }));
      actorIds.push(actor.id);
    }

    // s2: turning negative
    segments.push(pickByHash(SCENE_TURNING_NEG, seed + "-turn"));

    // s3: great failure base sentence
    segments.push(applyVars(pickByHash(COMPLETION_NARRATIVE.great_failure, seed + "-base"), vars));

    // s4: heavy aftermath
    segments.push(pickByHash(SCENE_AFTERMATH_FAIL, seed + "-after"));

  } else if (result.resultGrade === "failure") {
    // s0: failure base
    segments.push(applyVars(pickByHash(COMPLETION_NARRATIVE.failure, seed + "-base"), vars));

    // s1: failure context (why)
    segments.push(pickByHash(FAILURE_CONTEXT, seed + "-ctx"));

    // s2: aftermath
    segments.push(pickByHash(SCENE_AFTERMATH_FAIL, seed + "-after"));

  } else if (result.resultGrade === "narrow_success") {
    // s0: narrow success base
    segments.push(applyVars(pickByHash(COMPLETION_NARRATIVE.narrow_success, seed + "-base"), vars));

    // s1: actor who saved the day
    const actor = selectActor(members, classes, ["vanguard", "damage", "support"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = COMPLETION_ACTOR[role];
      segments.push(applyVars(pickByHash(pool, seed + "-act"), { actor: actor.name }));
      actorIds.push(actor.id);
    }

    // s2: relief
    segments.push(pickByHash(SCENE_RELIEF, seed + "-relief"));

  } else if (result.resultGrade === "retreat") {
    // s0: turning negative (context for why retreat)
    segments.push(pickByHash(SCENE_TURNING_NEG, seed + "-turn"));

    // s1: retreat decision sentence
    segments.push(applyVars(pickByHash(COMPLETION_NARRATIVE.retreat, seed + "-base"), vars));

    // s2: resolve / closure
    segments.push(pickByHash(SCENE_RETURN_CLOSE, seed + "-close"));

  } else {
    // success
    // s0: success base
    segments.push(applyVars(pickByHash(COMPLETION_NARRATIVE.success, seed + "-base"), vars));

    // s1: actor contribution
    const actor = selectActor(members, classes, ["vanguard", "damage", "support"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = COMPLETION_ACTOR[role];
      segments.push(applyVars(pickByHash(pool, seed + "-act"), { actor: actor.name }));
      actorIds.push(actor.id);
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
    narrative: buildScene(segments),
    actorIds,
    targetIds: [],
    tags: [quest.type, result.resultGrade, "completion", ...(enemy ? [enemy] : [])],
  };
}
