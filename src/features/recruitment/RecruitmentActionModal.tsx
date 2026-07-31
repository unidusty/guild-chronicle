type ActionKind = "accept" | "reject" | "hold" | "release_hold";

const ACTION_COPY: Record<ActionKind, { title: string; body: string; okLabel: string; okClass: string }> = {
  accept:       { title: "입단 승인",    body: "지원자를 정식 모험가로 받아들입니다.",     okLabel: "승인",    okClass: "rec-modal-ok accept" },
  reject:       { title: "지원 반려",    body: "지원자의 가입을 거절합니다.",              okLabel: "반려",    okClass: "rec-modal-ok reject" },
  hold:         { title: "보류 처리",    body: "지원을 2일간 보류합니다. 기간 종료 후 다시 심사할 수 있습니다.", okLabel: "보류", okClass: "rec-modal-ok hold" },
  release_hold: { title: "보류 해제",   body: "보류를 즉시 해제하고 다시 심사 대기 상태로 전환합니다.", okLabel: "해제", okClass: "rec-modal-ok hold" },
};

interface Props {
  applicantName: string;
  classLabel: string;
  kind: ActionKind;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RecruitmentActionModal({ applicantName, classLabel, kind, onConfirm, onCancel }: Props) {
  const copy = ACTION_COPY[kind];

  return (
    <div className="rec-modal-overlay" onClick={onCancel}>
      <div className="rec-modal" onClick={(e) => e.stopPropagation()}>
        <p className="rec-modal-title">{copy.title}</p>
        <div className="rec-modal-info">
          <span>{applicantName}</span>
          <span className="rec-modal-class">{classLabel}</span>
        </div>
        <p className="rec-modal-body">{copy.body}</p>
        <div className="rec-modal-actions">
          <button className="rec-modal-cancel" onClick={onCancel}>취소</button>
          <button className={copy.okClass} onClick={onConfirm}>{copy.okLabel}</button>
        </div>
      </div>
    </div>
  );
}
