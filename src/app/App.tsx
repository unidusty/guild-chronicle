import { useState } from "react";
import { initialGameState } from "../data/gameState";
import { formatGameDate } from "../game/simulation/selectors";
import GuildHallPage from "../features/guildHall/GuildHallPage";
import AdventurersPage from "../features/adventurers/AdventurersPage";
import PartiesPage from "../features/parties/PartiesPage";
import QuestBoardPage from "../features/quests/QuestBoardPage";
import QuestResultPanel from "../features/quests/QuestResultPanel";
import WarehousePage from "../features/warehouse/WarehousePage";
import DayEndOverlay from "../features/dayEnd/DayEndOverlay";
import SettingsModal from "../components/SettingsModal";
import DevPanel from "../features/devTools/DevPanel";
import { useAudio, playHover, playSelect } from "../lib/audio";

const DEV_MODE = import.meta.env.DEV;

type Page = "guildHall" | "adventurers" | "parties" | "quests" | "warehouse";

interface NavItem {
  label: string;
  page: Page | null;
}

const NAV_ITEMS: NavItem[] = [
  { label: "길드 홀",      page: "guildHall" },
  { label: "모험가",       page: "adventurers" },
  { label: "파티",         page: "parties" },
  { label: "의뢰 게시판",  page: "quests" },
  { label: "길드 창고",    page: "warehouse" },
  { label: "세계 지도",    page: null },
  { label: "연대기",       page: null },
];

export default function App() {
  const audio = useAudio();
  const [state, setState] = useState(initialGameState);
  const [page, setPage] = useState<Page>("guildHall");
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dayEndOpen, setDayEndOpen] = useState(false);
  const [partiesFormationDirty, setPartiesFormationDirty] = useState(false);
  const [pendingNavPage, setPendingNavPage] = useState<Page | null>(null);

  function navigateToParty(partyId: string) {
    setSelectedPartyId(partyId);
    setPage("parties");
  }

  function handleNavClick(newPage: Page) {
    if (page === "parties" && partiesFormationDirty && newPage !== "parties") {
      setPendingNavPage(newPage);
      return;
    }
    playSelect();
    setPage(newPage);
  }

  function openSettings() { playSelect(); setSettingsOpen(true); }
  function closeSettings() { setSettingsOpen(false); }

  function handleDayEnd() { playSelect(); setDayEndOpen(true); }
  function handleDayEndComplete(newState: typeof state) {
    setState(newState);
    setDayEndOpen(false);
  }
  function handleDayEndCancel() { setDayEndOpen(false); }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">GC</div>
        <div className="brand-copy">
          <strong>Guild Chronicle</strong>
          <span>길드 연대기</span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={[
                "nav-item",
                item.page === page ? "active" : "",
                !item.page ? "disabled" : "",
              ].filter(Boolean).join(" ")}
              onMouseEnter={playHover}
              onClick={() => {
                if (!item.page) return;
                handleNavClick(item.page);
              }}
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
        <div className="sidebar-note">
          <span>오늘</span>
          <strong>{formatGameDate(state.currentDate)}</strong>
        </div>
      </aside>

      <main>
        {page === "guildHall" ? (
          <GuildHallPage state={state} onStateChange={setState} onDayEnd={handleDayEnd} />
        ) : page === "adventurers" ? (
          <AdventurersPage state={state} onNavigateToParty={navigateToParty} />
        ) : page === "parties" ? (
          <PartiesPage state={state} onStateChange={setState} initialSelectedId={selectedPartyId} onInitialIdConsumed={() => setSelectedPartyId(null)} onFormationDirtyChange={setPartiesFormationDirty} />
        ) : page === "quests" ? (
          <QuestBoardPage state={state} onStateChange={setState} />
        ) : page === "warehouse" ? (
          <WarehousePage state={state} onStateChange={setState} />
        ) : null}
      </main>

      {state.pendingResults.length > 0 && (
        <QuestResultPanel
          results={state.pendingResults}
          state={state}
          onDismiss={() => setState((s) => ({ ...s, pendingResults: [] }))}
        />
      )}

      {dayEndOpen && (
        <DayEndOverlay
          state={state}
          onComplete={handleDayEndComplete}
          onCancel={handleDayEndCancel}
        />
      )}

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

      {DEV_MODE && (
        <DevPanel state={state} onStateChange={setState} />
      )}

      {pendingNavPage && (
        <div className="modal-backdrop" onClick={() => setPendingNavPage(null)}>
          <div className="formation-nav-confirm" onClick={(e) => e.stopPropagation()}>
            <p className="formation-nav-confirm-title">저장하지 않은 진형 변경사항이 있습니다.</p>
            <p className="formation-nav-confirm-body">변경사항을 버리고 이동하시겠습니까?</p>
            <div className="formation-nav-confirm-actions">
              <button className="fac-confirm-cancel" onClick={() => setPendingNavPage(null)}>돌아가기</button>
              <button className="fac-confirm-ok" onClick={() => { playSelect(); setPage(pendingNavPage!); setPendingNavPage(null); }}>변경사항 버리기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
