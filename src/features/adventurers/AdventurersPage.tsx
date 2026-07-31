import { useState } from "react";
import type { EntityId, GameState } from "../../types/game";
import AdventurerList from "./AdventurerList";
import AdventurerDetail from "./AdventurerDetail";

interface Props {
  state: GameState;
  onNavigateToParty?: (partyId: EntityId) => void;
}

export default function AdventurersPage({ state, onNavigateToParty }: Props) {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const selectedAdventurer = selectedId ? state.adventurers[selectedId] : null;

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WESTWIND GUILD · ROSTER</p>
          <h1>모험가 명부</h1>
        </div>
      </header>
      <div className={`adv-page${selectedAdventurer ? " has-detail" : ""}`}>
        <div className="adv-list-col">
          <AdventurerList
            state={state}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPartyClick={onNavigateToParty}
          />
        </div>
        {selectedAdventurer && (
          <div className="adv-detail-col">
            <AdventurerDetail
              adventurer={selectedAdventurer}
              state={state}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
