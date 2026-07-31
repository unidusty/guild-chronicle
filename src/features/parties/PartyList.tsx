import type { EntityId, GameState, Party } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { partyStatusLabels } from "../../game/constants/labels";

interface Props {
  state: GameState;
  selectedId: EntityId | null;
  onSelect: (id: EntityId) => void;
}

export default function PartyList({ state, selectedId, onSelect }: Props) {
  const parties = state.guild.partyIds
    .map((id) => state.parties[id])
    .filter((p): p is Party => Boolean(p));

  if (parties.length === 0) {
    return <p className="party-empty">등록된 파티가 없습니다.</p>;
  }

  return (
    <div className="party-card-list">
      {parties.map((party) => {
        const leader = party.leaderId ? state.adventurers[party.leaderId] : null;
        const members = party.memberIds
          .map((id) => state.adventurers[id])
          .filter(Boolean);
        const quest = party.activeQuestId ? state.quests[party.activeQuestId] : null;
        const isSelected = party.id === selectedId;
        const statusTone =
          party.status === "dispatched" || party.status === "returning" ? "active" : "idle";

        return (
          <button
            key={party.id}
            className={`party-card${isSelected ? " selected" : ""}`}
            onMouseEnter={playHover}
            onClick={() => { playSelect(); onSelect(party.id); }}
          >
            <div className="party-card-top">
              <div className="party-card-name">
                <span className="rank">{party.rank}</span>
                <strong>{party.name}</strong>
              </div>
              <span className={`status ${statusTone}`}>{partyStatusLabels[party.status]}</span>
            </div>
            <div className="party-card-meta">
              {leader ? `리더 · ${leader.name}` : "리더 미지정"} · {members.length}명
            </div>
            <div className="party-card-bottom">
              <div className="party-member-icons">
                {members.length === 0 && <span className="quiet" style={{ fontSize: "var(--font-tiny)" }}>파티원 없음</span>}
                {members.slice(0, 6).map((m) => {
                  const initials = m.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={m.id} className="portrait portrait-sm" title={m.name}>
                      {m.portrait ? <img src={m.portrait} alt={m.name} /> : initials}
                    </div>
                  );
                })}
              </div>
              {quest && <span className="party-card-quest">{quest.title}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
