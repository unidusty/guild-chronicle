import type { EntityId, RecruitmentApplicant, Stats } from "../../types/game";
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
  const isSpecial = def ? !def.isBasic : false;
  const relatedNames = ctx?.relatedApplicantIds
    .map((rid) => allApplicants.find((a) => a.id === rid)?.name)
    .filter(Boolean) as string[] ?? [];

  return (
    <div className="rec-detail-pane">

      {/* ── 상단: 초상화 + 신원·가입 신청 정보 ──────────────────── */}
      <div className="rd-top">
        <div className="rd-portrait">
          {applicant.portrait
            ? <img className="rd-portrait-img" src={applicant.portrait} alt={applicant.name} />
            : <span className="rd-portrait-initials">{initials}</span>}
        </div>

        <div className="rd-info">
          {/* 신원 */}
          <div className="rd-identity">
            <div className="rd-name-row">
              <p className="rd-name">{applicant.name}</p>
              {isSpecial && <span className="rec-event-badge">특별 지원</span>}
            </div>
            <p className="rd-meta">{raceLabels[applicant.race]} · {genderLabels[applicant.gender]} · {applicant.age}세</p>
            <p className="rd-class">{jobLabels[applicant.classId] ?? applicant.classId}</p>
            <p className="rd-personality">{applicant.personalityLabel}</p>
          </div>

          {/* 가입 신청 배경 */}
          <div className="rd-bg">
            <p className="rd-section-label">가입 신청</p>
            {def && (
              <div className="rd-field">
                <span className="rd-field-label">가입 배경</span>
                <span className="rd-field-value">{def.name}</span>
              </div>
            )}
            {def?.featureText && (
              <div className="rd-field">
                <span className="rd-field-label">현재 상황</span>
                <span className="rd-field-value">{def.featureText}</span>
              </div>
            )}
            <div className="rd-field">
              <span className="rd-field-label">지원 동기</span>
              <span className="rd-field-value">{applicant.motivation}</span>
            </div>
            <div className="rd-field">
              <span className="rd-field-label">첫인상</span>
              <span className="rd-field-value">{applicant.firstImpression}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 중단: 장단점 + 특별 정보 ────────────────────────────── */}
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

          {isSpecial && (
            <div className="rd-special-extras">
              {def.description && (
                <div className="rd-field">
                  <span className="rd-field-label">상세 배경</span>
                  <span className="rd-field-value">{def.description}</span>
                </div>
              )}
              {def.recommenderText && (
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
              {def.specialNote && (
                <div className="rd-special-note">
                  <p className="rd-special-note-label">특별 사정</p>
                  <p className="rd-special-note-text">{def.specialNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 하단: 능력치 ─────────────────────────────────────────── */}
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

      {/* ── 승인·보류·반려 버튼 ──────────────────────────────────── */}
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
