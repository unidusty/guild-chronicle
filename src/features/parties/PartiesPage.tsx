import { useState } from "react";
import type { EntityId, GameState } from "../../types/game";
import PartyList from "./PartyList";
import PartyDetail from "./PartyDetail";

interface Props { state: GameState; }

export default function PartiesPage({ state }: Props) {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const selectedParty = selectedId ? state.parties[selectedId] : null;

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WESTWIND GUILD · PARTIES</p>
          <h1>파티 관리</h1>
        </div>
      </header>
      <div className={`party-page${selectedParty ? " has-detail" : ""}`}>
        <div className="party-list-col">
          <PartyList
            state={state}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        {selectedParty && (
          <div className="party-detail-col">
            <PartyDetail
              partyId={selectedId!}
              state={state}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
