import type { GameState } from "../../types/game";
import { FACILITY_DEFS } from "../../data/facilityData";

export function startBuildFacility(state: GameState, facilityId: string): GameState {
  const facility = state.facilities[facilityId];
  if (!facility || facility.status !== "unbuilt" || facility.level !== 0) return state;

  const def = FACILITY_DEFS[facilityId];
  if (!def) return state;

  const levelDef = def.levels[0];
  if (state.guild.gold < levelDef.cost) return state;

  return {
    ...state,
    guild: { ...state.guild, gold: state.guild.gold - levelDef.cost },
    facilities: {
      ...state.facilities,
      [facilityId]: {
        ...facility,
        status: "constructing" as const,
        targetLevel: 1,
        constructionProgressDays: 0,
        constructionDurationDays: levelDef.constructionDays,
        constructionStartedDay: state.currentDate,
      },
    },
  };
}

export function startUpgradeFacility(state: GameState, facilityId: string): GameState {
  const facility = state.facilities[facilityId];
  if (!facility || facility.status !== "active" || facility.level >= facility.maxLevel) return state;

  const def = FACILITY_DEFS[facilityId];
  if (!def) return state;

  // levels[facility.level] = 다음 레벨(facility.level+1)의 비용/효과
  const nextDef = def.levels[facility.level];
  if (!nextDef) return state;

  if (state.guild.gold < nextDef.cost) return state;

  return {
    ...state,
    guild: { ...state.guild, gold: state.guild.gold - nextDef.cost },
    facilities: {
      ...state.facilities,
      [facilityId]: {
        ...facility,
        status: "upgrading" as const,
        targetLevel: facility.level + 1,
        constructionProgressDays: 0,
        constructionDurationDays: nextDef.constructionDays,
        constructionStartedDay: state.currentDate,
      },
    },
  };
}

export function advanceFacilityConstruction(
  state: GameState,
): { state: GameState; completed: Array<{ id: string; name: string }> } {
  const facilities = { ...state.facilities };
  const completed: Array<{ id: string; name: string }> = [];

  for (const facility of Object.values(state.facilities)) {
    if (facility.status !== "constructing" && facility.status !== "upgrading") continue;

    const newProgress = facility.constructionProgressDays + 1;
    if (newProgress >= facility.constructionDurationDays) {
      const newLevel = facility.targetLevel ?? facility.level;
      facilities[facility.id] = {
        ...facility,
        level: newLevel,
        status: "active" as const,
        targetLevel: null,
        constructionProgressDays: 0,
        constructionDurationDays: 0,
        constructionStartedDay: null,
      };
      completed.push({ id: facility.id, name: facility.name });
    } else {
      facilities[facility.id] = { ...facility, constructionProgressDays: newProgress };
    }
  }

  return { state: { ...state, facilities }, completed };
}
