import type {
  EntityId,
  GameDate,
  Quest,
  QuestEvent,
  QuestEventCategory,
  QuestProgress,
  QuestStage,
  Region,
} from "../../types/game";

// ── Quest Tag System ──────────────────────────────────────────────────────────

export type QuestTag =
  // Terrain
  | "terrain:forest" | "terrain:mountain" | "terrain:dungeon"
  | "terrain:plain"  | "terrain:swamp"    | "terrain:coast"
  | "terrain:city"   | "terrain:ruins"
  // Enemy
  | "enemy:undead"  | "enemy:beast"  | "enemy:bandit" | "enemy:monster"
  | "enemy:dragon"  | "enemy:golem"  | "enemy:goblin" | "enemy:rodent"
  // Risk
  | "risk:ambush"  | "risk:trap"     | "risk:collapse" | "risk:flood"
  | "risk:disease" | "risk:hostile"  | "risk:magic"    | "risk:curse"
  // Objective
  | "obj:hunt"    | "obj:escort" | "obj:search"  | "obj:rescue"
  | "obj:explore" | "obj:deliver"
  // Season
  | "season:spring" | "season:summer" | "season:autumn" | "season:winter"
  // Difficulty
  | "diff:easy" | "diff:normal" | "diff:hard" | "diff:extreme"
  // Theme
  | "theme:mystery" | "theme:danger" | "theme:treasure" | "theme:social";

// ── EventDefinition ───────────────────────────────────────────────────────────

export interface EventDefinition {
  id: string;
  category: QuestEventCategory;
  title: string;
  description: string;
  weight: number;
  rarity?: "rare" | "epic";
  requiredTags?: QuestTag[];
  blockedTags?: QuestTag[];
  requiredStage?: QuestStage;
  boostedByTags?: QuestTag[];
  followUpIds?: string[];
}

// ── Event Pool (90 events) ────────────────────────────────────────────────────

