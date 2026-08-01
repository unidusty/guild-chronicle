import { useState } from "react";
import type { EntityId, GameState, QuestChronicleEntry } from "../../types/game";
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

export default function QuestChronicleTab({ state }: Props) {
  const [partyFilter, setPartyFilter] = useState<EntityId | "all">("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");

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

      {/* List or empty state */}
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
            <ChronicleEntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chronicle entry row ───────────────────────────────────────────────────────

interface EntryRowProps {
  entry: QuestChronicleEntry;
}

function ChronicleEntryRow({ entry }: EntryRowProps) {
  const partyLabel = entry.partyNameSnapshot ?? entry.partyId ?? "길드";
  const categoryLabel = questCategoryLabels[entry.questCategory];
  const gradeLabel = questResultGradeLabels[entry.resultGrade];

  return (
    <div className="qchron-entry">
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
