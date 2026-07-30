import type { Adventurer, GameState, Stats } from "../../types/game";
import { getPortraitPath } from "../../game/assets/portraits";
import {
  adventurerStatusLabels,
  genderLabels,
  getPotentialGrade,
  getStatusTone,
  raceLabels,
  roleLabels,
  statLabels,
} from "../../game/constants/labels";
import { getTraitName } from "../../game/generator/traits";
import {
  formatShortGameDate,
  getAdventurerBio,
  getAdventurerChronicle,
  getAdventurerLocationLabel,
} from "../../game/simulation/selectors";

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
  const keyTraits = adv.traits.slice(0, 3);
  const chronicle = getAdventurerChronicle(state, adv.id, 5);
  const bio = getAdventurerBio(adv, cls?.name);
  const guildParty = adv.partyId ? state.parties[adv.partyId] : null;
  const currentQuest = adv.currentQuestId ? state.quests[adv.currentQuestId] : null;

  return (
    <div className="panel adv-detail">
      <button className="detail-close" onClick={onClose} aria-label="닫기">×</button>

      {/* ── 좌측 캐릭터 카드 ── */}
      <div className="adv-char-card">
        <div className="portrait bust">
          {portraitPath ? <img src={portraitPath} alt={adv.name} /> : initials}
        </div>

        <div className="char-nameplate">
          <h3 className="char-name">{adv.name}</h3>
          <p className="char-class-meta">{raceLabels[adv.race]} · {cls?.name ?? "미정"}</p>
        </div>

        <div className="char-grades">
          <div className="grade-item">
            <label>등급</label>
            <span className="adv-rank-badge">{adv.rank}</span>
          </div>
          <div className="grade-item">
            <label>잠재력</label>
            <span className={`pot-badge pot-${potGrade.toLowerCase()}`}>{potGrade}</span>
          </div>
        </div>

        <div className="char-status-block">
          <div className="char-status-row">
            <label>상태</label>
            <span className={`status ${statusTone}`}>{adventurerStatusLabels[adv.status]}</span>
          </div>
          <div className="char-status-row">
            <label>위치</label>
            <span className="char-location">{locationLabel}</span>
          </div>
          <div className="char-status-row">
            <label>컨디션</label>
            <span className={adv.injuryIds.length > 0 ? "char-condition warning" : "char-condition"}>
              {adv.injuryIds.length > 0 ? `부상 ${adv.injuryIds.length}건` : "이상 없음"}
            </span>
          </div>
        </div>

        <div className="char-belonging">
          <div className="char-belonging-header">
            <span>소속감</span>
            <span className="char-belonging-val">{adv.belonging}</span>
          </div>
          <div className="belonging-bar">
            <i style={{ width: `${adv.belonging}%` }} />
          </div>
        </div>

        {keyTraits.length > 0 && (
          <div className="char-key-traits">
            <p className="char-section-label">대표 특성</p>
            <div className="trait-list">
              {keyTraits.map((t) => (
                <span key={t.id} className="trait-tag">{getTraitName(t.id)}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 우측 정보 패널 ── */}
      <div className="adv-info-panel">

        {/* ── Row 1: 기본 정보 | 능력치 ── */}
        <div className="detail-row detail-row-2">
          <div className="info-card">
            <p className="info-card-title">기본 정보</p>
            <div className="info-rows">
              <div className="info-row"><label>성별</label><span>{genderLabels[adv.gender]}</span></div>
              <div className="info-row"><label>나이</label><span>{adv.age}세</span></div>
              <div className="info-row"><label>성격</label><span>{adv.personality}</span></div>
              <div className="info-row"><label>출신</label><span>{adv.background}</span></div>
            </div>
          </div>

          <div className="info-card">
            <p className="info-card-title">능력치</p>
            <div className="detail-stat-list">
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
          </div>
        </div>

        {/* ── Row 2: 캐릭터 설명 (전체 폭) ── */}
        <div className="detail-row detail-row-full">
          <div className="info-card bio-card">
            <p className="char-bio">{bio}</p>
          </div>
        </div>

        {/* ── Row 3: 전투 능력 | 소속 정보 | 특성 ── */}
        <div className="detail-row detail-row-3">
          <div className="info-card">
            <p className="info-card-title">전투 능력</p>
            <div className="combat-profile">
              {cls && (
                <div className="combat-role-row">
                  <label>역할</label>
                  <span className="role-tag">{roleLabels[cls.role]}</span>
                </div>
              )}
              <div className="detail-stat-list">
                {(cls?.primaryStats ?? []).map((stat) => {
                  const val = adv.stats[stat];
                  return (
                    <div className="detail-stat-row" key={stat}>
                      <span className="stat-label primary">{statLabels[stat]}</span>
                      <div className="stat-bar">
                        <i className="primary" style={{ width: `${(val / 18) * 100}%` }} />
                      </div>
                      <b className="stat-val primary">{val}</b>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="info-card">
            <p className="info-card-title">소속 정보</p>
            <div className="info-rows">
              <div className="info-row"><label>파티</label><span>{guildParty?.name ?? "미배정"}</span></div>
              <div className="info-row"><label>의뢰</label><span>{currentQuest?.title ?? "없음"}</span></div>
              <div className="info-row"><label>가입</label><span>{formatShortGameDate(adv.joinedAt)}</span></div>
            </div>
          </div>

          <div className="info-card">
            <p className="info-card-title">특성</p>
            <div className="trait-list adv-trait-list">
              {adv.traits.map((t) => (
                <span key={t.id} className="trait-tag">{getTraitName(t.id)}</span>
              ))}
              {adv.traits.length === 0 && <span className="info-empty">없음</span>}
            </div>
          </div>
        </div>

        {/* ── Row 4: 최근 활동 (전체 폭) ── */}
        <div className="detail-row detail-row-full">
          <div className="info-card activity-card">
            <p className="info-card-title">최근 활동</p>
            {chronicle.length === 0 ? (
              <p className="info-empty">기록된 활동이 없습니다.</p>
            ) : (
              <div className="activity-list">
                {chronicle.map((entry) => (
                  <div className="activity-item" key={entry.id}>
                    <time>{formatShortGameDate(entry.date)}</time>
                    <p>{entry.title} — {entry.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
