import type { GameState, GuildQuestDraft } from "../../types/game";
import { questCategoryLabels, dangerLevelLabel } from "../../game/constants/labels";
import { playSelect } from "../../lib/audio";

const NEED_LABELS: Record<string, string> = {
  low_gold:               "자금 부족",
  dangerous_world_event:  "위협 증가",
  periodic_exploration:   "정기 탐사",
};

interface Props {
  draft: GuildQuestDraft;
  state: GameState;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function GuildQuestDraftModal({ draft, state, onApprove, onReject, onClose }: Props) {
  const region = state.regions[draft.regionId];
  const canAfford = state.guild.gold >= draft.estimatedCost;
  const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

  return (
    <div className="gqd-overlay" onClick={onClose}>
      <div className="gqd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gqd-header">
          <span className="gqd-badge">길드 발주 초안</span>
          <span className="gqd-need-label">{NEED_LABELS[draft.needType] ?? draft.needType}</span>
          <h2 className="gqd-title">{draft.questTitle}</h2>
        </div>

        <div className="gqd-section">
          <p className="gqd-label">발주 사유</p>
          <p className="gqd-reason">{draft.reason}</p>
        </div>

        <div className="gqd-section">
          <p className="gqd-label">기대 성과</p>
          <p className="gqd-text">{draft.expectedReward}</p>
        </div>

        <div className="gqd-section">
          <p className="gqd-label">의뢰 정보</p>
          <div className="gqd-info-grid">
            <div className="gqd-info-row">
              <span className="gqd-info-key">분류</span>
              <span className="gqd-info-val">{questCategoryLabels[draft.questCategory]}</span>
            </div>
            <div className="gqd-info-row">
              <span className="gqd-info-key">등급</span>
              <span className={`gqd-info-val rank rank-${draft.questGrade}`}>{draft.questGrade}</span>
            </div>
            <div className="gqd-info-row">
              <span className="gqd-info-key">지역</span>
              <span className="gqd-info-val">{region?.name ?? "—"}</span>
            </div>
            <div className="gqd-info-row">
              <span className="gqd-info-key">기간</span>
              <span className="gqd-info-val">{draft.durationDays}일</span>
            </div>
            <div className="gqd-info-row">
              <span className="gqd-info-key">위험도</span>
              <span className={`gqd-info-val danger-level-${Math.max(1, Math.min(5, draft.dangerLevel))}`}>
                {dangerLevelLabel(draft.dangerLevel)}
              </span>
            </div>
            <div className="gqd-info-row">
              <span className="gqd-info-key">권장 인원</span>
              <span className="gqd-info-val">{draft.recommendedPartySize}명</span>
            </div>
            <div className="gqd-info-row">
              <span className="gqd-info-key">길드 지출</span>
              <span className={`gqd-info-val${canAfford ? "" : " gqd-warn-text"}`}>
                {fmt(draft.estimatedCost)} G
              </span>
            </div>
          </div>
        </div>

        {!canAfford && (
          <p className="gqd-warn-banner">
            자금 부족 — 현재 {fmt(state.guild.gold)}G · 필요 {fmt(draft.estimatedCost)}G
          </p>
        )}

        <div className="gqd-actions">
          <button
            className="gqd-btn-reject"
            onClick={() => { playSelect(); onReject(); }}
          >
            거절
          </button>
          <button
            className="gqd-btn-approve"
            disabled={!canAfford}
            onClick={() => { playSelect(); onApprove(); }}
          >
            승인
          </button>
        </div>
      </div>
    </div>
  );
}
