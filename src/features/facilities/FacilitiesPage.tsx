import { useState, type Dispatch, type SetStateAction } from "react";
import type { Facility, GameState } from "../../types/game";
import { FACILITY_DEFS } from "../../data/facilityData";
import { startBuildFacility, startUpgradeFacility } from "../../game/simulation/facilities";
import { playHover, playSelect } from "../../lib/audio";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
}

interface PendingAction {
  type: "build" | "upgrade";
  facilityId: string;
  facilityName: string;
  cost: number;
  duration: number;
  targetLevel: number;
}

const FACILITY_ORDER = [
  "facility-guild-hall",
  "facility-reception",
  "facility-storage",
  "facility-recruitment",
];

function fmt(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

export default function FacilitiesPage({ state, onStateChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const facilityList = FACILITY_ORDER
    .map((id) => state.facilities[id])
    .filter((f): f is Facility => !!f);

  const selected = selectedId ? state.facilities[selectedId] ?? null : null;

  function handleSelect(id: string) {
    playSelect();
    setSelectedId(id);
  }

  function handleRequestBuild(facilityId: string, cost: number, duration: number, targetLevel: number) {
    const facility = state.facilities[facilityId];
    if (!facility) return;
    playSelect();
    setPending({ type: "build", facilityId, facilityName: facility.name, cost, duration, targetLevel });
  }

  function handleRequestUpgrade(facilityId: string, cost: number, duration: number, targetLevel: number) {
    const facility = state.facilities[facilityId];
    if (!facility) return;
    playSelect();
    setPending({ type: "upgrade", facilityId, facilityName: facility.name, cost, duration, targetLevel });
  }

  function handleConfirm() {
    if (!pending) return;
    playSelect();
    if (pending.type === "build") {
      onStateChange((s) => startBuildFacility(s, pending.facilityId));
    } else {
      onStateChange((s) => startUpgradeFacility(s, pending.facilityId));
    }
    setPending(null);
  }

  return (
    <>
      <div className="fac-layout">
        {/* Facility list */}
        <div className="fac-list">
          {facilityList.map((facility) => {
            const isUnbuilt = facility.status === "unbuilt";
            const isConstructing = facility.status === "constructing" || facility.status === "upgrading";
            const isSelected = selectedId === facility.id;
            return (
              <button
                key={facility.id}
                className={[
                  "fac-card",
                  isSelected ? "selected" : "",
                  isUnbuilt ? "unbuilt" : "",
                ].filter(Boolean).join(" ")}
                onMouseEnter={playHover}
                onClick={() => handleSelect(facility.id)}
              >
                <span className="fac-card-name">{facility.name}</span>
                <span className="fac-card-level">
                  {isUnbuilt ? "건설 전" : isConstructing ? "공사 중" : `Lv${facility.level}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="fac-detail">
            <FacilityDetail
              facility={selected}
              gold={state.guild.gold}
              onRequestBuild={handleRequestBuild}
              onRequestUpgrade={handleRequestUpgrade}
            />
          </div>
        ) : (
          <div className="fac-detail fac-detail-empty">
            <span>시설을 선택하세요.</span>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {pending && (
        <div className="fac-confirm-overlay">
          <div className="fac-confirm-modal">
            <h3 className="fac-confirm-title">
              {pending.type === "build"
                ? `${pending.facilityName} 건설`
                : `${pending.facilityName} Lv${pending.targetLevel} 업그레이드`}
            </h3>
            <div className="fac-confirm-info">
              <div className="fac-confirm-row">
                <span>{pending.type === "build" ? "건설 비용" : "업그레이드 비용"}</span>
                <strong>{fmt(pending.cost)} G</strong>
              </div>
              <div className="fac-confirm-row">
                <span>공사 기간</span>
                <strong>{pending.duration}일</strong>
              </div>
            </div>
            <div className="fac-confirm-actions">
              <button className="fac-confirm-cancel" onMouseEnter={playHover} onClick={() => setPending(null)}>
                취소
              </button>
              <button className="fac-confirm-ok primary" onMouseEnter={playHover} onClick={handleConfirm}>
                {pending.type === "build" ? "건설 시작" : "업그레이드 시작"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FacilityDetail({
  facility,
  gold,
  onRequestBuild,
  onRequestUpgrade,
}: {
  facility: Facility;
  gold: number;
  onRequestBuild: (facilityId: string, cost: number, duration: number, targetLevel: number) => void;
  onRequestUpgrade: (facilityId: string, cost: number, duration: number, targetLevel: number) => void;
}) {
  const def = FACILITY_DEFS[facility.id];
  const isUnbuilt = facility.status === "unbuilt";
  const isConstructing = facility.status === "constructing";
  const isUpgrading = facility.status === "upgrading";
  const isInProgress = isConstructing || isUpgrading;
  const isMaxLevel = facility.level >= facility.maxLevel;

  const currentEffects = !isUnbuilt && !isInProgress && def
    ? def.levels[facility.level - 1].effects
    : (!isUnbuilt && isUpgrading && def ? def.levels[facility.level - 1].effects : []);

  const nextDef = !isMaxLevel && !isInProgress && def
    ? def.levels[isUnbuilt ? 0 : facility.level]
    : null;

  const nextCost = nextDef?.cost ?? 0;
  const nextDuration = nextDef?.constructionDays ?? 0;
  const nextEffects = nextDef?.effects ?? [];
  const nextTargetLevel = isUnbuilt ? 1 : (facility.level + 1);
  const canAfford = gold >= nextCost;
  const shortfall = nextCost - gold;

  // Construction progress display
  const progressPct = facility.constructionDurationDays > 0
    ? Math.round((facility.constructionProgressDays / facility.constructionDurationDays) * 100)
    : 0;
  const remainingDays = facility.constructionDurationDays - facility.constructionProgressDays;

  return (
    <div className="fac-detail-inner">
      <div className="fac-detail-head">
        <h2 className="fac-detail-title">{facility.name}</h2>
        <span className={`fac-detail-badge${isUnbuilt ? " unbuilt" : isInProgress ? " constructing" : ""}`}>
          {isUnbuilt
            ? "건설 전"
            : isConstructing
            ? `건설 중 Lv${facility.targetLevel}`
            : isUpgrading
            ? `업그레이드 중 Lv${facility.targetLevel}`
            : `Lv${facility.level} / ${facility.maxLevel}`}
        </span>
      </div>

      <p className="fac-detail-desc">{facility.description}</p>

      {/* Construction progress */}
      {isInProgress && (
        <div className="fac-section">
          <p className="fac-section-label">{isConstructing ? "건설 진행" : "업그레이드 진행"}</p>
          <div className="fac-progress-bar">
            <div className="fac-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="fac-progress-label">
            {facility.constructionProgressDays}일 경과 / {facility.constructionDurationDays}일 ({remainingDays}일 남음)
          </p>
        </div>
      )}

      {/* Current effects (when active) */}
      {!isUnbuilt && !isInProgress && currentEffects.length > 0 && (
        <div className="fac-section">
          <p className="fac-section-label">현재 효과</p>
          <ul className="fac-effects-list">
            {currentEffects.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Daily maintenance cost */}
      {!isUnbuilt && def && (
        <div className="fac-section fac-maintenance-section">
          <p className="fac-section-label">일일 유지비</p>
          <div className="fac-maintenance-row">
            {facility.status === "active" ? (
              <>
                <span className="fac-maintenance-current">Lv{facility.level} — {fmt(def.maintenanceCostByLevel[facility.level - 1])} G / 일</span>
                {facility.level < facility.maxLevel && (
                  <span className="fac-maintenance-next">→ Lv{facility.level + 1} 업그레이드 시 {fmt(def.maintenanceCostByLevel[facility.level])} G</span>
                )}
              </>
            ) : (
              <span className="fac-maintenance-current">공사 완료 후 {fmt(def.maintenanceCostByLevel[(facility.targetLevel ?? 1) - 1])} G / 일</span>
            )}
          </div>
        </div>
      )}

      {/* Next level / build section */}
      {!isInProgress && !isMaxLevel && nextDef && (
        <div className="fac-section fac-next-section">
          <p className="fac-section-label">
            {isUnbuilt ? "건설 효과" : `Lv${facility.level + 1} 효과`}
          </p>
          <ul className="fac-effects-list next">
            {nextEffects.map((e) => <li key={e}>{e}</li>)}
          </ul>
          <div className="fac-cost-row">
            <span className="fac-cost-label">
              {isUnbuilt ? "건설 비용" : "업그레이드 비용"}
            </span>
            <span className={`fac-cost-value${!canAfford ? " insufficient" : ""}`}>
              {fmt(nextCost)} G
              {!canAfford && <span className="fac-shortfall"> ({fmt(shortfall)} G 부족)</span>}
            </span>
          </div>
          <div className="fac-cost-row" style={{ marginTop: 4 }}>
            <span className="fac-cost-label">공사 기간</span>
            <span className="fac-cost-value" style={{ fontSize: "var(--font-body)", color: "#8aaa8e" }}>
              {nextDuration}일
            </span>
          </div>
          <button
            className={`fac-action-btn${canAfford ? " primary" : ""}`}
            onMouseEnter={playHover}
            onClick={() =>
              isUnbuilt
                ? onRequestBuild(facility.id, nextCost, nextDuration, nextTargetLevel)
                : onRequestUpgrade(facility.id, nextCost, nextDuration, nextTargetLevel)
            }
            disabled={!canAfford}
          >
            {isUnbuilt ? "건설" : "업그레이드"}
          </button>
        </div>
      )}

      {!isInProgress && isMaxLevel && (
        <div className="fac-section">
          <p className="fac-max-notice">최대 레벨에 도달했습니다.</p>
        </div>
      )}
    </div>
  );
}
