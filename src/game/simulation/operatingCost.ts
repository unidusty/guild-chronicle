import type { DailyOperatingCostResult, GameState } from "../../types/game";
import { FACILITY_DEFS } from "../../data/facilityData";
import { toAbsoluteDay } from "./recruitment";
import { applyFinanceExpense } from "./finance";

export const BASE_DAILY_GUILD_OPERATING_COST = 30;

export function calcDailyOperatingCost(state: GameState): DailyOperatingCostResult {
  const date = state.currentDate;
  const facilityMaintenanceEntries = [];

  for (const facility of Object.values(state.facilities)) {
    if (facility.status !== "active") continue;
    const def = FACILITY_DEFS[facility.id];
    if (!def) continue;
    const cost = def.maintenanceCostByLevel[facility.level - 1] ?? 0;
    if (cost > 0) {
      facilityMaintenanceEntries.push({
        facilityId: facility.id,
        facilityName: facility.name,
        level: facility.level,
        cost,
      });
    }
  }

  const facilityMaintenanceTotal = facilityMaintenanceEntries.reduce((sum, e) => sum + e.cost, 0);
  const totalCost = BASE_DAILY_GUILD_OPERATING_COST + facilityMaintenanceTotal;
  const balanceBefore = state.guild.gold;
  const paidAmount = Math.min(totalCost, balanceBefore);
  const unpaidAmount = totalCost - paidAmount;
  const balanceAfter = balanceBefore - paidAmount;

  return {
    date,
    baseOperatingCost: BASE_DAILY_GUILD_OPERATING_COST,
    facilityMaintenanceEntries,
    facilityMaintenanceTotal,
    totalCost,
    paidAmount,
    unpaidAmount,
    balanceBefore,
    balanceAfter,
  };
}

export function applyDailyOperatingCost(
  state: GameState,
): { newState: GameState; result: DailyOperatingCostResult } {
  const absDay = toAbsoluteDay(state.currentDate);

  // Dedup: already processed for this day
  if (state.lastOperatingCostDay === absDay) {
    return {
      newState: state,
      result: {
        date: state.currentDate,
        baseOperatingCost: 0,
        facilityMaintenanceEntries: [],
        facilityMaintenanceTotal: 0,
        totalCost: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        balanceBefore: state.guild.gold,
        balanceAfter: state.guild.gold,
      },
    };
  }

  const result = calcDailyOperatingCost(state);

  let newState: GameState = {
    ...state,
    guild: {
      ...state.guild,
      unpaidOperatingCost: state.guild.unpaidOperatingCost + result.unpaidAmount,
    },
    lastOperatingCostDay: absDay,
  };

  const dateKey = `${result.date.year}${result.date.season}${result.date.day}`;
  let remainingBudget = result.paidAmount;

  // Apply facility maintenance (paid portion, facility costs first)
  if (result.facilityMaintenanceTotal > 0) {
    const maintenancePaid = Math.min(result.facilityMaintenanceTotal, remainingBudget);
    if (maintenancePaid > 0) {
      const detail = result.facilityMaintenanceEntries
        .map((e) => `${e.facilityName} ${e.cost}G`)
        .join(", ");
      newState = applyFinanceExpense(newState, {
        type: "facility_maintenance",
        amount: maintenancePaid,
        description: `시설 유지비 (${detail})`,
        sourceType: "daily_operation",
        sourceId: `${dateKey}-maint`,
      });
      remainingBudget -= maintenancePaid;
    }
  }

  // Apply base guild operating cost (paid portion)
  const basePaid = Math.min(result.baseOperatingCost, remainingBudget);
  if (basePaid > 0) {
    newState = applyFinanceExpense(newState, {
      type: "guild_operating_cost",
      amount: basePaid,
      description: "길드 기본 운영비",
      sourceType: "daily_operation",
      sourceId: `${dateKey}-base`,
    });
  }

  return { newState, result };
}
