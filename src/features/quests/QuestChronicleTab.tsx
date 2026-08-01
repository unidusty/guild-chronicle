import { useState } from "react";
import type { AdventureLogCategory, EntityId, GameState, QuestChronicleEntry } from "../../types/game";
import { questCategoryLabels, questResultGradeLabels } from "../../game/constants/labels";
import { formatGameDate } from "../../game/simulation/selectors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGold(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n) + " G";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  state: GameState;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ADV_LOG_CATEGORY_LABELS: Record<AdventureLogCategory, string> = {
  departure: "출발", travel: "이동", exploration: "탐사", combat: "전투", defense: "방어",
  healing: "치료", discovery: "발견", incident: "사건", decision: "결정", injury: "부상",
  growth: "성장", trait: "특성", relationship: "관계", teamwork: "팀워크", retreat: "철수",
  failure: "실패", death: "사망", return: "귀환", completion: "완료",
};

export default function QuestChronicleTab({ state }: Props) {
  const [partyFilter, setPartyFilter] = useState<EntityId | "all">("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [selectedQuestId, setSelectedQuestId] = useState<EntityId | null>(null);

  const chronicle: QuestChronicleEntry[] = state.questChronicle ?? [];

  // ── Build party options (unique partyId + partyNameSnapshot pairs) ──────────

  const partyOptionsMap = new Map<EntityId | "guild", string>();
  for (const entry of chronicle) {
    if (!entry.partyId) {
      partyOptionsMap.set("guild", "길드");
    } else if (!partyOptionsMap.has(entry.partyId)) {
      partyOptionsMap.set(
        entry.partyId,
        entry.partyNameSnapshot ?? entry.partyId,
      );
    }
  }

  // ── Build year options (unique years, descending) ──────────────────────────

  const yearSet = new Set<number>();
  for (const entry of chronicle) {
    yearSet.add(entry.completedDate.year);
  }
  const yearOptions = [...yearSet].sort((a, b) => b - a);

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = chronicle
    .slice()
    .reverse()
    .filter((entry) => {
      if (partyFilter !== "all") {
        if (partyFilter === "guild") {
          if (entry.partyId !== null) return false;
        } else {
          if (entry.partyId !== partyFilter) return false;
        }
      }
      if (yearFilter !== "all" && entry.completedDate.year !== yearFilter) {
        return false;
      }
      return true;
    });

  const hasAnyChronicle = chronicle.length > 0;
  const isEmpty = filtered.length === 0;

  const selectedLogs = selectedQuestId ? ((state.adventureLogs ?? {})[selectedQuestId] ?? []) : [];

  return (
    <div className="qchron-wrap">
      {/* Filter bar */}
      <div className="qchron-filters">
        <select
          className="qchron-filter-select"
          value={partyFilter}
          onChange={(e) =>
            setPartyFilter(e.target.value as EntityId | "all")
          }
        >
          <option value="all">전체 파티</option>
          {[...partyOptionsMap.entries()].map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>

        <select
          className="qchron-filter-select"
          value={yearFilter === "all" ? "all" : String(yearFilter)}
          onChange={(e) =>
            setYearFilter(
              e.target.value === "all" ? "all" : Number(e.target.value),
            )
          }
        >
          <option value="all">전체 연도</option>
          {yearOptions.map((year) => (
            <option key={year} value={String(year)}>
              {year}년
            </option>
          ))}
        </select>
      </div>

      {/* Body: list + optional log detail */}
      <div className="qchron-body">
        {/* List or empty state */}
        <div className="qchron-list-col">
          {isEmpty ? (
            <div className="qchron-empty">
              {hasAnyChronicle ? (
                <p>선택한 조건에 맞는 기록이 없습니다.</p>
              ) : (
                <p>
                  아직 길드가 완수한 의뢰 기록이 없습니다.
                  <br />
                  첫 의뢰의 기록이 이곳에 남게 됩니다.
                </p>
              )}
            </div>
          ) : (
            <div className="qchron-list">
              {filtered.map((entry) => (
                <ChronicleEntryRow
                  key={entry.id}
                  entry={entry}
                  selected={entry.questId === selectedQuestId}
                  onSelect={() => setSelectedQuestId(selectedQuestId === entry.questId ? null : entry.questId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Adventure log detail panel */}
        {selectedQuestId && (
          <div className="qchron-log-panel">
            <div className="qchron-log-header">
              <span className="qchron-log-title">모험 기록</span>
              <button className="qchron-log-close" onClick={() => setSelectedQuestId(null)}>✕</button>
            </div>
            {selectedLogs.length === 0 ? (
              <div className="qchron-log-empty">
                <p>이 의뢰에는 상세 모험 기록이 남아 있지 않습니다.</p>
              </div>
            ) : (
              <div className="qchron-log-entries">
                {selectedLogs.map((entry) => (
                  <div key={entry.id} className={`adv-log-entry adv-log-cat-${entry.category}`}>
                    <div className="adv-log-meta">
                      <span className="adv-log-day">{entry.questDay}일차</span>
                      <span className="adv-log-category">{ADV_LOG_CATEGORY_LABELS[entry.category]}</span>
                      <span className="adv-log-date">{formatGameDate(entry.date)}</span>
                    </div>
                    <p className="adv-log-narrative">{entry.narrative}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chronicle entry row ───────────────────────────────────────────────────────

interface EntryRowProps {
  entry: QuestChronicleEntry;
  selected?: boolean;
  onSelect?: () => void;
}

function ChronicleEntryRow({ entry, selected, onSelect }: EntryRowProps) {
  const partyLabel = entry.partyNameSnapshot ?? entry.partyId ?? "길드";
  const categoryLabel = questCategoryLabels[entry.questCategory];
  const gradeLabel = questResultGradeLabels[entry.resultGrade];

  return (
    <div
      className={`qchron-entry${selected ? " selected" : ""}${onSelect ? " clickable" : ""}`}
      onClick={onSelect}
    >
      <div className="qchron-entry-top">
        <div className="qchron-date">{formatGameDate(entry.completedDate)}</div>
        <span className={`qchron-result ${entry.resultGrade}`}>
          {gradeLabel}
        </span>
      </div>

      <strong className="qchron-title">{entry.questTitle}</strong>

      <p className="qchron-narrative">{entry.narrative}</p>

      <div className="qchron-facts">
        <span className="qchron-fact">{partyLabel}</span>
        <span className="qchron-fact-sep" />
        <span className="qchron-fact">{categoryLabel}</span>
        <span className="qchron-fact-sep" />
        <span className="qchron-fact">{entry.regionNameSnapshot}</span>
        <span className="qchron-fact-sep" />
        <span className="qchron-fact qchron-reward">
          {formatGold(entry.rewardGold)}
        </span>
        {entry.incidentCount > 0 && (
          <>
            <span className="qchron-fact-sep" />
            <span className="qchron-fact qchron-incident">
              특이사항 {entry.incidentCount}건
            </span>
          </>
        )}
        {entry.supportUsed && (
          <>
            <span className="qchron-fact-sep" />
            <span className="qchron-fact qchron-support">지원 파견</span>
          </>
        )}
      </div>
    </div>
  );
}