export const EVENT_POOL: EventDefinition[] = [

  // ── COMBAT (20) ──────────────────────────────────────────────────────────

  {
    id: "ev-combat-001",
    category: "combat",
    title: "강한 개체 출현",
    description: "목표 구역에서 예상보다 강한 개체가 확인되었습니다. 파티가 경계를 강화하며 전술을 재정비하고 있습니다.",
    weight: 6,
    boostedByTags: ["obj:hunt", "diff:hard"],
    followUpIds: ["ev-combat-003", "ev-danger-001"],
  },
  {
    id: "ev-combat-002",
    category: "combat",
    title: "몬스터 무리 증가",
    description: "교전 중 추가 개체들이 합류했습니다. 예상보다 수가 훨씬 많아 대열을 유지하는 것이 급선무입니다.",
    weight: 5,
    boostedByTags: ["obj:hunt", "enemy:goblin", "enemy:undead"],
    followUpIds: ["ev-danger-001", "ev-combat-016"],
  },
  {
    id: "ev-combat-003",
    category: "combat",
    title: "정예 개체 발견",
    description: "일반 개체와 다른 특이 개체가 발견되었습니다. 비정상적인 크기와 전투력을 보유하고 있습니다.",
    weight: 4,
    boostedByTags: ["obj:hunt", "diff:hard", "diff:extreme"],
    followUpIds: ["ev-combat-015", "ev-danger-001"],
  },
  {
    id: "ev-combat-004",
    category: "combat",
    title: "기습 공격",
    description: "이동 중 매복한 무리에게 기습을 당했습니다. 빠른 대응으로 피해를 최소화했지만 소모가 발생했습니다.",
    weight: 5,
    requiredStage: "traveling",
    boostedByTags: ["risk:ambush", "enemy:bandit", "enemy:goblin"],
    followUpIds: ["ev-danger-001", "ev-danger-002"],
  },
  {
    id: "ev-combat-005",
    category: "combat",
    title: "매복 함정",
    description: "경로에 함정이 설치되어 있었습니다. 선발대가 제때 발견하여 피해를 줄였지만 전열을 재정비해야 합니다.",
    weight: 4,
    requiredTags: ["enemy:bandit"],
    boostedByTags: ["risk:trap", "risk:ambush"],
    followUpIds: ["ev-combat-010", "ev-danger-002"],
  },
  {
    id: "ev-combat-006",
    category: "combat",
    title: "야간 습격",
    description: "야영 중 야간에 적의 습격을 받았습니다. 보초가 제때 경보를 울려 큰 피해는 막았습니다.",
    weight: 4,
    boostedByTags: ["risk:hostile", "risk:ambush", "theme:danger"],
    followUpIds: ["ev-danger-001"],
  },
  {
    id: "ev-combat-007",
    category: "combat",
    title: "독성 개체 조우",
    description: "독을 뿜는 위험한 개체와 조우했습니다. 신중한 거리 전투로 대응하고 있으나 노출 위험이 있습니다.",
    weight: 4,
    boostedByTags: ["risk:disease", "terrain:swamp", "terrain:dungeon"],
    followUpIds: ["ev-danger-004"],
  },
  {
    id: "ev-combat-008",
    category: "combat",
    title: "언데드 대규모 출몰",
    description: "언데드 개체가 예상보다 훨씬 많이 출몰하고 있습니다. 마법 공격이 특히 효과적인 상황입니다.",
    weight: 4,
    requiredTags: ["enemy:undead"],
    followUpIds: ["ev-combat-002", "ev-danger-010"],
  },
  {
    id: "ev-combat-009",
    category: "combat",
    title: "고블린 정찰대 교전",
    description: "고블린 정찰대가 파티를 발견했습니다. 신속하게 처리하지 않으면 본대에 보고될 수 있습니다.",
    weight: 5,
    requiredTags: ["enemy:goblin"],
    followUpIds: ["ev-combat-002", "ev-combat-018"],
  },
  {
    id: "ev-combat-010",
    category: "combat",
    title: "산적 두목 출현",
    description: "산적 무리의 두목으로 보이는 강한 인물이 전선에 등장했습니다. 처치하면 무리가 와해될 것입니다.",
    weight: 3,
    requiredTags: ["enemy:bandit"],
    boostedByTags: ["diff:hard"],
    followUpIds: ["ev-combat-019"],
  },
  {
    id: "ev-combat-011",
    category: "combat",
    title: "드래곤 영역 경고",
    description: "드래곤의 영역 표식이 발견되었습니다. 드래곤이 근처에 있음이 확실하며 경계가 최대로 높아졌습니다.",
    weight: 3,
    requiredTags: ["enemy:dragon"],
    boostedByTags: ["diff:extreme"],
    followUpIds: ["ev-combat-015", "ev-danger-010"],
  },
  {
    id: "ev-combat-012",
    category: "combat",
    title: "거대 짐승 조우",
    description: "비정상적으로 거대한 짐승이 나타났습니다. 일반 전술로는 효과가 제한적이라 접근법을 바꿔야 합니다.",
    weight: 4,
    requiredTags: ["enemy:beast"],
    boostedByTags: ["obj:hunt", "terrain:forest", "terrain:mountain"],
    followUpIds: ["ev-danger-001", "ev-danger-009"],
  },
  {
    id: "ev-combat-013",
    category: "combat",
    title: "수호 골렘 기동",
    description: "오랫동안 잠들어 있던 수호 골렘이 파티의 접근을 감지하고 기동을 시작했습니다.",
    weight: 3,
    requiredTags: ["enemy:golem"],
    followUpIds: ["ev-danger-002", "ev-danger-001"],
  },
  {
    id: "ev-combat-014",
    category: "combat",
    title: "마법 생물 출현",
    description: "마나를 흡수하는 특이한 마법 생물이 출현했습니다. 물리 공격이 잘 통하지 않아 전술 변환이 필요합니다.",
    weight: 3,
    boostedByTags: ["risk:magic", "terrain:ruins", "terrain:dungeon"],
    followUpIds: ["ev-danger-006"],
  },
  {
    id: "ev-combat-015",
    category: "combat",
    title: "보스급 변이체 발견",
    description: "일반 개체와는 전혀 다른 강력한 변이 개체를 발견했습니다. 파티 전원의 역량을 총동원해야 합니다.",
    weight: 2,
    boostedByTags: ["diff:hard", "diff:extreme"],
    followUpIds: ["ev-danger-001", "ev-danger-009"],
  },
  {
    id: "ev-combat-016",
    category: "combat",
    title: "포위 상황",
    description: "사방에서 적들이 포위해왔습니다. 이대로는 소모전이 불가피합니다. 돌파구를 만들어야 합니다.",
    weight: 2,
    boostedByTags: ["diff:hard", "diff:extreme", "risk:hostile"],
    followUpIds: ["ev-danger-001"],
  },
  {
    id: "ev-combat-017",
    category: "combat",
    title: "보복 역습",
    description: "이전 전투에서 살아남은 적들이 무리를 더 모아 역습해왔습니다. 예상보다 빠른 반격입니다.",
    weight: 3,
    boostedByTags: ["enemy:bandit", "enemy:goblin"],
    followUpIds: ["ev-danger-001", "ev-combat-002"],
  },
  {
    id: "ev-combat-018",
    category: "combat",
    title: "두 세력 사이에 끼임",
    description: "서로 다른 두 적 세력이 맞부딪히는 전선 한가운데에 파티가 끼어들어버렸습니다.",
    weight: 2,
    boostedByTags: ["diff:hard"],
  },
  {
    id: "ev-combat-019",
    category: "combat",
    title: "두목과 부하 연합",
    description: "적의 두목이 부하들을 이끌고 전면 공격을 개시했습니다. 두목을 우선 제압해야 전선이 흔들립니다.",
    weight: 3,
    boostedByTags: ["enemy:bandit", "enemy:goblin", "obj:hunt"],
    followUpIds: ["ev-danger-001"],
  },
  {
    id: "ev-combat-020",
    category: "combat",
    title: "마법 저항 개체",
    description: "마법 계열 공격을 거의 무력화하는 특이한 개체가 등장했습니다. 물리 공격 위주로 전략을 전환해야 합니다.",
    weight: 2,
    boostedByTags: ["risk:magic", "terrain:dungeon"],
  },

  // ── EXPLORATION (15) ─────────────────────────────────────────────────────

  {
    id: "ev-explore-001",
    category: "exploration",
    title: "더 깊은 구조물 발견",
    description: "의뢰 지역 내에서 예상보다 깊은 구조물이 발견되었습니다. 지도에 없는 구역이라 신중한 탐색이 필요합니다.",
    weight: 5,
    boostedByTags: ["obj:explore", "terrain:dungeon", "terrain:ruins"],
    followUpIds: ["ev-explore-005", "ev-reward-001"],
  },
  {
    id: "ev-explore-002",
    category: "exploration",
    title: "숨겨진 통로 발견",
    description: "지도에 표시되지 않은 숨겨진 통로가 발견되었습니다. 어디로 이어지는지 불분명합니다.",
    weight: 5,
    boostedByTags: ["obj:explore", "terrain:dungeon"],
    followUpIds: ["ev-explore-001", "ev-reward-010"],
  },
  {
    id: "ev-explore-003",
    category: "exploration",
    title: "새로운 조사 지점",
    description: "조사 중 예상치 못한 흔적을 발견했습니다. 추가 확인이 필요해 보이는 지점입니다.",
    weight: 6,
    boostedByTags: ["obj:search", "obj:explore"],
  },
  {
    id: "ev-explore-004",
    category: "exploration",
    title: "고대 비문 발견",
    description: "고대 언어로 쓰인 비문이 발견되었습니다. 해독하는 데 시간이 걸리지만 중요한 단서일 수 있습니다.",
    weight: 4,
    boostedByTags: ["terrain:ruins", "terrain:dungeon", "theme:mystery"],
    followUpIds: ["ev-reward-001", "ev-explore-012"],
  },
  {
    id: "ev-explore-005",
    category: "exploration",
    title: "지하 공간 발견",
    description: "예상치 못한 지하 공간이 발견되었습니다. 내부가 광활하고 위험 여부를 파악 중입니다.",
    weight: 4,
    boostedByTags: ["terrain:dungeon", "obj:explore"],
    followUpIds: ["ev-combat-013", "ev-reward-010"],
  },
  {
    id: "ev-explore-006",
    category: "exploration",
    title: "위험한 함정 지대",
    description: "함정이 촘촘히 배치된 구역을 발견했습니다. 신중하게 통과하지 않으면 큰 피해가 우려됩니다.",
    weight: 4,
    boostedByTags: ["risk:trap", "terrain:ruins", "terrain:dungeon"],
    followUpIds: ["ev-danger-006", "ev-danger-009"],
  },
  {
    id: "ev-explore-007",
    category: "exploration",
    title: "마법 잔재 발견",
    description: "강력한 마법이 사용된 흔적이 발견되었습니다. 아직 잔류 마나가 불안정하게 흐르고 있습니다.",
    weight: 4,
    boostedByTags: ["risk:magic", "terrain:ruins"],
    followUpIds: ["ev-danger-006", "ev-reward-005"],
  },
  {
    id: "ev-explore-008",
    category: "exploration",
    title: "분기 통로",
    description: "경로가 여러 갈래로 나뉩니다. 어느 쪽을 선택하느냐에 따라 이후 상황이 크게 달라질 수 있습니다.",
    weight: 5,
    boostedByTags: ["terrain:dungeon", "obj:explore"],
  },
  {
    id: "ev-explore-009",
    category: "exploration",
    title: "예상 이상으로 깊은 곳",
    description: "의뢰서에 명시된 것보다 훨씬 더 깊은 영역에 도달했습니다. 귀환 경로를 지금 확보해두어야 합니다.",
    weight: 3,
    boostedByTags: ["obj:explore", "diff:hard"],
    followUpIds: ["ev-danger-007"],
  },
  {
    id: "ev-explore-010",
    category: "exploration",
    title: "오래된 지도 발견",
    description: "이 지역의 구 지도가 발견되었습니다. 숨겨진 경로와 위험 지점이 표시되어 있어 큰 도움이 됩니다.",
    weight: 4,
    boostedByTags: ["terrain:ruins", "terrain:dungeon", "theme:mystery"],
    followUpIds: ["ev-explore-002", "ev-reward-010"],
  },
  {
    id: "ev-explore-011",
    category: "exploration",
    title: "전 탐험대 흔적 발견",
    description: "이전에 이 지역을 탐색했던 탐험대의 흔적이 발견되었습니다. 좋지 않은 일이 있었던 것 같습니다.",
    weight: 4,
    boostedByTags: ["terrain:ruins", "theme:mystery", "theme:danger"],
    followUpIds: ["ev-person-001", "ev-danger-010"],
  },
  {
    id: "ev-explore-012",
    category: "exploration",
    title: "봉인된 공간 발견",
    description: "강력한 마법으로 봉인된 공간을 발견했습니다. 봉인을 해제할 방법을 찾는다면 내부에 무언가 있을 것입니다.",
    weight: 3,
    boostedByTags: ["risk:magic", "terrain:ruins", "theme:mystery"],
    followUpIds: ["ev-reward-001", "ev-combat-014"],
  },
  {
    id: "ev-explore-013",
    category: "exploration",
    title: "마법 함정 지대",
    description: "고대 마법으로 설치된 함정들이 활성화 상태입니다. 마법 감지 능력이 없으면 매우 위험한 구역입니다.",
    weight: 3,
    requiredTags: ["risk:magic"],
    boostedByTags: ["terrain:ruins", "risk:trap"],
    followUpIds: ["ev-danger-006"],
  },
  {
    id: "ev-explore-014",
    category: "exploration",
    title: "수몰된 통로",
    description: "지하에서 물이 차오르고 있습니다. 일부 통로가 이미 침수되어 우회로를 찾아야 합니다.",
    weight: 3,
    boostedByTags: ["risk:flood", "terrain:dungeon"],
    followUpIds: ["ev-danger-007", "ev-danger-008"],
  },
  {
    id: "ev-explore-015",
    category: "exploration",
    title: "고대 기관 발견",
    description: "고대에 제작된 것으로 보이는 기계 장치가 발견되었습니다. 작동 원리를 파악하면 유용할 수도 있습니다.",
    weight: 3,
    boostedByTags: ["terrain:ruins", "obj:explore"],
    followUpIds: ["ev-reward-001", "ev-explore-012"],
  },

  // ── ENVIRONMENT (15) ─────────────────────────────────────────────────────

  {
    id: "ev-env-001",
    category: "environment",
    title: "폭우",
    description: "갑작스러운 폭우로 시야가 좁아지고 이동이 어려워졌습니다. 진행 속도가 현저히 느려집니다.",
    weight: 5,
    boostedByTags: ["season:summer", "season:autumn"],
    blockedTags: ["season:winter"],
  },
  {
    id: "ev-env-002",
    category: "environment",
    title: "짙은 안개",
    description: "새벽부터 짙은 안개가 이어져 탐색 속도가 느려지고 있습니다. 대열을 유지하기가 쉽지 않습니다.",
    weight: 5,
    boostedByTags: ["terrain:swamp", "terrain:forest"],
  },
  {
    id: "ev-env-003",
    category: "environment",
    title: "낙석",
    description: "이동 중 낙석이 발생하여 우회로를 탐색하는 중입니다. 시간이 지체되고 있습니다.",
    weight: 5,
    requiredTags: ["terrain:mountain"],
    boostedByTags: ["risk:collapse"],
  },
  {
    id: "ev-env-004",
    category: "environment",
    title: "경로 붕괴",
    description: "일부 경로가 붕괴되어 새 경로를 확보해야 합니다. 귀환로까지 차단될 위험이 있습니다.",
    weight: 4,
    boostedByTags: ["risk:collapse", "terrain:dungeon", "terrain:mountain"],
  },
  {
    id: "ev-env-005",
    category: "environment",
    title: "갑작스러운 폭설",
    description: "갑자기 강한 눈보라가 몰아쳤습니다. 이동 속도가 크게 느려지고 저체온증 위험이 있습니다.",
    weight: 4,
    requiredTags: ["season:winter"],
    boostedByTags: ["terrain:mountain"],
    followUpIds: ["ev-danger-007"],
  },
  {
    id: "ev-env-006",
    category: "environment",
    title: "강물 범람",
    description: "최근 폭우로 강물이 범람하여 예정된 도하 지점이 봉쇄되었습니다. 새 경로를 찾아야 합니다.",
    weight: 4,
    requiredTags: ["risk:flood"],
    boostedByTags: ["season:spring", "season:summer"],
  },
  {
    id: "ev-env-007",
    category: "environment",
    title: "독기 지대",
    description: "독성 가스가 가득한 구역을 발견했습니다. 직접 통과하면 파티원 전원이 위험에 처할 수 있습니다.",
    weight: 4,
    boostedByTags: ["risk:disease", "terrain:swamp", "terrain:dungeon"],
    followUpIds: ["ev-danger-004"],
  },
  {
    id: "ev-env-008",
    category: "environment",
    title: "마법 폭풍",
    description: "마나 기류가 불안정해지며 마법 폭풍이 발생했습니다. 마법 기술과 아이템 사용에 이상이 생길 수 있습니다.",
    weight: 3,
    boostedByTags: ["risk:magic", "terrain:ruins"],
    followUpIds: ["ev-danger-006"],
  },
  {
    id: "ev-env-009",
    category: "environment",
    title: "밤 기온 급강하",
    description: "야영 중 기온이 급격히 떨어졌습니다. 피로도가 증가하고 장비 작동에도 문제가 생길 수 있습니다.",
    weight: 4,
    boostedByTags: ["season:winter", "season:autumn", "terrain:mountain"],
    followUpIds: ["ev-danger-007"],
  },
  {
    id: "ev-env-010",
    category: "environment",
    title: "산불 흔적",
    description: "최근 대규모 화재가 있었던 흔적이 발견되었습니다. 불안정한 지형과 잔류 연기로 이동이 위험합니다.",
    weight: 3,
    boostedByTags: ["terrain:forest", "season:summer"],
  },
  {
    id: "ev-env-011",
    category: "environment",
    title: "늪지 함몰",
    description: "늪지 지형이 예고 없이 함몰되는 구역이 있습니다. 이동 경로를 신중하게 선택해야 합니다.",
    weight: 4,
    requiredTags: ["terrain:swamp"],
    followUpIds: ["ev-danger-009"],
  },
  {
    id: "ev-env-012",
    category: "environment",
    title: "해안 폭풍",
    description: "해안 방향에서 강한 폭풍이 밀려오고 있습니다. 야영지를 내륙으로 이동시켜야 합니다.",
    weight: 3,
    boostedByTags: ["terrain:coast", "season:autumn"],
  },
  {
    id: "ev-env-013",
    category: "environment",
    title: "지진 전조",
    description: "약한 지진이 여러 차례 발생했습니다. 구조물과 지형의 붕괴 위험이 빠르게 높아지고 있습니다.",
    weight: 3,
    boostedByTags: ["terrain:dungeon", "terrain:mountain", "risk:collapse"],
    followUpIds: ["ev-env-004"],
  },
  {
    id: "ev-env-014",
    category: "environment",
    title: "마나 기류 교란",
    description: "이 지역의 마나 흐름이 심하게 교란되어 있습니다. 마법 계열 기술의 효과가 예측 불가능하게 변동됩니다.",
    weight: 3,
    boostedByTags: ["risk:magic", "terrain:ruins"],
  },
  {
    id: "ev-env-015",
    category: "environment",
    title: "저주받은 땅",
    description: "저주받은 땅에 들어선 것 같습니다. 파티원들이 강한 불쾌감과 원인 모를 피로를 호소하고 있습니다.",
    weight: 2,
    boostedByTags: ["risk:curse", "terrain:ruins", "enemy:undead"],
    followUpIds: ["ev-danger-010", "ev-danger-007"],
  },

  // ── REWARD (10) ──────────────────────────────────────────────────────────

  {
    id: "ev-reward-001",
    category: "reward",
    title: "고대 유물 발견",
    description: "의뢰 지역에서 예상치 못한 고대 유물이 발견되었습니다. 상당한 가치가 있어 보입니다.",
    weight: 4,
    boostedByTags: ["terrain:ruins", "terrain:dungeon", "obj:explore", "theme:treasure"],
  },
  {
    id: "ev-reward-002",
    category: "reward",
    title: "희귀 광물 발견",
    description: "채굴 흔적 근처에서 희귀 광물 맥이 발견되었습니다. 전문 채굴이 필요하지만 상당한 수익이 기대됩니다.",
    weight: 4,
    boostedByTags: ["terrain:mountain", "terrain:dungeon"],
  },
  {
    id: "ev-reward-003",
    category: "reward",
    title: "귀중한 약초 발견",
    description: "이동 중 시장에서 고가에 거래되는 약초 군락을 발견했습니다. 일부를 채취했습니다.",
    weight: 5,
    boostedByTags: ["terrain:forest", "terrain:plain", "season:spring", "season:summer"],
  },
  {
    id: "ev-reward-004",
    category: "reward",
    title: "은닉된 재화 발견",
    description: "탐색 중 누군가 숨겨둔 재화를 발견했습니다. 소유주를 확인한 후 처분 방법을 결정할 예정입니다.",
    weight: 4,
    boostedByTags: ["theme:treasure", "terrain:ruins"],
  },
  {
    id: "ev-reward-005",
    category: "reward",
    title: "마법 아이템 발견",
    description: "오래된 마법이 깃든 아이템이 발견되었습니다. 감정을 받아봐야 정확한 가치를 알 수 있습니다.",
    weight: 3,
    boostedByTags: ["terrain:ruins", "risk:magic", "theme:treasure"],
  },
  {
    id: "ev-reward-006",
    category: "reward",
    title: "희귀 몬스터 소재",
    description: "매우 희귀한 몬스터 소재가 획득되었습니다. 시장에서 높은 가격을 받을 수 있을 것입니다.",
    weight: 3,
    boostedByTags: ["obj:hunt", "enemy:dragon", "enemy:beast"],
  },
  {
    id: "ev-reward-007",
    category: "reward",
    title: "고대 금화 발견",
    description: "오래된 금화들이 발견되었습니다. 현재 통용되지 않는 화폐지만 골동품으로서의 가치가 상당합니다.",
    weight: 4,
    boostedByTags: ["terrain:ruins", "theme:treasure"],
  },
  {
    id: "ev-reward-008",
    category: "reward",
    title: "전설적 무기의 단서",
    description: "전설적인 무기와 관련된 단서가 담긴 문서가 발견되었습니다. 길드에 보고해야 할 중요한 정보입니다.",
    weight: 1,
    rarity: "rare",
    boostedByTags: ["terrain:ruins", "theme:mystery", "theme:treasure"],
  },
  {
    id: "ev-reward-009",
    category: "reward",
    title: "의뢰 외 추가 보상",
    description: "의뢰와 관련하여 현지 주민이 추가 보상을 제공하겠다고 합니다. 의뢰를 성공적으로 완료하는 것이 조건입니다.",
    weight: 4,
    boostedByTags: ["theme:social", "obj:escort", "obj:rescue"],
  },
  {
    id: "ev-reward-010",
    category: "reward",
    title: "비밀 보물창고 발견",
    description: "오래된 보물창고가 발견되었습니다. 봉인이 되어있지만 내부에 상당한 재화가 있을 것으로 보입니다.",
    weight: 1,
    rarity: "rare",
    boostedByTags: ["terrain:dungeon", "terrain:ruins", "theme:treasure"],
  },

  // ── PERSON (10) ──────────────────────────────────────────────────────────

  {
    id: "ev-person-001",
    category: "person",
    title: "실종 모험가 흔적",
    description: "의뢰 지역에서 소식이 두절된 모험가의 흔적을 발견했습니다. 아직 살아있을 가능성이 있습니다.",
    weight: 4,
    boostedByTags: ["obj:search", "obj:rescue", "theme:mystery"],
    followUpIds: ["ev-person-002"],
  },
  {
    id: "ev-person-002",
    category: "person",
    title: "생존자 발견",
    description: "의뢰 지역에서 예상치 못한 생존자를 발견했습니다. 안전을 확보하고 상황을 파악하는 중입니다.",
    weight: 4,
    boostedByTags: ["obj:rescue", "obj:search"],
  },
  {
    id: "ev-person-003",
    category: "person",
    title: "의문의 인물 조우",
    description: "정체를 알 수 없는 인물과 마주쳤습니다. 적대적이지는 않지만 목적이 전혀 불분명합니다.",
    weight: 5,
    boostedByTags: ["theme:mystery", "theme:social"],
  },
  {
    id: "ev-person-004",
    category: "person",
    title: "지역 주민 정보 입수",
    description: "현지 주민으로부터 의뢰 목표에 관한 유용한 정보를 얻었습니다. 계획을 일부 수정할 필요가 있을 수도 있습니다.",
    weight: 5,
    boostedByTags: ["theme:social", "obj:search", "obj:rescue"],
  },
  {
    id: "ev-person-005",
    category: "person",
    title: "경쟁 파티 조우",
    description: "같은 목표를 노리는 것으로 보이는 다른 파티와 마주쳤습니다. 협력할지 경쟁할지 판단해야 합니다.",
    weight: 4,
    boostedByTags: ["theme:social", "obj:hunt", "obj:explore"],
  },
  {
    id: "ev-person-006",
    category: "person",
    title: "타 길드 모험가 조우",
    description: "타 길드의 모험가 파티와 같은 지역에서 조우했습니다. 우호적인 정보 교환이 이루어졌습니다.",
    weight: 4,
    boostedByTags: ["theme:social"],
  },
  {
    id: "ev-person-007",
    category: "person",
    title: "상인 행렬 조우",
    description: "마침 이 지역을 지나는 상인 행렬을 만났습니다. 소모품 보충이 가능할지도 모릅니다.",
    weight: 4,
    requiredStage: "traveling",
    boostedByTags: ["obj:escort", "obj:deliver", "theme:social"],
    followUpIds: ["ev-reward-009"],
  },
  {
    id: "ev-person-008",
    category: "person",
    title: "부상당한 기사 발견",
    description: "심하게 부상당한 기사를 발견했습니다. 도움을 요청하고 있으며 중요한 정보를 갖고 있는 것 같습니다.",
    weight: 3,
    boostedByTags: ["theme:social", "theme:mystery"],
    followUpIds: ["ev-reward-009"],
  },
  {
    id: "ev-person-009",
    category: "person",
    title: "탈출한 포로",
    description: "적에게 포로로 잡혀있다 탈출한 인물을 발견했습니다. 적진 내부 정보를 알고 있을 수 있습니다.",
    weight: 3,
    boostedByTags: ["obj:rescue", "enemy:bandit", "risk:hostile"],
  },
  {
    id: "ev-person-010",
    category: "person",
    title: "수상한 밀정 포착",
    description: "파티를 미행하는 수상한 인물을 발견했습니다. 정보 수집인지 적의를 품은 것인지 불분명합니다.",
    weight: 3,
    boostedByTags: ["theme:mystery", "risk:hostile", "enemy:bandit"],
    followUpIds: ["ev-combat-006"],
  },

  // ── DANGER (10) ──────────────────────────────────────────────────────────

  {
    id: "ev-danger-001",
    category: "danger",
    title: "파티원 경상",
    description: "교전 또는 이동 중 파티원 일부가 경상을 입었습니다. 임무 수행에는 지장이 없지만 주의가 필요합니다.",
    weight: 6,
    boostedByTags: ["diff:hard", "diff:extreme"],
  },
  {
    id: "ev-danger-002",
    category: "danger",
    title: "장비 파손",
    description: "거친 지형 이동이나 전투 중 장비 일부가 손상되었습니다. 임시 수리를 완료했지만 성능이 저하됩니다.",
    weight: 5,
    boostedByTags: ["terrain:dungeon", "terrain:mountain"],
  },
  {
    id: "ev-danger-003",
    category: "danger",
    title: "식량 부족",
    description: "예상보다 긴 탐색으로 식량이 부족해지고 있습니다. 현지 조달이 필요하거나 의뢰 일정을 앞당겨야 합니다.",
    weight: 4,
    boostedByTags: ["obj:explore", "obj:rescue", "diff:hard"],
  },
  {
    id: "ev-danger-004",
    category: "danger",
    title: "독 노출",
    description: "파티원이 독성 물질에 노출되었습니다. 즉각적인 해독 처치가 필요한 상황입니다.",
    weight: 4,
    boostedByTags: ["risk:disease", "terrain:swamp", "enemy:beast"],
  },
  {
    id: "ev-danger-005",
    category: "danger",
    title: "방향 감각 상실 위기",
    description: "짙은 안개와 복잡한 지형으로 방향 감각을 잃을 뻔했습니다. 선발대가 경로를 재탐색 중입니다.",
    weight: 4,
    boostedByTags: ["terrain:forest", "terrain:swamp", "terrain:dungeon"],
  },
  {
    id: "ev-danger-006",
    category: "danger",
    title: "마법 함정 피해",
    description: "고대 마법 함정이 발동되어 파티원이 피해를 입었습니다. 다행히 치명적이지는 않았습니다.",
    weight: 3,
    boostedByTags: ["risk:trap", "risk:magic", "terrain:ruins"],
  },
  {
    id: "ev-danger-007",
    category: "danger",
    title: "기력 소진",
    description: "장시간의 이동과 전투로 파티원들의 기력이 크게 소모되었습니다. 충분한 휴식이 필요한 상황입니다.",
    weight: 5,
    boostedByTags: ["diff:hard", "diff:extreme"],
  },
  {
    id: "ev-danger-008",
    category: "danger",
    title: "소모품 고갈",
    description: "치료 포션과 마법 재료 등 소모품이 거의 소진되었습니다. 앞으로의 전투에 대비한 절약이 필요합니다.",
    weight: 4,
    boostedByTags: ["diff:hard", "diff:extreme", "obj:explore"],
  },
  {
    id: "ev-danger-009",
    category: "danger",
    title: "낙상 사고",
    description: "불안정한 지형에서 파티원이 낙상 사고를 당했습니다. 즉각적인 응급처치로 안정화했습니다.",
    weight: 3,
    boostedByTags: ["terrain:mountain", "terrain:dungeon", "risk:collapse"],
  },
  {
    id: "ev-danger-010",
    category: "danger",
    title: "공포 조우",
    description: "파티원들이 강렬한 공포감을 유발하는 존재와 조우했습니다. 심리적 충격으로 전투력이 일시 저하됩니다.",
    weight: 3,
    boostedByTags: ["enemy:undead", "risk:curse", "theme:mystery"],
    followUpIds: ["ev-danger-007"],
  },

  // ── RARE (10) ────────────────────────────────────────────────────────────

  {
    id: "ev-rare-001",
    category: "environment",
    title: "유성우 목격",
    description: "한밤중에 아름다운 유성우가 쏟아졌습니다. 드문 천문 현상으로 파티원 모두가 경외감에 발을 멈추었습니다. 좋은 징조라고들 합니다.",
    weight: 1,
    rarity: "rare",
  },
  {
    id: "ev-rare-002",
    category: "person",
    title: "길 잃은 아이",
    description: "이런 곳에서 혼자 길을 잃은 어린아이를 발견했습니다. 어떤 사연인지 알 수 없지만 우선 보호해야 합니다.",
    weight: 1,
    rarity: "rare",
  },
  {
    id: "ev-rare-003",
    category: "reward",
    title: "전설의 검 소문",
    description: "현지에서 오래된 전설적인 검에 대한 소문을 듣게 되었습니다. 찾는다면 엄청난 가치가 있을 것입니다.",
    weight: 1,
    rarity: "rare",
  },
  {
    id: "ev-rare-004",
    category: "person",
    title: "떠돌이 대장장이 조우",
    description: "뛰어난 기술을 가진 떠돌이 대장장이를 만났습니다. 즉석에서 장비를 수리하고 개조해 줄 수 있다고 합니다.",
    weight: 1,
    rarity: "rare",
  },
  {
    id: "ev-rare-005",
    category: "exploration",
    title: "오래된 영웅의 묘",
    description: "전설적인 영웅의 무덤으로 추정되는 장소를 발견했습니다. 오랫동안 아무도 방문하지 않은 것 같습니다.",
    weight: 1,
    rarity: "rare",
    followUpIds: ["ev-reward-001", "ev-reward-008"],
  },
  {
    id: "ev-rare-006",
    category: "exploration",
    title: "드래곤의 발자국",
    description: "거대한 드래곤의 발자국이 발견되었습니다. 매우 최근에 지나간 것으로 보입니다. 파티가 극도로 긴장하고 있습니다.",
    weight: 1,
    rarity: "rare",
    followUpIds: ["ev-combat-011"],
  },
  {
    id: "ev-rare-007",
    category: "person",
    title: "검은 기사 조우",
    description: "정체불명의 검은 갑옷을 입은 기사와 마주쳤습니다. 적대적이지는 않았지만 강력한 기운을 내뿜고 있었습니다.",
    weight: 1,
    rarity: "rare",
  },
  {
    id: "ev-rare-008",
    category: "environment",
    title: "오로라",
    description: "북쪽 하늘에 아름다운 오로라가 펼쳐졌습니다. 수십 년에 한 번 볼까 말까 한 장관에 파티원 모두가 말을 잃었습니다.",
    weight: 1,
    rarity: "rare",
    boostedByTags: ["season:winter", "terrain:mountain"],
  },
  {
    id: "ev-rare-009",
    category: "exploration",
    title: "고대 정령 출현",
    description: "이 지역을 수호하는 고대 정령이 모습을 드러냈습니다. 정령은 파티를 시험하듯 바라보다 조용히 사라졌습니다.",
    weight: 1,
    rarity: "rare",
    followUpIds: ["ev-reward-001"],
  },
  {
    id: "ev-rare-010",
    category: "reward",
    title: "예언서 조각 발견",
    description: "고대 예언이 기록된 양피지 조각을 발견했습니다. 내용의 일부만 해독 가능하지만 무언가 중요한 내용인 것 같습니다.",
    weight: 1,
    rarity: "rare",
  },
];

