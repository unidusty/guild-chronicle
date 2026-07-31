import { useState, type Dispatch, type SetStateAction } from "react";
import type { GameState } from "../../types/game";
import {
  formatGameDate,
  formatShortGameDate,
  getActiveQuestRows,
  getGuildMetrics,
  getRosterRows,
} from "../../game/simulation/selectors";
import FacilitiesPage from "../facilities/FacilitiesPage";
import RecruitmentTab from "../recruitment/RecruitmentTab";
import { playHover, playSelect } from "../../lib/audio";

type GuildTab = "dashboard" | "facilities" | "recruitment";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
  onDayEnd: () => void;
}

const reportPresentation = {
  medical:     { icon: "!", tone: "danger" },
  emergency:   { icon: "Q", tone: "gold" },
  recruitment: { icon: "+", tone: "green" },
} as const;

export default function GuildHallPage({ state, onStateChange, onDayEnd }: Props) {
  const [tab, setTab] = useState<GuildTab>("dashboard");

  const metrics      = getGuildMetrics(state);
  const roster       = getRosterRows(state);
  const activeQuests = getActiveQuestRows(state);
  const activeDutyRoster = roster.filter(
    (row) => state.adventurers[row.id]?.status !== "idle",
  );

  const recruitmentFacility = state.facilities["facility-recruitment"];
  const recruitmentStatus = recruitmentFacility?.status ?? "unbuilt";
  const hasRecruitmentRoom = (recruitmentFacility?.level ?? 0) > 0;
  const pendingApplicantCount = state.recruitment.applicants.filter(
    (a) => a.status === "pending" || a.status === "held",
  ).length;

  function handleTabChange(t: GuildTab) {
    playSelect();
    setTab(t);
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WESTWIND GUILD · HEAD OFFICE</p>
          <h1>{state.guild.name}</h1>
        </div>
        {tab === "dashboard" && (
          <div className="top-actions">
            <button onMouseEnter={playHover}>게임 저장</button>
            <button className="primary" onMouseEnter={playHover} onClick={onDayEnd}>
              오늘 업무 종료
            </button>
          </div>
        )}
        {tab === "facilities" && (
          <span className="fac-gold-bar">
            보유 골드 <strong>{new Intl.NumberFormat("ko-KR").format(state.guild.gold)} G</strong>
          </span>
        )}
      </header>

      {/* Tab bar */}
      <div className="gh-tab-bar">
        <button
          className={`gh-tab${tab === "dashboard" ? " active" : ""}`}
          onMouseEnter={playHover}
          onClick={() => handleTabChange("dashboard")}
        >
          대시보드
        </button>
        <button
          className={`gh-tab${tab === "facilities" ? " active" : ""}`}
          onMouseEnter={playHover}
          onClick={() => handleTabChange("facilities")}
        >
          시설
        </button>
        <button
          className={`gh-tab${tab === "recruitment" ? " active" : ""}${!hasRecruitmentRoom && recruitmentStatus !== "constructing" && recruitmentStatus !== "upgrading" ? " locked" : ""}`}
          onMouseEnter={playHover}
          onClick={() => handleTabChange("recruitment")}
        >
          가입 심사
          {(recruitmentStatus === "constructing" || recruitmentStatus === "upgrading") && (
            <span className="gh-tab-badge">공사 중</span>
          )}
          {hasRecruitmentRoom && pendingApplicantCount > 0 && (
            <span className="gh-tab-badge">{pendingApplicantCount}</span>
          )}
        </button>
      </div>

      {/* Dashboard tab */}
      {tab === "dashboard" && (
        <>
          <section className="metric-grid">
            {metrics.map((item) => (
              <article className="metric-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="panel roster-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">ACTIVE ROSTER</p>
                  <h2>오늘의 모험가 현황</h2>
                </div>
                <button className="text-button" onMouseEnter={playHover}>전체 명단 →</button>
              </div>
              {activeDutyRoster.length === 0 ? (
                <p className="panel-empty">현재 진행 중인 활동이 없습니다.</p>
              ) : (
                <div className="table-wrap roster-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>모험가</th>
                        <th>직업</th>
                        <th>랭크</th>
                        <th>현재 임무</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDutyRoster.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div className="person">
                              <div className="portrait">
                                {a.portraitPath
                                  ? <img src={a.portraitPath} alt={a.name} />
                                  : a.initials}
                              </div>
                              <div>
                                <strong>{a.name}</strong>
                                <span>{a.race} · {a.age}세</span>
                              </div>
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
              )}
            </article>

            <article className="panel report-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">MASTER'S DESK</p>
                  <h2>결재 대기</h2>
                </div>
                <span className="count">{state.reports.length + (pendingApplicantCount > 0 ? 1 : 0)}</span>
              </div>
              <div className="report-list">
                {pendingApplicantCount > 0 && (
                  <button
                    className="report"
                    onMouseEnter={playHover}
                    onClick={() => { playSelect(); handleTabChange("recruitment"); }}
                  >
                    <span className="report-icon green">+</span>
                    <span>
                      <strong>가입 심사 대기</strong>
                      <small>지원자 {pendingApplicantCount}명이 심사를 기다리고 있습니다.</small>
                    </span>
                    <b>›</b>
                  </button>
                )}
                {state.reports.map((report) => {
                  const ui = reportPresentation[report.kind];
                  return (
                    <button
                      className="report"
                      key={report.id}
                      onMouseEnter={playHover}
                      onClick={playSelect}
                    >
                      <span className={`report-icon ${ui.tone}`}>{ui.icon}</span>
                      <span>
                        <strong>{report.title}</strong>
                        <small>{report.description}</small>
                      </span>
                      <b>›</b>
                    </button>
                  );
                })}
              </div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">LIVE OPERATIONS</p>
                  <h2>진행 중인 의뢰</h2>
                </div>
                <span className="quiet">{activeQuests.length}개 파티 파견 중</span>
              </div>
              {activeQuests.length === 0 ? (
                <p className="panel-empty">현재 진행 중인 의뢰가 없습니다.</p>
              ) : (
                <div className="activity-scroll">
                  {activeQuests.map((quest) => (
                    <div className="mission" key={quest.id}>
                      <div>
                        <span className={`mission-grade ${quest.grade.toLowerCase()}`}>
                          {quest.grade}
                        </span>
                        <div>
                          <strong>{quest.title}</strong>
                          <small>{quest.partyName} · {quest.returnLabel}</small>
                        </div>
                      </div>
                      <div className="progress">
                        <i style={{ width: `${quest.progress}%` }} />
                      </div>
                      <span>{quest.progress}%</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel chronicle-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">CHRONICLE</p>
                  <h2>최근 연대기</h2>
                </div>
                <button className="text-button" onMouseEnter={playHover}>기록 열기 →</button>
              </div>
              <div className="timeline">
                {state.chronicle.slice(0, 3).map((entry) => (
                  <div key={entry.id}>
                    <time>{formatShortGameDate(entry.date)}</time>
                    <p>
                      <strong>{entry.title}</strong>
                      <br />
                      <span className="timeline-desc">{entry.description}</span>
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}

      {/* Facilities tab */}
      {tab === "facilities" && (
        <FacilitiesPage state={state} onStateChange={onStateChange} />
      )}

      {/* Recruitment tab */}
      {tab === "recruitment" && (
        <RecruitmentTab state={state} onStateChange={onStateChange} />
      )}
    </div>
  );
}
