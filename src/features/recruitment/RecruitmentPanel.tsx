import type { Adventurer, AdventurerClass, EntityId, Stats } from "../../types/game";
import { getPortraitPath } from "../../game/assets/portraits";
import { getPotentialGrade, genderLabels, raceLabels, statLabels } from "../../game/constants/labels";
import { getTraitName } from "../../game/generator/traits";

interface Props {
  candidates: Adventurer[];
  classes: Record<EntityId, AdventurerClass>;
  recruited: boolean;
  onRecruit: (adventurer: Adventurer) => void;
  onRefresh: () => void;
}

export default function RecruitmentPanel({ candidates, classes, recruited, onRecruit, onRefresh }: Props) {
  return (
    <section className="panel recruit-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">RECRUITMENT</p>
          <h2>오늘의 영입 후보</h2>
        </div>
        <button className="text-button" onClick={onRefresh}>새 후보 찾기 ↺</button>
      </div>

      {candidates.length === 0 ? (
        <p className="recruit-empty">후보가 없습니다. 새 후보 찾기를 눌러주세요.</p>
      ) : (
        <div className="candidate-grid">
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              adventurer={c}
              classes={classes}
              disabled={recruited}
              onRecruit={onRecruit}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface CardProps {
  adventurer: Adventurer;
  classes: Record<EntityId, AdventurerClass>;
  disabled: boolean;
  onRecruit: (adventurer: Adventurer) => void;
}

function CandidateCard({ adventurer: c, classes, disabled, onRecruit }: CardProps) {
  const cls = classes[c.classId];
  const potGrade = getPotentialGrade(c.potential);
  const initials = c.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const portraitPath = getPortraitPath(c.portraitId, c.race, c.gender);
  const primaryStats = new Set(cls?.primaryStats ?? []);

  return (
    <article className="candidate-card">

      {/* ── 헤더: 초상화 + 이름·잠재력·메타 ── */}
      <div className="candidate-header">
        <div className="portrait large">
          {portraitPath ? <img src={portraitPath} alt={c.name} /> : initials}
        </div>
        <div className="candidate-identity">
          <div className="candidate-name-row">
            <strong className="candidate-name">{c.name}</strong>
            <span className={`pot-badge pot-${potGrade.toLowerCase()}`}>{potGrade}</span>
          </div>
          <span className="candidate-meta">
            {raceLabels[c.race]} · {genderLabels[c.gender]} · {c.age}세
          </span>
          <span className="candidate-class">{cls?.name ?? "미정"}</span>
        </div>
      </div>

      {/* ── 능력치 ── */}
      <div className="candidate-stats">
        {(Object.keys(c.stats) as Array<keyof Stats>).map((stat) => {
          const val = c.stats[stat];
          const isPrimary = primaryStats.has(stat);
          return (
            <div className="stat-row" key={stat}>
              <span className={isPrimary ? "stat-label primary" : "stat-label"}>{statLabels[stat]}</span>
              <div className="stat-bar">
                <i className={isPrimary ? "primary" : ""} style={{ width: `${(val / 18) * 100}%` }} />
              </div>
              <b className={isPrimary ? "stat-val primary" : "stat-val"}>{val}</b>
            </div>
          );
        })}
      </div>

      {/* ── 특성 ── */}
      <div className="trait-list">
        {c.traits.map((t) => (
          <span key={t.id} className="trait-tag">{getTraitName(t.id)}</span>
        ))}
      </div>

      {/* ── 영입 버튼: 카드 하단 고정 ── */}
      <button
        className="recruit-btn"
        onClick={() => onRecruit(c)}
        disabled={disabled}
      >
        {disabled ? "선발 마감" : "영입"}
      </button>

    </article>
  );
}
