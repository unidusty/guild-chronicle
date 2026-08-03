import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { EntityId, GameState, QuestDecisionType } from "../../types/game";
import { playHover, playSelect } from "../../lib/audio";
import { assignQuest } from "../../game/simulation/quests";
import { applyQuestDecision } from "../../game/simulation/questDecisions";
import AvailableQuestsTab from "./AvailableQuestsTab";
import ActiveQuestsTab from "./ActiveQuestsTab";
import QuestChronicleTab from "./QuestChronicleTab";

type QuestBoardTab = "available" | "active" | "chronicle";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
  initialSelectedId?: EntityId | null;
  onInitialConsumed?: () => void;
}

export default function QuestBoardPage({ state, onStateChange, initialSelectedId, onInitialConsumed }: Props) {
  const [tab, setTab] = useState<QuestBoardTab>("available");
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);

  useEffect(() => {
    if (initialSelectedId) {
      setTab("active");
      setSelectedId(initialSelectedId);
      onInitialConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId]);

  const reputation = state.guild.reputation;
  const availableCount = Object.values(state.quests).filter(q => {
    if (q.status !== "available") return false;
    const cond = q.reputationCondition;
    if (!cond) return true;
    if (cond.minReputation != null && reputation < cond.minReputation) return false;
    if (cond.maxReputation != null && reputation > cond.maxReputation) return false;
    return true;
  }).length;
  const activeQuests   = Object.values(state.quests).filter(q => q.status === "assigned" || q.status === "in_progress");
  const activeCount    = activeQuests.length;

  const hasDecisionNeeded = activeQuests.some(q => {
    const prog = state.questProgress[q.id];
    return prog?.events.some(e => !e.read) ?? false;
  });

  function handleTabChange(newTab: QuestBoardTab) {
    playSelect();
    setTab(newTab);
    setSelectedId(null);
  }

  function handleAssign(partyId: EntityId) {
    if (!selectedId) return;
    onStateChange(s => assignQuest(s, selectedId, partyId));
    setTab("active");
  }

  function handleDecide(eventId: EntityId, decision: QuestDecisionType, supportPartyId?: EntityId) {
    if (!selectedId) return;
    onStateChange(s => applyQuestDecision(s, selectedId, eventId, decision, supportPartyId));
    if (decision === "withdraw" || decision === "abandon") {
      setSelectedId(null);
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WESTWIND GUILD · QUEST BOARD</p>
          <h1>의뢰 게시판</h1>
        </div>
      </header>

      <div className="qb-tab-bar">
        <button
          className={`qb-tab${tab === "available" ? " active" : ""}`}
          onMouseEnter={playHover}
          onClick={() => handleTabChange("available")}
        >
          가능 의뢰
          <span className="qb-tab-count">{availableCount}</span>
        </button>
        <button
          className={`qb-tab${tab === "active" ? " active" : ""}${hasDecisionNeeded ? " has-alert" : ""}`}
          onMouseEnter={playHover}
          onClick={() => handleTabChange("active")}
        >
          진행 중 의뢰
          <span className="qb-tab-count">{activeCount}</span>
          {hasDecisionNeeded && <span className="qb-tab-alert">결정 필요</span>}
        </button>
        <button
          className={`qb-tab${tab === "chronicle" ? " active" : ""}`}
          onMouseEnter={playHover}
          onClick={() => handleTabChange("chronicle")}
        >
          의뢰 연대기
          <span className="qb-tab-count">{state.questChronicle.length}</span>
        </button>
      </div>

      <div className="qb-content">
        {tab === "available" && (
          <AvailableQuestsTab
            state={state}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAssign={handleAssign}
          />
        )}
        {tab === "active" && (
          <ActiveQuestsTab
            state={state}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDecide={handleDecide}
          />
        )}
        {tab === "chronicle" && (
          <QuestChronicleTab state={state} />
        )}
      </div>
    </div>
  );
}
