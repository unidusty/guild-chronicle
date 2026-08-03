import { playHover, playSelect } from "../../lib/audio";

interface Props {
  onNewGame: () => void;
  onSettings: () => void;
}

export default function TitleScreen({ onNewGame, onSettings }: Props) {
  function handleNewGame() {
    playSelect();
    onNewGame();
  }

  function handleExit() {
    playSelect();
    try {
      window.close();
    } catch {
      // browser may block window.close() — silently ignore
    }
  }

  return (
    <div className="title-screen">
      <div className="title-content">
        <header className="title-header">
          <div className="title-emblem">GC</div>
          <h1 className="title-logo">GUILD CHRONICLE</h1>
          <p className="title-subtitle">길드 연대기</p>
        </header>

        <div className="title-divider" />

        <nav className="title-menu">
          <button
            className="title-menu-btn primary"
            onMouseEnter={playHover}
            onClick={handleNewGame}
          >
            새 게임
          </button>
          <button
            className="title-menu-btn disabled"
            disabled
            aria-disabled="true"
          >
            이어하기
          </button>
          <button
            className="title-menu-btn"
            onMouseEnter={playHover}
            onClick={() => { playSelect(); onSettings(); }}
          >
            설정
          </button>
          <button
            className="title-menu-btn"
            onMouseEnter={playHover}
            onClick={handleExit}
          >
            종료
          </button>
        </nav>
      </div>

      <footer className="title-footer">
        <span>Guild Chronicle · Alpha Build</span>
      </footer>
    </div>
  );
}
