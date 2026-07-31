import type { GameState } from "../../types/game";
import { FACILITY_DEFS } from "../../data/facilityData";

export function buildFacility(state: GameState, facilityId: string): GameState {
  const facility = state.facilities[facilityId];
  if (!facility || facility.status !== "unbuilt" || facility.level !== 0) return state;

  const def = FACILITY_DEFS[facilityId];
  if (!def) return state;

  const cost = def.levels[0].cost;
  if (state.guild.gold < cost) return state;

  return {
    ...state,
    guild: { ...state.guild, gold: state.guild.gold - cost },
    facilities: {
      ...state.facilities,
      [facilityId]: { ...facility, level: 1, status: "active" as const },
    },
  };
}

export function upgradeFacility(state: GameState, facilityId: string): GameState {
  const facility = state.facilities[facilityId];
  if (!facility || facility.status !== "active" || facility.level >= facility.maxLevel) return state;

  const def = FACILITY_DEFS[facilityId];
  if (!def) return state;

  // levels[facility.level] = 다음 레벨(facility.level+1)의 비용/효과
  const nextDef = def.levels[facility.level];
  if (!nextDef) return state;

  const cost = nextDef.cost;
  if (state.guild.gold < cost) return state;

  return {
    ...state,
    guild: { ...state.guild, gold: state.guild.gold - cost },
    facilities: {
      ...state.facilities,
      [facilityId]: { ...facility, level: facility.level + 1 },
    },
  };
}
