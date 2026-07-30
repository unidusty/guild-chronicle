import type { Adventurer, GameState, Stats } from "../../types/game";
import { getPortraitPath } from "../../game/assets/portraits";
import {
  adventurerStatusLabels,
  genderLabels,
  getPotentialGrade,
  getStatusTone,
  raceLabels,
  statLabels,
} from "../../game/constants/labels";
import { getTraitName } from "../../game/generator/traits";
import { getAdventurerLocationLabel } from "../../game/simulation/selectors";

interface Props {
  adventurer: Adventurer;
  state: GameState;
  onClose: () => void;
}

export default function AdventurerDetail({ adventurer: adv, state, onClose }: Props) {
  const cls = state.classes[adv.classId];
  const potGrade = getPotentialGrade(adv.potential);
  const statusTone = getStatusTone(adv);
  const locationLabel = getAdventurerLocationLabel(adv, state);
  const initials = adv.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const portraitPath = getPortraitPath(adv.portraitId, adv.race, adv.gender);
  const primaryStats = new Set(cls?.primaryStats ?? []);

  return (
    <div className="panel adv-detail">
      <button className="detail-close" onClick={onClose}>×</button>

      <div className="adv-detail-header">
        <div className="portrait hero">
          {portraitPath ? <img src={portraitPath} alt={adv.name} /> : initials}
        </div>
        <div className="adv-identity">
          <h2>{adv.name}</h2>
          <p className="adv-identity-meta">
            {raceLabels[adv.race]} · {genderLabels[adv.gender]} · {adv.age}세
          </p>
          <p className="adv-identity-class">{cls?.name ?? "미정"}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="adv-rank-badge">{adv.rank}</span>
            <span className={`pot-badge pot-${potGrade.toLowerCase()}`}>{potGrade}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <p className="detail-section-title">ATTRIBUTES · 능력치</p>
        {(Object.keys(adv.stats) as Array<keyof Stats>).map((stat) => {
          const val = adv.stats[stat];
          const isPrimary = primaryStats.has(stat);
          return (
            <div className="detail-stat-row" key={stat}>
              <span className={isPrimary ? "stat-label primary" : "stat-label"}>{statLabels[stat]}</span>
              <div className="stat-bar">
                <i className={isPrimary ? "primary" : ""} style={{ width: `${(val / 18) * 100}%` }} />
              </div>
              <b className={isPrimary ? "stat-val primary" : "stat-val"}>{val}</b>
            </div>
          );
        })}
      </div>

      <div className="detail-section">
        <p className="detail-section-title">TRAITS · 특성</p>
        <div className="trait-list">
          {adv.traits.map((t) => (
            <span key={t.id} className="trait-tag">{getTraitName(t.id)}</span>
          ))}
          {adv.traits.length === 0 && <span style={{ fontSize: "11px", color: "#5e6a60" }}>없음</span>}
        </div>
      </div>

      <div className="detail-section">
        <p className="detail-section-title">CHARACTER · 인물</p>
        <div className="char-grid">
          <div className="char-item">
            <label>성격</label>
            <span>{adv.personality}</span>
          </div>
          <div className="char-item">
            <label>출신</label>
            <span>{adv.background}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <p className="detail-section-title">STATUS · 현재 상태</p>
        <div className="status-location">
          <span className={`status ${statusTone}`}>{adventurerStatusLabels[adv.status]}</span>
          <span className="location-label">{locationLabel}</span>
        </div>
        <div className="belonging-wrap">
          <label>
            길드 소속감
            <span>{adv.belonging}</span>
          </label>
          <div className="belonging-bar">
            <i style={{ width: `${adv.belonging}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
