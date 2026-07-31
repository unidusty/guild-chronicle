import type { GameState, SaleTransaction } from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";

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

  const prevGold = state.guild.gold;
  const newGold = prevGold + totalPrice;
  if (!Number.isFinite(newGold) || newGold < 0) return state;

  return {
    ...state,
    guild: { ...state.guild, gold: newGold },
    warehouse: newWarehouse,
    saleTransactions: [transaction, ...state.saleTransactions],
  };
}
