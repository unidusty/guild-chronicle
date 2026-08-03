import type {
  FinanceTransactionType,
  FacilityUsageRecord,
  FacilityUsageType,
  GameDate,
  GameState,
  GuildFinancialHealth,
  GuildLoan,
  StaffMember,
} from "../../types/game";
import { applyFinanceExpense, applyFinanceIncome } from "./finance";
import { calcDailyOperatingCost } from "./operatingCost";
import { toAbsoluteDay } from "./recruitment";

// ── Constants ─────────────────────────────────────────────────────────────────

export const PAYROLL_INTERVAL_DAYS = 7;
export const TAX_INTERVAL_DAYS = 30;

// ── Date helpers ──────────────────────────────────────────────────────────────

export function absToGameDate(absDay: number): GameDate {
  const year = Math.floor(absDay / 120) + 1;
  const dayInYear = absDay % 120;
  if (dayInYear < 30) return { year, season: "spring", day: dayInYear + 1 };
  if (dayInYear < 60) return { year, season: "summer", day: dayInYear - 30 + 1 };
  if (dayInYear < 90) return { year, season: "autumn", day: dayInYear - 60 + 1 };
  return { year, season: "winter", day: dayInYear - 90 + 1 };
}

// ── Staff helpers ─────────────────────────────────────────────────────────────

