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
    return {
      itemId,
      itemName: item?.name ?? itemId,
      quantity,
      unitValue: item?.baseValue ?? 0,
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
      unitValue: entry.unitValue,
      totalValue: entry.unitValue * entry.quantity,
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

  // Update guild gold
  const newGold = state.guild.gold + settlement.netGuildGoldChange;

  return {
    ...state,
    guild: { ...state.guild, gold: newGold },
    parties,
    adventurers,
    warehouse,
    returnReports,
  };
}
