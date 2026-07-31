// AUTO-GENERATED — do not edit manually. Run: npm run manifest
// Generated: 2026-07-31T02:21:35.663Z
// ID 형식: `{race}-{gender}-{basename}` — 전체 매니페스트에서 전역 유일.
// Base/mod 동일 ID 충돌 시 mod 우선.

export type PortraitSource = "base" | "mod";

export interface PortraitEntry {
  id: string;
  path: string;
  race: string;
  gender: string;
  source: PortraitSource;
}

export interface AssetManifest {
  generatedAt: string;
  portraits: PortraitEntry[];
}

export const assetManifest: AssetManifest = {
  generatedAt: "2026-07-31T02:21:35.663Z",
  portraits: [],
};
