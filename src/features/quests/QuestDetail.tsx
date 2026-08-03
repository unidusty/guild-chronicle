import { useState } from "react";
import type { AdventureLogCategory, AdventureLogImportance, AdventurerRank, EntityId, GameState, QuestDecisionType, QuestEventCategory } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { formatGameDate } from "../../game/simulation/selectors";
import { dangerLevelLabel, questCategoryLabels, questStageLabels, questStatusLabels, questTypeLabels } from "../../game/constants/labels";
import { CHOICES_BY_CATEGORY, DECISION_LABELS } from "../../game/simulation/questDecisions";
import { calcCurrentDangerLevel, calcCurrentSuccessRate, getSupportStatus } from "../../game/simulation/questResult";
import { canAssignParty, isChallengeMode } from "../../game/simulation/quests";
import { calcPartyCombatPower, calcQuestSuccessRate, getQuestRecommendedPower } from "../../game/simulation/combatPower";

const EVENT_CATEGORY_LABELS: Record<QuestEventCategory, string> = {
  exploration: "탐색", combat: "전투", environment: "환경", reward: "보상", person: "인물", danger: "위험",
};

const ADV_LOG_CATEGORY_LABELS: Record<AdventureLogCategory, string> = {
  departure: "출발", travel: "이동", exploration: "탐사", combat: "전투", defense: "방어",
  healing: "치료", discovery: "발견", incident: "사건", decision: "결정", injury: "부상",
  growth: "성장", trait: "특성", relationship: "관계", teamwork: "팀워크", retreat: "철수",
  failure: "실패", death: "사망", return: "귀환", completion: "완료",
};

const ADV_LOG_IMPORTANCE_CLASS: Record<AdventureLogImportance, string> = {
  normal: "", notable: "notable", major: "major", historic: "historic",
};

const DECISION_DANGER: Set<QuestDecisionType> = new Set(["withdraw", "abandon"]);

