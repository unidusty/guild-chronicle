import type { GameState } from "../../types/game";
import { getFinanceSummary } from "../../game/simulation/finance";
import { formatShortGameDate } from "../../game/simulation/selectors";
import { financeTransactionTypeLabels } from "../../game/constants/labels";

interface Props {
  state: GameState;
}

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

export default function FinanceTab({ state }: Props) {
  const summary = getFinanceSummary(state);

  return (
    <div className="finance-tab">
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