// ── Tag Derivation Tables ─────────────────────────────────────────────────────

const REGION_TERRAIN: Record<string, QuestTag> = {
  "region-grayridge":     "terrain:mountain",
  "region-westcanal":     "terrain:plain",
  "region-westfield":     "terrain:plain",
  "region-oldmine":       "terrain:dungeon",
  "region-darkforest":    "terrain:forest",
  "region-swamplands":    "terrain:swamp",
  "region-borderpass":    "terrain:mountain",
  "region-redcanyon":     "terrain:mountain",
  "region-ancientruins":  "terrain:ruins",
  "region-northmountain": "terrain:mountain",
};

const RISK_TAG_MAP: Partial<Record<string, QuestTag[]>> = {
  "산적":        ["enemy:bandit", "risk:ambush"],
  "낙석":        ["risk:collapse"],
  "침수":        ["risk:flood"],
  "침수 지형":   ["risk:flood"],
  "야생 동물":   ["enemy:beast"],
  "붕괴 위험":   ["risk:collapse"],
  "독기":        ["risk:disease"],
  "독":          ["risk:disease"],
  "기습 위험":   ["risk:ambush"],
  "야간 순찰":   ["risk:hostile"],
  "야간":        ["risk:hostile"],
  "산악 지형":   ["terrain:mountain"],
  "대형 마물":   ["enemy:monster"],
  "매복 위험":   ["risk:ambush"],
  "함정":        ["risk:trap"],
  "수호 구조체": ["enemy:golem"],
  "구조물 붕괴": ["risk:collapse"],
  "고룡":        ["enemy:dragon"],
  "극한 추위":   ["season:winter"],
  "공격대 필요": ["diff:extreme"],
  "단독 불가":   ["diff:extreme"],
  "비행 마물":   ["enemy:beast"],
  "화염":        ["theme:danger"],
  "마법":        ["risk:magic"],
  "저주":        ["risk:curse"],
};

