import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { EntityId, GameState } from "../../types/game";
import { playSelect } from "../../lib/audio";
import { createParty, deleteParty, addPartyMember, removePartyMember, setPartyLeader } from "../../game/simulation/party";
import PartyList from "./PartyList";
import PartyDetail from "./PartyDetail";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
}

export default function PartiesPage({ state, onStateChange }: Props) {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const selectedParty = selectedId ? state.parties[selectedId] : null;

  function handleCreateParty(name: string) {
    playSelect();
    onStateChange((s) => createParty(s, name));
  }

  function handleDeleteParty(partyId: EntityId) {
    onStateChange((s) => deleteParty(s, partyId));
    setSelectedId(null);
  }

  function handleAddMember(adventurerId: EntityId) {
    if (!selectedId) return;
    onStateChange((s) => addPartyMember(s, selectedId, adventurerId));
  }

  function handleRemoveMember(adventurerId: EntityId) {
    if (!selectedId) return;
    onStateChange((s) => removePartyMember(s, selectedId, adventurerId));
  }

  function handleSetLeader(adventurerId: EntityId) {
    if (!selectedId) return;
    onStateChange((s) => setPartyLeader(s, selectedId, adventurerId));
  }

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
            onCreateParty={handleCreateParty}
          />
        </div>
        {selectedParty && selectedId && (
          <div className="party-detail-col">
            <PartyDetail
              partyId={selectedId}
              state={state}
              onClose={() => setSelectedId(null)}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onSetLeader={handleSetLeader}
              onDelete={() => handleDeleteParty(selectedId)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
