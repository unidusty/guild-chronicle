import type { AdventurerRank, EntityId, GameState, Quest } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { questStageLabels, questStatusLabels, questTypeLabels } from "../../game/constants/labels";

export type StatusFilter = "all" | "available" | "active" | "completed";
export type RankFilter = "all" | AdventurerRank;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "전체" },
  { value: "available", label: "접수 가능" },
  { value: "active",    label: "수행 중" },
];

const RANK_OPTIONS: Array<"all" | AdventurerRank> = ["all", "S", "A", "B", "C", "D", "E", "F"];

interface Props {
  state: GameState;
  filteredQuests: Quest[];
  selectedId: EntityId | null;
  onSelect: (id: EntityId) => void;
  statusFilter: StatusFilter;
  rankFilter: RankFilter;
  onStatusFilter: (f: StatusFilter) => void;
  onRankFilter: (r: RankFilter) => void;
}

function formatGold(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n) + "G";
}

function questStatusTone(quest: Quest): string {
  if (quest.status === "available") return "idle";
  if (quest.status === "assigned" || quest.status === "in_progress") return "active";
  if (quest.status === "failed") return "warning";
  return "idle";
}

export default function QuestList({ state, filteredQuests, selectedId, onSelect, statusFilter, rankFilter, onStatusFilter, onRankFilter }: Props) {
  return (
    <div className="quest-list-inner">
      <div className="quest-filter-bar">
        <div className="quest-filter-row">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`quest-filter-btn${statusFilter === opt.value ? " active" : ""}`}
              onMouseEnter={playHover}
              onClick={() => { playSelect(); onStatusFilter(opt.value); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="quest-filter-row">
          {RANK_OPTIONS.map((r) => (
            <button
              key={r}
              className={`quest-filter-btn${rankFilter === r ? " active" : ""}`}
              onMouseEnter={playHover}
              onClick={() => { playSelect(); onRankFilter(r); }}
            >
              {r === "all" ? "전체" : r}
            </button>
          ))}
        </div>
      </div>

      <div className="quest-list">
        {filteredQuests.length === 0 ? (
          <p className="quest-empty">조건에 맞는 의뢰가 없습니다.</p>
        ) : (
          filteredQuests.map((quest) => {
            const region = state.regions[quest.regionId];
            const tone = questStatusTone(quest);
            const isSelected = quest.id === selectedId;
            const isUrgent = quest.questType === "urgent";
            const isRaid = quest.questType === "raid";
            const isActive = quest.status === "assigned" || quest.status === "in_progress";
            return (
              <button
                key={quest.id}
                className={`quest-card${isSelected ? " selected" : ""}`}
                onMouseEnter={playHover}
                onClick={() => { playSelect(); onSelect(quest.id); }}
              >
                <div className="quest-card-top">
                  <span className="rank">{quest.grade}</span>
                  <span className="quest-card-title">{quest.title}</span>
                  {isActive && state.questProgress[quest.id]?.hasIncident && (
                    <span className="quest-incident-badge">⚠ 보고</span>
                  )}
                  <span className={`status ${tone}`}>{questStatusLabels[quest.status]}</span>
                </div>
                <div className="quest-card-meta">
                  <span className="quest-card-region">{region?.name ?? "—"}</span>
                  <span className="quest-card-reward">{formatGold(quest.rewardGold)}</span>
                </div>
                {isActive && (() => {
                  const prog = state.questProgress[quest.id];
                  if (!prog) return null;
                  const elapsed = prog.currentDay;
                  return (
                    <div className="quest-card-progress">
                      <div className="quest-card-progress-bar">
                        <div className="quest-card-progress-fill" style={{ width: `${quest.progress}%` }} />
                      </div>
                      <div className="quest-card-progress-meta">
                        <span className="quest-card-stage">
                          {!prog.reportRead && <span className="quest-new-dot">●</span>}
                          {questStageLabels[prog.currentStage]}
                        </span>
                        <span className="quest-card-days">{elapsed} / {prog.totalDays}일</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="quest-card-footer">
                  <span className="quest-card-duration">
                    {isActive
                      ? `${quest.remainingDays}일 후 귀환`
                      : `${quest.durationDays}일 소요`}
                  </span>
                  <div className="quest-card-badges">
                    {isUrgent && <span className="quest-type-badge urgent">{questTypeLabels.urgent}</span>}
                    {isRaid   && <span className="quest-type-badge raid">{questTypeLabels.raid} · 공격대</span>}
                    {quest.status === "available" && quest.expiresInDays > 0 && quest.expiresInDays <= 3 && (
                      <span className="quest-expire-warn">{quest.expiresInDays}일 후 마감</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
