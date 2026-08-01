import { useState } from "react";
import type { AdventurerRank, EntityId, GameState } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { dangerLevelLabel, questCategoryLabels, questStageLabels, questStatusLabels, questTypeLabels } from "../../game/constants/labels";
import type { QuestEventCategory } from "../../types/game";

const EVENT_CATEGORY_LABELS: Record<QuestEventCategory, string> = {
  exploration: "탐색", combat: "전투", environment: "환경", reward: "보상", person: "인물", danger: "위험",
};
import { canAssignParty, isChallengeMode } from "../../game/simulation/quests";
import { calcPartyCombatPower, calcQuestSuccessRate, getQuestRecommendedPower } from "../../game/simulation/combatPower";

interface Props {
  questId: EntityId;
  state: GameState;
  onAssign: (partyId: EntityId) => void;
}

const RANK_ORDER: AdventurerRank[] = ["F", "E", "D", "C", "B", "A", "S"];

function formatGold(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n) + " G";
}

function expireText(days: number): string {
  if (days <= 0) return "기한 없음";
  if (days === 1) return "오늘 마감";
  return `${days}일 후 마감`;
}

export default function QuestDetail({ questId, state, onAssign }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const quest = state.quests[questId];
  if (!quest) return null;

  const region = state.regions[quest.regionId];
  const isDispatched = quest.status === "assigned" || quest.status === "in_progress";
  const isAvailable = quest.status === "available";
  const assignedParty = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;

  const availableParties = Object.values(state.parties)
    .filter((p) => p.status === "idle" && p.activeQuestId === null)
    .sort((a, b) => {
      const rankDiff = RANK_ORDER.indexOf(b.rank) - RANK_ORDER.indexOf(a.rank);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, "ko");
    });

  function handleOpenPicker() {
    playSelect();
    setShowPicker((v) => !v);
  }

  function handleAssign(partyId: EntityId) {
    playSelect();
    onAssign(partyId);
    setShowPicker(false);
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
            <div className="quest-info-item"><label>권장 전투력</label><span>{getQuestRecommendedPower(quest)}</span></div>
            <div className="quest-info-item"><label>접수 기한</label><span>{expireText(quest.expiresInDays)}</span></div>
            {isDispatched && quest.remainingDays > 0 && (
              <div className="quest-info-item"><label>남은 기간</label><span>{quest.remainingDays}일</span></div>
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

        {isDispatched && (() => {
          const prog = state.questProgress[quest.id];
          if (!prog) return null;
          const elapsed = prog.currentDay;
          const pct = quest.progress;
          return (
            <section className="quest-detail-section quest-progress-section">
              <p className="char-section-label">
                {!prog.reportRead && <span className="quest-new-dot">● </span>}
                진행 현황
              </p>
              <div className="quest-progress-info">
                <div className="quest-progress-stage-row">
                  <span className="quest-progress-stage-label">{questStageLabels[prog.currentStage]}</span>
                  <span className="quest-progress-days">{elapsed} / {prog.totalDays}일</span>
                </div>
                <div className="quest-progress-bar-wrap">
                  <div className="quest-progress-bar">
                    <div className="quest-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="quest-progress-pct">{pct}%</span>
                </div>
                <div className="quest-progress-remain">
                  예상 귀환 <strong>{quest.remainingDays}일 후</strong>
                </div>
                {prog.events.length > 0 ? (
                  <div className="quest-event-log">
                    <p className="quest-event-log-label">현장 보고</p>
                    {prog.events.slice().reverse().map((ev) => (
                      <div key={ev.eventId} className={`quest-event-item${!ev.read ? " unread" : ""}`}>
                        <div className="quest-event-item-header">
                          <span className="quest-event-category">{EVENT_CATEGORY_LABELS[ev.category]}</span>
                          <span className="quest-event-title">{!ev.read && <span className="quest-new-dot">● </span>}{ev.title}</span>
                        </div>
                        <p className="quest-event-desc">{ev.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="quest-progress-incident">
                    특이사항 <span className="quiet">없음</span>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        <section className="quest-assign-section">
          <p className="char-section-label">파티 배정</p>

          {isDispatched ? (
            <div className="quest-assigned-display">
              <span className="quiet">담당 파티</span>
              <strong className="quest-assigned-name">{assignedParty?.name ?? "—"}</strong>
            </div>
          ) : isAvailable ? (
            <>
              <button
                className={`quest-assign-btn${showPicker ? " active" : ""}`}
                onMouseEnter={playHover}
                onClick={handleOpenPicker}
              >
                {showPicker ? "▲ 닫기" : "▼ 파티 선택"}
              </button>

              {showPicker && (
                <div className="quest-party-picker">
                  {availableParties.length === 0 ? (
                    <p className="quest-party-none">대기 중인 파티가 없습니다.</p>
                  ) : (
                    availableParties.map((party) => {
                      const eligible = canAssignParty(party.rank, quest.grade);
                      const memberCount = party.memberIds.length;
                      const members = party.memberIds.map((id) => state.adventurers[id]).filter(Boolean);
                      const power = calcPartyCombatPower(party, members, state.classes);
                      const successRate = memberCount > 0 ? calcQuestSuccessRate(power, party.rank, quest) : null;
                      const challenge = isChallengeMode(party.rank, quest.grade);
                      return (
                        <div key={party.id} className={`quest-party-row${eligible ? "" : " ineligible"}`}>
                          <span className="rank">{party.rank}</span>
                          <div className="quest-party-row-info">
                            <span className="quest-party-row-name">{party.name}</span>
                            <span className="quest-party-row-meta">
                              {memberCount > 0 ? `${memberCount}명 · ⚔ ${power}` : "파티원 없음"}
                              {challenge && <span className="quest-challenge-badge"> · 도전</span>}
                              {!eligible && (
                                <span className="quest-party-rank-warn"> · 랭크 부족 (의뢰 {quest.grade}랭크)</span>
                              )}
                            </span>
                          </div>
                          {successRate !== null && eligible && (
                            <span className={`quest-success-rate ${successRate >= 70 ? "high" : successRate >= 45 ? "mid" : "low"}`}>
                              {successRate}%
                            </span>
                          )}
                          <button
                            className="member-action-btn"
                            disabled={!eligible || memberCount === 0}
                            onMouseEnter={playHover}
                            onClick={() => handleAssign(party.id)}
                          >
                            배정
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="quest-assign-status">이 의뢰는 현재 배정할 수 없습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}
