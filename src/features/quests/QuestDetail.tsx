import { useState } from "react";
import type { EntityId, GameState } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { dangerLevelLabel, questCategoryLabels, questStatusLabels, questTypeLabels } from "../../game/constants/labels";

interface Props {
  questId: EntityId;
  state: GameState;
}

function formatGold(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n) + " G";
}

function expireText(days: number): string {
  if (days <= 0) return "기한 없음";
  if (days === 1) return "오늘 마감";
  return `${days}일 후 마감`;
}

export default function QuestDetail({ questId, state }: Props) {
  const [showNotice, setShowNotice] = useState(false);

  const quest = state.quests[questId];
  if (!quest) return null;

  const region = state.regions[quest.regionId];
  const isDispatched = quest.status === "assigned" || quest.status === "in_progress";
  const isAvailable = quest.status === "available";

  function handleAssign() {
    playSelect();
    setShowNotice(true);
  }

  const dangerClass = `danger-level-${Math.max(1, Math.min(5, quest.dangerLevel))}`;

  return (
    <div className="panel quest-detail">
      <div className="quest-detail-header">
        <div className="quest-detail-title-block">
          <span className="rank quest-rank">{quest.grade}</span>
          <h2 className="quest-detail-title">{quest.title}</h2>
        </div>
        <span className={`status ${isDispatched ? "active" : "idle"}`}>{questStatusLabels[quest.status]}</span>
      </div>

      <div className="quest-detail-body">
        <section className="quest-detail-section">
          <div className="quest-type-row">
            <span className={`quest-type-badge-lg ${quest.questType}`}>
              {questTypeLabels[quest.questType]}
            </span>
            <span className="quest-category-label">{questCategoryLabels[quest.type]}</span>
            {quest.questType === "raid" && (
              <span className="quest-raid-notice">공격대 필요</span>
            )}
          </div>
        </section>

        <section className="quest-detail-section">
          <p className="char-section-label">의뢰 정보</p>
          <div className="quest-info-grid">
            <div className="quest-info-item"><label>의뢰인</label><span>{quest.clientName}</span></div>
            <div className="quest-info-item"><label>지역</label><span>{region?.name ?? "—"}</span></div>
            <div className="quest-info-item"><label>보상</label><span className="quest-reward-value">{formatGold(quest.rewardGold)}</span></div>
            <div className="quest-info-item"><label>소요 기간</label><span>{quest.durationDays}일</span></div>
            <div className="quest-info-item"><label>위험도</label><span className={dangerClass}>{dangerLevelLabel(quest.dangerLevel)}</span></div>
            <div className="quest-info-item"><label>권장 인원</label><span>{quest.recommendedPartySize}명</span></div>
            <div className="quest-info-item"><label>접수 기한</label><span>{expireText(quest.expiresInDays)}</span></div>
            {isDispatched && quest.remainingDays > 0 && (
              <div className="quest-info-item"><label>남은 일수</label><span>{quest.remainingDays}일</span></div>
            )}
          </div>
        </section>

        <section className="quest-detail-section">
          <p className="char-section-label">의뢰 내용</p>
          <p className="quest-description">{quest.description}</p>
        </section>

        {quest.riskTags.length > 0 && (
          <section className="quest-detail-section">
            <p className="char-section-label">위험 요소</p>
            <div className="quest-risk-tags">
              {quest.riskTags.map((tag) => (
                <span key={tag} className="quest-risk-tag">{tag}</span>
              ))}
            </div>
          </section>
        )}

        <section className="quest-assign-section">
          <p className="char-section-label">파티 배정</p>
          {isDispatched ? (
            <p className="quest-assign-status">현재 수행 중인 의뢰입니다.</p>
          ) : (
            <>
              <button
                className="quest-assign-btn"
                onMouseEnter={playHover}
                onClick={handleAssign}
                disabled={!isAvailable}
              >
                파티 배정
              </button>
              {showNotice && (
                <p className="quest-assign-notice">파티 배정 기능은 013-B에서 추가됩니다.</p>
              )}
              {!isAvailable && !isDispatched && (
                <p className="quest-assign-notice">이 의뢰는 현재 배정할 수 없습니다.</p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
