import type {
  EntityId,
  GameDate,
  GameState,
  LootDrop,
  LootEntry,
  LootPurchaseResult,
  Party,
  Quest,
  QuestProgress,
  QuestResult,
  ReturnReport,
  SettlementResult,
} from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";
import { applyFinanceIncome, applyFinanceExpense } from "./finance";
import { calcGuildPurchaseValue } from "../constants/economy";
import { calcQuestReputation } from "../constants/reputation";
import { applyReputationChange } from "./reputation";

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
  prog?: QuestProgress,
): ReturnReport {
  const totalRewardGold  = quest.rewardGold;
  const isGuildIssued    = quest.issuer === "guild";
  const guildFeeGold     = isGuildIssued ? 0 : Math.floor(totalRewardGold * GUILD_FEE_RATE);
  const partyPaymentGold = totalRewardGold - guildFeeGold;

  // Actual duration = last incremented currentDay + 1 (the completion day itself)
  const actualDurationDays     = prog ? prog.currentDay + 1 : quest.durationDays;
  const initialEstimatedDays   = prog ? prog.initialEstimatedDays : quest.durationDays;
  const totalDurationDelta     = actualDurationDays - initialEstimatedDays;

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
    durationDays: actualDurationDays,
    initialEstimatedDays,
    totalDurationDelta,
    completedAt: date,
    resultGrade: questResult.resultGrade,
    successRate: questResult.successRate,
    totalRewardGold,
    guildFeeGold,
    partyPaymentGold,
    loot: lootEntries,
    issuer: quest.issuer,
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

  const netGuildGoldChange = report.issuer === "guild"
    ? -(report.partyPaymentGold + lootPurchaseTotal)
    : report.guildFeeGold - lootPurchaseTotal;

  return {
    reportId: report.id,
    guildFeeGold: report.guildFeeGold,
    partyPaymentGold: report.partyPaymentGold,
    purchasedLoot,
    lootPurchaseTotal,
    netGuildGoldChange,
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

  const isGuildIssued = report.issuer === "guild";

  // Pre-validate: ensure sufficient gold for net outflows
  if (isGuildIssued) {
    if (state.guild.gold < settlement.partyPaymentGold + settlement.lootPurchaseTotal) return state;
  } else {
    if (state.guild.gold + settlement.guildFeeGold < settlement.lootPurchaseTotal) return state;
  }

  // Build intermediate state with non-gold changes applied
  const midState: GameState = {
    ...state,
    parties,
    adventurers,
    warehouse,
    returnReports,
  };

  let afterGold: GameState;
  if (isGuildIssued) {
    // Guild pays party as expense (no commission income)
    const afterExpense = applyFinanceExpense(midState, {
      type: "guild_quest_commission",
      amount: settlement.partyPaymentGold,
      description: `길드 발주 보수 지급 — ${report.questTitle}`,
      sourceType: "return_report",
      sourceId: report.id,
    });
    afterGold = settlement.lootPurchaseTotal > 0
      ? applyFinanceExpense(afterExpense, {
          type: "loot_purchase",
          amount: settlement.lootPurchaseTotal,
          description: `전리품 구매 — ${report.questTitle}`,
          sourceType: "return_report_loot",
          sourceId: report.id,
        })
      : afterExpense;
  } else {
    // External quest: income first (commission), then loot expense
    const afterIncome = applyFinanceIncome(midState, {
      type: "quest_commission",
      amount: settlement.guildFeeGold,
      description: `의뢰 수수료 — ${report.questTitle}`,
      sourceType: "return_report",
      sourceId: report.id,
    });
    afterGold = settlement.lootPurchaseTotal > 0
      ? applyFinanceExpense(afterIncome, {
          type: "loot_purchase",
          amount: settlement.lootPurchaseTotal,
          description: `전리품 구매 — ${report.questTitle}`,
          sourceType: "return_report_loot",
          sourceId: report.id,
        })
      : afterIncome;
  }

  const afterLoot = afterGold;

  // Apply reputation change (idempotent by sourceId = report.id)
  const repDelta = calcQuestReputation(report.questGrade, report.resultGrade);
  const repSourceId = `rep-quest-${report.id}`;
  const resultLabels: Record<string, string> = {
    great_success: "대성공",
    success:       "성공",
    narrow_success:"간신히 성공",
    retreat:       "철수",
    failure:       "실패",
    great_failure: "대실패",
  };
  return applyReputationChange(afterLoot, {
    type: "quest_result",
    delta: repDelta,
    description: `${report.questTitle} ${resultLabels[report.resultGrade] ?? report.resultGrade}`,
    date: report.completedAt,
    sourceId: repSourceId,
    questId: report.questId,
  });
}
