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

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return h;
}

function pickByHash<T>(arr: T[], seed: string): T {
  return arr[hashSeed(seed) % arr.length];
}

function pickAvoidingRecent<T>(arr: T[], seed: string, recent: Set<string>): T {
  const h = hashSeed(seed);
  for (let i = 0; i < arr.length; i++) {
    const candidate = arr[(h + i) % arr.length];
    if (!recent.has(String(candidate))) return candidate;
  }
  return arr[h % arr.length]; // all used, fall back
}

// ── Variable substitution ─────────────────────────────────────────────────────

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? k);
}

// ── Scene builder ─────────────────────────────────────────────────────────────

function buildScene(segments: string[]): string {
  return segments.filter(s => s.trim().length > 0).join("\n\n");
}

// ── Recent segment builder ────────────────────────────────────────────────────

function buildRecentSegments(logs: AdventureLogEntry[], count = 10): Set<string> {
  const s = new Set<string>();
  for (const log of logs.slice(-count)) {
    for (const seg of log.narrative.split("\n\n")) {
      const t = seg.trim();
      if (t) s.add(t);
    }
  }
  return s;
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
    "{actor}이(가) 거친 함성을 지르며 적의 돌격을 정면으로 받아냈다.",
    "{actor}는 흔들리지 않는 방어선으로 파티의 중심을 잡았다.",
    "{actor}이(가) 일격을 견뎌내며 반격의 기회를 만들었다.",
    "{actor}는 전장을 가로질러 위험에 처한 동료를 구해냈다.",
  ],
  swordsman: [
    "{actor}이(가) 검술로 적장을 쓰러뜨렸다.",
    "{actor}는 날카로운 검격으로 적의 방어를 뚫었다.",
    "{actor}이(가) 빠른 칼놀림으로 적을 제압하였다.",
    "{actor}는 결정적인 일격으로 전투를 이끌었다.",
    "{actor}이(가) 연속 검격으로 적의 빈틈을 파고들었다.",
    "{actor}는 우아한 검술로 다수의 적을 상대하였다.",
    "{actor}이(가) 칼집에서 검을 뽑는 순간, 주변 적들이 움찔하였다.",
    "{actor}는 단 한 번의 베기로 상황을 결정지었다.",
  ],
  spearman: [
    "{actor}이(가) 창으로 돌격을 저지하였다.",
    "{actor}는 긴 창을 앞세워 적의 접근을 허용하지 않았다.",
    "{actor}이(가) 창격으로 적의 진형을 흐트러뜨렸다.",
    "{actor}는 선봉에서 창을 휘두르며 적군을 몰아냈다.",
    "{actor}이(가) 창의 사거리를 이용해 여러 적을 연속으로 제압하였다.",
    "{actor}는 회전 창격으로 주위를 둘러싼 적들을 쓸어냈다.",
    "{actor}이(가) 정확한 찌르기로 적의 급소를 노렸다.",
    "{actor}는 창끝을 적의 방어구 틈새로 밀어 넣었다.",
  ],
  archer: [
    "{actor}이(가) 후방에서 정확한 화살로 적을 지원하였다.",
    "{actor}는 원거리에서 핵심 위협 대상을 제거하였다.",
    "{actor}이(가) 정밀 사격으로 전황을 유리하게 이끌었다.",
    "{actor}는 빠른 연사로 적의 접근을 차단하였다.",
    "{actor}이(가) 화살 하나로 적 지휘관의 움직임을 멈추었다.",
    "{actor}는 좁은 시야 속에서도 정확히 목표를 명중시켰다.",
    "{actor}이(가) 파티가 위험에 처하자 집중 사격으로 압박을 줄였다.",
    "{actor}는 높은 위치를 선점하여 전장 전체를 내려다보며 지원하였다.",
  ],
  mage: [
    "{actor}이(가) 마법으로 적의 움직임을 봉쇄하였다.",
    "{actor}는 강력한 주문으로 전황을 바꾸었다.",
    "{actor}이(가) 원거리 마법으로 다수의 적을 무력화하였다.",
    "{actor}는 주문을 시전하여 전장의 흐름을 뒤집었다.",
    "{actor}이(가) 화염 주문으로 적 무리를 일시에 제압하였다.",
    "{actor}는 마력을 극한까지 끌어올려 결정적인 마법을 발동하였다.",
    "{actor}이(가) 적의 마법 공격을 차단하며 파티를 보호하였다.",
    "{actor}는 지형을 활용한 영역 주문으로 전장의 흐름을 통제하였다.",
  ],
  paladin: [
    "{actor}이(가) 방어선을 굳건히 유지하였다.",
    "{actor}는 신성한 방어막으로 동료들을 보호하였다.",
    "{actor}이(가) 성스러운 힘으로 파티를 지탱하였다.",
    "{actor}는 동료를 보호하며 적의 공격을 흡수하였다.",
    "{actor}이(가) 신성 검기를 발동하여 다수의 적을 밀쳐냈다.",
    "{actor}는 기도를 올리며 동료의 상처를 빠르게 회복시켰다.",
    "{actor}이(가) 빛나는 방패로 치명적인 일격을 막아냈다.",
    "{actor}는 신의 가호를 받아 흔들리지 않는 방어선을 형성하였다.",
  ],
  rogue: [
    "{actor}이(가) 적의 허를 찔러 치명타를 가하였다.",
    "{actor}는 그림자처럼 움직여 핵심 적을 제거하였다.",
    "{actor}이(가) 기습으로 적 지휘관을 무력화하였다.",
    "{actor}는 기민한 움직임으로 위협 대상을 빠르게 처리하였다.",
    "{actor}이(가) 연막 속에서 모습을 감추고 결정적인 순간에 나타났다.",
    "{actor}는 독을 바른 단검으로 적의 전투력을 무력화하였다.",
    "{actor}이(가) 적의 등 뒤로 돌아 급소를 찌르는 데 성공하였다.",
    "{actor}는 눈 깜짝할 새에 표적을 쓰러뜨리고 자취를 감추었다.",
  ],
  priest: [
    "{actor}이(가) 부상자를 치료하여 전열을 유지하였다.",
    "{actor}는 축복으로 파티의 전투력을 높였다.",
    "{actor}이(가) 신성 마법으로 동료들을 지원하였다.",
    "{actor}는 위기 상황에서 신속히 동료의 상처를 치료하였다.",
    "{actor}이(가) 신성한 빛을 발하여 적의 언데드 무리를 물리쳤다.",
    "{actor}는 결계를 펼쳐 파티 전원을 일시적으로 보호하였다.",
    "{actor}이(가) 쓰러진 동료를 일으켜 세우며 전투를 이어가게 하였다.",
    "{actor}는 신의 이름을 부르며 파티에게 용기를 불어넣었다.",
  ],
  guardian: [
    "{actor}이(가) 철벽 방어로 적의 공격을 흡수하였다.",
    "{actor}는 파티의 방패가 되어 동료들을 지켰다.",
    "{actor}이(가) 무거운 갑옷으로 선두에서 버텨냈다.",
    "{actor}는 단단한 방어선으로 파티 전원의 안전을 확보하였다.",
    "{actor}이(가) 거대한 방패를 들어 적의 집중 포화를 홀로 막아냈다.",
    "{actor}는 동료가 쓰러지는 것을 막기 위해 두 배의 공격을 받아냈다.",
    "{actor}이(가) 전진하며 파티가 재편성할 공간을 확보하였다.",
    "{actor}는 흔들리지 않는 존재감으로 전선의 균형을 지켰다.",
  ],
};

