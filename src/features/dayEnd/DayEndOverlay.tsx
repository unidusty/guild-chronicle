import { useState } from "react";
import type { DailyReport, GameState } from "../../types/game";
import { processDayEnd } from "../../game/simulation/dayEnd";
import { formatGameDate } from "../../game/simulation/selectors";
import { playSelect } from "../../lib/audio";

type Phase = "confirm" | "report";

interface Props {
  state: GameState;
  onComplete: (newState: GameState) => void;
  onCancel: () => void;
}

export default function DayEndOverlay({ state, onComplete, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [result, setResult] = useState<{ newState: GameState; report: DailyReport } | null>(null);

  const activeQuestCount = Object.values(state.quests).filter(
    (q) => q.status === "assigned",
  ).length;
  const constructingCount = Object.values(state.facilities).filter(
    (f) => f.status === "constructing" || f.status === "upgrading",
  ).length;

  function handleConfirm() {
    playSelect();
    const r = processDayEnd(state);
    setResult(r);
    setPhase("report");
  }

  function handleComplete() {
    playSelect();
    if (result) onComplete(result.newState);
  }

  if (phase === "confirm") {
    return (
      <div className="day-end-overlay dim">
        <div className="day-end-confirm">
          <p className="day-end-confirm-eyebrow">WESTWIND GUILD</p>
          <h2 className="day-end-confirm-title">오늘 업무를 종료합니까?</h2>
          <div className="day-end-confirm-summary">
            <div className="day-end-confirm-row">
              <span>진행 중인 의뢰</span>
              <strong>{activeQuestCount}건</strong>
            </div>
            <div className="day-end-confirm-row">
              <span>공사 중인 시설</span>
              <strong>{constructingCount}개</strong>
            </div>
          </div>
          <div className="day-end-confirm-actions">
            <button className="day-end-cancel-btn" onClick={onCancel}>
              취소
            </button>
            <button className="day-end-ok-btn primary" onClick={handleConfirm}>
              업무 종료
            </button>
          </div>
        </div>
      </div>
    );
  }

  const report = result!.report;
  return (
    <div className="day-end-overlay dark">
      <div className="day-end-report">
        <p className="day-end-report-eyebrow">일일 업무 보고</p>
        <h2 className="day-end-report-date">{formatGameDate(report.previousDate)}</h2>

        <div className="day-end-report-items">
          {report.items.length === 0 ? (
            <p className="day-end-report-empty">오늘은 특이 사항이 없었습니다.</p>
          ) : (
            report.items.map((item, i) => (
              <div
                key={i}
                className={`day-end-report-item ${item.kind}`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
            ))
          )}
        </div>

        <div className="day-end-report-footer">
          <div className="day-end-next-date-block">
            <span className="day-end-next-label">다음 날</span>
            <strong className="day-end-next-date">{formatGameDate(report.nextDate)}</strong>
          </div>
          <button className="day-end-ok-btn primary" onClick={handleComplete}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
