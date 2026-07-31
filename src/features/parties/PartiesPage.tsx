import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { EntityId, GameState } from "../../types/game";
import { playSelect } from "../../lib/audio";
import { createParty, deleteParty, addPartyMember, removePartyMember, setPartyLeader, renameParty, setFormationSlot, swapFormationSlots } from "../../game/simulation/party";
import type { FormationSlot } from "../../types/game";
import PartyList from "./PartyList";
import PartyDetail from "./PartyDetail";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
  initialSelectedId?: string | null;
  onInitialIdConsumed?: () => void;
}

export default function PartiesPage({ state, onStateChange, initialSelectedId, onInitialIdConsumed }: Props) {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
      onInitialIdConsumed?.();
    }
  }, [initialSelectedId, onInitialIdConsumed]);
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

  function handleRenameParty(name: string) {
    if (!selectedId) return;
    onStateChange((s) => renameParty(s, selectedId, name));
  }

  function handleFormationSlot(slot: FormationSlot, advId: string | null) {
    if (!selectedId) return;
    onStateChange((s) => setFormationSlot(s, selectedId, slot, advId));
  }

  function handleFormationSwap(slotA: FormationSlot, slotB: FormationSlot) {
    if (!selectedId) return;
    onStateChange((s) => swapFormationSlots(s, selectedId, slotA, slotB));
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
              onRename={handleRenameParty}
              onFormationSlot={handleFormationSlot}
              onFormationSwap={handleFormationSwap}
            />
          </div>
        )}
      </div>
    </div>
  );
}
