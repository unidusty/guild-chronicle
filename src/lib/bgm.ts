import { useState, useEffect } from "react";

const STORAGE_KEY = "guild-chronicle-muted";
const VOLUME = 0.15;
const SRC = "/audio/guild-hall-bgm.mp3";

let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.volume = VOLUME;
  }
  return audio;
}

function readMuted(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
}

function saveMuted(v: boolean) {
  try { localStorage.setItem(STORAGE_KEY, String(v)); } catch {}
}

export function useBgm() {
  const [muted, setMutedState] = useState(readMuted);

  useEffect(() => {
    const a = getAudio();
    a.muted = muted;

    const start = () => { a.play().catch(() => {}); };
    document.addEventListener("click", start, { once: true });
    document.addEventListener("keydown", start, { once: true });
    return () => {
      document.removeEventListener("click", start);
      document.removeEventListener("keydown", start);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { getAudio().muted = muted; }, [muted]);

  const toggleMute = () => {
    const next = !muted;
    saveMuted(next);
    setMutedState(next);
  };

  return { muted, toggleMute };
}
