import type { ArrivalNotification } from "../../types/game";

interface Props {
  notification: ArrivalNotification;
  onConfirm: () => void;
  onLater: () => void;
}

export default function ArrivalModal({ notification, onConfirm, onLater }: Props) {
  const count = notification.applicantIds.length;
  const countLabel = count > 1 ? ` 외 ${count - 1}명` : "";

  return (
    <div className="arr-overlay" onClick={onLater}>
      <div className="arr-modal" onClick={(e) => e.stopPropagation()}>
        <p className="arr-badge">{notification.eventName}</p>
        <p className="arr-scene">{notification.arrivalScene}</p>
        {count > 1 && (
          <p className="arr-count">총 {count}명의 지원자가 도착했습니다.</p>
        )}
        <div className="arr-actions">
          <button className="arr-btn-later" onClick={onLater}>나중에 확인</button>
          <button className="arr-btn-confirm" onClick={onConfirm}>
            확인하기{countLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
