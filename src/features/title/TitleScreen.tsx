import { useEffect } from "react";
import { playHover, playSelect, playTitleBgm, stopTitleBgm } from "../../lib/audio";

interface Props {
  onNewGame: () => void;
  onSettings: () => void;
}

export default function TitleScreen({ onNewGame, onSettings }: Props) {
  // Start title BGM on the first user interaction (click or keydown).
  // Browsers block autoplay until a user gesture has occurred.
  useEffect(() => {
    const start = () => { playTitleBgm(); };
    document.addEventListener("click",   start, { once: true });
    document.addEventListener("keydown", start, { once: true });
    return () => {
      document.removeEventListener("click",   start);
      document.removeEventListener("keydown", start);
    };
  }, []);

  function handleNewGame() {
    playSelect();
    stopTitleBgm();
    onNewGame();
  }

  function handleExit() {
    playSelect();
    try { window.close(); } catch { /* browser may block */ }
  }

  return (
    <div className="title-screen">
      <img
        className="title-bg-img"
        src="/game-assets/title/title-background.png"
        alt=""
        aria-hidden="true"
      />
      <div className="title-bg-overlay" aria-hidden="true" />

      <div className="title-content">
        <header className="title-header">
          <img
            className="title-logo-img"
            src="/game-assets/title/guild-chronicle-logo.png"
            alt="GUILD CHRONICLE"
          />
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
