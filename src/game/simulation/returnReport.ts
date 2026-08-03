import type {
  EntityId,
  GameDate,
  GameState,
  LootDrop,
  LootEntry,
  LootPurchaseResult,
  Party,
  Quest,
  QuestResult,
  ReturnReport,
  SettlementResult,
} from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";
import { applyFinanceIncome, applyFinanceExpense } from "./finance";
import { calcGuildPurchaseValue } from "../constants/economy";

export const GUILD_FEE_RATE = 0.10;

function dateKey(date: GameDate): string {
  return `${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`;
}

export function createReturnReport(
  quest: Quest,
  party: Party,
  questResult: QuestResult,
  loot: LootDrop[],
  date: GameDate,
  regionName: string,
): ReturnReport {
  const totalRewardGold = quest.rewardGold;
  const guildFeeGold = Math.floor(totalRewardGold * GUILD_FEE_RATE);
  const partyPaymentGold = totalRewardGold - guildFeeGold;

  const lootEntries: LootEntry[] = loot.map(({ itemId, quantity }) => {
    const item = LOOT_TABLE[itemId];
    const baseValue = item?.baseValue ?? 0;
    return {
      itemId,
      itemName: item?.name ?? itemId,
      quantity,
      unitValue: baseValue,
      purchaseUnitValue: calcGuildPurchaseValue(baseValue),
    };
  });

  return {
    id: `rr-${quest.id}-${dateKey(date)}`,
    questId: quest.id,
    questTitle: quest.title,
    questCategory: quest.type,
    questGrade: quest.grade,
    partyId: party.id,
    partyNameSnapshot: party.name,
    memberIdsSnapshot: [...party.memberIds],
    regionId: quest.regionId,
    regionNameSnapshot: regionName,
    durationDays: quest.durationDays,
    completedAt: date,
    resultGrade: questResult.resultGrade,
    successRate: questResult.successRate,
    totalRewardGold,
    guildFeeGold,
    partyPaymentGold,
    loot: lootEntries,
  };
}

export function calcSettlement(
  report: ReturnReport,
  selectedItemIds: EntityId[],
): SettlementResult {
  const selectedSet = new Set(selectedItemIds);

  const purchasedLoot: LootPurchaseResult[] = report.loot
    .filter((entry) => selectedSet.has(entry.itemId))
    .map((entry) => ({
      itemId: entry.itemId,
      itemName: entry.itemName,
      quantity: entry.quantity,
      unitValue: entry.purchaseUnitValue,
      totalValue: entry.purchaseUnitValue * entry.quantity,
    }));

  const lootPurchaseTotal = purchasedLoot.reduce((sum, p) => sum + p.totalValue, 0);

  return {
    reportId: report.id,
    guildFeeGold: report.guildFeeGold,
    partyPaymentGold: report.partyPaymentGold,
    purchasedLoot,
    lootPurchaseTotal,
    netGuildGoldChange: report.guildFeeGold - lootPurchaseTotal,
  };
}

export function finalizeSettlement(
  state: GameState,
  reportId: EntityId,
  selectedItemIds: EntityId[],
): GameState {
  const report = state.returnReports.find((r) => r.id === reportId);
  if (!report) return state;

  const settlement = calcSettlement(report, selectedItemIds);

  const parties = { ...state.parties };
  const adventurers = { ...state.adventurers };
  const warehouse = { ...state.warehouse };

  // Party → idle
  const party = parties[report.partyId];
  if (party) {
    parties[report.partyId] = {
      ...party,
      status: "idle",
      totalGoldEarned: party.totalGoldEarned + report.partyPaymentGold + settlement.lootPurchaseTotal,
    };
  }

  // Members → idle
  for (const memberId of report.memberIdsSnapshot) {
    const adv = adventurers[memberId];
    if (adv) {
      adventurers[memberId] = { ...adv, status: "idle" };
    }
  }

  // Purchased loot → warehouse
  for (const purchased of settlement.purchasedLoot) {
    warehouse[purchased.itemId] = (warehouse[purchased.itemId] ?? 0) + purchased.quantity;
  }

  // Remove ReturnReport
  const returnReports = state.returnReports.filter((r) => r.id !== reportId);

  // Pre-validate: income first, then check expense coverage
  if (state.guild.gold + settlement.guildFeeGold < settlement.lootPurchaseTotal) {
    return state;
  }

  // Build intermediate state with non-gold changes applied
  const midState: GameState = {
    ...state,
    parties,
    adventurers,
    warehouse,
    returnReports,
  };

  // Apply income first (quest commission)
  const afterIncome = applyFinanceIncome(midState, {
    type: "quest_commission",
    amount: settlement.guildFeeGold,
    description: `의뢰 수수료 — ${report.questTitle}`,
    sourceType: "return_report",
    sourceId: report.id,
  });

  // Apply loot purchase expense if any
  if (settlement.lootPurchaseTotal > 0) {
    return applyFinanceExpense(afterIncome, {
      type: "loot_purchase",
      amount: settlement.lootPurchaseTotal,
      description: `전리품 구매 — ${report.questTitle}`,
      sourceType: "return_report_loot",
      sourceId: report.id,
    });
  }

  return afterIncome;
}
