import { useState, useEffect } from "react";
import type { EntityId, Formation, FormationSlot, GameState } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { adventurerStatusLabels, getBondStageLabel, getStatusTone, partyStatusLabels, questStageLabels } from "../../game/constants/labels";
import {
  calcPartyCombatPower,
  calcSynergy,
  calcFormationAdjustment,
} from "../../game/simulation/combatPower";
import FormationGrid from "./FormationGrid";

const ALL_SLOTS: FormationSlot[] = ["front-1", "front-2", "mid-1", "mid-2", "back-1", "back-2"];

function formationsEqual(a: Formation, b: Formation): boolean {
  return ALL_SLOTS.every((s) => (a[s] ?? null) === (b[s] ?? null));
}

interface Props {
  partyId: EntityId;
  state: GameState;
  onClose: () => void;
  onAddMember: (adventurerId: EntityId) => void;
  onRemoveMember: (adventurerId: EntityId) => void;
  onSetLeader: (adventurerId: EntityId) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onApplyFormation: (formation: Formation) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function PartyDetail({
  partyId, state, onClose, onAddMember, onRemoveMember,
  onSetLeader, onDelete, onRename, onApplyFormation, onDirtyChange,
}: Props) {
  const [addingMember, setAddingMember] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [draftFormation, setDraftFormation] = useState<Formation>({});

  const party = state.parties[partyId];

  // Reset draft formation when party changes or member list changes
  const memberIdsKey = party ? party.memberIds.join(",") : "";
  useEffect(() => {
    if (party) {
      setDraftFormation({ ...party.formation });
    }
  }, [partyId, memberIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!party) return null;

  const isDispatched = party.status === "dispatched" || party.status === "returning";
  const members = party.memberIds.map((id) => state.adventurers[id]).filter(Boolean);
  const quest = party.activeQuestId ? state.quests[party.activeQuestId] : null;
  const statusTone = isDispatched ? "active" : "idle";

  const isDirty = !formationsEqual(draftFormation, party.formation);

  // Propagate dirty state to parent
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const effectiveFormation = draftFormation;
  const combatPower = calcPartyCombatPower({ ...party, formation: effectiveFormation }, members, state.classes);
  const synergy = calcSynergy(members, state.classes);
  const formationAdj = calcFormationAdjustment(effectiveFormation, members);

  const eligibleAdventurers = Object.values(state.adventurers)
    .filter((adv) => !adv.isArchived && adv.status === "idle" && adv.partyId === null)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  function handleAddMember(advId: EntityId) {
    playSelect();
    onAddMember(advId);
  }

  function handleRemoveMember(advId: EntityId) {
    playSelect();
    onRemoveMember(advId);
  }

  function handleSetLeader(advId: EntityId) {
    playSelect();
    onSetLeader(advId);
  }

  function handleDeleteConfirm() {
    playSelect();
    onDelete();
  }

  function handleRenameOpen() {
    playSelect();
    setRenameValue(party.name);
    setRenameError("");
    setRenaming(true);
  }

  function handleRenameCancel() {
    playSelect();
    setRenaming(false);
    setRenameError("");
  }

  function handleRenameSave() {
    const trimmed = renameValue.trim();
    if (trimmed.length < 2) { setRenameError("최소 2자 이상 입력하세요."); return; }
    if (trimmed.length > 20) { setRenameError("최대 20자까지 입력할 수 있습니다."); return; }
    playSelect();
    onRename(trimmed);
    setRenaming(false);
    setRenameError("");
  }

  // ── Draft formation mutation handlers ────────────────────────────────────

  function handleDraftSlotChange(slot: FormationSlot, advId: string | null) {
    setDraftFormation((prev) => {
      if (advId === null) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      const cleaned = Object.fromEntries(
        Object.entries(prev).filter(([, id]) => id !== advId)
      ) as Formation;
      return { ...cleaned, [slot]: advId };
    });
  }

  function handleDraftSlotSwap(slotA: FormationSlot, slotB: FormationSlot) {
    setDraftFormation((prev) => {
      const advA = prev[slotA];
      const advB = prev[slotB];
      if (advA === advB) return prev;
      const next = { ...prev };
      if (advA) next[slotB] = advA; else delete next[slotB];
      if (advB) next[slotA] = advB; else delete next[slotA];
      return next;
    });
  }

  function handleApplyFormation() {
    playSelect();
    onApplyFormation(draftFormation);
  }

  function handleCancelFormation() {
    playSelect();
    setDraftFormation({ ...party.formation });
  }

  const bondLabel = getBondStageLabel(party.currentFormationQuestCount);

  return (
    <div className="panel party-detail">
      <button className="detail-close" onMouseEnter={playHover} onClick={() => { playSelect(); onClose(); }}>✕</button>

      <div className="party-detail-header">
        <div className="party-detail-title">
          <span className="rank party-rank">{party.rank}</span>
          {renaming ? (
            <div className="party-rename-form">
              <input
                className="party-rename-input"
                value={renameValue}
                maxLength={20}
                autoFocus
                onChange={(e) => { setRenameValue(e.target.value); setRenameError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameSave(); if (e.key === "Escape") handleRenameCancel(); }}
              />
              <div className="party-rename-actions">
                <button className="member-action-btn" onMouseEnter={playHover} onClick={handleRenameSave}>저장</button>
                <button className="member-action-btn" onMouseEnter={playHover} onClick={handleRenameCancel}>취소</button>
              </div>
              {renameError && <p className="party-rename-error">{renameError}</p>}
            </div>
          ) : (
            <div className="party-name-row">
              <h2 className="party-name-heading">{party.name}</h2>
              {!isDispatched && (
                <button className="party-rename-btn" onMouseEnter={playHover} onClick={handleRenameOpen}>이름 변경</button>
              )}
            </div>
          )}
        </div>
        <span className={`status ${statusTone}`}>{partyStatusLabels[party.status]}</span>
      </div>

      {/* Combat power banner */}
      <div className="party-power-banner">
        <div className="party-power-main">
          <span className="party-power-label">{isDirty ? "예상 전투력" : "전투력"}</span>
          <span className="party-power-value">{combatPower}</span>
        </div>
        <div className="party-power-mods">
          {synergy.bonuses.map((b) => (
            <span key={b} className="synergy-tag bonus">{b}</span>
          ))}
          {synergy.penalties.map((p) => (
            <span key={p} className="synergy-tag penalty">{p}</span>
          ))}
          {members.length > 0 && formationAdj !== 0 && (
            <span className={`synergy-tag ${formationAdj >= 0 ? "bonus" : "penalty"}`}>
              진형 {formationAdj >= 0 ? `+${formationAdj}` : formationAdj}
            </span>
          )}
        </div>
      </div>

      <div className="party-detail-body">
        {isDispatched && (
          <p className="party-locked-notice">의뢰 수행 중 파티는 편성을 변경할 수 없습니다.</p>
        )}

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
                      <span className="quiet">{cls?.name ?? "미정"} · {m.rank}랭크</span>
                    </div>
                    <span className={`status ${tone}`}>{adventurerStatusLabels[m.status]}</span>
                    {!isDispatched && (
                      <div className="member-actions">
                        {!isLeader && (
                          <button className="member-action-btn" onMouseEnter={playHover} onClick={() => handleSetLeader(m.id)}>리더</button>
                        )}
                        <button className="member-action-btn danger" onMouseEnter={playHover} onClick={() => handleRemoveMember(m.id)}>제외</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isDispatched && (
            <div className="add-member-section">
              <button
                className="add-member-toggle"
                onMouseEnter={playHover}
                onClick={() => { playSelect(); setAddingMember((v) => !v); }}
              >
                {addingMember ? "▲ 닫기" : "▼ 모험가 추가"}
              </button>
              {addingMember && (
                <div className="add-member-panel">
                  {eligibleAdventurers.length === 0 ? (
                    <p className="info-empty">추가 가능한 모험가 없음</p>
                  ) : (
                    eligibleAdventurers.map((adv) => {
                      const initials = adv.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
                      const cls = state.classes[adv.classId];
                      return (
                        <div key={adv.id} className="add-member-row">
                          <div className="portrait portrait-sm">
                            {adv.portrait ? <img src={adv.portrait} alt={adv.name} /> : initials}
                          </div>
                          <div className="add-member-info">
                            <strong>{adv.name}</strong>
                            <span className="quiet">{cls?.name ?? "미정"} · {adv.rank}랭크</span>
                          </div>
                          <button className="member-action-btn" onMouseEnter={playHover} onClick={() => handleAddMember(adv.id)}>추가</button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {members.length > 0 && (
          <section className="party-formation-section">
            <p className="char-section-label">진형 배치</p>
            <FormationGrid
              formation={draftFormation}
              memberIds={party.memberIds}
              adventurers={state.adventurers}
              classes={state.classes}
              disabled={isDispatched}
              onSlotChange={handleDraftSlotChange}
              onSlotSwap={handleDraftSlotSwap}
            />
            {!isDispatched && (
              <div className="formation-actions-bar">
                {isDirty && <span className="formation-dirty-hint">변경 사항 있음</span>}
                <button className="formation-cancel-btn" disabled={!isDirty} onClick={handleCancelFormation}>변경 취소</button>
                <button className="formation-apply-btn" disabled={!isDirty} onClick={handleApplyFormation}>진형 적용</button>
              </div>
            )}
          </section>
        )}

        <section className="party-quest-section">
          <p className="char-section-label">진행 중 의뢰</p>
          {quest ? (() => {
            const prog = party.activeQuestId ? state.questProgress[party.activeQuestId] : null;
            const elapsed = prog ? prog.currentDay : (quest.durationDays - quest.remainingDays);
            return (
              <div className="info-card party-active-quest-card">
                <div className="info-rows">
                  <div className="info-row"><label>의뢰명</label><span>{quest.title}</span></div>
                  <div className="info-row"><label>등급</label><span className="rank">{quest.grade}</span></div>
                  {prog && (
                    <div className="info-row">
                      <label>현재 단계</label>
                      <span className="quest-stage-inline">{questStageLabels[prog.currentStage]}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <label>진행</label>
                    <span className="party-quest-days">{elapsed} / {quest.durationDays}일</span>
                  </div>
                </div>
                <div className="party-quest-progress-bar">
                  <div className="party-quest-progress-fill" style={{ width: `${quest.progress}%` }} />
                </div>
                <div className="party-quest-footer">
                  <span className="quiet">예상 귀환</span>
                  <span>{quest.remainingDays}일 후</span>
                </div>
              </div>
            );
          })() : (
            <p className="info-empty">현재 의뢰 없음</p>
          )}
        </section>

        <section className="party-meta-section">
          <p className="char-section-label">파티 기록</p>
          <div className="info-card">
            <div className="info-rows">
              <div className="info-row"><label>파티 랭크</label><span className="rank">{party.rank}</span></div>
              <div className="info-row"><label>유대</label><span>{bondLabel}</span></div>
              <div className="info-row"><label>편성 일수</label><span>{party.currentFormationDays}일</span></div>
              <div className="info-row"><label>현 편성 의뢰</label><span>{party.currentFormationQuestCount}건</span></div>
              <div className="info-row"><label>누적 의뢰</label><span>{party.questsCompleted}건</span></div>
              <div className="info-row"><label>누적 활동일</label><span>{party.totalActivityDays}일</span></div>
              <div className="info-row"><label>총 수익</label><span>{party.totalGoldEarned.toLocaleString("ko-KR")} G</span></div>
            </div>
          </div>
        </section>

        {!isDispatched && (
          <section className="party-delete-section">
            {deleteConfirm ? (
              <div className="party-delete-confirm">
                <span>정말 해산하시겠습니까?</span>
                <div className="party-delete-actions">
                  <button className="member-action-btn danger" onMouseEnter={playHover} onClick={handleDeleteConfirm}>해산</button>
                  <button className="member-action-btn" onMouseEnter={playHover} onClick={() => { playSelect(); setDeleteConfirm(false); }}>취소</button>
                </div>
              </div>
            ) : (
              <button className="party-dissolve-btn" onMouseEnter={playHover} onClick={() => { playSelect(); setDeleteConfirm(true); }}>파티 해산</button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
