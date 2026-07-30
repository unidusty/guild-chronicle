import { useState } from "react";

// 기존 125% = 새 100% (--ui-scale: 1.25)
// 기존 150% = 새 125% (--ui-scale: 1.5)
// 기존 175% = 새 150% (--ui-scale: 1.75)
// 신규       = 새 175% (--ui-scale: 2.0)
export type UiScale = 1.25 | 1.5 | 1.75 | 2;
export const UI_SCALES: UiScale[] = [1.25, 1.5, 1.75, 2];
export const UI_SCALE_LABELS: Record<UiScale, string> = {
  1.25: "100%",
  1.5:  "125%",
  1.75: "150%",
  2:    "175%",
};

const STORAGE_KEY = "guild-chronicle-ui-scale";
const DEFAULT_SCALE: UiScale = 1.25;

function readSaved(): UiScale {
  try {
    const n = parseFloat(localStorage.getItem(STORAGE_KEY) ?? "");
    if (UI_SCALES.includes(n as UiScale)) return n as UiScale;
  } catch {}
  return DEFAULT_SCALE;
}

function apply(scale: UiScale) {
  document.documentElement.style.setProperty("--ui-scale", String(scale));
  try { localStorage.setItem(STORAGE_KEY, String(scale)); } catch {}
}

export function useUiScale() {
  const [scale, setScaleState] = useState<UiScale>(() => {
    const s = readSaved();
    apply(s);
    return s;
  });

  const setScale = (s: UiScale) => { apply(s); setScaleState(s); };
  return [scale, setScale] as const;
}
