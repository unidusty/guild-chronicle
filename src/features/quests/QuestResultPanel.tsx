import type { GameDate, GameState, QuestCompletionResult } from "../../types/game";
import { playSelect } from "../../lib/audio";
import { seasonLabels } from "../../game/constants/labels";

interface Props {
  results: QuestCompletionResult[];
  state: GameState;
  onDismiss: () => void;
}

function formatDate(d: GameDate): string {
  return `왕국력 ${d.year}년 ${seasonLabels[d.season]} ${d.day}일`;
}

function formatGold(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n) + " G";
}

export default function QuestResultPanel({ results, state, onDismiss }: Props) {
  function handleDismiss() {
    playSelect();
    onDismiss();
  }

  return (
    <div className="result-overlay" onClick={handleDismiss}>
      <div className="result-modal" onClick={(e) => e.stopPropagation()}>
        <div className="result-modal-head">
          <p className="eyebrow">QUEST COMPLETE</p>
          <h2 className="result-modal-title">의뢰 완료</h2>
        </div>

        <div className="result-list">
          {results.map((r) => {
            const adventurerNames = r.adventurerIds
              .map((id) => state.adventurers[id]?.name)
              .filter((n): n is string => Boolean(n));
            return (
              <div key={r.questId} className="result-card">
                <div className="result-card-header">
                  <span className="rank">{r.grade}</span>
                  <span className="result-card-title">{r.questTitle}</span>
                  <span className="status idle">완료</span>
                </div>
                <div className="result-card-body">
                  <div className="result-info-row">
                    <label>파티</label>
                    <span>{r.partyName}</span>
                  </div>
                  <div className="result-info-row">
                    <label>참가자</label>
                    <span>{adventurerNames.length > 0 ? adventurerNames.join(", ") : "—"}</span>
                  </div>
                  <div className="result-info-row">
                    <label>소요 기간</label>
                    <span>{r.durationDays}일</span>
                  </div>
                  <div className="result-info-row">
                    <label>완료일</label>
                    <span>{formatDate(r.completedAt)}</span>
                  </div>
                  <div className="result-info-row">
                    <label>의뢰 보상</label>
                    <span className="result-reward">{formatGold(r.rewardGold)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn-primary result-confirm-btn" onClick={handleDismiss}>
          확인
        </button>
      </div>
    </div>
  );
}
