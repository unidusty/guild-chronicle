export interface FacilityLevelDef {
  cost: number;
  effects: string[];
}

export interface FacilityDef {
  id: string;
  levels: [FacilityLevelDef, FacilityLevelDef, FacilityLevelDef];
}

// levels[n] = 레벨 n+1 데이터. cost는 해당 레벨로 올리는 비용.
// levels[0].cost = 건설 비용 (0→1), levels[1].cost = 업그레이드 비용 (1→2), levels[2].cost = (2→3)
export const FACILITY_DEFS: Record<string, FacilityDef> = {
  "facility-guild-hall": {
    id: "facility-guild-hall",
    levels: [
      { cost: 0,    effects: ["모험가 최대 등록 10명"] },
      { cost: 3000, effects: ["모험가 최대 등록 20명"] },
      { cost: 8000, effects: ["모험가 최대 등록 35명"] },
    ],
  },
  "facility-reception": {
    id: "facility-reception",
    levels: [
      { cost: 800,  effects: ["동시 수주 의뢰 3건"] },
      { cost: 2000, effects: ["동시 수주 의뢰 5건"] },
      { cost: 5000, effects: ["동시 수주 의뢰 7건"] },
    ],
  },
  "facility-storage": {
    id: "facility-storage",
    levels: [
      { cost: 1200, effects: ["전리품 창고 이용 가능"] },
      { cost: 3000, effects: ["창고 보관 효율 증가"] },
      { cost: 7000, effects: ["전리품 자동 분류"] },
    ],
  },
  "facility-recruitment": {
    id: "facility-recruitment",
    levels: [
      { cost: 2000, effects: ["신규 지원자 등장", "가입 심사 기능 해금"] },
      { cost: 4000, effects: ["지원자 수 증가"] },
      { cost: 9000, effects: ["희귀 직업 확률 증가"] },
    ],
  },
};
