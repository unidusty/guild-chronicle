import { useState } from "react";
import { initialGameState } from "../data/gameState";
import { formatGameDate, formatShortGameDate, getActiveQuestRows, getGuildMetrics, getRosterRows } from "../game/simulation/selectors";
import AdventurersPage from "../features/adventurers/AdventurersPage";
import SettingsModal from "../components/SettingsModal";
import { useAudio, playHover, playSelect } from "../lib/audio";

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
  medical:     { icon: "!", tone: "danger" },
  emergency:   { icon: "Q", tone: "gold" },
  recruitment: { icon: "+", tone: "green" },
} as const;

export default function App() {
  const audio = useAudio();
  const [state] = useState(initialGameState);
  const [page, setPage] = useState<Page>("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const metrics     = getGuildMetrics(state);
  const roster      = getRosterRows(state);
  const activeQuests = getActiveQuestRows(state);

  function openSettings() { playSelect(); setSettingsOpen(true); }
  function closeSettings() { setSettingsOpen(false); }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">GC</div>
        <div className="brand-copy"><strong>Guild Chronicle</strong><span>길드 연대기</span></div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              className={item.page === page ? "nav-item active" : "nav-item"}
              key={item.label}
              onMouseEnter={playHover}
              onClick={() => { if (item.page) { playSelect(); setPage(item.page); } }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button
          className="settings-btn"
          aria-label="설정 열기"
          onMouseEnter={playHover}
          onClick={openSettings}
        >
          설정
        </button>
        <div className="sidebar-note"><span>오늘</span><strong>{formatGameDate(state.currentDate)}</strong></div>
      </aside>

      <main>
        {page === "dashboard" ? (
          <>
            <header className="topbar">
              <div><p className="eyebrow">WESTWIND GUILD · HEAD OFFICE</p><h1>{state.guild.name} 운영 보고서</h1></div>
              <div className="top-actions">
                <button onMouseEnter={playHover}>게임 저장</button>
                <button className="primary" onMouseEnter={playHover} onClick={playSelect}>하루 진행</button>
              </div>
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
                  <button className="text-button" onMouseEnter={playHover}>전체 명단 →</button>
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
                      <button className="report" key={report.id} onMouseEnter={playHover} onClick={playSelect}>
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
                  <button className="text-button" onMouseEnter={playHover}>기록 열기 →</button>
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
          </>
        ) : (
          <AdventurersPage state={state} />
        )}
      </main>

      {settingsOpen && (
        <SettingsModal
          bgmVolume={audio.bgmVolume}
          sfxVolume={audio.sfxVolume}
          bgmMuted={audio.bgmMuted}
          sfxMuted={audio.sfxMuted}
          onBgmVolume={audio.setBgmVolume}
          onSfxVolume={audio.setSfxVolume}
          onBgmMute={audio.toggleBgmMute}
          onSfxMute={audio.toggleSfxMute}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}
