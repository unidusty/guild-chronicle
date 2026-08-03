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

      {/* Personality text */}
      <div className="rec-detail-section">
        <p className="rec-detail-label">지원 동기</p>
        <p className="rec-detail-text">{applicant.motivation}</p>
      </div>

      <div className="rec-detail-section">
        <p className="rec-detail-label">첫인상</p>
        <p className="rec-detail-text">{applicant.firstImpression}</p>
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

      {/* Recruitment Event — only shown for special (non-basic) events */}
      {applicant.recruitmentEvent && (() => {
        const ctx = applicant.recruitmentEvent;
        const def = RECRUITMENT_EVENT_DEFINITIONS.find((d) => d.id === ctx.eventId);
        if (def?.isBasic) return null;
        const relatedNames = ctx.relatedApplicantIds
          .map((rid) => allApplicants.find((a) => a.id === rid)?.name)
          .filter(Boolean) as string[];
        return (
          <div className="rec-event-section">
            <p className="rec-event-section-title">특별 지원</p>
            <p className="rec-event-name">{def?.name ?? ctx.eventType}</p>
            {def && <p className="rec-event-desc">{def.description}</p>}
            {def && <p className="rec-event-feature">{def.featureText}</p>}
            {def && (
              <div className="rec-event-adv-dis">
                <div className="rec-event-row">
                  <span className="rec-event-row-label">장점</span>
                  <span className="rec-event-adv">{def.advantageText}</span>
                </div>
                <div className="rec-event-row">
                  <span className="rec-event-row-label">단점</span>
                  <span className="rec-event-dis">{def.disadvantageText}</span>
                </div>
              </div>
            )}
            {relatedNames.length > 0 && (
              <div className="rec-event-row">
                <span className="rec-event-row-label">관계</span>
                <span className="rec-event-sibling">{relatedNames.join(", ")} 와(과) 함께 지원</span>
              </div>
            )}
          </div>
        );
      })()}

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
