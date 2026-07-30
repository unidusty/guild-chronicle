import { useState } from "react";
import type { EntityId, GameState } from "../../types/game";
import { getPortraitPath } from "../../game/assets/portraits";
import {
  adventurerStatusLabels,
  getPotentialGrade,
  getStatusTone,
  raceLabels,
} from "../../game/constants/labels";
import { getActiveAdventurers, getAdventurerLocationLabel } from "../../game/simulation/selectors";

interface Props {
  state: GameState;
  selectedId: EntityId | null;
  onSelect: (id: EntityId) => void;
}

export default function AdventurerList({ state, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterRace, setFilterRace] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const all = getActiveAdventurers(state);

  const uniqueClassIds = [...new Set(all.map((a) => a.classId))];

  const filtered = all
    .filter((a) => {
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (filterClass && a.classId !== filterClass) return false;
      if (filterRace && a.race !== filterRace) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <div>
      <div className="filter-bar">
        <input
          className="search-input"
          type="text"
          placeholder="이름 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
        >
          <option value="">직업</option>
          {uniqueClassIds.map((id) => (
            <option key={id} value={id}>{state.classes[id]?.name ?? id}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filterRace}
          onChange={(e) => setFilterRace(e.target.value)}
        >
          <option value="">전체 종족</option>
          <option value="human">인간</option>
          <option value="elf">엘프</option>
          <option value="dwarf">드워프</option>
        </select>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">전체 상태</option>
          <option value="idle">대기</option>
          <option value="dispatched">의뢰 수행</option>
          <option value="injured">부상</option>
          <option value="training">훈련 중</option>
          <option value="recovering">휴식</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="adv-empty">모험가 없음</p>
      ) : (
        <div className="table-wrap">
          <table className="adv-table">
            <thead>
              <tr>
                <th>모험가</th>
                <th>직업</th>
                <th>잠재력</th>
                <th>상태</th>
                <th>위치</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((adv) => {
                const cls = state.classes[adv.classId];
                const potGrade = getPotentialGrade(adv.potential);
                const statusTone = getStatusTone(adv);
                const locationLabel = getAdventurerLocationLabel(adv, state);
                const initials = adv.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                const portraitPath = getPortraitPath(adv.portraitId, adv.race, adv.gender);

                return (
                  <tr
                    key={adv.id}
                    className={`adv-row${selectedId === adv.id ? " selected" : ""}`}
                    onClick={() => onSelect(adv.id)}
                  >
                    <td>
                      <div className="person">
                        <div className="portrait">
                          {portraitPath ? <img src={portraitPath} alt={adv.name} /> : initials}
                        </div>
                        <div>
                          <strong>{adv.name}</strong>
                          <span>{raceLabels[adv.race]} · {adv.age}세</span>
                        </div>
                      </div>
                    </td>
                    <td>{cls?.name ?? "미정"}</td>
                    <td><span className={`pot-badge pot-${potGrade.toLowerCase()}`}>{potGrade}</span></td>
                    <td><span className={`status ${statusTone}`}>{adventurerStatusLabels[adv.status]}</span></td>
                    <td>{locationLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
