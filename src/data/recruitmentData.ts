import type { CombatRatings, CombatTendencies, Stats } from "../types/game";

// ── Display text pools ───────────────────────────────────────────────────────

export const PERSONALITY_LABELS = [
  "침착한", "활달한", "과묵한", "신중한", "충동적인", "다정한", "냉정한",
  "자존심이 강한", "책임감이 강한", "낙천적인", "비관적인", "야심이 큰",
  "소심한", "고집이 센", "사교적인", "독립적인",
] as const;

export const MOTIVATIONS = [
  "실전 경험을 쌓고 싶습니다.",
  "안정적으로 의뢰를 받을 수 있는 길드를 찾고 있습니다.",
  "유명한 모험가들과 함께 성장하고 싶습니다.",
  "고향에 돈을 보내기 위해 지원했습니다.",
  "혼자 활동하는 데 한계를 느꼈습니다.",
  "더 큰 의뢰에 도전하고 싶습니다.",
  "이 지역을 지키는 일에 힘을 보태고 싶습니다.",
  "길드의 명성을 듣고 찾아왔습니다.",
  "오래 머물 수 있는 곳을 찾고 있습니다.",
  "제 실력을 증명하고 싶습니다.",
  "가족의 빚을 갚기 위해 많은 보수가 필요합니다.",
  "새로운 동료를 만나고 싶습니다.",
  "떠돌이 생활을 청산하고 싶었습니다.",
  "이전 길드가 해산하여 새 둥지를 찾고 있습니다.",
  "언젠가 고향을 지킬 힘을 키우고 싶습니다.",
] as const;

export const FIRST_IMPRESSIONS = [
  "질문에 또박또박 대답한다.",
  "긴장한 기색을 감추지 못한다.",
  "주변을 예리하게 살핀다.",
  "자신감이 지나쳐 보인다.",
  "낡은 장비를 정성스럽게 관리한 흔적이 있다.",
  "손에 굳은살이 깊게 배어 있다.",
  "길드 내부를 호기심 있게 바라본다.",
  "말수는 적지만 태도는 성실하다.",
  "동료 이야기가 나오자 표정이 어두워진다.",
  "보수에 관한 질문을 여러 번 반복한다.",
  "자신의 전력을 다소 과장하는 듯하다.",
  "현재 실력에 비해 지나치게 겸손하다.",
  "면접 내내 출입구를 신경 쓴다.",
  "지원서를 여러 번 고쳐 쓴 흔적이 있다.",
  "약속 시간보다 훨씬 일찍 도착했다.",
  "눈빛이 또렷하고 흔들림이 없다.",
  "피로한 기색이 역력하지만 자세를 바로잡으려 애쓴다.",
  "말할 때 손을 자주 움직인다.",
] as const;

// ── Hidden traits ────────────────────────────────────────────────────────────

export const POSITIVE_TRAITS = [
  "late_bloomer", "fast_learner", "iron_body", "mana_affinity",
  "natural_leader", "loyal", "brave",
] as const;

export const NEGATIVE_TRAITS = [
  "injury_prone", "cowardly", "greedy", "volatile", "disloyal", "slow_learner",
] as const;

export const RARE_TRAITS = [
  "sword_emperor", "infinite_mana",
] as const;

export const HIDDEN_GROWTH_TYPES = [
  "steady", "late_bloomer", "early_peak", "burst", "balanced",
] as const;

// ── Race & class generation weights ─────────────────────────────────────────

export const RACE_WEIGHTS: Array<{ race: "human" | "elf" | "dwarf"; weight: number }> = [
  { race: "human", weight: 55 },
  { race: "elf",   weight: 25 },
  { race: "dwarf", weight: 20 },
];

export const CLASS_IDS = [
  "warrior", "swordsman", "spearman", "archer",
  "mage", "paladin", "rogue", "priest", "guardian",
] as const;

// ── Age ranges ───────────────────────────────────────────────────────────────

export const AGE_RANGES: Record<"human" | "elf" | "dwarf", { min: number; max: number }> = {
  human: { min: 16, max: 45 },
  elf:   { min: 18, max: 180 },
  dwarf: { min: 20, max: 90 },
};

// ── Stat generation templates ─────────────────────────────────────────────────
// primary stats get a bigger bonus, secondary get a small bonus

export const STAT_TEMPLATES: Record<string, {
  primary: Array<keyof Stats>;
  secondary: Array<keyof Stats>;
}> = {
  warrior:   { primary: ["strength", "endurance"],       secondary: ["willpower"] },
  swordsman: { primary: ["strength", "agility"],         secondary: ["endurance"] },
  spearman:  { primary: ["strength", "agility"],         secondary: ["endurance"] },
  archer:    { primary: ["agility", "perception"],       secondary: ["endurance"] },
  mage:      { primary: ["intelligence", "willpower"],   secondary: ["perception"] },
  paladin:   { primary: ["endurance", "willpower"],      secondary: ["strength"] },
  rogue:     { primary: ["agility", "perception"],       secondary: ["intelligence"] },
  priest:    { primary: ["intelligence", "willpower"],   secondary: ["perception"] },
  guardian:  { primary: ["endurance", "willpower"],      secondary: ["strength"] },
};

// ── Combat base values for F-rank adventurers ────────────────────────────────

export const COMBAT_BASE: Record<string, CombatRatings> = {
  warrior:   { attack: 2, defense: 2, evasion: 1, accuracy: 1, survival: 2, leadership: 1 },
  swordsman: { attack: 2, defense: 2, evasion: 2, accuracy: 2, survival: 2, leadership: 1 },
  spearman:  { attack: 2, defense: 2, evasion: 1, accuracy: 2, survival: 2, leadership: 1 },
  archer:    { attack: 2, defense: 1, evasion: 2, accuracy: 3, survival: 1, leadership: 1 },
  mage:      { attack: 1, defense: 1, evasion: 2, accuracy: 2, survival: 1, leadership: 2 },
  paladin:   { attack: 1, defense: 3, evasion: 1, accuracy: 1, survival: 3, leadership: 2 },
  rogue:     { attack: 2, defense: 1, evasion: 3, accuracy: 2, survival: 1, leadership: 1 },
  priest:    { attack: 1, defense: 1, evasion: 1, accuracy: 1, survival: 2, leadership: 2 },
  guardian:  { attack: 1, defense: 3, evasion: 1, accuracy: 1, survival: 3, leadership: 1 },
};

export const COMBAT_TENDENCY_BASE: Record<string, CombatTendencies> = {
  warrior:   { melee: 4, ranged: 1, magic: 1, survival: 4, command: 2 },
  swordsman: { melee: 4, ranged: 1, magic: 2, survival: 3, command: 2 },
  spearman:  { melee: 4, ranged: 2, magic: 1, survival: 3, command: 2 },
  archer:    { melee: 1, ranged: 5, magic: 2, survival: 2, command: 2 },
  mage:      { melee: 1, ranged: 2, magic: 5, survival: 1, command: 3 },
  paladin:   { melee: 3, ranged: 1, magic: 2, survival: 4, command: 3 },
  rogue:     { melee: 2, ranged: 3, magic: 2, survival: 2, command: 1 },
  priest:    { melee: 1, ranged: 2, magic: 4, survival: 2, command: 4 },
  guardian:  { melee: 4, ranged: 1, magic: 1, survival: 5, command: 2 },
};

// ── Constants ────────────────────────────────────────────────────────────────

export const EXPIRY_DAYS = 5;
export const HOLD_DAYS = 2;
export const MAX_HISTORY = 20;
export const MAX_STAT = 15; // for UI bar display
