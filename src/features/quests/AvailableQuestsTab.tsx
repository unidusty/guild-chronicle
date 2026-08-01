import { useState } from "react";
import type { AdventurerRank, EntityId, GameState } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import {
  questTypeLabels,
  questCategoryLabels,
  dangerLevelLabel,
} from "../../game/constants/labels";
import { getQuestRecommendedPower } from "../../game/simulation/combatPower";
import QuestDetail from "./QuestDetail";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGold(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n) + " G";
}

function expireText(days: number): string {
  if (days <= 0) return "기한 없음";
  if (days === 1) return "오늘 마감";
  return `${days}일 후 마감`;
}

const RANK_ORDER: AdventurerRank[] = ["F", "E", "D", "C", "B", "A", "S"];

function rankToNum(rank: AdventurerRank): number {
  return RANK_ORDER.indexOf(rank);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RankFilter = "all" | AdventurerRank;
type SortMode = "default" | "rank" | "reward" | "duration" | "danger";

interface Props {
  state: GameState;
  selectedId: EntityId | null;
  onSelect: (id: EntityId | null) => void;
  onAssign: (partyId: EntityId) => void;
}

// ── Sort labels ───────────────────────────────────────────────────────────────

const SORT_LABELS: Record<SortMode, string> = {
  default:  "기본순",
  rank:     "랭크순",
  reward:   "보상순",
  duration: "기간순",
  danger:   "위험도순",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AvailableQuestsTab({
  state,
  selectedId,
  onSelect,
  onAssign,
}: Props) {
  const [rankFilter, setRankFilter] = useState<RankFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const availableQuests = Object.values(state.quests).filter(
    (q) => q.status === "available",
  );

  const filtered = availableQuests.filter(
    (q) => rankFilter === "all" || q.grade === rankFilter,
  );

  const sorted = [...filtered].sort((a, b) => {
    switch (sortMode) {
      case "rank":
        return rankToNum(b.grade) - rankToNum(a.grade);
      case "reward":
        return b.rewardGold - a.rewardGold;
      case "duration":
        return a.durationDays - b.durationDays;
      case "danger":
        return b.dangerLevel - a.dangerLevel;
      default:
        // default: rank desc, then reward desc
        {
          const rd = rankToNum(b.grade) - rankToNum(a.grade);
          if (rd !== 0) return rd;
          return b.rewardGold - a.rewardGold;
        }
    }
  });

  const detailOpen = selectedId !== null;

  function handleCardClick(id: EntityId) {
    playSelect();
    onSelect(selectedId === id ? null : id);
  }

  function handleAssign(partyId: EntityId) {
    onAssign(partyId);
    onSelect(null);
  }

  return (
    <div className="qb-available">
      {/* ── Left: card grid ── */}
      <div className={`qb-available-main${detailOpen ? " detail-open" : ""}`}>
        {/* Filter + sort bar */}
        <div className="qb-available-filter">
          <div className="qb-rank-chips">
            {(["all", "S", "A", "B", "C", "D", "E", "F"] as const).map((r) => (
              <button
                key={r}
                className={`qb-rank-chip${rankFilter === r ? " active" : ""}${r !== "all" ? ` rank-chip-${r}` : ""}`}
                onMouseEnter={playHover}
                onClick={() => {
                  playSelect();
                  setRankFilter(r);
                }}
              >
                {r === "all" ? "전체" : r}
              </button>
            ))}
          </div>

          <select
            className="qb-sort-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {SORT_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>

        {/* Card grid */}
        {sorted.length === 0 ? (
          <div className="qb-empty">
            <p>현재 게시된 의뢰가 없습니다.</p>
          </div>
        ) : (
          <div className="quest-card-grid">
            {sorted.map((quest) => {
              const region = state.regions[quest.regionId];
              const isSelected = quest.id === selectedId;
              const isUrgent = quest.questType === "urgent";
              const expiringSoon = quest.expiresInDays > 0 && quest.expiresInDays <= 3;
              const recPower = getQuestRecommendedPower(quest);

              return (
                <button
                  key={quest.id}
                  className={`quest-board-card${isSelected ? " selected" : ""}`}
                  onMouseEnter={playHover}
                  onClick={() => handleCardClick(quest.id)}
                >
                  <div className="qbc-pin" />

                  {/* Header row: rank + urgent badge */}
                  <div className="qbc-header">
                    <span className={`rank qbc-grade rank-${quest.grade}`}>
                      {quest.grade}
                    </span>
                    {isUrgent && (
                      <span className="qbc-urgent-badge">긴급</span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="qbc-title">{quest.title}</h3>

                  {/* Type + region */}
                  <div className="qbc-type-row">
                    <span className={`qbc-quest-type ${quest.questType}`}>
                      {questTypeLabels[quest.questType]}
                    </span>
                    <span className="qbc-category">
                      {questCategoryLabels[quest.type]}
                    </span>
                    {region && (
                      <span className="qbc-region">{region.name}</span>
                    )}
                  </div>

                  {/* Info rows */}
                  <div className="qbc-info">
                    <div className="qbc-info-row">
                      <span className="qbc-info-label">보상</span>
                      <span className="qbc-info-value qbc-reward">
                        {formatGold(quest.rewardGold)}
                      </span>
                    </div>
                    <div className="qbc-info-row">
                      <span className="qbc-info-label">기간</span>
                      <span className="qbc-info-value">{quest.durationDays}일</span>
                    </div>
                    <div className="qbc-info-row">
                      <span className="qbc-info-label">권장 인원</span>
                      <span className="qbc-info-value">
                        {quest.recommendedPartySize}명
                      </span>
                    </div>
                    <div className="qbc-info-row">
                      <span className="qbc-info-label">권장 전투력</span>
                      <span className="qbc-info-value">{recPower}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="qbc-footer">
                    <span
                      className={`qbc-danger danger-level-${Math.max(1, Math.min(5, quest.dangerLevel))}`}
                    >
                      {dangerLevelLabel(quest.dangerLevel)}
                    </span>
                    {expiringSoon && (
                      <span className="qbc-expire-warn">
                        {expireText(quest.expiresInDays)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right: side detail panel ── */}
      {detailOpen && selectedId && (
        <div className="qb-side-detail">
          <QuestDetail
            key={selectedId}
            questId={selectedId}
            state={state}
            onAssign={handleAssign}
          />
        </div>
      )}
    </div>
  );
}
