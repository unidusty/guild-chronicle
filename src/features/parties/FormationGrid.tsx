import { useRef, useState } from "react";
import type { Adventurer, AdventurerClass, Formation, FormationSlot } from "../../types/game";
import { CLASS_PREFERRED_ROWS } from "../../game/simulation/combatPower";
import { playSelect } from "../../lib/audio";

const SLOT_LAYOUT: { row: string; slots: FormationSlot[] }[] = [
  { row: "전방", slots: ["front-1", "front-2"] },
  { row: "중앙", slots: ["mid-1", "mid-2"] },
  { row: "후방", slots: ["back-1", "back-2"] },
];

function slotRow(slot: FormationSlot) {
  return slot.split("-")[0] as "front" | "mid" | "back";
}

interface Props {
  formation: Formation;
  memberIds: string[];
  adventurers: Record<string, Adventurer>;
  classes: Record<string, AdventurerClass>;
  disabled?: boolean;
  onSlotChange: (slot: FormationSlot, advId: string | null) => void;
  onSlotSwap: (slotA: FormationSlot, slotB: FormationSlot) => void;
}

export default function FormationGrid({
  formation, memberIds, adventurers, classes, disabled, onSlotChange, onSlotSwap,
}: Props) {
  // Click-to-assign state
  const [activeSlot, setActiveSlot] = useState<FormationSlot | null>(null);
  // DnD visual state (React state — async, for rendering only)
  const [dragAdvState, setDragAdvState] = useState<string | null>(null);
  const [dragFromSlotState, setDragFromSlotState] = useState<FormationSlot | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<FormationSlot | "unassigned" | null>(null);
  // DnD synchronous ref (used in event handlers to avoid async state issues)
  const dragRef = useRef<{ advId: string; fromSlot: FormationSlot | null } | null>(null);

  const assignedIds = new Set(Object.values(formation).filter(Boolean) as string[]);
  const unassigned = memberIds.filter((id) => !assignedIds.has(id));

  function isPreferred(advId: string, slot: FormationSlot): boolean {
    const adv = adventurers[advId];
    if (!adv) return false;
    return (CLASS_PREFERRED_ROWS[adv.classId] ?? ["front", "mid", "back"]).includes(slotRow(slot));
  }

  // ── Click handlers ────────────────────────────────────────────────────────

  function handleSlotClick(slot: FormationSlot) {
    if (disabled) return;
    const current = formation[slot];
    if (current) {
      // occupied slot: clicking the slot itself does nothing (use × button to unassign)
      return;
    } else {
      setActiveSlot(activeSlot === slot ? null : slot);
    }
  }

  function handlePickerAssign(slot: FormationSlot, advId: string) {
    playSelect();
    onSlotChange(slot, advId);
    setActiveSlot(null);
  }

  // ── DnD: unassigned member drag start ────────────────────────────────────

  function handleMemberDragStart(e: React.DragEvent, advId: string) {
    if (disabled) { e.preventDefault(); return; }
    dragRef.current = { advId, fromSlot: null };
    setDragAdvState(advId);
    setDragFromSlotState(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", advId);
    setActiveSlot(null);
  }

  // ── DnD: slot drag start ──────────────────────────────────────────────────

  function handleSlotDragStart(e: React.DragEvent, slot: FormationSlot, advId: string) {
    if (disabled) { e.preventDefault(); return; }
    e.stopPropagation();
    dragRef.current = { advId, fromSlot: slot };
    setDragAdvState(advId);
    setDragFromSlotState(slot);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", advId);
    setActiveSlot(null);
  }

  // ── DnD: slot drag over / leave / drop ───────────────────────────────────

  function handleSlotDragOver(e: React.DragEvent, slot: FormationSlot) {
    if (disabled) return;
    e.preventDefault();
    if (!dragRef.current) return;
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(slot);
  }

  function handleSlotDragLeave(e: React.DragEvent, slot: FormationSlot) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget((t) => (t === slot ? null : t));
    }
  }

  function handleSlotDrop(e: React.DragEvent, targetSlot: FormationSlot) {
    e.preventDefault();
    const drag = dragRef.current;
    if (!drag || disabled) { resetDrag(); return; }

    const { advId, fromSlot } = drag;
    const currentOccupant = formation[targetSlot];
    if (currentOccupant === advId) { resetDrag(); return; }

    if (currentOccupant && fromSlot) {
      // Occupied slot + came from another slot → swap
      onSlotSwap(fromSlot, targetSlot);
    } else {
      // Empty slot, or came from unassigned onto occupied (replaces) → setSlot
      onSlotChange(targetSlot, advId);
    }
    resetDrag();
  }

  // ── DnD: unassigned area drag over / drop ────────────────────────────────

  function handleUnassignedDragOver(e: React.DragEvent) {
    if (disabled) return;
    const drag = dragRef.current;
    if (!drag?.fromSlot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget("unassigned");
  }

  function handleUnassignedDrop(e: React.DragEvent) {
    e.preventDefault();
    const drag = dragRef.current;
    if (!drag || disabled) { resetDrag(); return; }
    if (drag.fromSlot) onSlotChange(drag.fromSlot, null); // unassign
    resetDrag();
  }

  function handleDragEnd() { resetDrag(); }

  function resetDrag() {
    dragRef.current = null;
    setDragAdvState(null);
    setDragFromSlotState(null);
    setDragOverTarget(null);
  }

  return (
    <div className="formation-grid">
      {/* Unassigned members zone */}
      <div
        className={[
          "formation-unassigned",
          dragAdvState && dragFromSlotState ? "drop-target" : "",
          dragOverTarget === "unassigned" ? "drag-over" : "",
        ].filter(Boolean).join(" ")}
        onDragOver={handleUnassignedDragOver}
        onDragLeave={() => setDragOverTarget((t) => (t === "unassigned" ? null : t))}
        onDrop={handleUnassignedDrop}
      >
        {memberIds.length === 0 ? (
          <span className="formation-unassigned-empty">파티원 없음</span>
        ) : unassigned.length === 0 ? (
          <span className="formation-unassigned-empty">모든 파티원이 배치됨</span>
        ) : (
          unassigned.map((id) => {
            const adv = adventurers[id];
            const cls = adv ? classes[adv.classId] : null;
            const isDragging = dragAdvState === id;
            return (
              <div
                key={id}
                className={["formation-member-card", isDragging ? "dragging" : ""].filter(Boolean).join(" ")}
                draggable={!disabled}
                onDragStart={(e) => handleMemberDragStart(e, id)}
                onDragEnd={handleDragEnd}
                title={adv ? `${adv.name} — 슬롯으로 드래그하여 배치` : id}
              >
                <span className="fmc-name">{adv?.name ?? id}</span>
                <span className="fmc-class">{cls?.name ?? ""}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Formation rows */}
      {SLOT_LAYOUT.map(({ row, slots }) => (
        <div key={row} className="formation-row">
          <span className="formation-row-label">{row}</span>
          <div className="formation-slots">
            {slots.map((slot) => {
              const advId = formation[slot];
              const adv = advId ? adventurers[advId] : null;
              const cls = adv ? classes[adv.classId] : null;
              const isOpen = activeSlot === slot;
              const correct = advId ? isPreferred(advId, slot) : null;
              const isDragSource = dragAdvState !== null && dragFromSlotState === slot;
              const isDragOver = dragOverTarget === slot;

              return (
                <div key={slot} className="formation-slot-wrap">
                  <div
                    className={[
                      "formation-slot",
                      adv ? "occupied" : "empty",
                      correct === true ? "pos-good" : correct === false ? "pos-bad" : "",
                      isOpen ? "open" : "",
                      disabled ? "disabled" : "",
                      isDragSource ? "drag-source" : "",
                      isDragOver ? "drag-over" : "",
                    ].filter(Boolean).join(" ")}
                    // Drop target (all slots)
                    onDragOver={(e) => handleSlotDragOver(e, slot)}
                    onDragLeave={(e) => handleSlotDragLeave(e, slot)}
                    onDrop={(e) => handleSlotDrop(e, slot)}
                    // Click to toggle picker (empty slot); occupied slot does nothing
                    onClick={() => handleSlotClick(slot)}
                    title={adv ? `${adv.name} — 드래그하여 이동 / × 버튼으로 해제` : "드래그하여 배치 / 클릭하여 선택"}
                  >
                    {adv ? (
                      <div
                        className="slot-card"
                        draggable={!disabled}
                        onDragStart={(e) => handleSlotDragStart(e, slot, adv.id)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="slot-name">{adv.name}</span>
                        <span className="slot-class">{cls?.name ?? adv.classId}</span>
                        <span className="slot-pos-dot" />
                        {!disabled && (
                          <button
                            className="slot-unassign-btn"
                            title="배치 해제"
                            onClick={(e) => {
                              e.stopPropagation();
                              playSelect();
                              onSlotChange(slot, null);
                            }}
                          >×</button>
                        )}
                      </div>
                    ) : (
                      <span className="slot-empty-label">비어있음</span>
                    )}
                  </div>

                  {/* Click-to-assign picker (empty slots only) */}
                  {isOpen && !disabled && (
                    <div className="slot-picker">
                      {unassigned.length === 0 ? (
                        <span className="slot-picker-empty">배치 가능 멤버 없음</span>
                      ) : (
                        unassigned.map((id) => {
                          const a = adventurers[id];
                          const c = a ? classes[a.classId] : null;
                          const pref = isPreferred(id, slot);
                          return (
                            <button
                              key={id}
                              className={["slot-picker-item", pref ? "preferred" : ""].filter(Boolean).join(" ")}
                              onClick={(e) => { e.stopPropagation(); handlePickerAssign(slot, id); }}
                            >
                              <span>{a?.name ?? id}</span>
                              <span className="slot-picker-class">{c?.name ?? ""}</span>
                              {pref && <span className="slot-picker-badge">적합</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
