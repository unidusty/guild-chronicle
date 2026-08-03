import type {
  FinanceTransaction,
  FinanceTransactionType,
  FinanceSummary,
  GameDate,
  GameState,
} from "../../types/game";
import { toAbsoluteDay } from "./recruitment";

function makeId(date: GameDate, type: FinanceTransactionType): string {
  const { year, season, day } = date;
  return `fin-${year}${season[0]}${day}-${type}-${Math.random().toString(36).slice(2, 7)}`;
}

function isDuplicate(
  state: GameState,
  sourceType: string,
  sourceId: string,
  type: FinanceTransactionType,
): boolean {
  return state.financeTransactions.some(
    (t) => t.sourceType === sourceType && t.sourceId === sourceId && t.type === type,
  );
}

interface IncomeParams {
  type: FinanceTransactionType;
  amount: number;
  description: string;
  sourceType?: string;
  sourceId?: string;
}

interface ExpenseParams {
  type: FinanceTransactionType;
  amount: number;
  description: string;
  sourceType?: string;
  sourceId?: string;
}

export function applyFinanceIncome(state: GameState, params: IncomeParams): GameState {
  const { type, amount, description, sourceType, sourceId } = params;

  if (sourceType && sourceId && isDuplicate(state, sourceType, sourceId, type)) {
    return state;
  }

  const balanceBefore = state.guild.gold;
  const balanceAfter = balanceBefore + amount;

  const tx: FinanceTransaction = {
    id: makeId(state.currentDate, type),
    date: state.currentDate,
    type,
    direction: "income",
    amount,
    balanceBefore,
    balanceAfter,
    description,
    ...(sourceType ? { sourceType } : {}),
    ...(sourceId ? { sourceId } : {}),
  };

  return {
    ...state,
    guild: { ...state.guild, gold: balanceAfter },
    financeTransactions: [tx, ...state.financeTransactions],
  };
}

export function applyFinanceExpense(state: GameState, params: ExpenseParams): GameState {
  const { type, amount, description, sourceType, sourceId } = params;

  if (sourceType && sourceId && isDuplicate(state, sourceType, sourceId, type)) {
    return state;
  }

  const balanceBefore = state.guild.gold;
  const balanceAfter = balanceBefore - amount;

  const tx: FinanceTransaction = {
    id: makeId(state.currentDate, type),
    date: state.currentDate,
    type,
    direction: "expense",
    amount,
    balanceBefore,
    balanceAfter,
    description,
    ...(sourceType ? { sourceType } : {}),
    ...(sourceId ? { sourceId } : {}),
  };

  return {
    ...state,
    guild: { ...state.guild, gold: balanceAfter },
    financeTransactions: [tx, ...state.financeTransactions],
  };
}

export function getFinanceSummary(state: GameState): FinanceSummary {
  const todayAbs = toAbsoluteDay(state.currentDate);
  const txs = state.financeTransactions;

  let todayIncome = 0;
  let todayExpense = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of txs) {
    const isToday = toAbsoluteDay(tx.date) === todayAbs;
    if (tx.direction === "income") {
      totalIncome += tx.amount;
      if (isToday) todayIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
      if (isToday) todayExpense += tx.amount;
    }
  }

  return {
    currentGold: state.guild.gold,
    todayIncome,
    todayExpense,
    todayNet: todayIncome - todayExpense,
    totalIncome,
    totalExpense,
    recentTransactions: txs.slice(0, 30),
  };
}