const ENEMY_TAG_MAP: Partial<Record<string, QuestTag>> = {
  "산적":          "enemy:bandit",
  "들쥐":          "enemy:rodent",
  "야생 멧돼지":   "enemy:beast",
  "고블린":        "enemy:goblin",
  "늪지 마물":     "enemy:monster",
  "와이번":        "enemy:dragon",
  "수호 골렘":     "enemy:golem",
  "고룡 서리날개": "enemy:dragon",
  "언데드":        "enemy:undead",
};

const OBJ_TAG_MAP: Record<string, QuestTag> = {
  escort:      "obj:escort",
  search:      "obj:search",
  hunt:        "obj:hunt",
  delivery:    "obj:deliver",
  rescue:      "obj:rescue",
  exploration: "obj:explore",
};

// ── deriveTags ────────────────────────────────────────────────────────────────

export function deriveTags(quest: Quest, date: GameDate, region?: Region): Set<QuestTag> {
  const tags = new Set<QuestTag>();

  // Objective
  const obj = OBJ_TAG_MAP[quest.type];
  if (obj) tags.add(obj);

  // Season
  tags.add(`season:${date.season}` as QuestTag);

  // Difficulty
  if      (quest.dangerLevel <= 2) tags.add("diff:easy");
  else if (quest.dangerLevel <= 4) tags.add("diff:normal");
  else if (quest.dangerLevel <= 6) tags.add("diff:hard");
  else                             tags.add("diff:extreme");

  // Terrain from region ID
  const terrain = REGION_TERRAIN[quest.regionId];
  if (terrain) tags.add(terrain);

  // Region control/danger
  if (region) {
    if (region.danger >= 70)         tags.add("theme:danger");
    if (region.control === "hostile") tags.add("risk:hostile");
  }

  // Enemy tags from enemyHint
  if (quest.enemyHint) {
    const enemyTag = ENEMY_TAG_MAP[quest.enemyHint];
    if (enemyTag) tags.add(enemyTag);
  }

  // Risk tags
  for (const riskTag of quest.riskTags) {
    const mapped = RISK_TAG_MAP[riskTag];
    if (mapped) mapped.forEach(t => tags.add(t));
  }

  return tags;
}

