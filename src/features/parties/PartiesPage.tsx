import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { EntityId, Formation, GameState } from "../../types/game";
import { playSelect } from "../../lib/audio";
import { createParty, deleteParty, addPartyMember, removePartyMember, setPartyLeader, renameParty, replaceFormation } from "../../game/simulation/party";
import PartyList from "./PartyList";
import PartyDetail from "./PartyDetail";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
  initialSelectedId?: string | null;
  onInitialIdConsumed?: () => void;
  onFormationDirtyChange?: (dirty: boolean) => void;
}

export default function PartiesPage({ state, onStateChange, initialSelectedId, onInitialIdConsumed, onFormationDirtyChange }: Props) {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [formationDirty, setFormationDirty] = useState(false);
  const [pendingPartyId, setPendingPartyId] = useState<EntityId | null>(null);

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

  function handleApplyFormation(formation: Formation) {
    if (!selectedId) return;
    onStateChange((s) => replaceFormation(s, selectedId, formation));
  }

  function handleFormationDirtyChange(dirty: boolean) {
    setFormationDirty(dirty);
    onFormationDirtyChange?.(dirty);
  }

  function handlePartySelect(id: EntityId) {
    if (formationDirty && id !== selectedId) {
      setPendingPartyId(id);
    } else {
      setSelectedId(id);
    }
  }

  function handleDiscardAndSwitch() {
    setFormationDirty(false);
    onFormationDirtyChange?.(false);
    playSelect();
    setSelectedId(pendingPartyId);
    setPendingPartyId(null);
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
            onSelect={handlePartySelect}
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
              onApplyFormation={handleApplyFormation}
              onDirtyChange={handleFormationDirtyChange}
            />
          </div>
        )}
      </div>

      {pendingPartyId && (
        <div className="modal-backdrop" onClick={() => setPendingPartyId(null)}>
          <div className="formation-nav-confirm" onClick={(e) => e.stopPropagation()}>
            <p className="formation-nav-confirm-title">저장하지 않은 진형 변경사항이 있습니다.</p>
            <p className="formation-nav-confirm-body">변경사항을 버리고 다른 파티로 이동하시겠습니까?</p>
            <div className="formation-nav-confirm-actions">
              <button className="fac-confirm-cancel" onClick={() => setPendingPartyId(null)}>돌아가기</button>
              <button className="fac-confirm-ok" onClick={handleDiscardAndSwitch}>변경사항 버리기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
