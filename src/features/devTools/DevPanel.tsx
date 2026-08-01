/**
 * Developer test panel — only rendered when import.meta.env.DEV is true.
 * Remove this file (and its import in App.tsx) before shipping a release build.
 */
import { useState, type Dispatch, type SetStateAction } from "react";
import type { Facility, GameState } from "../../types/game";
import { processDayEnd } from "../../game/simulation/dayEnd";
import { generateDailyApplicants } from "../../game/simulation/recruitment";
import { getDirectorState } from "../../game/simulation/questDirector";

interface Props {
  state: GameState;
  onStateChange: Dispatch<SetStateAction<GameState>>;
}

export default function DevPanel({ state, onStateChange }: Props) {
  const [open, setOpen] = useState(false);

  function addGold(amount: number) {
    onStateChange((s) => ({ ...s, guild: { ...s.guild, gold: s.guild.gold + amount } }));
  }

  function advanceDay() {
    const { newState } = processDayEnd(state);
    onStateChange(newState);
  }

  function forceGenerateApplicant() {
    onStateChange((s) => {
      const facilityId = "facility-recruitment";
      const orig = s.facilities[facilityId];
      // Temporarily activate the facility so generation logic can proceed
      const mockFacility: Facility = orig && orig.level > 0
        ? { ...orig, status: "active" }
        : {
            id: facilityId, name: "가입 심사실", description: "",
            level: 1, maxLevel: 3, status: "active", unlocks: [],
            targetLevel: null, constructionProgressDays: 0,
            constructionDurationDays: 0, constructionStartedDay: null,
          };
      const temp = {
        ...s,
        facilities: { ...s.facilities, [facilityId]: mockFacility },
        recruitment: { ...s.recruitment, lastGeneratedDay: null },
      };
      const { state: generated } = generateDailyApplicants(temp);
      // Keep original facilities to avoid permanently changing unbuilt status
      return { ...generated, facilities: s.facilities };
    });
  }

  function completeAllConstruction() {
    onStateChange((s) => {
      const facilities = { ...s.facilities };
      for (const f of Object.values(s.facilities)) {
        if (f.status === "constructing" || f.status === "upgrading") {
          facilities[f.id] = {
            ...f,
            level: f.targetLevel ?? f.level,
            status: "active" as const,
            targetLevel: null,
            constructionProgressDays: 0,
            constructionDurationDays: 0,
            constructionStartedDay: null,
          };
        }
      }
      return { ...s, facilities };
    });
  }

  if (!open) {
    return (
      <button className="dev-toggle" onClick={() => setOpen(true)} title="개발자 도구">
        DEV
      </button>
    );
  }

  const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

  const URGENCY_COLOR: Record<string, string> = {
    none:     "#666",
    low:      "#8aaa60",
    high:     "#c8a040",
    critical: "#c84040",
  };

  const activeDirectorStates = Object.values(state.questProgress).map(prog => {
    const quest = state.quests[prog.questId];
    if (!quest) return null;
    const ds = getDirectorState(quest, prog);
    return { quest, prog, ds };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="dev-panel">
      <div className="dev-panel-head">
        <span>개발자 도구</span>
        <button className="dev-close" onClick={() => setOpen(false)}>✕</button>
      </div>
      <div className="dev-info">
        골드: {fmt(state.guild.gold)} G &nbsp;·&nbsp;
        지원자: {state.recruitment.applicants.filter((a) => a.status === "pending" || a.status === "held").length}명
      </div>
      <div className="dev-actions">
        <button onClick={() => addGold(1000)}>+1,000 G</button>
        <button onClick={() => addGold(10000)}>+10,000 G</button>
        <button onClick={forceGenerateApplicant}>지원자 생성</button>
        <button onClick={advanceDay}>하루 진행</button>
        <button onClick={completeAllConstruction}>시설 즉시 완료</button>
      </div>
      {activeDirectorStates.length > 0 && (
        <div style={{ marginTop: 8, borderTop: "1px solid #333", paddingTop: 8, fontSize: 11 }}>
          <div style={{ color: "#aaa", marginBottom: 4 }}>Quest Director</div>
          {activeDirectorStates.map(({ quest, prog, ds }) => (
            <div key={quest.id} style={{ marginBottom: 6, background: "#1a1a1a", padding: "4px 6px", borderRadius: 3 }}>
              <div style={{ color: "#c8e0cc", fontWeight: "bold" }}>{quest.title}</div>
              <div style={{ color: "#888" }}>
                D{prog.currentDay}/{prog.totalDays} · {prog.currentStage} · 귀환까지 {ds.daysUntilReturn}일
                &nbsp;·&nbsp;
                <span style={{ color: URGENCY_COLOR[ds.urgencyLevel] ?? "#666" }}>
                  {ds.urgencyLevel.toUpperCase()}
                </span>
              </div>
              <div>
                완료: {ds.fulfilledSteps.length > 0
                  ? ds.fulfilledSteps.map(s => <span key={s.id} style={{ color: "#7ec87e", marginRight: 4 }}>{s.id}</span>)
                  : <span style={{ color: "#555" }}>없음</span>}
              </div>
              <div>
                미완료: {ds.pendingSteps.length > 0
                  ? ds.pendingSteps.map(s => <span key={s.id} style={{ color: URGENCY_COLOR[ds.urgencyLevel], marginRight: 4 }}>{s.id}</span>)
                  : <span style={{ color: "#555" }}>없음</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
