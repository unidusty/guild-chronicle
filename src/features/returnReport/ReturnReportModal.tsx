import { useState } from "react";
import type { GameState, ReturnReport } from "../../types/game";
import { calcSettlement, finalizeSettlement } from "../../game/simulation/returnReport";
import { questResultGradeLabels, questCategoryLabels } from "../../game/constants/labels";
import { playSelect } from "../../lib/audio";

interface Props {
  report: ReturnReport;
  state: GameState;
  onClose: () => void;
  onSettle: (newState: GameState) => void;
}

export default function ReturnReportModal({ report, state, onClose, onSettle }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleItem(itemId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  const settlement = calcSettlement(report, [...selectedIds]);
  const canAfford = state.guild.gold + settlement.guildFeeGold >= settlement.lootPurchaseTotal;

  function handleSettle() {
    if (!canAfford) return;
    playSelect();
    const newState = finalizeSettlement(state, report.id, [...selectedIds]);
    onSettle(newState);
  }

  const resultLabel = questResultGradeLabels[report.resultGrade];
  const categoryLabel = questCategoryLabels[report.questCategory];

  return (
    <div className="rrm-overlay" onClick={onClose}>
      <div className="rrm-modal" onClick={e => e.stopPropagation()}>
        <header className="rrm-header">
          <div>
            <p className="eyebrow">RETURN REPORT</p>
            <h2>{report.questTitle}</h2>
          </div>
          <button className="detail-close" onClick={onClose}>×</button>
        </header>

        <div className="rrm-body">
          {/* Quest summary */}
          <section className="rrm-section">
            <div className="rrm-meta-row">
              <span className="rrm-meta-item">
                <label>파티</label>
                <strong>{report.partyNameSnapshot}</strong>
              </span>
              <span className="rrm-meta-item">
                <label>분류</label>
                <strong>{categoryLabel} · {report.questGrade}등급</strong>
              </span>
              <span className="rrm-meta-item">
                <label>기간</label>
                <strong>{report.durationDays}일</strong>
              </span>
              <span className="rrm-meta-item">
                <label>결과</label>
                <strong className={`rrm-result ${report.resultGrade}`}>{resultLabel}</strong>
              </span>
            </div>
          </section>

          {/* Settlement breakdown */}
          <section className="rrm-section">
            <p className="char-section-label">보수 정산</p>
            <div className="rrm-settlement">
              <div className="rrm-settlement-row">
                <span>총 보수</span>
                <span>{report.totalRewardGold.toLocaleString("ko-KR")} G</span>
              </div>
              <div className="rrm-settlement-row deduction">
                <span>길드 수수료 (10%)</span>
                <span>+{report.guildFeeGold.toLocaleString("ko-KR")} G</span>
              </div>
              <div className="rrm-settlement-row sub">
                <span>파티 지급액</span>
                <span>{report.partyPaymentGold.toLocaleString("ko-KR")} G</span>
              </div>
            </div>
          </section>

          {/* Loot */}
          {report.loot.length > 0 && (
            <section className="rrm-section">
              <p className="char-section-label">전리품 매입 (선택)</p>
              <div className="rrm-loot-list">
                {report.loot.map(entry => {
                  const checked = selectedIds.has(entry.itemId);
                  const purchaseTotal = entry.purchaseUnitValue * entry.quantity;
                  return (
                    <label key={entry.itemId} className={`rrm-loot-item${checked ? " checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(entry.itemId)}
                      />
                      <span className="rrm-loot-name">{entry.itemName}</span>
                      <span className="rrm-loot-qty">×{entry.quantity}</span>
                      <span className="rrm-loot-val">
                        {purchaseTotal.toLocaleString("ko-KR")} G
                        <small className="rrm-loot-market">시장가 {(entry.unitValue * entry.quantity).toLocaleString("ko-KR")} G</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <footer className="rrm-footer">
          <div className="rrm-net">
            <span>길드 순수입</span>
            <strong className={settlement.netGuildGoldChange >= 0 ? "positive" : "negative"}>
              {settlement.netGuildGoldChange >= 0 ? "+" : ""}
              {settlement.netGuildGoldChange.toLocaleString("ko-KR")} G
            </strong>
          </div>
          <div className="rrm-footer-actions">
            <button className="rrm-cancel" onClick={onClose}>취소</button>
            <button className="rrm-confirm" onClick={handleSettle} disabled={!canAfford}>
              {canAfford ? "정산 완료" : "골드 부족"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
