import { useState } from "react";
import type { Adventurer, GameState, Stats } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import {
  adventurerStatusLabels,
  genderLabels,
  getStatusTone,
  raceLabels,
  statLabels,
} from "../../game/constants/labels";
import { getTraitName } from "../../game/generator/traits";
import {
  formatShortGameDate,
  getAdventurerBio,
  getAdventurerChronicle,
  getAdventurerLocationLabel,
} from "../../game/simulation/selectors";

type DetailTab = "info" | "skills" | "equipment" | "traits" | "relations" | "chronicle";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "info",      label: "정보" },
  { id: "skills",    label: "스킬" },
  { id: "equipment", label: "장비" },
  { id: "traits",    label: "특성" },
  { id: "relations", label: "관계" },
  { id: "chronicle", label: "연대기" },
];

const PLACEHOLDER_LABEL: Partial<Record<DetailTab, string>> = {
  skills:    "스킬",
  equipment: "장비",
  traits:    "특성",
  relations: "관계",
  chronicle: "연대기",
};

const COMBAT_RATING_KEYS = ["attack", "defense", "evasion", "accuracy", "survival", "leadership"] as const;
type CombatRatingKey = typeof COMBAT_RATING_KEYS[number];
const COMBAT_RATING_LABELS: Record<CombatRatingKey, string> = {
  attack: "공격", defense: "방어", evasion: "회피", accuracy: "명중", survival: "생존", leadership: "리더십",
};

const COMBAT_TENDENCY_KEYS = ["melee", "ranged", "magic", "survival", "command"] as const;
type CombatTendencyKey = typeof COMBAT_TENDENCY_KEYS[number];
const COMBAT_TENDENCY_LABELS: Record<CombatTendencyKey, string> = {
  melee: "근접전", ranged: "원거리", magic: "마법", survival: "생존력", command: "지휘",
};

function StarRating({ value }: { value: number }) {
  return (
    <span className="star-rating" aria-label={`${value}성`}>
      {"★".repeat(value)}{"☆".repeat(5 - value)}
    </span>
  );
}

interface Props {
  adventurer: Adventurer;
  state: GameState;
  onClose: () => void;
}

export default function AdventurerDetail({ adventurer: adv, state, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("info");

  const cls = state.classes[adv.classId];
  const statusTone = getStatusTone(adv);
  const locationLabel = getAdventurerLocationLabel(adv, state);
  const initials = adv.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const portraitPath = adv.portrait;
  const primaryStats = new Set(cls?.primaryStats ?? []);
  const keyTraits = adv.traits.slice(0, 3);
  const chronicle = getAdventurerChronicle(state, adv.id, 5);
  const bio = getAdventurerBio(adv, cls?.name);
  const guildParty = adv.partyId ? state.parties[adv.partyId] : null;
  const currentQuest = adv.currentQuestId ? state.quests[adv.currentQuestId] : null;

  return (
    <div className="panel adv-detail">
      <button className="detail-close" onMouseEnter={playHover} onClick={() => { playSelect(); onClose(); }} aria-label="닫기">×</button>

      {/* ── 좌측 캐릭터 카드 ── */}
      <div className="adv-char-card">
        {/* 초상화 — 이름/등급 그라데이션 오버레이 포함 */}
        <div className="portrait bust">
          {portraitPath ? <img src={portraitPath} alt={adv.name} /> : initials}
          <div className="portrait-overlay">
            <div className="portrait-name-row">
              <h3 className="char-name">{adv.name}</h3>
              <span className="adv-rank-badge">{adv.rank}</span>
            </div>
            <p className="char-class-meta">{raceLabels[adv.race]} · {cls?.name ?? "미정"}</p>
          </div>
        </div>

        {/* 하단 정보 영역 */}
        <div className="char-card-body">
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

          <div className="char-party-block">
            <div className="char-status-row">
              <label>파티</label>
              <span className="char-location">{guildParty?.name ?? "미배정"}</span>
            </div>
            <div className="char-status-row">
              <label>의뢰</label>
              <span className="char-location">{currentQuest?.title ?? "없음"}</span>
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
      </div>

      {/* ── 우측: 탭 + 콘텐츠 ── */}
      <div className="adv-detail-right">
        <nav className="adv-tab-nav">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`adv-tab${activeTab === tab.id ? " active" : ""}`}
              onMouseEnter={playHover}
              onClick={() => { playSelect(); setActiveTab(tab.id); }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="adv-tab-body">
          {activeTab === "info" ? (
            <>
              {/* Row 1: 기본 정보 | 능력치 */}
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

              {/* Row 2: 캐릭터 설명 */}
              <div className="detail-row detail-row-full">
                <div className="info-card bio-card">
                  <p className="char-bio">{bio}</p>
                </div>
              </div>

              {/* Row 3: 전투 능력 | 전투 성향 | 특성 */}
              <div className="detail-row detail-row-3">
                <div className="info-card">
                  <p className="info-card-title">전투 능력</p>
                  <div className="combat-rating-list">
                    {COMBAT_RATING_KEYS.map((key) => (
                      <div className="combat-rating-row" key={key}>
                        <span className="combat-rating-label">{COMBAT_RATING_LABELS[key]}</span>
                        <StarRating value={adv.combatRatings[key]} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="info-card">
                  <p className="info-card-title">전투 성향</p>
                  <div className="tendency-list">
                    {COMBAT_TENDENCY_KEYS.map((key) => (
                      <div className="tendency-row" key={key}>
                        <span className="tendency-label">{COMBAT_TENDENCY_LABELS[key]}</span>
                        <div className="tendency-bar">
                          <i style={{ width: `${(adv.combatTendencies[key] / 5) * 100}%` }} />
                        </div>
                        <span className="tendency-val">{adv.combatTendencies[key]}</span>
                      </div>
                    ))}
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

              {/* Row 4: 최근 활동 */}
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
                          <div className="activity-content">
                            <strong>{entry.title}</strong>
                            {entry.description && <span>{entry.description}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="tab-placeholder">
              {PLACEHOLDER_LABEL[activeTab]} 정보는 추후 구현 예정입니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
