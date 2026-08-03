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
      {/* Header */}
      <div className="rec-detail-header">
        <div className="portrait bust rec-detail-bust">
          {applicant.portrait
            ? <img src={applicant.portrait} alt={applicant.name} />
            : <span className="rec-detail-initials">{initials}</span>}
        </div>
        <div className="rec-detail-identity">
          <p className="rec-detail-name">{applicant.name}</p>
          <p className="rec-detail-meta">
            {raceLabels[applicant.race]} · {genderLabels[applicant.gender]} · {applicant.age}세
          </p>
          <p className="rec-detail-class">{jobLabels[applicant.classId] ?? applicant.classId}</p>
          <p className="rec-detail-personality">{applicant.personalityLabel}</p>
        </div>
      </div>

      {/* 가입 신청 정보 — all applicants */}
      <div className={`rec-bg-section${isSpecial ? " special" : ""}`}>
        <div className="rec-bg-heading">
          <span className="rec-bg-heading-text">가입 신청</span>
          {isSpecial && <span className="rec-event-badge">특별 지원</span>}
        </div>

        {/* 가입 배경 */}
        {def && (
          <div className="rec-bg-row">
            <span className="rec-bg-label">가입 배경</span>
            <span className="rec-bg-value">{def.name}</span>
          </div>
        )}

        {/* 현재 상황 */}
        {def?.featureText && (
          <div className="rec-bg-row">
            <span className="rec-bg-label">현재 상황</span>
            <span className="rec-bg-value">{def.featureText}</span>
          </div>
        )}

        {/* 상세 배경 — special events only */}
        {isSpecial && def?.description && (
          <div className="rec-bg-row">
            <span className="rec-bg-label">상세 배경</span>
            <span className="rec-bg-value">{def.description}</span>
          </div>
        )}

        {/* 추천인 — if present */}
        {def?.recommenderText && (
          <div className="rec-bg-row">
            <span className="rec-bg-label">추천인</span>
            <span className="rec-bg-value rec-bg-recommender">{def.recommenderText}</span>
          </div>
        )}

        {/* 함께 지원 — siblings etc. */}
        {relatedNames.length > 0 && (
          <div className="rec-bg-row">
            <span className="rec-bg-label">함께 지원</span>
            <span className="rec-bg-value rec-bg-sibling">{relatedNames.join(", ")}</span>
          </div>
        )}

        {/* 지원 동기 */}
        <div className="rec-bg-row">
          <span className="rec-bg-label">지원 동기</span>
          <span className="rec-bg-value">{applicant.motivation}</span>
        </div>

        {/* 첫인상 */}
        <div className="rec-bg-row">
          <span className="rec-bg-label">첫인상</span>
          <span className="rec-bg-value">{applicant.firstImpression}</span>
        </div>

        {/* 장점 / 단점 */}
        {def && (
          <>
            <div className="rec-bg-row">
              <span className="rec-bg-label">장점</span>
              <span className="rec-bg-value rec-bg-adv">{def.advantageText}</span>
            </div>
            <div className="rec-bg-row">
              <span className="rec-bg-label">단점</span>
              <span className="rec-bg-value rec-bg-dis">{def.disadvantageText}</span>
            </div>
          </>
        )}

        {/* 특별 사정 — special events only */}
        {isSpecial && def?.specialNote && (
          <div className="rec-bg-row rec-bg-special-note-row">
            <span className="rec-bg-label">특별 사정</span>
            <span className="rec-bg-value rec-bg-special-note">{def.specialNote}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="rec-detail-section">
        <p className="rec-detail-label">능력치</p>
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

      {/* Actions */}
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
