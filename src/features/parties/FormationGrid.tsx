import { useSensor, useSensors, DndContext, DragOverlay, PointerSensor, TouchSensor } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import type { Adventurer, AdventurerClass, Formation, FormationSlot } from "../../types/game";
import { CLASS_PREFERRED_ROWS } from "../../game/simulation/combatPower";
import { playSelect } from "../../lib/audio";

const SLOT_LAYOUT: { row: string; slots: FormationSlot[] }[] = [
  { row: "전방", slots: ["front-1", "front-2"] },
  { row: "중앙", slots: ["mid-1", "mid-2"] },
  { row: "후방", slots: ["back-1", "back-2"] },
];

const UNASSIGNED_ZONE_ID = "unassigned-zone";

function makeSlotId(slot: FormationSlot): string { return `slot:${slot}`; }
function parseSlotId(id: string): FormationSlot | null {
  return id.startsWith("slot:") ? (id.slice(5) as FormationSlot) : null;
}

interface DragData {
  adventurerId: string;
  sourceType: "unassigned" | "slot";
  sourceSlot: FormationSlot | null;
}

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

// ── Sub-components ────────────────────────────────────────────────────────────

interface MemberCardContentProps {
  adv: Adventurer | undefined;
  cls: AdventurerClass | null | undefined;
  advId: string;
  overlay?: boolean;
}

function MemberCardContent({ adv, cls, overlay }: MemberCardContentProps) {
  return (
    <>
      <span className="fmc-name">{adv?.name ?? "?"}</span>
      <span className="fmc-class">{cls?.name ?? ""}</span>
      {overlay && <span className="fmc-overlay-hint">놓아서 배치</span>}
    </>
  );
}

interface DraggableMemberCardProps {
  advId: string;
  adv: Adventurer | undefined;
  cls: AdventurerClass | null | undefined;
  disabled?: boolean;
}

function DraggableMemberCard({ advId, adv, cls, disabled }: DraggableMemberCardProps) {
  const dragData: DragData = { adventurerId: advId, sourceType: "unassigned", sourceSlot: null };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `adv:${advId}`,
    data: dragData,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={["formation-member-card", isDragging ? "dragging" : ""].filter(Boolean).join(" ")}
      title={adv ? `${adv.name} — 슬롯으로 드래그하여 배치` : advId}
      {...listeners}
      {...attributes}
    >
      <MemberCardContent adv={adv} cls={cls} advId={advId} />
    </div>
  );
}

interface DroppableUnassignedZoneProps {
  memberIds: string[];
  formation: Formation;
  adventurers: Record<string, Adventurer>;
  classes: Record<string, AdventurerClass>;
  disabled?: boolean;
  activeAdvId: string | null;
  activeSourceType: "unassigned" | "slot" | null;
}

function DroppableUnassignedZone({
  memberIds, formation, adventurers, classes, disabled,
  activeAdvId, activeSourceType,
}: DroppableUnassignedZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED_ZONE_ID, disabled });

  const assignedIds = new Set(Object.values(formation).filter(Boolean) as string[]);
  const unassigned = memberIds.filter((id) => !assignedIds.has(id));

  const showDropTarget = activeAdvId !== null && activeSourceType === "slot";

  return (
    <div
      ref={setNodeRef}
      className={[
        "formation-unassigned",
        showDropTarget ? "drop-target" : "",
        isOver ? "drag-over" : "",
      ].filter(Boolean).join(" ")}
    >
      {memberIds.length === 0 ? (
        <span className="formation-unassigned-empty">파티원 없음</span>
      ) : unassigned.length === 0 ? (
        <span className="formation-unassigned-empty">모든 파티원이 배치됨</span>
      ) : (
        unassigned.map((id) => {
          const adv = adventurers[id];
          const cls = adv ? classes[adv.classId] : null;
          return (
            <DraggableMemberCard
              key={id}
              advId={id}
              adv={adv}
              cls={cls}
              disabled={disabled}
            />
          );
        })
      )}
    </div>
  );
}

interface FormationSlotItemProps {
  slot: FormationSlot;
  formation: Formation;
  adventurers: Record<string, Adventurer>;
  classes: Record<string, AdventurerClass>;
  disabled?: boolean;
  activeSlot: FormationSlot | null;
  onSlotClick: (slot: FormationSlot) => void;
  onPickerAssign: (slot: FormationSlot, advId: string) => void;
  onUnassign: (slot: FormationSlot) => void;
  unassigned: string[];
  isPreferred: (advId: string, slot: FormationSlot) => boolean;
  activeAdvId: string | null;
}

