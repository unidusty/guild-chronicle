import { useState } from "react";
import type { Adventurer } from "../types/game";
import { initialGameState } from "../data/gameState";
import { generateCandidates } from "../game/generator/adventurer";
import { formatGameDate, formatShortGameDate, getActiveQuestRows, getGuildMetrics, getRosterRows } from "../game/simulation/selectors";
import RecruitmentPanel from "../features/recruitment/RecruitmentPanel";
import AdventurersPage from "../features/adventurers/AdventurersPage";
import { UI_SCALES, UI_SCALE_LABELS, useUiScale } from "../lib/uiScale";
import type { UiScale } from "../lib/uiScale";

type Page = "dashboard" | "adventurers";
interface NavItem { label: string; page: Page | null; }
const NAV_ITEMS: NavItem[] = [
  { label: "길드 현황",   page: "dashboard" },
  { label: "모험가",      page: "adventurers" },
  { label: "의뢰 게시판", page: null },
  { label: "파티",        page: null },
  { label: "세계 지도",   page: null },
  { label: "시설",        page: null },
  { label: "연대기",      page: null },
];

const reportPresentation = {
  medical: { icon: "!", tone: "danger" },
  emergency: { icon: "Q", tone: "gold" },
  recruitment: { icon: "+", tone: "green" },
} as const;

export default function App() {
  const [uiScale, setUiScale] = useUiScale();
  const [state, setState] = useState(initialGameState);
  const [candidates, setCandidates] = useState(() =>
    generateCandidates(3, initialGameState.classes, initialGameState.currentDate,
      new Set(Object.keys(initialGameState.adventurers)))
  );
  const [recruited, setRecruited] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");

  const metrics = getGuildMetrics(state);
  const roster = getRosterRows(state);
  const activeQuests = getActiveQuestRows(state);

  function handleRecruit(adventurer: Adventurer) {
    setState((prev) => ({
      ...prev,
      guild: {
        ...prev.guild,
        adventurerIds: [...prev.guild.adventurerIds, adventurer.id],
      },
      adventurers: {
        ...prev.adventurers,
        [adventurer.id]: adventurer,
      },
    }));
    setCandidates((prev) => prev.filter((c) => c.id !== adventurer.id));
    setRecruited(true);
  }

  function handleRefresh() {
    const allIds = new Set([
      ...Object.keys(state.adventurers),
      ...candidates.map((c) => c.id),
    ]);
    setCandidates(generateCandidates(3, state.classes, state.currentDate, allIds));
    setRecruited(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">GC</div>
        <div className="brand-copy"><strong>Guild Chronicle</strong><span>길드 연대기</span></div>
        <nav>
          {NAV_ITEMS.map((item, index) => (
            <button
              className={item.page === page ? "nav-item active" : "nav-item"}
              key={item.label}
              onClick={() => item.page && setPage(item.page)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="scale-selector">
          <span className="scale-selector-label">UI 배율</span>
          <div className="scale-btns">
            {UI_SCALES.map((s) => (
              <button
                key={s}
                className={`scale-btn${uiScale === s ? " active" : ""}`}
                onClick={() => setUiScale(s as UiScale)}
              >
                {UI_SCALE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-note"><span>현재 날짜</span><strong>{formatGameDate(state.currentDate)}</strong></div>
      </aside>

      <main>
        {page === "dashboard" ? (
          <>
            <header className="topbar">
              <div><p className="eyebrow">WESTWIND GUILD · HEAD OFFICE</p><h1>{state.guild.name} 운영 보고서</h1></div>
              <div className="top-actions"><button>게임 저장</button><button className="primary">하루 진행</button></div>
            </header>

            <section className="metric-grid">
              {metrics.map((item) => (
                <article className="metric-card" key={item.label}>
                  <span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small>
                </article>
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="panel roster-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">ACTIVE ROSTER</p><h2>오늘의 모험가 현황</h2></div>
                  <button className="text-button">전체 명단 →</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>모험가</th><th>직업</th><th>등급</th><th>현재 임무</th><th>상태</th></tr></thead>
                    <tbody>
                      {roster.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div className="person">
                              <div className="portrait">{a.portraitPath ? <img src={a.portraitPath} alt={a.name} /> : a.initials}</div>
                              <div><strong>{a.name}</strong><span>{a.race} · {a.age}세</span></div>
                            </div>
                          </td>
                          <td>{a.job}</td>
                          <td><span className="rank">{a.rank}</span></td>
                          <td>{a.assignment}</td>
                          <td><span className={`status ${a.statusTone}`}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="panel report-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">MASTER'S DESK</p><h2>결재 대기</h2></div>
                  <span className="count">{state.reports.length}</span>
                </div>
                <div className="report-list">
                  {state.reports.map((report) => {
                    const ui = reportPresentation[report.kind];
                    return (
                      <button className="report" key={report.id}>
                        <span className={`report-icon ${ui.tone}`}>{ui.icon}</span>
                        <span><strong>{report.title}</strong><small>{report.description}</small></span>
                        <b>›</b>
                      </button>
                    );
                  })}
                </div>
              </article>

              <article className="panel activity-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">LIVE OPERATIONS</p><h2>진행 중인 의뢰</h2></div>
                  <span className="quiet">{activeQuests.length}개 파티 파견 중</span>
                </div>
                {activeQuests.map((quest) => (
                  <div className="mission" key={quest.id}>
                    <div>
                      <span className={`mission-grade ${quest.grade.toLowerCase()}`}>{quest.grade}</span>
                      <div><strong>{quest.title}</strong><small>{quest.partyName} · {quest.returnLabel}</small></div>
                    </div>
                    <div className="progress"><i style={{ width: `${quest.progress}%` }} /></div>
                    <span>{quest.progress}%</span>
                  </div>
                ))}
              </article>

              <article className="panel chronicle-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">CHRONICLE</p><h2>최근 연대기</h2></div>
                  <button className="text-button">기록 열기 →</button>
                </div>
                <div className="timeline">
                  {state.chronicle.map((entry) => (
                    <div key={entry.id}>
                      <time>{formatShortGameDate(entry.date)}</time>
                      <p><strong>{entry.title}</strong><br />{entry.description}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <RecruitmentPanel
              candidates={candidates}
              classes={state.classes}
              recruited={recruited}
              onRecruit={handleRecruit}
              onRefresh={handleRefresh}
            />
          </>
        ) : (
          <AdventurersPage state={state} />
        )}
      </main>
    </div>
  );
}