export function getActiveStaff(state: GameState): StaffMember[] {
  return state.staff.filter((s) => {
    if (!s.isActive) return false;
    const facility = state.facilities[s.requiredFacilityId];
    return facility?.status === "active";
  });
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export interface PayrollResult {
  periodEndDay: number;
  totalSalary: number;
  paidSalary: number;
  unpaidSalary: number;
  entries: Array<{ staffId: string; name: string; salary: number }>;
}

export function processPayroll(
  state: GameState,
  todayAbsDay: number,
): { newState: GameState; result: PayrollResult | null } {
  const lastPayroll = state.lastPayrollDay ?? todayAbsDay;
  if (todayAbsDay - lastPayroll < PAYROLL_INTERVAL_DAYS) {
    return { newState: state, result: null };
  }

  // Duplicate prevention
  if (
    state.financeTransactions.some(
      (tx) => tx.sourceType === "payroll" && tx.sourceId === String(todayAbsDay),
    )
  ) {
    return { newState: state, result: null };
  }

  const activeStaff = getActiveStaff(state);
  const totalSalary = activeStaff.reduce((sum, s) => sum + s.salaryPerPeriod, 0);

  if (totalSalary === 0) {
    return {
      newState: { ...state, lastPayrollDay: todayAbsDay },
      result: { periodEndDay: todayAbsDay, totalSalary: 0, paidSalary: 0, unpaidSalary: 0, entries: [] },
    };
  }

  const paidSalary = Math.min(state.guild.gold, totalSalary);
  const unpaidSalary = totalSalary - paidSalary;

  let newState = state;
  if (paidSalary > 0) {
    newState = applyFinanceExpense(newState, {
      type: "staff_salary",
      amount: paidSalary,
      description: `직원 급여 — ${activeStaff.length}명 (${PAYROLL_INTERVAL_DAYS}일 주기)`,
      sourceType: "payroll",
      sourceId: String(todayAbsDay),
    });
  }

  newState = {
    ...newState,
    unpaidSalary: newState.unpaidSalary + unpaidSalary,
    lastPayrollDay: todayAbsDay,
  };

  return {
    newState,
    result: {
      periodEndDay: todayAbsDay,
      totalSalary,
      paidSalary,
      unpaidSalary,
      entries: activeStaff.map((s) => ({ staffId: s.id, name: s.name, salary: s.salaryPerPeriod })),
    },
  };
}

// ── Tax ───────────────────────────────────────────────────────────────────────

export interface TaxResult {
  periodEndDay: number;
  taxAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export function calcGuildTax(state: GameState): number {
  const memberCount = state.guild.adventurerIds.length;
  const activeFacilityCount = Object.values(state.facilities).filter(
    (f) => f.status === "active" && f.level > 0,
  ).length;
  return 50 + memberCount * 5 + activeFacilityCount * 10;
}

export function processTax(
  state: GameState,
  todayAbsDay: number,
): { newState: GameState; result: TaxResult | null } {
  const lastTax = state.lastTaxDay ?? todayAbsDay;
  if (todayAbsDay - lastTax < TAX_INTERVAL_DAYS) {
    return { newState: state, result: null };
  }

  // Duplicate prevention
  if (
    state.financeTransactions.some(
      (tx) => tx.sourceType === "tax" && tx.sourceId === String(todayAbsDay),
    )
  ) {
    return { newState: state, result: null };
  }

  const taxAmount = calcGuildTax(state);
  const paidAmount = Math.min(state.guild.gold, taxAmount);
  const unpaidAmount = taxAmount - paidAmount;

  let newState = state;
  if (paidAmount > 0) {
    newState = applyFinanceExpense(newState, {
      type: "guild_tax",
      amount: paidAmount,
      description: `길드 세금 납부 — ${TAX_INTERVAL_DAYS}일 주기`,
      sourceType: "tax",
      sourceId: String(todayAbsDay),
    });
  }

  newState = {
    ...newState,
    unpaidTax: newState.unpaidTax + unpaidAmount,
    lastTaxDay: todayAbsDay,
  };

  return {
    newState,
    result: { periodEndDay: todayAbsDay, taxAmount, paidAmount, unpaidAmount },
  };
}

// ── Loans ─────────────────────────────────────────────────────────────────────

export interface LoanRepaymentEntry {
  loanId: string;
  creditorName: string;
  principalPaid: number;
  interestPaid: number;
  remainingPrincipal: number;
  isFullyPaid: boolean;
  isOverdue: boolean;
  overdueAmount: number;
}

export function processLoanRepayments(
  state: GameState,
  todayAbsDay: number,
): { newState: GameState; results: LoanRepaymentEntry[] } {
  let newState = state;
  const results: LoanRepaymentEntry[] = [];

  const updatedLoans: GuildLoan[] = state.loans.map((loan) => {
    if (loan.status === "paid") return loan;

    const paymentDay = toAbsoluteDay(loan.nextPaymentDate);
    if (todayAbsDay < paymentDay) return loan;

    // Duplicate prevention
    const dupKey = `${loan.id}:${paymentDay}`;
    const interestDone = newState.financeTransactions.some(
      (tx) => tx.sourceType === "loan_payment" && tx.sourceId === `${dupKey}:interest`,
    );
    if (interestDone) return loan;

    const interest = Math.ceil(loan.remainingPrincipal * loan.interestRate);
    const principal = Math.min(loan.installmentAmount, loan.remainingPrincipal);
    const totalDue = principal + interest;
    const available = newState.guild.gold;

    let principalPaid = 0;
    let interestPaid = 0;
    let overdueAmount = 0;

    if (available >= totalDue) {
      principalPaid = principal;
      interestPaid = interest;
    } else if (available >= interest) {
      interestPaid = interest;
      principalPaid = available - interest;
      overdueAmount = principal - principalPaid;
    } else {
      interestPaid = Math.min(available, interest);
      overdueAmount = totalDue - interestPaid;
    }

    if (interestPaid > 0) {
      newState = applyFinanceExpense(newState, {
        type: "loan_interest_payment",
        amount: interestPaid,
        description: `대출 이자 상환 — ${loan.creditorName}`,
        sourceType: "loan_payment",
        sourceId: `${dupKey}:interest`,
      });
    }
    if (principalPaid > 0) {
      newState = applyFinanceExpense(newState, {
        type: "loan_principal_payment",
        amount: principalPaid,
        description: `대출 원금 상환 — ${loan.creditorName}`,
        sourceType: "loan_payment",
        sourceId: `${dupKey}:principal`,
      });
    }

    const newRemaining = loan.remainingPrincipal - principalPaid;
    const isFullyPaid = newRemaining <= 0;
    const nextPaymentDate = isFullyPaid ? loan.nextPaymentDate : absToGameDate(paymentDay + loan.paymentIntervalDays);

    results.push({
      loanId: loan.id,
      creditorName: loan.creditorName,
      principalPaid,
      interestPaid,
      remainingPrincipal: Math.max(0, newRemaining),
      isFullyPaid,
      isOverdue: overdueAmount > 0,
      overdueAmount,
    });

    return {
      ...loan,
      remainingPrincipal: Math.max(0, newRemaining),
      status: isFullyPaid ? "paid" : overdueAmount > 0 ? "overdue" : "active",
      overdueAmount: loan.overdueAmount + overdueAmount,
      nextPaymentDate,
    };
  });

  return { newState: { ...newState, loans: updatedLoans }, results };
}

export function takeLoan(
  state: GameState,
  params: {
    id: string;
    creditorName: string;
    principal: number;
    interestRate: number;
    paymentIntervalDays: number;
    installmentAmount: number;
  },
  todayAbsDay: number,
): GameState {
  const loan: GuildLoan = {
    id: params.id,
    creditorName: params.creditorName,
    principal: params.principal,
    remainingPrincipal: params.principal,
    interestRate: params.interestRate,
    issuedAt: state.currentDate,
    nextPaymentDate: absToGameDate(todayAbsDay + params.paymentIntervalDays),
    paymentIntervalDays: params.paymentIntervalDays,
    installmentAmount: params.installmentAmount,
    status: "active",
    overdueAmount: 0,
  };

  let newState = applyFinanceIncome(state, {
    type: "loan_received",
    amount: params.principal,
    description: `대출 실행 — ${params.creditorName}`,
    sourceType: "loan",
    sourceId: params.id,
  });

  return { ...newState, loans: [...newState.loans, loan] };
}

// ── Facility usage & revenue ──────────────────────────────────────────────────

const REVENUE_FACILITY_CONFIG: Record<string, { usageType: FacilityUsageType; txType: FinanceTransactionType; visitChance: number; maxVisitors: number; unitRevenue: number; operatingCostRate: number }> = {
  "facility-inn":        { usageType: "lodging",   txType: "lodging_revenue", visitChance: 0.70, maxVisitors: 5,  unitRevenue: 30, operatingCostRate: 0.30 },
  "facility-pub":        { usageType: "pub_visit",  txType: "pub_revenue",     visitChance: 0.60, maxVisitors: 10, unitRevenue: 12, operatingCostRate: 0.35 },
  "facility-restaurant": { usageType: "meal",       txType: "meal_revenue",    visitChance: 0.80, maxVisitors: 8,  unitRevenue: 15, operatingCostRate: 0.40 },
};

export interface FacilityUsageProcessResult {
  usageRecords: FacilityUsageRecord[];
}

export function processFacilityUsage(
  state: GameState,
  todayAbsDay: number,
): { newState: GameState; result: FacilityUsageProcessResult } {
  const newUsageRecords: FacilityUsageRecord[] = [];
  let newState = state;

  for (const [facilityId, cfg] of Object.entries(REVENUE_FACILITY_CONFIG)) {
    const facility = state.facilities[facilityId];
    if (!facility || facility.status !== "active" || facility.level === 0) continue;

    const opState = state.facilityOperationStates[facilityId];
    if (opState && opState.status !== "open") continue;

    // Duplicate prevention
    const dupId = `usage-${facilityId}-${todayAbsDay}`;
    if (state.facilityUsageRecords.some((r) => r.id === dupId)) continue;

    if (Math.random() >= cfg.visitChance) continue;

    const quantity = Math.max(1, Math.floor(Math.random() * cfg.maxVisitors) + 1);
    const grossRevenue = quantity * cfg.unitRevenue;
    const operatingCost = Math.ceil(grossRevenue * cfg.operatingCostRate);
    const netRevenue = grossRevenue - operatingCost;

    const record: FacilityUsageRecord = {
      id: dupId,
      facilityId,
      date: state.currentDate,
      usageType: cfg.usageType,
      quantity,
      unitRevenue: cfg.unitRevenue,
      grossRevenue,
      operatingCost,
      netRevenue,
    };
    newUsageRecords.push(record);

    if (grossRevenue > 0) {
      newState = applyFinanceIncome(newState, {
        type: cfg.txType,
        amount: grossRevenue,
        description: `${facility.name} 이용 수익 (${quantity}명)`,
        sourceType: "facility_usage",
        sourceId: dupId,
      });
    }
    if (operatingCost > 0) {
      newState = applyFinanceExpense(newState, {
        type: "facility_operating_cost",
        amount: operatingCost,
        description: `${facility.name} 운영비 (${quantity}명 이용)`,
        sourceType: "facility_usage_cost",
        sourceId: dupId,
      });
    }
  }

  const combined = [...newState.facilityUsageRecords, ...newUsageRecords];
  return {
    newState: { ...newState, facilityUsageRecords: combined.slice(-90) },
    result: { usageRecords: newUsageRecords },
  };
}

// ── Financial health ──────────────────────────────────────────────────────────

export function getFinancialHealth(state: GameState): GuildFinancialHealth {
  const gold = state.guild.gold;
  const dailyCost = calcDailyOperatingCost(state).totalCost;
  const hasOverdueLoans = state.loans.some((l) => l.status === "overdue");
  const totalDebt = state.loans
    .filter((l) => l.status !== "paid")
    .reduce((sum, l) => sum + l.remainingPrincipal, 0);
  const totalUnpaid =
    state.unpaidSalary + state.unpaidTax + state.guild.unpaidOperatingCost;

  if (hasOverdueLoans || gold < 0) return "critical";
  if (gold < dailyCost * 7 || totalUnpaid > dailyCost * 14) return "deficit";
  if (totalUnpaid > 0 || (totalDebt > 0 && totalDebt > gold * 2)) return "caution";
  return "stable";
}
