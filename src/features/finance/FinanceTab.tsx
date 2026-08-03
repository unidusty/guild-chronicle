import type { GameState } from "../../types/game";
import { getFinanceSummary } from "../../game/simulation/finance";
import { calcDailyOperatingCost } from "../../game/simulation/operatingCost";
import { getFinancialHealth, calcGuildTax, PAYROLL_INTERVAL_DAYS, TAX_INTERVAL_DAYS, getActiveStaff } from "../../game/simulation/economy";
import { formatShortGameDate } from "../../game/simulation/selectors";
import { financeTransactionTypeLabels } from "../../game/constants/labels";

interface Props {
  state: GameState;
}

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

const HEALTH_LABELS: Record<string, { label: string; className: string }> = {
  stable:   { label: "안정",     className: "fh-stable" },
  caution:  { label: "주의",     className: "fh-caution" },
  deficit:  { label: "적자",     className: "fh-deficit" },
  critical: { label: "위기",     className: "fh-critical" },
};

export default function FinanceTab({ state }: Props) {
  const summary = getFinanceSummary(state);
  const todayOpCost = calcDailyOperatingCost(state);
  const health = getFinancialHealth(state);
  const healthMeta = HEALTH_LABELS[health];

  const hasUnpaid = state.guild.unpaidOperatingCost > 0;
  const hasUnpaidSalary = state.unpaidSalary > 0;
  const hasUnpaidTax = state.unpaidTax > 0;
  const activeLoans = state.loans.filter((l) => l.status !== "paid");
  const activeStaff = getActiveStaff(state);
  const nextSalary = activeStaff.reduce((sum, s) => sum + s.salaryPerPeriod, 0);
  const nextTax = calcGuildTax(state);

  const todayUsageRecords = state.facilityUsageRecords.filter(
    (r) =>
      r.date.year === state.currentDate.year &&
      r.date.season === state.currentDate.season &&
      r.date.day === state.currentDate.day,
  );

  return (
    <div className="finance-tab">

      {/* Financial health */}
      <div className="fh-row">
        <span className="fh-label">재정 건강</span>
        <span className={`fh-badge ${healthMeta.className}`}>{healthMeta.label}</span>
        {health === "caution" && <span className="fh-note">미납 금액이 있습니다.</span>}
        {health === "deficit" && <span className="fh-note">운영 자금이 위험 수준입니다.</span>}
        {health === "critical" && <span className="fh-note">대출 연체 또는 잔액 부족 — 즉각 조치 필요.</span>}
      </div>

      {/* Unpaid warnings */}
      {hasUnpaid && (
        <div className="finance-unpaid-banner">
          <span className="finance-unpaid-icon">⚠</span>
          <span>운영비 미납 <strong>{fmt(state.guild.unpaidOperatingCost)} G</strong> 누적</span>
        </div>
      )}
      {hasUnpaidSalary && (
        <div className="finance-unpaid-banner">
          <span className="finance-unpaid-icon">⚠</span>
          <span>급여 미지급 <strong>{fmt(state.unpaidSalary)} G</strong> 누적</span>
        </div>
      )}
      {hasUnpaidTax && (
        <div className="finance-unpaid-banner">
          <span className="finance-unpaid-icon">⚠</span>
          <span>세금 미납 <strong>{fmt(state.unpaidTax)} G</strong> 누적</span>
        </div>
      )}
      {activeLoans.some((l) => l.status === "overdue") && (
        <div className="finance-unpaid-banner critical">
          <span className="finance-unpaid-icon">⚠</span>
          <span>대출 연체 중 — 채권자에게 확인하십시오.</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="finance-summary-grid">
        <article className="finance-card gold">
          <span>보유 골드</span>
          <strong>{fmt(summary.currentGold)} G</strong>
        </article>
        <article className={`finance-card ${summary.todayNet >= 0 ? "green" : "red"}`}>
          <span>오늘 순익</span>
          <strong>{summary.todayNet >= 0 ? "+" : ""}{fmt(summary.todayNet)} G</strong>
          <small>수입 {fmt(summary.todayIncome)} · 지출 {fmt(summary.todayExpense)}</small>
        </article>
        <article className="finance-card green">
          <span>누적 수입</span>
          <strong>{fmt(summary.totalIncome)} G</strong>
        </article>
        <article className="finance-card red">
          <span>누적 지출</span>
          <strong>{fmt(summary.totalExpense)} G</strong>
        </article>
      </div>

      {/* Daily operating cost */}
      <section className="finance-opcost">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">DAILY OPERATIONS</p>
            <h2>오늘의 운영비</h2>
          </div>
          <span className="finance-opcost-total">{fmt(todayOpCost.totalCost)} G</span>
        </div>
        <div className="finance-opcost-rows">
          <div className="finance-opcost-row">
            <span>길드 기본 운영비</span>
            <span>{fmt(todayOpCost.baseOperatingCost)} G</span>
          </div>
          {todayOpCost.facilityMaintenanceEntries.map((e) => (
            <div key={e.facilityId} className="finance-opcost-row">
              <span>{e.facilityName} Lv{e.level} 유지비</span>
              <span>{fmt(e.cost)} G</span>
            </div>
          ))}
        </div>
      </section>

      {/* Staff payroll */}
      <section className="finance-opcost">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PAYROLL</p>
            <h2>직원 급여</h2>
          </div>
          <span className="finance-opcost-total">{fmt(nextSalary)} G <small className="quiet">/ {PAYROLL_INTERVAL_DAYS}일</small></span>
        </div>
        {activeStaff.length === 0 ? (
          <p className="panel-empty">재직 중인 직원이 없습니다.</p>
        ) : (
          <div className="finance-opcost-rows">
            {activeStaff.map((s) => (
              <div key={s.id} className="finance-opcost-row">
                <span>{s.name}</span>
                <span>{fmt(s.salaryPerPeriod)} G</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tax & loans */}
      <section className="finance-opcost">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">OBLIGATIONS</p>
            <h2>세금 · 부채</h2>
          </div>
        </div>
        <div className="finance-opcost-rows">
          <div className="finance-opcost-row">
            <span>정기 세금 ({TAX_INTERVAL_DAYS}일 주기)</span>
            <span>{fmt(nextTax)} G</span>
          </div>
          {hasUnpaidTax && (
            <div className="finance-opcost-row finance-row-warning">
              <span>세금 미납 누적</span>
              <span>{fmt(state.unpaidTax)} G</span>
            </div>
          )}
        </div>
        {activeLoans.length > 0 && (
          <div className="finance-loan-list">
            {activeLoans.map((loan) => (
              <div key={loan.id} className={`finance-loan-item${loan.status === "overdue" ? " overdue" : ""}`}>
                <div className="finance-loan-header">
                  <span className="finance-loan-creditor">{loan.creditorName}</span>
                  <span className={`finance-loan-status finance-loan-${loan.status}`}>
                    {loan.status === "active" ? "상환 중" : loan.status === "overdue" ? "연체" : "완료"}
                  </span>
                </div>
                <div className="finance-loan-details">
                  <span>잔여 원금 <strong>{fmt(loan.remainingPrincipal)} G</strong></span>
                  <span>이자율 {(loan.interestRate * 100).toFixed(1)}%</span>
                  <span>다음 상환일 {formatShortGameDate(loan.nextPaymentDate)}</span>
                </div>
                {loan.overdueAmount > 0 && (
                  <div className="finance-loan-overdue-amount">연체 금액 {fmt(loan.overdueAmount)} G</div>
                )}
              </div>
            ))}
          </div>
        )}
        {activeLoans.length === 0 && (
          <p className="panel-empty">현재 대출 없음</p>
        )}
      </section>

      {/* Facility P&L (today) */}
      {todayUsageRecords.length > 0 && (
        <section className="finance-opcost">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">FACILITY REVENUE</p>
              <h2>시설 오늘 손익</h2>
            </div>
            <span className="finance-opcost-total">
              +{fmt(todayUsageRecords.reduce((s, r) => s + r.netRevenue, 0))} G
            </span>
          </div>
          <div className="finance-opcost-rows">
            {todayUsageRecords.map((r) => {
              const facility = state.facilities[r.facilityId];
              return (
                <div key={r.id} className="finance-opcost-row">
                  <span>{facility?.name ?? r.facilityId} ({r.quantity}명)</span>
                  <span>+{fmt(r.netRevenue)} G</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Transaction ledger */}
      <section className="finance-ledger">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">TRANSACTION LEDGER</p>
            <h2>거래 내역</h2>
          </div>
          <span className="quiet">{state.financeTransactions.length}건</span>
        </div>

        {summary.recentTransactions.length === 0 ? (
          <p className="panel-empty">거래 내역이 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>내용</th>
                  <th>분류</th>
                  <th className="text-right">금액</th>
                  <th className="text-right">잔액</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentTransactions.map((tx) => (
                  <tr key={tx.id} className={`finance-row ${tx.direction}`}>
                    <td className="finance-date">{formatShortGameDate(tx.date)}</td>
                    <td className="finance-desc">{tx.description}</td>
                    <td className="finance-type">{financeTransactionTypeLabels[tx.type]}</td>
                    <td className={`finance-amount text-right ${tx.direction}`}>
                      {tx.direction === "income" ? "+" : "−"}{fmt(tx.amount)} G
                    </td>
                    <td className="finance-balance text-right">{fmt(tx.balanceAfter)} G</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
