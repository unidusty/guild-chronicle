import type { EntityId, GameState, QuestDecisionType } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { questStageLabels } from "../../game/constants/labels";
import {
  calcCurrentSuccessRate,
  getSupportStatus,
} from "../../game/simulation/questResult";
import QuestDetail from "./QuestDetail";

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  state: GameState;
  selectedId: EntityId | null;
  onSelect: (id: EntityId | null) => void;
  onDecide: (
    eventId: EntityId,
    decision: QuestDecisionType,
    supportPartyId?: EntityId,
  ) => void;
}

export default function ActiveQuestsTab({
  state,
  selectedId,
  onSelect,
  onDecide,
}: Props) {
  const activeQuests = Object.values(state.quests).filter(
    (q) => q.status === "assigned" || q.status === "in_progress",
  );

  // Sort: needs-decision first, then by remaining days ascending
  const sorted = [...activeQuests].sort((a, b) => {
    const progA = state.questProgress[a.id];
    const progB = state.questProgress[b.id];
    const needsA = progA?.events.some((e) => !e.read) ? 1 : 0;
    const needsB = progB?.events.some((e) => !e.read) ? 1 : 0;
    if (needsB !== needsA) return needsB - needsA;
    return a.remainingDays - b.remainingDays;
  });

  function handleRowClick(id: EntityId) {
    playSelect();
    onSelect(selectedId === id ? null : id);
  }

  return (
    <div className="qb-active">
      {/* ── Left: list column ── */}
      <div className="qb-active-list">
        {sorted.length === 0 ? (
          <div className="qb-empty">
            <p>현재 수행 중인 의뢰가 없습니다.</p>
          </div>
        ) : (
          sorted.map((quest) => {
            const prog = state.questProgress[quest.id];
            const party = quest.assignedPartyId
              ? state.parties[quest.assignedPartyId]
              : null;

            const needsDecision = prog?.events.some((e) => !e.read) ?? false;
            const hasIncident = prog?.hasIncident ?? false;
            const isSelected = quest.id === selectedId;

            const supportStatus = prog ? getSupportStatus(prog) : "none";
            const supportEnRoute = supportStatus === "en_route";
            const supportArrived = supportStatus === "arrived";

            const successRate =
              party && prog
                ? calcCurrentSuccessRate(party, quest, prog, state)
                : null;

            const progressPct =
              prog && prog.totalDays > 0
                ? Math.min(100, Math.round((prog.currentDay / prog.totalDays) * 100))
                : quest.progress;

            const rateClass =
              successRate === null
                ? ""
                : successRate >= 70
                ? " high"
                : successRate >= 45
                ? " mid"
                : " low";

            return (
              <button
                key={quest.id}
                className={[
                  "aq-row",
                  isSelected ? "selected" : "",
                  needsDecision ? "needs-decision" : "",
                  hasIncident && !needsDecision ? "has-incident" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={playHover}
                onClick={() => handleRowClick(quest.id)}
              >
                {/* Grade badge */}
                <div className={`aq-grade rank-${quest.grade}`}>
                  {quest.grade}
                </div>

                {/* Main content */}
                <div className="aq-main">
                  <div className="aq-title">{quest.title}</div>

                  <div className="aq-meta">
                    <span className="aq-party-name">
                      {party
                        ? `${party.name} · ${party.memberIds.length}명`
                        : "파티 미배정"}
                    </span>
                    {prog && (
                      <span className="aq-stage">
                        {questStageLabels[prog.currentStage]}
                      </span>
                    )}
                  </div>

                  {prog && (
                    <>
                      <div className="aq-progress-label">
                        {prog.currentDay} / {prog.totalDays}일
                      </div>
                      <div className="aq-progress">
                        <div
                          className="aq-progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </>
                  )}

                  {/* Badges */}
                  <div className="aq-badges">
                    {needsDecision && (
                      <span className="aq-badge decision">결정 필요</span>
                    )}
                    {!needsDecision && hasIncident && (
                      <span className="aq-badge incident">보고</span>
                    )}
                    {supportEnRoute && (
                      <span className="aq-badge support">지원 이동 중</span>
                    )}
                    {supportArrived && (
                      <span className="aq-badge support-arrived">
                        지원 합류
                      </span>
                    )}
                  </div>

                  {/* Footer: success rate + remaining days + duration delta */}
                  <div className="aq-footer">
                    {successRate !== null && (
                      <span className={`aq-rate${rateClass}`}>
                        성공률 {successRate}%
                      </span>
                    )}
                    <span className="aq-remaining">
                      {quest.remainingDays > 0
                        ? `${quest.remainingDays}일 후 귀환`
                        : "귀환 대기"}
                    </span>
                    {prog && prog.durationChanges.length > 0 && (() => {
                      const delta = prog.currentEstimatedDays - prog.initialEstimatedDays;
                      if (delta === 0) return null;
                      const sign = delta > 0 ? "+" : "";
                      return (
                        <span className={`aq-duration-delta${delta > 0 ? " delayed" : " shortened"}`}>
                          {sign}{delta}일
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ── Right: detail panel ── */}
      <div className="qb-active-detail">
        {selectedId ? (
          <QuestDetail
            key={selectedId}
            questId={selectedId}
            state={state}
            onAssign={() => undefined}
            onDecide={onDecide}
          />
        ) : (
          <div className="qb-empty qb-empty-detail">
            <p>의뢰를 선택하면 상세 정보를 확인할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