function FormationSlotItem({
  slot, formation, adventurers, classes, disabled,
  activeSlot, onSlotClick, onPickerAssign, onUnassign,
  unassigned, isPreferred, activeAdvId,
}: FormationSlotItemProps) {
  const advId = formation[slot];
  const adv = advId ? adventurers[advId] : null;
  const cls = adv ? classes[adv.classId] : null;
  const isOpen = activeSlot === slot;
  const correct = advId ? isPreferred(advId, slot) : null;

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: makeSlotId(slot), disabled });

  const dragData: DragData = {
    adventurerId: advId ?? "",
    sourceType: "slot",
    sourceSlot: slot,
  };
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `slot-card:${slot}`,
    data: dragData,
    disabled: disabled || !advId,
  });

  const isActiveSource = activeAdvId !== null && isDragging;

  return (
    <div className="formation-slot-wrap">
      <div
        ref={setDropRef}
        className={[
          "formation-slot",
          adv ? "occupied" : "empty",
          correct === true ? "pos-good" : correct === false ? "pos-bad" : "",
          isOpen ? "open" : "",
          disabled ? "disabled" : "",
          isActiveSource ? "drag-source" : "",
          isOver ? "drag-over" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => onSlotClick(slot)}
        title={adv ? `${adv.name} — 드래그하여 이동 / × 버튼으로 해제` : "드래그하여 배치 / 클릭하여 선택"}
      >
        {adv ? (
          <div
            ref={setDragRef}
            className="slot-card"
            onClick={(e) => e.stopPropagation()}
            {...listeners}
            {...attributes}
          >
            <span className="slot-name">{adv.name}</span>
            <span className="slot-class">{cls?.name ?? adv.classId}</span>
            <span className="slot-pos-dot" />
            {!disabled && (
              <button
                className="slot-unassign-btn"
                title="배치 해제"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  playSelect();
                  onUnassign(slot);
                }}
              >×</button>
            )}
          </div>
        ) : (
          <span className="slot-empty-label">비어있음</span>
        )}
      </div>

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
                  onClick={(e) => { e.stopPropagation(); onPickerAssign(slot, id); }}
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
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FormationGrid({
  formation, memberIds, adventurers, classes, disabled, onSlotChange, onSlotSwap,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<FormationSlot | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
  );

  const assignedIds = new Set(Object.values(formation).filter(Boolean) as string[]);
  const unassigned = memberIds.filter((id) => !assignedIds.has(id));

  function isPreferred(advId: string, slot: FormationSlot): boolean {
    const adv = adventurers[advId];
    if (!adv) return false;
    return (CLASS_PREFERRED_ROWS[adv.classId] ?? ["front", "mid", "back"]).includes(slotRow(slot));
  }

  function handleSlotClick(slot: FormationSlot) {
    if (disabled) return;
    const current = formation[slot];
    if (current) return;
    setActiveSlot(activeSlot === slot ? null : slot);
  }

  function handlePickerAssign(slot: FormationSlot, advId: string) {
    playSelect();
    onSlotChange(slot, advId);
    setActiveSlot(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDrag(event.active.data.current as DragData);
    setActiveSlot(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { over, active } = event;
    if (!over) return;

    const drag = active.data.current as DragData | undefined;
    if (!drag) return;

    const { adventurerId, sourceType, sourceSlot } = drag;
    const overId = over.id as string;

    if (overId === UNASSIGNED_ZONE_ID) {
      if (sourceType === "slot" && sourceSlot) {
        onSlotChange(sourceSlot, null);
      }
      return;
    }

    const targetSlot = parseSlotId(overId);
    if (!targetSlot) return;

    const currentOccupant = formation[targetSlot];

    if (currentOccupant === adventurerId) return;

    if (currentOccupant && sourceType === "slot" && sourceSlot) {
      onSlotSwap(sourceSlot, targetSlot);
    } else {
      onSlotChange(targetSlot, adventurerId);
    }
  }

  const activeAdv = activeDrag ? adventurers[activeDrag.adventurerId] : null;
  const activeCls = activeAdv ? classes[activeAdv.classId] : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="formation-grid">
        <DroppableUnassignedZone
          memberIds={memberIds}
          formation={formation}
          adventurers={adventurers}
          classes={classes}
          disabled={disabled}
          activeAdvId={activeDrag?.adventurerId ?? null}
          activeSourceType={activeDrag?.sourceType ?? null}
        />

        {SLOT_LAYOUT.map(({ row, slots }) => (
          <div key={row} className="formation-row">
            <span className="formation-row-label">{row}</span>
            <div className="formation-slots">
              {slots.map((slot) => (
                <FormationSlotItem
                  key={slot}
                  slot={slot}
                  formation={formation}
                  adventurers={adventurers}
                  classes={classes}
                  disabled={disabled}
                  activeSlot={activeSlot}
                  onSlotClick={handleSlotClick}
                  onPickerAssign={handlePickerAssign}
                  onUnassign={(s) => onSlotChange(s, null)}
                  unassigned={unassigned}
                  isPreferred={isPreferred}
                  activeAdvId={activeDrag?.adventurerId ?? null}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeDrag && activeAdv ? (
          <div className="formation-member-card formation-drag-overlay">
            <MemberCardContent
              adv={activeAdv}
              cls={activeCls}
              advId={activeDrag.adventurerId}
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