// ── Class-specific action templates (exploration context) ─────────────────────

const CLASS_EXPLORE: Partial<Record<string, string[]>> = {
  archer:    [
    "{actor}이(가) 날카로운 눈으로 중요한 단서를 발견하였다.",
    "{actor}는 주변을 면밀히 살피며 숨겨진 통로를 찾아냈다.",
    "{actor}이(가) 높은 곳에 올라 주변 지형을 한눈에 파악하였다.",
    "{actor}는 멀리서 수상한 움직임을 먼저 포착하여 파티에게 알렸다.",
  ],
  rogue:     [
    "{actor}이(가) 조심스럽게 앞서 나가 함정 여부를 확인하였다.",
    "{actor}는 대담하게 앞장서 길을 열었다.",
    "{actor}이(가) 잠긴 문을 열어 새로운 구역을 개방하였다.",
    "{actor}는 흔적을 읽어 파티가 올바른 방향으로 나아가도록 이끌었다.",
  ],
  mage:      [
    "{actor}이(가) 수집된 단서들을 분석하여 방향을 잡았다.",
    "{actor}는 마법적 감지로 이상 징후를 먼저 포착하였다.",
    "{actor}이(가) 마법 진단으로 오래된 유적의 비밀을 밝혀냈다.",
    "{actor}는 마력의 흐름을 감지하여 숨겨진 구역을 발견하였다.",
  ],
  priest:    [
    "{actor}이(가) 체계적인 조사로 탐사를 지원하였다.",
    "{actor}는 신성한 감각으로 위험 지역을 미리 파악하였다.",
    "{actor}이(가) 신성한 힘으로 어둠 속의 위험을 감지하였다.",
    "{actor}는 조용히 기도를 올리며 탐사 방향에 대한 확신을 얻었다.",
  ],
  warrior:   [
    "{actor}이(가) 파티를 이끌며 탐사 범위를 넓혀나갔다.",
    "{actor}는 선두에서 경로를 개척하였다.",
    "{actor}이(가) 무너진 잔해를 걷어내며 새로운 통로를 열었다.",
    "{actor}는 위험한 지역을 먼저 확인하고 안전을 선언하였다.",
  ],
  guardian:  [
    "{actor}이(가) 신중하게 구조물을 점검하며 안전을 확인하였다.",
    "{actor}는 무게 있는 발걸음으로 바닥을 확인하며 전진하였다.",
    "{actor}이(가) 파티를 보호하는 후위를 맡으며 탐사를 지원하였다.",
    "{actor}는 불안정한 구조물을 지탱하며 파티가 빠져나갈 시간을 벌었다.",
  ],
  swordsman: [
    "{actor}이(가) 위험 지역에 먼저 진입하여 안전을 확인하였다.",
    "{actor}는 반사적인 움직임으로 위험 요소를 제거하였다.",
    "{actor}이(가) 빠른 판단으로 함정을 피하며 파티를 이끌었다.",
    "{actor}는 검으로 덤불을 헤치며 새로운 경로를 개척하였다.",
  ],
  spearman:  [
    "{actor}이(가) 긴 창으로 어두운 곳을 살피며 전진하였다.",
    "{actor}는 사거리를 활용해 위험 지역을 안전하게 탐색하였다.",
    "{actor}이(가) 창을 지팡이 삼아 불안한 지형을 확인하였다.",
    "{actor}는 창끝으로 수상한 구조물을 건드려 안전 여부를 확인하였다.",
  ],
  paladin:   [
    "{actor}이(가) 신성한 빛으로 어둠 속의 위험을 밝혀냈다.",
    "{actor}는 파티를 보호하며 탐사를 이끌었다.",
    "{actor}이(가) 오래된 유물에서 신성한 기운을 감지하였다.",
    "{actor}는 빛나는 방패를 들어 어두운 통로를 밝히며 전진하였다.",
  ],
};

