import { useState, useEffect } from "react";

// ── Storage keys ────────────────────────────────────────────────────────────────

const KEYS = {
  bgmVolume:   "guild-chronicle-bgm-volume",
  sfxVolume:   "guild-chronicle-sfx-volume",
  bgmMuted:    "guild-chronicle-bgm-muted",
  sfxMuted:    "guild-chronicle-sfx-muted",
  legacyMuted: "guild-chronicle-muted",
} as const;

const DEFAULTS = { bgmVolume: 15, sfxVolume: 35, bgmMuted: false, sfxMuted: false };

const HOVER_COEFF  = 0.55;
const SELECT_COEFF = 1.0;

// ── Singleton audio elements ────────────────────────────────────────────────────

let bgmEl:    HTMLAudioElement | null = null;
let hoverEl:  HTMLAudioElement | null = null;
let selectEl: HTMLAudioElement | null = null;

function getBgm():    HTMLAudioElement { if (!bgmEl)    { bgmEl    = new Audio("/audio/guild-hall-bgm.mp3"); bgmEl.loop = true; } return bgmEl; }
function getHover():  HTMLAudioElement { if (!hoverEl)  hoverEl  = new Audio("/audio/ui-hover.mp3");  return hoverEl; }
function getSelect(): HTMLAudioElement { if (!selectEl) selectEl = new Audio("/audio/ui-select.mp3"); return selectEl; }

// ── localStorage helpers ────────────────────────────────────────────────────────

function loadNum(key: string, fallback: number): number {
  try { const v = parseFloat(localStorage.getItem(key) ?? ""); return isFinite(v) ? v : fallback; } catch { return fallback; }
}
function loadBool(key: string, fallback: boolean): boolean {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === "true"; } catch { return fallback; }
}
function persist(key: string, value: string) { try { localStorage.setItem(key, value); } catch {} }

function migrateLegacy() {
  try {
    const old = localStorage.getItem(KEYS.legacyMuted);
    if (old !== null && localStorage.getItem(KEYS.bgmMuted) === null) {
      localStorage.setItem(KEYS.bgmMuted, old);
      localStorage.removeItem(KEYS.legacyMuted);
    }
  } catch {}
}

function readInitial() {
  migrateLegacy();
  return {
    bgmVolume: loadNum (KEYS.bgmVolume, DEFAULTS.bgmVolume),
    sfxVolume: loadNum (KEYS.sfxVolume, DEFAULTS.sfxVolume),
    bgmMuted:  loadBool(KEYS.bgmMuted,  DEFAULTS.bgmMuted),
    sfxMuted:  loadBool(KEYS.sfxMuted,  DEFAULTS.sfxMuted),
  };
}

// ── Module-level SFX state (updated by hook, used by standalone functions) ─────

let _sfxVolume = DEFAULTS.sfxVolume;
let _sfxMuted  = DEFAULTS.sfxMuted;

// ── Standalone playback functions (importable without hook) ────────────────────

export function playHover() {
  if (_sfxMuted || _sfxVolume === 0) return;
  const a = getHover();
  a.volume = (_sfxVolume / 100) * HOVER_COEFF;
  a.currentTime = 0;
  a.play().catch(() => {});
}

export function playSelect() {
  if (_sfxMuted || _sfxVolume === 0) return;
  const a = getSelect();
  a.volume = (_sfxVolume / 100) * SELECT_COEFF;
  a.currentTime = 0;
  a.play().catch(() => {});
}

export function playSelectPreview(sfxVol: number) {
  if (sfxVol === 0) return;
  const a = getSelect();
  a.volume = (sfxVol / 100) * SELECT_COEFF;
  a.currentTime = 0;
  a.play().catch(() => {});
}

// ── React hook ──────────────────────────────────────────────────────────────────

export function useAudio() {
  const [state, setState] = useState(readInitial);

  // Set up BGM autoplay on first user gesture
  useEffect(() => {
    const a = getBgm();
    a.volume = state.bgmVolume / 100;
    a.muted  = state.bgmMuted;
    _sfxVolume = state.sfxVolume;
    _sfxMuted  = state.sfxMuted;

    const start = () => { a.play().catch(() => {}); };
    document.addEventListener("click",   start, { once: true });
    document.addEventListener("keydown", start, { once: true });
    return () => {
      document.removeEventListener("click",   start);
      document.removeEventListener("keydown", start);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync BGM whenever volume/muted state changes
  useEffect(() => {
    const a = getBgm();
    a.volume = state.bgmVolume / 100;
    a.muted  = state.bgmMuted;
  }, [state.bgmVolume, state.bgmMuted]);

  // Sync module-level SFX vars for standalone functions
  useEffect(() => {
    _sfxVolume = state.sfxVolume;
    _sfxMuted  = state.sfxMuted;
  }, [state.sfxVolume, state.sfxMuted]);

  function setBgmVolume(v: number) {
    const vol = Math.max(0, Math.min(100, Math.round(v)));
    persist(KEYS.bgmVolume, String(vol));
    setState((s) => ({ ...s, bgmVolume: vol }));
  }

  function setSfxVolume(v: number) {
    const vol = Math.max(0, Math.min(100, Math.round(v)));
    persist(KEYS.sfxVolume, String(vol));
    setState((s) => ({ ...s, sfxVolume: vol }));
  }

  function toggleBgmMute() {
    setState((s) => {
      const next = !s.bgmMuted;
      persist(KEYS.bgmMuted, String(next));
      return { ...s, bgmMuted: next };
    });
  }

  function toggleSfxMute() {
    setState((s) => {
      const next = !s.sfxMuted;
      persist(KEYS.sfxMuted, String(next));
      return { ...s, sfxMuted: next };
    });
  }

  return { ...state, setBgmVolume, setSfxVolume, toggleBgmMute, toggleSfxMute };
}
