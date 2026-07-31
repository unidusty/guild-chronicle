import type { EntityId, GameState } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { adventurerStatusLabels, getStatusTone, partyStatusLabels } from "../../game/constants/labels";

interface Props {
  partyId: EntityId;
  state: GameState;
  onClose: () => void;
}

export default function PartyDetail({ partyId, state, onClose }: Props) {
  const party = state.parties[partyId];
  if (!party) return null;

  const members = party.memberIds
    .map((id) => state.adventurers[id])
    .filter(Boolean);
  const quest = party.activeQuestId ? state.quests[party.activeQuestId] : null;
  const statusTone =
    party.status === "dispatched" || party.status === "returning" ? "active" : "idle";

  return (
    <div className="panel party-detail">
      <button
        className="detail-close"
        onMouseEnter={playHover}
        onClick={() => { playSelect(); onClose(); }}
      >
        ✕
      </button>

      <div className="party-detail-header">
        <div className="party-detail-title">
          <span className="rank party-rank">{party.rank}</span>
          <h2 className="party-name-heading">{party.name}</h2>
        </div>
        <span className={`status ${statusTone}`}>{partyStatusLabels[party.status]}</span>
      </div>

      <div className="party-detail-body">
        <section className="party-members-section">
          <p className="char-section-label">파티원 · {members.length}명</p>
          {members.length === 0 ? (
            <p className="info-empty">파티원 없음</p>
          ) : (
            <div className="party-member-list">
              {members.map((m) => {
                const isLeader = m.id === party.leaderId;
                const initials = m.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
                const tone = getStatusTone(m);
                const cls = state.classes[m.classId];
                return (
                  <div key={m.id} className={`party-member-row${isLeader ? " is-leader" : ""}`}>
                    <div className="portrait portrait-md">
                      {m.portrait ? <img src={m.portrait} alt={m.name} /> : initials}
                    </div>
                    <div className="party-member-info">
                      <div className="party-member-name-row">
                        <strong>{m.name}</strong>
                        {isLeader && <span className="leader-badge">리더</span>}
                      </div>
                      <span className="quiet">{cls?.name ?? "미정"} · {m.rank}등급</span>
                    </div>
                    <span className={`status ${tone}`}>{adventurerStatusLabels[m.status]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="party-quest-section">
          <p className="char-section-label">진행 중 의뢰</p>
          {quest ? (
            <div className="info-card">
              <div className="info-rows">
                <div className="info-row">
                  <label>의뢰명</label>
                  <span>{quest.title}</span>
                </div>
                <div className="info-row">
                  <label>등급</label>
                  <span className="rank">{quest.grade}</span>
                </div>
                <div className="info-row">
                  <label>남은 일수</label>
                  <span>{quest.remainingDays}일</span>
                </div>
                <div className="info-row">
                  <label>진행률</label>
                  <span>{quest.progress}%</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="info-empty">현재 의뢰 없음</p>
          )}
        </section>

        <section className="party-meta-section">
          <p className="char-section-label">파티 정보</p>
          <div className="info-card">
            <div className="info-rows">
              <div className="info-row">
                <label>파티 등급</label>
                <span className="rank">{party.rank}</span>
              </div>
              <div className="info-row">
                <label>경험치</label>
                <span>{party.experience}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
