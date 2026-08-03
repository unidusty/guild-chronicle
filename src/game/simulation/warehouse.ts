import type { GameState, SaleTransaction } from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";
import { applyFinanceIncome } from "./finance";

export function sellWarehouseItem(state: GameState, itemId: string, quantity: number): GameState {
  const item = LOOT_TABLE[itemId];
  if (!item) return state;

  const currentQty = state.warehouse[itemId] ?? 0;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > currentQty) return state;

  const totalPrice = item.baseValue * quantity;
  if (totalPrice <= 0 || !Number.isFinite(totalPrice)) return state;

  const newWarehouse = { ...state.warehouse };
  const remaining = currentQty - quantity;
  if (remaining === 0) {
    delete newWarehouse[itemId];
  } else {
    newWarehouse[itemId] = remaining;
  }

  const { year, season, day } = state.currentDate;
  const id = `sale-${year}${season[0]}${day}-${Math.random().toString(36).slice(2, 7)}`;

  const transaction: SaleTransaction = {
    id,
    date: state.currentDate,
    itemId,
    itemName: item.name,
    quantity,
    unitPrice: item.baseValue,
    totalPrice,
  };

  if (!Number.isFinite(state.guild.gold + totalPrice) || state.guild.gold + totalPrice < 0) return state;

  const midState: GameState = {
    ...state,
    warehouse: newWarehouse,
    saleTransactions: [transaction, ...state.saleTransactions],
  };

  return applyFinanceIncome(midState, {
    type: "warehouse_sale",
    amount: totalPrice,
    description: `창고 판매 — ${item.name} ×${quantity}`,
    sourceType: "sale_transaction",
    sourceId: id,
  });
}
