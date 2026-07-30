import { useState } from "react";

export type UiScale = 1 | 1.25 | 1.5 | 1.75;
export const UI_SCALES: UiScale[] = [1, 1.25, 1.5, 1.75];
const STORAGE_KEY = "guild-chronicle-ui-scale";

function readSaved(): UiScale {
  try {
    const n = parseFloat(localStorage.getItem(STORAGE_KEY) ?? "");
    if (UI_SCALES.includes(n as UiScale)) return n as UiScale;
  } catch {}
  return 1;
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