// ── Event roll probability ────────────────────────────────────────────────────

function rollEventChance(dangerLevel: number, stage: QuestStage): boolean {
  const base        = 0.10;
  const dangerBonus = Math.max(0, dangerLevel - 2) * 0.04;
  const stageBonus  = stage === "executing" ? 0.05 : 0;
  return Math.random() < Math.min(base + dangerBonus + stageBonus, 0.32);
}

// ── selectEvent ───────────────────────────────────────────────────────────────

export function selectEvent(
  quest: Quest,
  prog: QuestProgress,
  date: GameDate,
  tags: Set<QuestTag>,
): EventDefinition | null {
  if (!rollEventChance(quest.dangerLevel, prog.currentStage)) return null;

  // Event Memory: avoid recently seen event titles (last 5)
  const recentTitles = new Set(prog.events.slice(-5).map(e => e.title));

  // Event Chain: boost follow-up IDs of the last event
  let followUpBias: Set<string> | null = null;
  if (prog.events.length > 0) {
    const lastTitle = prog.events[prog.events.length - 1].title;
    const lastDef   = EVENT_POOL.find(d => d.title === lastTitle);
    if (lastDef?.followUpIds?.length) {
      followUpBias = new Set(lastDef.followUpIds);
    }
  }

  // Filter
  const eligible = EVENT_POOL.filter(def => {
    if (recentTitles.has(def.title)) return false;
    if (def.requiredStage && def.requiredStage !== prog.currentStage) return false;
    if (def.requiredTags && !def.requiredTags.every(t => tags.has(t))) return false;
    if (def.blockedTags  && def.blockedTags.some(t => tags.has(t)))    return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // Compute weights
  const weights = eligible.map(def => {
    // Rare events start very low
    let w = def.rarity === "epic" ? 0.1 : def.rarity === "rare" ? 0.5 : def.weight;

    // Tag boosts
    if (def.boostedByTags) {
      for (const tag of def.boostedByTags) {
        if (tags.has(tag)) w += 2;
      }
    }

    // Event chain: double weight for designated follow-ups
    if (followUpBias && followUpBias.has(def.id)) w *= 2;

    return w;
  });

  // Weighted random selection
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

// ── buildQuestEvent ───────────────────────────────────────────────────────────

export function buildQuestEvent(
  questId: EntityId,
  partyId: EntityId,
  day: number,
  def: EventDefinition,
): QuestEvent {
  return {
    eventId:     `ev-${def.id}-${questId}-${day}`,
    questId,
    partyId,
    day,
    category:    def.category as QuestEventCategory,
    title:       def.title,
    description: def.description,
    read:        false,
  };
}
