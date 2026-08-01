import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { EntityId, GameState, QuestDecisionType } from "../../types/game";
import { assignQuest } from "../../game/simulation/quests";
import { applyQuestDecision } from "../../game/simulation/questDecisions";
import QuestList, { type RankFilter, type StatusFilter } from "./QuestList";
import QuestDetail from "./QuestDetail";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
}

const RANK_ORDER = ["F", "E", "D", "C", "B", "A", "S"] as const;

export default function QuestBoardPage({ state, onStateChange }: Props) {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rankFilter, setRankFilter] = useState<RankFilter>("all");

  function getFiltered() {
    return Object.values(state.quests)
      .filter((q) => {
        if (statusFilter === "available") return q.status === "available";
        if (statusFilter === "active")    return q.status === "assigned" || q.status === "in_progress";
        if (statusFilter === "completed") return q.status === "completed" || q.status === "failed" || q.status === "expired";
        return true;
      })
      .filter((q) => rankFilter === "all" || q.grade === rankFilter)
      .sort((a, b) => {
        const rankDiff = RANK_ORDER.indexOf(b.grade as typeof RANK_ORDER[number]) - RANK_ORDER.indexOf(a.grade as typeof RANK_ORDER[number]);
        if (rankDiff !== 0) return rankDiff;
        return a.title.localeCompare(b.title, "ko");
      });
  }

  const filteredQuests = getFiltered();

  useEffect(() => {
    const visible = getFiltered();
    if (!selectedId || !visible.some((q) => q.id === selectedId)) {
      setSelectedId(visible.length > 0 ? visible[0].id : null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, rankFilter, state.quests]);

  useEffect(() => {
    if (!selectedId) {
      const visible = getFiltered();
      if (visible.length > 0) setSelectedId(visible[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDecide(eventId: EntityId, decision: QuestDecisionType, supportPartyId?: EntityId) {
    if (!selectedId) return;
    onStateChange((s) => applyQuestDecision(s, selectedId, eventId, decision, supportPartyId));
    if (decision === "withdraw" || decision === "abandon") {
      setSelectedId(null);
    }
  }

  function handleAssign(partyId: EntityId) {
    if (!selectedId) return;
    onStateChange((s) => assignQuest(s, selectedId, partyId));
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WESTWIND GUILD · QUEST BOARD</p>
          <h1>의뢰 게시판</h1>
        </div>
      </header>
      <div className={`quest-page${selectedId ? " has-detail" : ""}`}>
        <div className="quest-list-col">
          <QuestList
            state={state}
            filteredQuests={filteredQuests}
            selectedId={selectedId}
            onSelect={setSelectedId}
            statusFilter={statusFilter}
            rankFilter={rankFilter}
            onStatusFilter={setStatusFilter}
            onRankFilter={setRankFilter}
          />
        </div>
        <div className="quest-detail-col">
          {selectedId ? (
            <QuestDetail
              key={selectedId}
              questId={selectedId}
              state={state}
              onAssign={handleAssign}
              onDecide={handleDecide}
            />
          ) : (
            <div className="quest-select-prompt">
              <span>의뢰를 선택하면 상세 정보를 확인할 수 있습니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
