import { useState, type Dispatch, type SetStateAction } from "react";
import type { Facility, GameState } from "../../types/game";
import {
  acceptApplicant,
  holdApplicant,
  rejectApplicant,
  releaseHold,
} from "../../game/simulation/recruitment";
import { jobLabels } from "../../game/constants/labels";
import ApplicantList from "./ApplicantList";
import ApplicantDetail from "./ApplicantDetail";
import RecruitmentActionModal from "./RecruitmentActionModal";

type ActionKind = "accept" | "reject" | "hold" | "release_hold";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
}

export default function RecruitmentTab({ state, onStateChange }: Props) {
  const facility = state.facilities["facility-recruitment"] as Facility | undefined;
  const status = facility?.status ?? "unbuilt";

  if (status === "unbuilt") {
    return (
      <div className="gh-recruitment-placeholder locked">
        <p className="gh-recruitment-lock-icon">🔒</p>
        <p className="gh-recruitment-lock-msg">가입 심사실이 건설되지 않았습니다.</p>
        <p className="gh-recruitment-lock-hint">시설 탭에서 가입 심사실을 건설하세요.</p>
      </div>
    );
  }

  if (status === "constructing" || status === "upgrading") {
    const pct = facility && facility.constructionDurationDays > 0
      ? Math.round((facility.constructionProgressDays / facility.constructionDurationDays) * 100)
      : 0;
    const remaining = facility ? facility.constructionDurationDays - facility.constructionProgressDays : 0;
    return (
      <div className="gh-recruitment-placeholder">
        <p className="gh-recruitment-lock-msg">
          {status === "constructing"
            ? `가입 심사실을 건설하고 있습니다. (Lv${facility?.targetLevel ?? 1})`
            : `가입 심사실을 업그레이드하고 있습니다. (Lv${facility?.targetLevel ?? "?"})`}
        </p>
        <div className="gh-recruitment-progress-bar">
          <div className="gh-recruitment-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="gh-recruitment-lock-hint">{pct}% 완료 · {remaining}일 남음</p>
      </div>
    );
  }

  return <ActiveRecruitmentTab state={state} onStateChange={onStateChange} />;
}

function ActiveRecruitmentTab({ state, onStateChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ kind: ActionKind; id: string } | null>(null);

  const applicants = state.recruitment.applicants;
  const selectedApplicant = selectedId
    ? applicants.find((a) => a.id === selectedId) ?? null
    : null;

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function requestAction(kind: ActionKind) {
    if (!selectedId) return;
    setPendingAction({ kind, id: selectedId });
  }

  function handleConfirm() {
    if (!pendingAction) return;
    const { kind, id } = pendingAction;
    setPendingAction(null);

    const fn =
      kind === "accept"       ? acceptApplicant :
      kind === "reject"       ? rejectApplicant :
      kind === "hold"         ? holdApplicant :
      /* release_hold */        releaseHold;

    onStateChange((prev) => fn(prev, id));

    // After accept/reject, auto-select the next pending applicant
    if (kind === "accept" || kind === "reject") {
      const remaining = state.recruitment.applicants.filter(
        (a) => a.id !== id && (a.status === "pending" || a.status === "held"),
      );
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  const modalApplicant = pendingAction
    ? applicants.find((a) => a.id === pendingAction.id) ?? null
    : null;

  return (
    <div className="rec-layout">
      <ApplicantList
        applicants={applicants}
        history={state.recruitment.history}
        classes={state.classes}
        selectedId={selectedId}
        currentDate={state.currentDate}
        onSelect={handleSelect}
      />
      <ApplicantDetail
        applicant={selectedApplicant}
        classes={state.classes}
        onAccept={() => requestAction("accept")}
        onReject={() => requestAction("reject")}
        onHold={() => requestAction("hold")}
        onReleaseHold={() => requestAction("release_hold")}
      />

      {pendingAction && modalApplicant && (
        <RecruitmentActionModal
          applicantName={modalApplicant.name}
          classLabel={jobLabels[modalApplicant.classId] ?? modalApplicant.classId}
          kind={pendingAction.kind}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
