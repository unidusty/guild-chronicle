import { useState } from "react";
import type { Adventurer, AdventurerClass, Formation, FormationSlot } from "../../types/game";
import { CLASS_PREFERRED_ROWS } from "../../game/simulation/combatPower";

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
}

export default function FormationGrid({ formation, memberIds, adventurers, classes, disabled, onSlotChange }: Props) {
  const [activeSlot, setActiveSlot] = useState<FormationSlot | null>(null);

  const assignedIds = new Set(Object.values(formation).filter(Boolean) as string[]);
  const unassigned = memberIds.filter((id) => !assignedIds.has(id));

  function handleSlotClick(slot: FormationSlot) {
    if (disabled) return;
    const current = formation[slot];
    if (current) {
      onSlotChange(slot, null);
      setActiveSlot(null);
    } else {
      setActiveSlot(activeSlot === slot ? null : slot);
    }
  }

  function handleAssign(slot: FormationSlot, advId: string) {
    onSlotChange(slot, advId);
    setActiveSlot(null);
  }

  function isPreferred(advId: string, slot: FormationSlot): boolean {
    const adv = adventurers[advId];
    if (!adv) return false;
    const preferred = CLASS_PREFERRED_ROWS[adv.classId] ?? ["front", "mid", "back"];
    return preferred.includes(slotRow(slot));
  }

  return (
    <div className="formation-grid">
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

              return (
                <div key={slot} className="formation-slot-wrap">
                  <button
                    className={[
                      "formation-slot",
                      adv ? "occupied" : "empty",
                      correct === true ? "pos-good" : correct === false ? "pos-bad" : "",
                      isOpen ? "open" : "",
                      disabled ? "disabled" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => handleSlotClick(slot)}
                    title={adv ? `${adv.name} — 클릭하여 배치 해제` : "클릭하여 배치"}
                  >
                    {adv ? (
                      <>
                        <span className="slot-name">{adv.name}</span>
                        <span className="slot-class">{cls?.name ?? adv.classId}</span>
                        <span className="slot-pos-dot" />
                      </>
                    ) : (
                      <span className="slot-empty-label">비어있음</span>
                    )}
                  </button>

                  {isOpen && unassigned.length > 0 && (
                    <div className="slot-picker">
                      {unassigned.map((id) => {
                        const a = adventurers[id];
                        const c = a ? classes[a.classId] : null;
                        const pref = isPreferred(id, slot);
                        return (
                          <button
                            key={id}
                            className={["slot-picker-item", pref ? "preferred" : ""].filter(Boolean).join(" ")}
                            onClick={() => handleAssign(slot, id)}
                          >
                            <span>{a?.name ?? id}</span>
                            <span className="slot-picker-class">{c?.name ?? ""}</span>
                            {pref && <span className="slot-picker-badge">적합</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isOpen && unassigned.length === 0 && (
                    <div className="slot-picker">
                      <span className="slot-picker-empty">배치 가능 멤버 없음</span>
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
