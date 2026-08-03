export interface RecruitmentLevelConfig {
  dailyChance: number;
  minApplicants: number;
  maxApplicants: number;
  capacity: number;
}

export interface FacilityLevelDef {
  cost: number;
  constructionDays: number;
  effects: string[];
  recruitment?: RecruitmentLevelConfig;
}

export interface FacilityDef {
  id: string;
  levels: [FacilityLevelDef, FacilityLevelDef, FacilityLevelDef];
  maintenanceCostByLevel: [number, number, number]; // Lv1, Lv2, Lv3 — active 상태에서만 부과
}

// levels[n] = 레벨 n+1 데이터.
// levels[0].cost = 건설 비용 (0→1), levels[1].cost = 업그레이드 비용 (1→2), etc.
// constructionDays = 건설/업그레이드 완료까지 걸리는 일수.
export const FACILITY_DEFS: Record<string, FacilityDef> = {
  "facility-guild-hall": {
    id: "facility-guild-hall",
    levels: [
      { cost: 0,    constructionDays: 0,  effects: ["모험가 최대 등록 10명"] },
      { cost: 3000, constructionDays: 14, effects: ["모험가 최대 등록 20명"] },
      { cost: 8000, constructionDays: 30, effects: ["모험가 최대 등록 35명"] },
    ],
    maintenanceCostByLevel: [20, 40, 70],
  },
  "facility-reception": {
    id: "facility-reception",
    levels: [
      { cost: 800,  constructionDays: 5,  effects: ["동시 수주 의뢰 3건"] },
      { cost: 2000, constructionDays: 10, effects: ["동시 수주 의뢰 5건"] },
      { cost: 5000, constructionDays: 20, effects: ["동시 수주 의뢰 7건"] },
    ],
    maintenanceCostByLevel: [10, 20, 35],
  },
  "facility-storage": {
    id: "facility-storage",
    levels: [
      { cost: 1200, constructionDays: 5,  effects: ["전리품 창고 이용 가능"] },
      { cost: 3000, constructionDays: 10, effects: ["창고 보관 효율 증가"] },
      { cost: 7000, constructionDays: 20, effects: ["전리품 자동 분류"] },
    ],
    maintenanceCostByLevel: [8, 16, 28],
  },
  "facility-recruitment": {
    id: "facility-recruitment",
    levels: [
      { cost: 2000, constructionDays: 3,  effects: ["신규 지원자 등장", "가입 심사 기능 해금"],
        recruitment: { dailyChance: 0.35, minApplicants: 1, maxApplicants: 1, capacity: 3 } },
      { cost: 4000, constructionDays: 7,  effects: ["지원자 수 증가"],
        recruitment: { dailyChance: 0.55, minApplicants: 1, maxApplicants: 2, capacity: 5 } },
      { cost: 9000, constructionDays: 14, effects: ["희귀 직업 확률 증가"],
        recruitment: { dailyChance: 0.75, minApplicants: 1, maxApplicants: 3, capacity: 8 } },
    ],
    maintenanceCostByLevel: [15, 25, 40],
  },
};
