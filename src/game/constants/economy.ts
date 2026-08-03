export const GUILD_PURCHASE_RATE = 0.80;

export function calcGuildPurchaseValue(baseValue: number): number {
  return Math.floor(baseValue * GUILD_PURCHASE_RATE);
}
