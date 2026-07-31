import { useEffect } from "react";
import { playHover, playSelect, playSelectPreview } from "../lib/audio";

interface Props {
  bgmVolume: number;
  sfxVolume: number;
  bgmMuted:  boolean;
  sfxMuted:  boolean;
  onBgmVolume: (v: number) => void;
  onSfxVolume: (v: number) => void;
  onBgmMute:   () => void;
  onSfxMute:   () => void;
  onClose:     () => void;
}

export default function SettingsModal({
  bgmVolume, sfxVolume, bgmMuted, sfxMuted,
  onBgmVolume, onSfxVolume, onBgmMute, onSfxMute, onClose,
}: Props) {

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleClose()   { playSelect(); onClose(); }
  function handleBgmMute() { playSelect(); onBgmMute(); }
  function handleSfxMute() { playSelect(); onSfxMute(); }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-header">
          <h2 id="settings-title">설정</h2>
          <button className="settings-close" onClick={handleClose} aria-label="닫기" onMouseEnter={playHover}>×</button>
        </div>

        <div className="settings-body">
          <p className="settings-section-label">사운드</p>

          {/* BGM */}
          <div className="sound-row">
            <div className="sound-row-header">
              <span className="sound-label">BGM</span>
              <span className="sound-pct">{bgmVolume}%</span>
            </div>
            <input
              type="range"
              className="vol-slider"
              min={0}
              max={100}
              value={bgmVolume}
              aria-label="BGM 볼륨"
              onChange={(e) => onBgmVolume(Number(e.target.value))}
            />
            <button
              className={`mute-toggle${bgmMuted ? " muted" : ""}`}
              onClick={handleBgmMute}
              onMouseEnter={playHover}
              aria-pressed={bgmMuted}
            >
              {bgmMuted ? "음소거 해제" : "음소거"}
            </button>
          </div>

          {/* SFX */}
          <div className="sound-row">
            <div className="sound-row-header">
              <span className="sound-label">효과음</span>
              <span className="sound-pct">{sfxVolume}%</span>
            </div>
            <input
              type="range"
              className="vol-slider"
              min={0}
              max={100}
              value={sfxVolume}
              aria-label="효과음 볼륨"
              onChange={(e) => onSfxVolume(Number(e.target.value))}
              onMouseUp={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (!sfxMuted && v > 0) playSelectPreview(v);
              }}
            />
            <button
              className={`mute-toggle${sfxMuted ? " muted" : ""}`}
              onClick={handleSfxMute}
              onMouseEnter={playHover}
              aria-pressed={sfxMuted}
            >
              {sfxMuted ? "음소거 해제" : "음소거"}
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-done" onClick={handleClose} onMouseEnter={playHover}>닫기</button>
        </div>
      </div>
    </div>
  );
}