// ── Class-specific action templates (travel context) ─────────────────────────

const CLASS_TRAVEL: Partial<Record<string, string[]>> = {
  archer:    [
    "{actor}이(가) 주변을 경계하며 이상 징후를 살폈다.",
    "{actor}는 앞서 정찰하며 파티의 안전을 확보하였다.",
    "{actor}이(가) 멀리 새가 갑자기 날아오르는 것을 보고 경계를 강화하였다.",
    "{actor}는 높은 지형에서 주변 지형을 먼저 파악하였다.",
  ],
  rogue:     [
    "{actor}이(가) 빠르게 앞서 나가 경로를 확인하였다.",
    "{actor}는 소리 없이 이동하며 주변 상황을 파악하였다.",
    "{actor}이(가) 그림자처럼 이동하며 잠재적 위협을 먼저 파악하였다.",
    "{actor}는 가장 안전하고 빠른 경로를 파티에게 안내하였다.",
  ],
  mage:      [
    "{actor}이(가) 마법으로 주변의 이상 기운을 탐지하였다.",
    "{actor}는 이동 중에도 방어 주문을 유지하였다.",
    "{actor}이(가) 주위 마력 흐름의 변화를 감지하며 경로를 조정하였다.",
    "{actor}는 원거리 탐지 주문으로 파티의 안전 범위를 넓혔다.",
  ],
  priest:    [
    "{actor}이(가) 동료들의 상태를 확인하며 행군을 이어갔다.",
    "{actor}는 파티의 피로를 줄이기 위해 회복 기도를 올렸다.",
    "{actor}이(가) 신성한 감각으로 부정한 기운의 방향을 가늠하였다.",
    "{actor}는 행군 중에 짧은 기도로 파티의 발걸음을 가볍게 하였다.",
  ],
  warrior:   [
    "{actor}이(가) 선두에서 경계를 서며 파티를 이끌었다.",
    "{actor}는 묵묵히 앞장서 이동 속도를 유지하였다.",
    "{actor}이(가) 거친 지형을 앞서 개척하며 파티의 이동을 도왔다.",
    "{actor}는 변함없는 발걸음으로 파티에게 안정감을 주었다.",
  ],
  guardian:  [
    "{actor}이(가) 후미에서 파티를 지키며 이동하였다.",
    "{actor}는 이동 중에도 방어 태세를 유지하였다.",
    "{actor}이(가) 후방을 지키며 어떤 추격에도 대응할 준비를 갖추었다.",
    "{actor}는 느리지만 흔들림 없이 파티의 마지막을 책임졌다.",
  ],
  swordsman: [
    "{actor}이(가) 칼자루에 손을 얹고 주변을 경계하였다.",
    "{actor}는 예리한 눈으로 이상 징후를 살폈다.",
    "{actor}이(가) 길목마다 잠시 멈추어 주변을 확인하였다.",
    "{actor}는 손에서 검을 놓지 않으며 언제든 싸울 준비를 하고 있었다.",
  ],
  spearman:  [
    "{actor}이(가) 창을 앞세워 선두에서 경계를 섰다.",
    "{actor}는 넓은 사거리를 활용하며 주변을 통제하였다.",
    "{actor}이(가) 창을 겨누며 수풀 속의 이상한 소리를 확인하였다.",
    "{actor}는 좌우를 창으로 훑으며 매복의 여부를 살폈다.",
  ],
  paladin:   [
    "{actor}이(가) 신성한 감각으로 주변의 위험을 감지하였다.",
    "{actor}는 파티의 사기를 북돋우며 행군을 이끌었다.",
    "{actor}이(가) 이동 중에도 조용히 기도를 올리며 파티를 지켰다.",
    "{actor}는 부정한 기운이 느껴지는 방향을 가리키며 파티에게 경계를 촉구하였다.",
  ],
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
  "{actor}이(가) 적을 붙잡아 두는 동안, {actor2}이(가) 결정적인 일격을 가하였다.",
  "{actor2}이(가) 신호를 보내자, {actor}이(가) 즉시 협력 공격에 합류하였다.",
  "{actor}이(가) 방어하고 {actor2}이(가) 공격하는 연계가 완벽하게 맞아떨어졌다.",
  "{actor}의 희생적인 방어 덕분에 {actor2}이(가) 적의 핵심을 공략할 수 있었다.",
  "{actor}과(와) {actor2}이(가) 좌우에서 동시에 압박을 가해 적을 혼란에 빠뜨렸다.",
  "{actor}이(가) 앞을 막고 {actor2}이(가) 뒤를 노리는 협공이 성공하였다.",
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

// ── Seasonal context templates ────────────────────────────────────────────────

const SEASON_CONTEXT: Record<"spring" | "summer" | "autumn" | "winter", string[]> = {
  spring: [
    "봄비가 가볍게 내리고 있었다.",
    "새싹이 돋아나는 길을 걸었다.",
    "따뜻한 봄바람이 불었다.",
    "꽃향기가 바람을 타고 왔다.",
    "해가 길어진 계절이었다.",
  ],
  summer: [
    "무더운 여름 햇살이 내리쬐었다.",
    "열기가 대지를 달구고 있었다.",
    "여름 소나기가 잠시 쏟아졌다 그쳤다.",
    "짙은 녹음이 그늘을 만들었다.",
    "매미 소리가 멀리서 들려왔다.",
  ],
  autumn: [
    "낙엽이 바스라지는 소리가 발밑에서 났다.",
    "가을 바람이 차갑게 불어왔다.",
    "단풍이 물든 숲을 지났다.",
    "하늘이 높고 맑았다.",
    "수확의 계절, 마을 곳곳이 분주하였다.",
  ],
  winter: [
    "눈이 소리 없이 내리고 있었다.",
    "차가운 바람이 칼날처럼 파고들었다.",
    "발자국이 눈 위에 선명하게 찍혔다.",
    "겨울 안개가 자욱하게 깔렸다.",
    "숨이 하얗게 피어올랐다.",
  ],
};

// ── Enemy behavior templates ──────────────────────────────────────────────────

const ENEMY_BEHAVIOR: Partial<Record<string, string[]>> = {
  "산적": [
    "{enemy}들은 수풀 속에 몸을 숨기고 매복해 있었다.",
    "{enemy} 무리는 숫자를 믿고 거칠게 덤벼들었다.",
    "{enemy}의 두목이 앞으로 나서며 부하들을 독려하였다.",
    "{enemy}들은 파티를 포위하려 진형을 넓혀가고 있었다.",
    "칼과 곤봉으로 무장한 {enemy}들이 고함을 치며 달려들었다.",
    "{enemy} 일부가 도주로를 차단하려 움직이기 시작하였다.",
  ],
  "들쥐": [
    "{enemy} 떼가 사방에서 밀려들었다.",
    "{enemy}들은 작은 몸을 이용해 빈틈을 파고들었다.",
    "수십 마리의 {enemy}이(가) 파도처럼 쏟아져 나왔다.",
    "{enemy}들은 무리를 지어 발목을 노리며 달려들었다.",
    "끊임없이 밀려드는 {enemy} 떼에 파티가 압박을 받았다.",
  ],
  "야생 멧돼지": [
    "{enemy}이(가) 육중한 몸을 낮추고 돌격 자세를 취하였다.",
    "{enemy}의 날카로운 어금니가 번득였다.",
    "흥분한 {enemy}이(가) 땅을 박차고 파티를 향해 돌진해 왔다.",
    "{enemy}은(는) 부상을 입고도 멈추지 않고 돌격을 이어갔다.",
    "육중한 {enemy}의 돌격에 지면이 진동하였다.",
    "{enemy}이(가) 앞발로 땅을 긁으며 다시 공격 태세를 갖추었다.",
  ],
  "고블린": [
    "{enemy}들이 날카로운 울음소리를 지르며 달려들었다.",
    "{enemy}들은 숫자로 승부를 보려 파티를 에워쌌다.",
    "{enemy} 무리 중 한 놈이 투석을 시도하였다.",
    "교활한 {enemy}들은 파티의 주의를 분산시키려 했다.",
    "{enemy} 샤먼이 뒤에서 주문을 시전하려는 모습이 보였다.",
    "{enemy}들은 작은 덫과 함정을 미리 설치해 두고 있었다.",
  ],
  "늪지 마물": [
    "{enemy}이(가) 늪 속에서 미끄러지듯 나타났다.",
    "역한 냄새를 풍기며 {enemy}이(가) 서서히 다가왔다.",
    "{enemy}은(는) 독성 액체를 내뿜으며 공격하였다.",
    "{enemy}의 몸은 늪의 점액으로 뒤덮여 있었고, 베어도 쉽게 재생되었다.",
    "{enemy}이(가) 촉수를 뻗어 파티원을 끌어당기려 하였다.",
    "늪의 지형을 자유롭게 이용하는 {enemy}을(를) 상대하기가 쉽지 않았다.",
  ],
  "와이번": [
    "{enemy}이(가) 하늘에서 급강하하며 발톱을 세웠다.",
    "{enemy}의 독 침이 땅에 박히며 연기를 피워 올렸다.",
    "날개를 펼친 {enemy}이(가) 강풍으로 파티의 대형을 흐트러뜨렸다.",
    "{enemy}은(는) 공중에서 독안개를 뿌리며 파티를 교란하였다.",
    "{enemy}이(가) 선회하며 재차 강습을 준비하는 것이 보였다.",
    "지면에 내려앉은 {enemy}이(가) 꼬리를 휘두르며 주변을 쓸었다.",
  ],
  "수호 골렘": [
    "{enemy}이(가) 느리지만 강력한 주먹을 내리쳤다.",
    "마법 핵에서 빛이 뿜어져 나오며 {enemy}이(가) 움직이기 시작하였다.",
    "{enemy}의 육중한 몸이 진동을 일으키며 파티를 향해 다가왔다.",
    "{enemy}은(는) 물리적 공격에 강한 내성을 보였다.",
    "{enemy}이(가) 마법진을 따라 이동하며 침입자를 몰아내려 하였다.",
    "부서진 {enemy}의 파편이 날아와 파티를 위협하였다.",
  ],
  "고룡 서리날개": [
    "{enemy}이(가) 서릿바람을 내뿜으며 지면을 얼려버렸다.",
    "하늘을 뒤덮은 {enemy}의 그림자가 파티에게 드리워졌다.",
    "{enemy}의 날갯짓 하나에 나무들이 뿌리째 흔들렸다.",
    "빙결 화염을 내뿜는 {enemy}의 포효가 대기를 진동시켰다.",
    "{enemy}은(는) 파티를 작은 벌레처럼 여기며 짓누르려 하였다.",
    "고대의 위엄을 지닌 {enemy}이(가) 눈을 번뜩이며 공격 대상을 골랐다.",
  ],
};

// ── Travel detail pool ────────────────────────────────────────────────────────

const TRAVEL_DETAIL: string[] = [
  "개울 소리가 가까워졌다.",
  "발밑의 땅이 점점 거칠어졌다.",
  "저 멀리 연기가 오르고 있었다.",
  "파티는 잠시 걸음을 멈추고 주위를 살폈다.",
  "바람이 방향을 바꾸었다.",
  "구름이 빠르게 흘러가고 있었다.",
  "멀리서 짐승의 울음소리가 들렸다.",
  "길 위에 최근 누군가 지나간 흔적이 남아 있었다.",
  "나뭇가지 사이로 햇빛이 얼룩졌다.",
  "잠시 쉬어가기로 하였다.",
  "경사진 길이 이어졌다.",
  "파티는 좁은 협곡을 지나갔다.",
  "물이 고인 웅덩이를 피해 우회하였다.",
  "안개가 점점 걷히기 시작하였다.",
  "바위 위로 이끼가 빼곡하게 덮여 있었다.",
  "새 소리가 갑자기 멈추었다.",
  "오솔길이 두 갈래로 나뉘어졌다.",
  "파티는 서로의 상태를 짧게 확인하였다.",
  "오래된 이정표가 길옆에 서 있었다.",
  "돌길 위로 낙엽이 쌓여 있었다.",
  "시야가 트이며 넓은 평원이 펼쳐졌다.",
  "먹구름이 몰려오고 있었다.",
  "짧은 빗줄기가 지나갔다.",
  "파티가 가벼운 식사로 체력을 보충하였다.",
  "낯선 발자국이 경로와 교차하고 있었다.",
  "가시덤불이 경로를 막아 우회가 필요하였다.",
  "폐허가 된 건물 잔해가 보였다.",
  "파티는 잠시 지도를 확인하고 방향을 점검하였다.",
  "흐르는 강을 건너야 했다.",
  "땅이 부드러워지며 발이 빠지기 시작하였다.",
  "누군가 최근 불을 피운 흔적이 있었다.",
  "하늘빛이 점점 어두워지고 있었다.",
  "파티는 위험한 구간을 서로 돕고 이끌며 통과하였다.",
];

// ── Explore detail pool ───────────────────────────────────────────────────────

const EXPLORE_DETAIL: string[] = [
  "수상한 소리가 들렸다.",
  "이상한 냄새가 났다.",
  "발자국이 발견되었다.",
  "오래된 일지가 발견되었다.",
  "벽에 긁힌 자국이 남아 있었다.",
  "빛이 들어오지 않는 통로가 이어졌다.",
  "구석에 오래된 장비 잔해가 있었다.",
  "바닥에 기이한 문양이 새겨져 있었다.",
  "천장에서 물이 떨어지는 소리가 들렸다.",
  "공기가 갑자기 차가워졌다.",
  "희미한 빛이 어딘가에서 새어 나왔다.",
  "반쯤 열린 문이 앞에 있었다.",
  "파티는 모여 발견된 단서들을 분석하였다.",
  "오래된 지도 조각이 발견되었다.",
  "먼지 속에 뭔가의 흔적이 남아 있었다.",
  "이 구역에 누군가 최근 들어온 것이 분명하였다.",
  "부서진 함정 장치가 발견되었다.",
  "숨겨진 공간으로 이어지는 틈이 보였다.",
  "금이 간 벽 뒤로 다른 공간이 있었다.",
  "희미하게 빛나는 결정이 바닥에 박혀 있었다.",
  "바람이 어딘가로부터 흘러들어오고 있었다.",
  "탐사가 예상보다 깊어지고 있었다.",
  "어둠 속에서 눈 두 개가 빛나는 것이 보였다.",
  "오래된 글자가 새겨진 석판이 발견되었다.",
  "누군가 서둘러 버리고 간 흔적이 있었다.",
  "발밑이 울리는 소리가 났다. 아래에 공간이 있는 것 같았다.",
  "거미줄이 가득한 구역을 지나야 했다.",
  "잠겨 있던 서랍에 오래된 열쇠가 있었다.",
  "짐승이 갉아놓은 흔적이 이곳저곳에 보였다.",
  "탐사 중 갑자기 무너지는 소리가 들렸다.",
  "파티는 조심스럽게 구조물의 안전 여부를 확인하였다.",
  "예상보다 넓은 공간이 나타났다.",
];

// ── Combat development pool ───────────────────────────────────────────────────

const COMBAT_DEVELOPMENT: string[] = [
  "적이 기습을 시도하였다.",
  "파티가 선제 공격에 성공하였다.",
  "진형이 변경되었다.",
  "적의 수가 예상보다 많았다.",
  "파티 중 한 명이 부상을 입었다.",
  "전투가 장기전으로 접어들었다.",
  "적이 갑자기 전술을 바꾸었다.",
  "파티는 일시적으로 수세에 몰렸다.",
  "빈틈을 노린 공격이 적에게 큰 피해를 입혔다.",
  "전장 지형이 전황에 영향을 주기 시작하였다.",
  "적의 지원 무리가 추가로 나타났다.",
  "집중 공격으로 핵심 적을 먼저 제거하였다.",
  "파티의 전열이 일시적으로 흐트러졌다.",
  "적의 약점이 드러나기 시작하였다.",
  "후퇴와 재정비를 반복하며 버텨냈다.",
  "예상치 못한 기습에 파티가 흩어졌다.",
  "파티는 지형을 활용하여 불리한 상황을 만회하였다.",
  "적의 대장이 모습을 드러냈다.",
  "파티원들 사이의 연계 공격이 성공하였다.",
  "전투 중 일시적인 교착 상태가 이어졌다.",
  "가까스로 치명적인 공격을 피하였다.",
  "적의 수가 절반으로 줄어들었다.",
  "전세가 완전히 뒤집힐 것처럼 보이는 순간이 있었다.",
  "파티는 최후의 수단으로 모든 역량을 집중하였다.",
  "적이 도주를 시도하였다.",
  "기상 조건이 전투에 영향을 미쳤다.",
  "파티의 전략이 맞아떨어지기 시작하였다.",
  "적의 공격 패턴이 파악되었다.",
  "결정적인 순간이 찾아왔다.",
  "전투가 예상 밖으로 길어지고 있었다.",
  "적의 포위가 점점 좁혀들고 있었다.",
  "불의의 상황에서도 파티는 흔들리지 않았다.",
  "상호 견제 속에서 긴장이 이어졌다.",
  "일격을 가할 기회가 찾아왔다.",
  "파티가 빠르게 전열을 재정비하였다.",
  "지면의 균열이 전투에 변수가 되었다.",
  "적이 예상보다 끈질기게 저항하였다.",
  "이 전투, 쉽지 않을 것이 분명하였다.",
  "파티는 침착함을 잃지 않았다.",
  "연속 공격이 적의 방어를 허물기 시작하였다.",
  "방어에서 공격으로 전환하는 타이밍이 왔다.",
  "파티가 적의 허를 찌르는 데 성공하였다.",
  "후방에서 지원이 더해지며 상황이 바뀌었다.",
  "위기의 순간에 파티원들이 더욱 단단해졌다.",
  "적의 사기가 흔들리는 것이 보였다.",
  "전투가 절정에 다다르고 있었다.",
  "상황이 분명해지기 시작하였다.",
  "파티는 물러서지 않았다.",
  "적의 움직임에서 두려움이 느껴지기 시작하였다.",
  "마침내 승부를 낼 순간이 왔다.",
];

// ── Return detail pool ────────────────────────────────────────────────────────

const RETURN_DETAIL: string[] = [
  "전리품을 정리하며 귀환하였다.",
  "임무를 마쳤다는 안도감이 퍼졌다.",
  "파티는 말없이 길드를 향해 걸었다.",
  "몸은 지쳐 있었지만 발걸음은 가벼웠다.",
  "각자 임무를 돌아보며 이동하였다.",
  "파티원들 사이에 짧은 대화가 오갔다.",
  "귀환 경로는 평온하였다.",
  "서로의 안위를 확인하며 돌아왔다.",
  "해가 지기 전에 길드에 닿을 수 있을 것 같았다.",
  "힘들었지만 살아 돌아오는 것이 가장 중요하였다.",
  "파티는 오늘의 경험을 조용히 되새기고 있었다.",
  "귀환 중 부상자의 상태를 꼼꼼히 살폈다.",
  "수확물을 안전하게 운반하며 이동하였다.",
  "발걸음은 무거웠지만 의지는 꺾이지 않았다.",
  "임무 보고를 어떻게 할지 머릿속으로 정리하고 있었다.",
  "길드에 도착하면 먼저 쉬기로 하였다.",
  "멀리서 길드의 불빛이 보이기 시작하였다.",
  "서로 격려의 말을 나누며 마지막 길을 걸었다.",
  "귀환이 가까워질수록 긴장이 조금씩 풀렸다.",
  "고요한 귀환길이었다.",
];

// ── Rare scenes pool ──────────────────────────────────────────────────────────

const RARE_SCENES: string[] = [
  "유성이 밤하늘을 가로질렀다. 파티는 잠시 발걸음을 멈추고 하늘을 올려다보았다.",
  "길을 잃은 아이를 발견하였다. 파티는 아이를 안전한 마을까지 안내해 주었다.",
  "오래된 영웅의 묘 앞을 지나쳤다. 비석에는 낡은 문자들이 새겨져 있었다.",
  "떠돌이 상인이 파티와 잠시 동행하였다. 진귀한 물건들에 대한 이야기를 나누었다.",
  "드래곤의 발자국이 지나간 흔적을 발견하였다. 언제 지나간 것인지 알 수 없었다.",
  "정체를 알 수 없는 검은 기사가 멀리서 파티를 지켜보다 사라졌다.",
  "밤하늘에 거대한 오로라가 펼쳐졌다. 파티는 한동안 말없이 그것을 바라보았다.",
  "전설의 검에 대한 소문을 들었다. 어딘가에서 다시 모습을 드러냈다고 하였다.",
  "오래된 지도 조각을 발견하였다. 어딘가를 표시한 것처럼 보였다.",
  "들판에서 흰 사슴을 목격하였다. 잠시 눈이 마주쳤다가 사라졌다.",
  "밤새 낯선 피리 소리가 들렸다. 아침이 되자 소리는 멈추었다.",
  "폐가에서 오래된 편지를 발견하였다. 발신인도 수신인도 알 수 없었다.",
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
  existingLogs: AdventureLogEntry[] = [],
): AdventureLogEntry | null {
  const stage: QuestStage = prog.currentStage;
  const day = prog.currentDay;
  const seed = `${quest.id}-daily-${day}-${stage}`;
  const enemy = quest.enemyHint ?? "";
  const region = regionName || "목적지";
  const vars = { party: party.name, region, enemy };

  const recentSegments = buildRecentSegments(existingLogs);

  let s0 = "";
  let s1 = "";
  let s2 = "";
  let s3 = "";
  let category: AdventureLogCategory;
  let title: string;
  let actorContext: ActionContext = "travel";
  const actorIds: EntityId[] = [];

  if (stage === "traveling") {
    const pool = TRAVEL[quest.type] ?? TRAVEL.default;
    s0 = applyVars(pickAvoidingRecent(pool, seed, recentSegments), vars);

    // Actor travel observation
    const actor = selectActor(members, classes, ["scout", "vanguard"], seed + "-actor");
    if (actor) {
      s1 = applyVars(getClassAction(actor.classId, "travel", seed + "-act"), { actor: actor.name, ...vars });
      actorIds.push(actor.id);
    }

    // Travel detail segment
    s2 = pickAvoidingRecent(TRAVEL_DETAIL, seed + "-tdetail", recentSegments);

    // Optional seasonal segment (33% chance)
    if (hashSeed(seed + "-season") % 3 === 0) {
      s3 = pickAvoidingRecent(SEASON_CONTEXT[date.season], seed + "-seasonctx", recentSegments);
    }

    category = "travel";
    title = "이동";
    actorContext = "travel";
  } else if (stage === "returning") {
    s0 = applyVars(pickAvoidingRecent(RETURN_TMPL, seed, recentSegments), vars);
    s1 = pickAvoidingRecent(SCENE_RETURN_CLOSE, seed + "-close", recentSegments);

    // Return detail segment
    s2 = pickAvoidingRecent(RETURN_DETAIL, seed + "-rdetail", recentSegments);

    category = "return";
    title = "귀환 중";
    actorContext = "travel";
  } else {
    // executing
    const openPool = SCENE_OPENING[quest.type] ?? SCENE_OPENING.default;
    s0 = applyVars(pickAvoidingRecent(openPool, seed + "-open", recentSegments), vars);

    if (quest.type === "hunt" && enemy) {
      s1 = applyVars(pickAvoidingRecent(HUNT_ENEMY_EXEC, seed + "-hunt", recentSegments), vars);
    } else {
      const pool = EXECUTING[quest.type] ?? EXECUTING.default;
      s1 = applyVars(pickAvoidingRecent(pool, seed, recentSegments), vars);
    }

    category = quest.type === "exploration" || quest.type === "search" ? "exploration" : "travel";
    title = "임무 수행";
    actorContext = quest.type === "exploration" || quest.type === "search" ? "explore" : "travel";

    // Exploration/search get EXPLORE_DETAIL, others get TRAVEL_DETAIL
    if (quest.type === "exploration" || quest.type === "search") {
      s2 = pickAvoidingRecent(EXPLORE_DETAIL, seed + "-edetail", recentSegments);
    } else {
      s2 = pickAvoidingRecent(TRAVEL_DETAIL, seed + "-tdetail", recentSegments);
    }

    const preferredRoles: ActorRole[] = quest.type === "hunt"
      ? ["vanguard", "damage"]
      : quest.type === "exploration" || quest.type === "search"
      ? ["scout", "support"]
      : ["scout", "vanguard"];
    const actor = selectActor(members, classes, preferredRoles, seed + "-actor");
    if (actor) {
      s3 = applyVars(getClassAction(actor.classId, actorContext, seed + "-act"), { actor: actor.name, ...vars });
      actorIds.push(actor.id);
    }
  }

  // Rare scene: 2% chance (1 in 50)
  let rareScene = "";
  if (hashSeed(seed + "-rare") % 50 === 0) {
    rareScene = pickAvoidingRecent(RARE_SCENES, seed + "-raresc", recentSegments);
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
    narrative: buildScene([s0, s1, s2, s3, rareScene]),
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
  existingLogs: AdventureLogEntry[] = [],
): AdventureLogEntry {
  const seed = `${quest.id}-ev-${event.eventId}`;
  const day = prog.currentDay;
  const enemy = quest.enemyHint ?? "";
  const region = regionName || "현장";
  const vars = { party: party.name, region, enemy };

  const recentSegments = buildRecentSegments(existingLogs);

  const actorIds: EntityId[] = [];
  let category: AdventureLogCategory = "incident";
  let importance: AdventureLogImportance = "notable";
  const segments: string[] = [];

  if (event.category === "combat") {
    // s0: atmospheric opening
    const openPool = SCENE_OPENING[quest.type] ?? SCENE_OPENING.default;
    segments.push(applyVars(pickAvoidingRecent(openPool, seed + "-open", recentSegments), vars));

    // s1: enemy appearance or combat intro
    if (enemy) {
      segments.push(applyVars(pickAvoidingRecent(SCENE_ENEMY_APPEAR, seed + "-enemy", recentSegments), { enemy }));
    } else {
      segments.push(applyVars(pickAvoidingRecent(ENEMY_COMBAT_INTRO, seed + "-intro", recentSegments), vars));
    }

    // s2: conflict start
    segments.push(pickAvoidingRecent(SCENE_CONFLICT, seed + "-conf", recentSegments));

    // s2b: enemy-specific behavior (if available)
    if (enemy && ENEMY_BEHAVIOR[enemy]) {
      const behaviorPool = ENEMY_BEHAVIOR[enemy]!;
      segments.push(applyVars(pickAvoidingRecent(behaviorPool, seed + "-ebehav", recentSegments), { enemy }));
    }

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
      const coopTmpl = pickAvoidingRecent(SCENE_COOP, seed + "-coop", recentSegments);
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

    // Combat development segment
    segments.push(pickAvoidingRecent(COMBAT_DEVELOPMENT, seed + "-combdev", recentSegments));

    // s7: turning point (positive bias when party ≥ 3)
    const turnPool = members.length >= 3 ? SCENE_TURNING_POS : [...SCENE_TURNING_POS, ...SCENE_TURNING_NEG];
    segments.push(pickAvoidingRecent(turnPool, seed + "-turn", recentSegments));

    category = "combat";
    importance = "notable";

  } else if (event.category === "danger") {
    // s0: opening
    const openPool = SCENE_OPENING[quest.type] ?? SCENE_OPENING.default;
    segments.push(applyVars(pickAvoidingRecent(openPool, seed + "-open", recentSegments), vars));

    // s1: danger description
    segments.push(pickAvoidingRecent(EVENT_INTRO.danger, seed + "-intro", recentSegments));

    // s2: tension
    segments.push(pickAvoidingRecent(SCENE_TENSION, seed + "-tension", recentSegments));

    // s3: actor response
    const actor = selectActor(members, classes, ["vanguard", "support"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = DANGER_ACTOR[role];
      segments.push(applyVars(pickAvoidingRecent(pool, seed + "-act", recentSegments), { actor: actor.name }));
      actorIds.push(actor.id);
    }

    // s4: turning point
    segments.push(pickAvoidingRecent(SCENE_TURNING_POS, seed + "-turn", recentSegments));

    category = "incident";
    importance = "notable";

  } else if (event.category === "exploration" || event.category === "reward") {
    // s0: intro
    const introPool = EVENT_INTRO[event.category];
    segments.push(pickAvoidingRecent(introPool, seed + "-intro", recentSegments));

    // s1: actor discover action
    const actor = selectActor(members, classes, ["scout", "damage"], seed + "-actor");
    if (actor) {
      segments.push(applyVars(getClassAction(actor.classId, "explore", seed + "-act"), { actor: actor.name }));
      actorIds.push(actor.id);
    }

    // s2: result observation
    segments.push(pickAvoidingRecent(SCENE_RELIEF, seed + "-relief", recentSegments));

    category = event.category === "reward" ? "discovery" : "exploration";
    importance = "notable";

  } else {
    // environment / person / other
    const introPool = EVENT_INTRO[event.category] ?? EVENT_INTRO.danger;
    segments.push(pickAvoidingRecent(introPool, seed + "-intro", recentSegments));

    const actor = selectActor(members, classes, ["vanguard", "scout"], seed + "-actor");
    if (actor) {
      const cls = classes[actor.classId];
      const role = (cls?.role ?? "vanguard") as ActorRole;
      const pool = DANGER_ACTOR[role];
      segments.push(applyVars(pickAvoidingRecent(pool, seed + "-act", recentSegments), { actor: actor.name }));
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
