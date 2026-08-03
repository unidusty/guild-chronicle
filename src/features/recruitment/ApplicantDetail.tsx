import type { EntityId, RecruitmentApplicant, RecruitmentEventType, Stats } from "../../types/game";
import { jobLabels, raceLabels, genderLabels, statLabels } from "../../game/constants/labels";
import { RECRUITMENT_EVENT_DEFINITIONS } from "../../data/recruitmentEventData";
import { MAX_STAT, STAT_TEMPLATES } from "../../data/recruitmentData";

interface Props {
  applicant: RecruitmentApplicant | null;
  allApplicants: RecruitmentApplicant[];
  classes: Record<EntityId, { primaryStats: Array<keyof Stats> }>;
  onAccept: () => void;
  onReject: () => void;
  onHold: () => void;
  onReleaseHold: () => void;
}

const ATMOSPHERE_MAP: Partial<Record<RecruitmentEventType, string>> = {
  royal_recommendation:        "royal",
  noble_family:                "royal",
  siblings:                    "bond",
  lover:                       "bond",
  fallen_knight:               "shadow",
  guild_survivor:              "shadow",
  fallen_noble:                "shadow",
  debt_motivated:              "shadow",
  suspicious_applicant:        "mystery",
  rival:                       "mystery",
  young_prodigy:               "bright",
  retired_knight:              "veteran",
  retired_adventurer:          "veteran",
  mentor:                      "veteran",
};

function getAtmosphere(type: RecruitmentEventType | undefined): string | null {
  if (!type) return null;
  return ATMOSPHERE_MAP[type] ?? null;
}

export default function ApplicantDetail({ applicant, allApplicants, onAccept, onReject, onHold, onReleaseHold }: Props) {
  if (!applicant) {
    return (
      <div className="rec-detail-pane rec-detail-empty">
        <p>목록에서 지원자를 선택하세요.</p>
      </div>
    );
  }

  const initials = applicant.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  const template = STAT_TEMPLATES[applicant.classId];
  const primarySet = new Set<keyof Stats>(template?.primary ?? []);
  const isHeld = applicant.status === "held";

  const ctx = applicant.recruitmentEvent;
  const def = ctx ? RECRUITMENT_EVENT_DEFINITIONS.find((d) => d.id === ctx.eventId) : undefined;
  const relatedNames = ctx?.relatedApplicantIds
    .map((rid) => allApplicants.find((a) => a.id === rid)?.name)
    .filter(Boolean) as string[] ?? [];

  const atmosphere = getAtmosphere(ctx?.eventType);

  return (
    <div className={`rec-detail-pane${atmosphere ? ` rda-${atmosphere}` : ""}`}>

      {/* ── 등장 연출 ──────────────────────────────────────────────── */}
      {def?.arrivalScene && (
        <div className="rd-arrival-scene">
          <p className="rd-arrival-text">{def.arrivalScene}</p>
        </div>
      )}

      {/* ── 히어로: 대형 초상화 + 신원 ──────────────────────────────── */}
      <div className="rd-hero">
        <div className="rd-portrait-lg">
          {applicant.portrait
            ? <img className="rd-portrait-img" src={applicant.portrait} alt={applicant.name} />
            : <span className="rd-portrait-initials">{initials}</span>}
        </div>
        <div className="rd-hero-info">
          <p className="rd-name-lg">{applicant.name}</p>
          <p className="rd-class-lg">{jobLabels[applicant.classId] ?? applicant.classId}</p>
          <p className="rd-meta">{raceLabels[applicant.race]} · {genderLabels[applicant.gender]} · {applicant.age}세</p>
          <p className="rd-personality">{applicant.personalityLabel}</p>
          {def && <span className="rd-event-badge">{def.name}</span>}
        </div>
      </div>

      {/* ── 스토리 카드 ──────────────────────────────────────────────── */}
      <div className="rd-story-grid">
        {def?.background && (
          <div className="rd-story-card">
            <p className="rd-story-label">가입 배경</p>
            <p className="rd-story-text">{def.background}</p>
          </div>
        )}
        {def?.currentSituation && (
          <div className="rd-story-card">
            <p className="rd-story-label">현재 상황</p>
            <p className="rd-story-text">{def.currentSituation}</p>
          </div>
        )}
        <div className="rd-story-card">
          <p className="rd-story-label">지원 동기</p>
          <p className="rd-story-text">{applicant.motivation}</p>
        </div>
        <div className="rd-story-card">
          <p className="rd-story-label">첫인상</p>
          <p className="rd-story-text">{applicant.firstImpression}</p>
        </div>
      </div>

      {/* ── 장점 / 단점 ──────────────────────────────────────────────── */}
      {def && (
        <div className="rd-mid">
          <div className="rd-adv-dis">
            <div className="rd-adv-card">
              <p className="rd-adv-label">장점</p>
              <p className="rd-adv-text">{def.advantageText}</p>
            </div>
            <div className="rd-dis-card">
              <p className="rd-dis-label">단점</p>
              <p className="rd-dis-text">{def.disadvantageText}</p>
            </div>
          </div>

          {(def?.recommenderText || relatedNames.length > 0 || def?.specialNote) && (
            <div className="rd-special-extras">
              {def?.recommenderText && (
                <div className="rd-field">
                  <span className="rd-field-label">추천인</span>
                  <span className="rd-field-value rd-recommender">{def.recommenderText}</span>
                </div>
              )}
              {relatedNames.length > 0 && (
                <div className="rd-field">
                  <span className="rd-field-label">함께 지원</span>
                  <span className="rd-field-value rd-sibling">{relatedNames.join(", ")}</span>
                </div>
              )}
              {def?.specialNote && (
                <div className="rd-special-note">
                  <p className="rd-special-note-label">특별 사정</p>
                  <p className="rd-special-note-text">{def.specialNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 능력치 ─────────────────────────────────────────────────── */}
      <div className="rd-stats-section">
        <p className="rd-section-label">능력치</p>
        <div className="rec-detail-stats">
          {(Object.keys(applicant.stats) as Array<keyof Stats>).map((stat) => {
            const val = applicant.stats[stat];
            const isPrimary = primarySet.has(stat);
            return (
              <div className="detail-stat-row" key={stat}>
                <span className={isPrimary ? "stat-label primary" : "stat-label"}>{statLabels[stat]}</span>
                <div className="stat-bar">
                  <i className={isPrimary ? "primary" : ""} style={{ width: `${(val / MAX_STAT) * 100}%` }} />
                </div>
                <b className={isPrimary ? "stat-val primary" : "stat-val"}>{val}</b>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 승인·보류·반려 버튼 ────────────────────────────────────── */}
      <div className="rec-action-bar">
        {isHeld ? (
          <>
            <button className="rec-action-accept" onClick={onAccept}>승인</button>
            <button className="rec-action-release" onClick={onReleaseHold}>보류 해제</button>
            <button className="rec-action-reject" onClick={onReject}>반려</button>
          </>
        ) : (
          <>
            <button className="rec-action-accept" onClick={onAccept}>승인</button>
            <button className="rec-action-hold" onClick={onHold}>보류</button>
            <button className="rec-action-reject" onClick={onReject}>반려</button>
          </>
        )}
      </div>
    </div>
  );
}
