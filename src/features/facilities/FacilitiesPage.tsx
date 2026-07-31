import { useState, type Dispatch, type SetStateAction } from "react";
import type { Facility, GameState } from "../../types/game";
import { FACILITY_DEFS } from "../../data/facilityData";
import { buildFacility, upgradeFacility } from "../../game/simulation/facilities";
import { playHover, playSelect } from "../../lib/audio";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
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

  const facilityList = FACILITY_ORDER
    .map((id) => state.facilities[id])
    .filter((f): f is Facility => !!f);

  const selected = selectedId ? state.facilities[selectedId] ?? null : null;

  function handleSelect(id: string) {
    playSelect();
    setSelectedId(id);
  }

  function handleBuild(facilityId: string) {
    playSelect();
    onStateChange((s) => buildFacility(s, facilityId));
  }

  function handleUpgrade(facilityId: string) {
    playSelect();
    onStateChange((s) => upgradeFacility(s, facilityId));
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WESTWIND GUILD · FACILITIES</p>
          <h1>시설 관리</h1>
        </div>
        <div className="top-actions">
          <span className="fac-gold-bar">보유 골드 <strong>{fmt(state.guild.gold)} G</strong></span>
        </div>
      </header>

      <div className="fac-layout">
        {/* Facility list */}
        <div className="fac-list">
          {facilityList.map((facility) => {
            const isUnbuilt = facility.status === "unbuilt";
            const isSelected = selectedId === facility.id;
            return (
              <button
                key={facility.id}
                className={`fac-card${isSelected ? " selected" : ""}${isUnbuilt ? " unbuilt" : ""}`}
                onMouseEnter={playHover}
                onClick={() => handleSelect(facility.id)}
              >
                <span className="fac-card-name">{facility.name}</span>
                <span className="fac-card-level">
                  {isUnbuilt ? "건설 전" : `Lv${facility.level}`}
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
              onBuild={() => handleBuild(selected.id)}
              onUpgrade={() => handleUpgrade(selected.id)}
            />
          </div>
        ) : (
          <div className="fac-detail fac-detail-empty">
            <span>시설을 선택하세요.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FacilityDetail({
  facility,
  gold,
  onBuild,
  onUpgrade,
}: {
  facility: Facility;
  gold: number;
  onBuild: () => void;
  onUpgrade: () => void;
}) {
  const def = FACILITY_DEFS[facility.id];
  const isUnbuilt = facility.status === "unbuilt";
  const isMaxLevel = facility.level >= facility.maxLevel;

  const currentEffects = !isUnbuilt && def ? def.levels[facility.level - 1].effects : [];
  const nextDef = !isMaxLevel && def ? def.levels[isUnbuilt ? 0 : facility.level] : null;
  const nextCost = nextDef?.cost ?? 0;
  const nextEffects = nextDef?.effects ?? [];
  const canAfford = gold >= nextCost;
  const shortfall = nextCost - gold;

  return (
    <div className="fac-detail-inner">
      <div className="fac-detail-head">
        <h2 className="fac-detail-title">{facility.name}</h2>
        <span className={`fac-detail-badge${isUnbuilt ? " unbuilt" : ""}`}>
          {isUnbuilt ? "건설 전" : `Lv${facility.level} / ${facility.maxLevel}`}
        </span>
      </div>

      <p className="fac-detail-desc">{facility.description}</p>

      {!isUnbuilt && currentEffects.length > 0 && (
        <div className="fac-section">
          <p className="fac-section-label">현재 효과</p>
          <ul className="fac-effects-list">
            {currentEffects.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      {!isMaxLevel && nextDef && (
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
              {!canAfford && (
                <span className="fac-shortfall"> ({fmt(shortfall)} G 부족)</span>
              )}
            </span>
          </div>
          <button
            className={`fac-action-btn${canAfford ? " primary" : ""}`}
            onMouseEnter={playHover}
            onClick={isUnbuilt ? onBuild : onUpgrade}
            disabled={!canAfford}
          >
            {isUnbuilt ? "건설" : "업그레이드"}
          </button>
        </div>
      )}

      {isMaxLevel && (
        <div className="fac-section">
          <p className="fac-max-notice">최대 레벨에 도달했습니다.</p>
        </div>
      )}
    </div>
  );
}