interface Props {
  questId: EntityId;
  state: GameState;
  onAssign: (partyId: EntityId) => void;
  onDecide?: (eventId: EntityId, decision: QuestDecisionType, supportPartyId?: EntityId) => void;
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

export default function QuestDetail({ questId, state, onAssign, onDecide }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [supportPickerEventId, setSupportPickerEventId] = useState<EntityId | null>(null);

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
          {quest.issuer === "guild" && (
            <span className="guild-quest-badge">길드 발주</span>
          )}
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
                {prog.durationChanges.length > 0 && (() => {
                  const totalDelta = prog.currentEstimatedDays - prog.initialEstimatedDays;
                  const sign = totalDelta > 0 ? "+" : "";
                  const lastChange = prog.durationChanges[prog.durationChanges.length - 1];
                  return (
                    <div className="quest-duration-info">
                      <div className="qdi-row">
                        <span className="qdi-label">최초 예상</span>
                        <span className="qdi-value">{prog.initialEstimatedDays}일</span>
                      </div>
                      <div className="qdi-row">
                        <span className="qdi-label">현재 예상</span>
                        <span className={`qdi-value qdi-current${totalDelta > 0 ? " delayed" : totalDelta < 0 ? " shortened" : ""}`}>
                          {prog.currentEstimatedDays}일
                          <span className="qdi-delta">({sign}{totalDelta}일)</span>
                        </span>
                      </div>
                      <div className="qdi-row qdi-reason">
                        <span className="qdi-label">최근 변경</span>
                        <span className="qdi-value">{lastChange.reason}</span>
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const assignedParty = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;
                  if (!assignedParty) return null;
                  const sr = calcCurrentSuccessRate(assignedParty, quest, prog, state);
                  const dl = calcCurrentDangerLevel(quest, prog);
                  const support = getSupportStatus(prog);
                  return (
                    <div className="quest-success-prediction">
                      <div className="qsp-row">
                        <span className="qsp-label">예상 성공률</span>
                        <span className={`qsp-rate ${sr >= 70 ? "high" : sr >= 45 ? "mid" : "low"}`}>{sr}%</span>
                      </div>
                      <div className="qsp-row">
                        <span className="qsp-label">위험도</span>
                        <span className={`danger-level-${Math.max(1, Math.min(5, dl))}`}>{dangerLevelLabel(dl)}</span>
                      </div>
                      {support !== "none" && (
                        <div className="qsp-row">
                          <span className="qsp-label">지원 파티</span>
                          <span className={`qsp-support ${support}`}>
                            {support === "arrived" ? "합류 완료" : "도착 예정"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {prog.events.length > 0 ? (
                  <div className="quest-event-log">
                    <p className="quest-event-log-label">현장 보고</p>
                    {prog.events.slice().reverse().map((ev) => {
                      const choices = CHOICES_BY_CATEGORY[ev.category];
                      const idleParties = Object.values(state.parties).filter(
                        p => p.status === "idle" && p.activeQuestId === null && p.id !== prog.partyId
                      );
                      const existingDecision = prog.decisions.find(d => d.eventId === ev.eventId);
                      return (
                        <div key={ev.eventId} className={`quest-event-item${!ev.read ? " unread" : ""}`}>
                          <div className="quest-event-item-header">
                            <span className="quest-event-category">{EVENT_CATEGORY_LABELS[ev.category]}</span>
                            <span className="quest-event-title">{!ev.read && <span className="quest-new-dot">● </span>}{ev.title}</span>
                          </div>
                          <p className="quest-event-desc">{ev.description}</p>
                          {existingDecision ? (
                            <p className="quest-decision-result">
                              결정: <strong>{DECISION_LABELS[existingDecision.decision]}</strong>
                              {existingDecision.supportPartyId && (
                                <> · {state.parties[existingDecision.supportPartyId]?.name}</>
                              )}
                            </p>
                          ) : onDecide && (
                            <div className="quest-decision-area">
                              {choices.map((dc) => {
                                if (dc === "support_dispatch") {
                                  if (supportPickerEventId === ev.eventId) {
                                    return (
                                      <div key={dc} className="quest-support-picker">
                                        {idleParties.length === 0 ? (
                                          <span className="quiet">대기 파티 없음</span>
                                        ) : (
                                          idleParties.map(p => (
                                            <button
                                              key={p.id}
                                              className="quest-decision-btn"
                                              onMouseEnter={playHover}
                                              onClick={() => {
                                                playSelect();
                                                setSupportPickerEventId(null);
                                                onDecide(ev.eventId, "support_dispatch", p.id);
                                              }}
                                            >
                                              {p.name} 파견
                                            </button>
                                          ))
                                        )}
                                        <button
                                          className="quest-decision-btn"
                                          onMouseEnter={playHover}
                                          onClick={() => { playSelect(); setSupportPickerEventId(null); }}
                                        >
                                          취소
                                        </button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <button
                                      key={dc}
                                      className={`quest-decision-btn${idleParties.length === 0 ? " disabled" : ""}`}
                                      disabled={idleParties.length === 0}
                                      onMouseEnter={playHover}
                                      onClick={() => { playSelect(); setSupportPickerEventId(ev.eventId); }}
                                    >
                                      {DECISION_LABELS[dc]}
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    key={dc}
                                    className={`quest-decision-btn${DECISION_DANGER.has(dc) ? " danger" : ""}`}
                                    onMouseEnter={playHover}
                                    onClick={() => { playSelect(); onDecide(ev.eventId, dc); }}
                                  >
                                    {DECISION_LABELS[dc]}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

        {isDispatched && (() => {
          const logs = (state.adventureLogs ?? {})[quest.id] ?? [];
          if (logs.length === 0) return null;
          const displayLogs = logs.slice(-8).slice().reverse();
          return (
            <section className="quest-detail-section">
              <p className="char-section-label">모험 기록</p>
              <div className="adv-log-list">
                {displayLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`adv-log-entry adv-log-cat-${entry.category}${ADV_LOG_IMPORTANCE_CLASS[entry.importance] ? ` adv-log-${ADV_LOG_IMPORTANCE_CLASS[entry.importance]}` : ""}`}
                  >
                    <div className="adv-log-meta">
                      <span className="adv-log-day">{entry.questDay}일차</span>
                      <span className="adv-log-category">{ADV_LOG_CATEGORY_LABELS[entry.category]}</span>
                      <span className="adv-log-date">{formatGameDate(entry.date)}</span>
                    </div>
                    <div className="adv-log-narrative">
                      {entry.narrative.split("\n\n").map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                    {entry.actorIds.length > 0 && (() => {
                      const names = entry.actorIds
                        .map(id => state.adventurers[id]?.name)
                        .filter(Boolean)
                        .join(", ");
                      return names ? <span className="adv-log-actors">{names}</span> : null;
                    })()}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {isDispatched && (() => {
          const prog = state.questProgress[quest.id];
          if (!prog) return null;
          const supportDecisions = prog.decisions.filter(d => d.decision === "support_dispatch" && d.supportPartyId);
          if (supportDecisions.length === 0) return null;
          return (
            <section className="quest-detail-section">
              <p className="char-section-label">참여 파티</p>
              <div className="quest-party-roster">
                <div className="quest-party-roster-row">
                  <span className="quiet">주 파티</span>
                  <strong>{assignedParty?.name ?? "—"}</strong>
                </div>
                {supportDecisions.map(d => {
                  const sp = state.parties[d.supportPartyId!];
                  const elapsed = prog.currentDay - d.day;
                  const arrived = elapsed >= 2;
                  return (
                    <div key={d.decisionId} className="quest-party-roster-row">
                      <span className="quiet">지원 파티</span>
                      <strong>{sp?.name ?? "—"}</strong>
                      <span className={`qsp-support ${arrived ? "arrived" : "en_route"}`}>
                        {arrived ? "합류 완료" : "이동 중"}
                      </span>
                    </div>
                  );
                })}
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
