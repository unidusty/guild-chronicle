import type { EntityId, GameDate, RecruitmentApplicant, RecruitmentHistoryItem } from "../../types/game";
import { jobLabels, raceLabels, genderLabels, recruitmentEventTypeLabels } from "../../game/constants/labels";
import { RECRUITMENT_EVENT_DEFINITIONS } from "../../data/recruitmentEventData";
import { toAbsoluteDay } from "../../game/simulation/recruitment";

const ACTION_LABEL: Record<string, string> = {
  accepted: "승인",
  rejected: "반려",
  held:     "보류",
  expired:  "만료",
};

interface Props {
  applicants: RecruitmentApplicant[];
  history: RecruitmentHistoryItem[];
  classes: Record<EntityId, unknown>;
  selectedId: string | null;
  currentDate: GameDate;
  onSelect: (id: string) => void;
}

export default function ApplicantList({ applicants, history, selectedId, currentDate, onSelect }: Props) {
  const todayAbs = toAbsoluteDay(currentDate);
  const active = applicants.filter((a) => a.status === "pending" || a.status === "held");
  const recentHistory = history.slice(0, 8);

  return (
    <div className="rec-list-pane">
      <p className="rec-list-heading">지원자 목록 <span className="rec-list-count">{active.length}</span></p>

      {active.length === 0 ? (
        <p className="rec-list-empty">현재 심사 대기 중인 지원자가 없습니다.</p>
      ) : (
        <div className="rec-card-list">
          {active.map((a) => {
            const daysLeft = a.expiresDay - todayAbs;
            const isHeld = a.status === "held";
            const holdLeft = isHeld && a.holdUntilDay != null ? a.holdUntilDay - todayAbs : null;
            const initials = a.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
            return (
              <button
                key={a.id}
                className={`rec-applicant-card${selectedId === a.id ? " selected" : ""}${isHeld ? " held" : ""}`}
                onClick={() => onSelect(a.id)}
              >
                <div className="portrait portrait-md">
                  {a.portrait ? <img src={a.portrait} alt={a.name} /> : initials}
                </div>
                <div className="rec-card-body">
                  <div className="rec-card-top">
                    <strong className="rec-card-name">{a.name}</strong>
                    <span className={`rec-card-status${isHeld ? " held" : ""}`}>
                      {isHeld ? "보류 중" : "심사 대기"}
                    </span>
                  </div>
                  <span className="rec-card-meta">
                    {jobLabels[a.classId] ?? a.classId} · {raceLabels[a.race]} {genderLabels[a.gender]} · {a.age}세
                  </span>
                  {a.recruitmentEvent && (() => {
                    const def = RECRUITMENT_EVENT_DEFINITIONS.find((d) => d.id === a.recruitmentEvent!.eventId);
                    if (def?.isBasic) return null;
                    return (
                      <span className="rec-event-badge">
                        특별 지원 · {recruitmentEventTypeLabels[a.recruitmentEvent!.eventType] ?? a.recruitmentEvent!.eventType}
                      </span>
                    );
                  })()}
                  <span className="rec-card-expiry">
                    {isHeld && holdLeft != null
                      ? `보류 ${holdLeft}일 후 해제 · 만료 ${daysLeft}일`
                      : `만료까지 ${daysLeft}일`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {recentHistory.length > 0 && (
        <div className="rec-history-section">
          <p className="rec-history-heading">최근 심사 기록</p>
          {recentHistory.map((h) => (
            <div key={h.id} className={`rec-history-item ${h.action}`}>
              <span className="rec-history-name">{h.applicantName}</span>
              <span className="rec-history-meta">{jobLabels[h.classId] ?? h.classId}</span>
              <span className={`rec-history-action ${h.action}`}>{ACTION_LABEL[h.action] ?? h.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
