export type EntityId = string;

export type Race = "human" | "elf" | "dwarf";
export type Gender = "male" | "female";
export type AdventurerRank = "D" | "C" | "B" | "A" | "S";
export type AdventurerStatus = "idle" | "dispatched" | "injured" | "training" | "recovering";
export type PartyStatus = "idle" | "dispatched" | "returning";
export type QuestStatus = "available" | "assigned" | "completed" | "failed" | "expired";
export type ChronicleScope = "guild" | "adventurer" | "party" | "world";
export type ChronicleCategory = "join" | "quest" | "injury" | "growth" | "facility" | "reputation" | "world";

export interface GameDate {
  year: number;
  season: "spring" | "summer" | "autumn" | "winter";
  day: number;
}

export interface Stats {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
  perception: number;
  willpower: number;
}

export interface TraitRef {
  id: EntityId;
  revealed: boolean;
}

export interface CombatRatings {
  attack: number;
  defense: number;
  evasion: number;
  accuracy: number;
  survival: number;
  leadership: number;
}

export interface CombatTendencies {
  melee: number;
  ranged: number;
  magic: number;
  survival: number;
  command: number;
}

export interface Adventurer {
  id: EntityId;
  name: string;
  race: Race;
  gender: Gender;
  age: number;
  classId: EntityId;
  rank: AdventurerRank;
  portrait: string | null;
  stats: Stats;
  potential: number;
  traits: TraitRef[];
  belonging: number;
  status: AdventurerStatus;
  partyId: EntityId | null;
  currentQuestId: EntityId | null;
  injuryIds: EntityId[];
  joinedAt: GameDate;
  isArchived: boolean;
  personality: string;
  background: string;
  combatRatings: CombatRatings;
  combatTendencies: CombatTendencies;
}

export interface AdventurerClass {
  id: EntityId;
  name: string;
  role: "vanguard" | "damage" | "support" | "scout";
  primaryStats: Array<keyof Stats>;
}

export interface Injury {
  id: EntityId;
  adventurerId: EntityId;
  name: string;
  severity: "minor" | "moderate" | "severe";
  recoveryDays: number;
}

export interface Party {
  id: EntityId;
  name: string;
  leaderId: EntityId;
  memberIds: EntityId[];
  rank: AdventurerRank;
  status: PartyStatus;
  activeQuestId: EntityId | null;
  experience: number;
}

export interface Quest {
  id: EntityId;
  title: string;
  grade: AdventurerRank;
  regionId: EntityId;
  type: "escort" | "search" | "hunt" | "delivery" | "rescue" | "exploration";
  status: QuestStatus;
  rewardGold: number;
  durationDays: number;
  progress: number;
  assignedPartyId: EntityId | null;
  expectedReturnAt: GameDate | null;
  riskTags: string[];
}

export interface Region {
  id: EntityId;
  name: string;
  danger: number;
  control: "kingdom" | "contested" | "hostile";
}

export interface Facility {
  id: EntityId;
  name: string;
  level: number;
  status: "active" | "upgrading" | "damaged";
}

export interface Guild {
  id: EntityId;
  name: string;
  gold: number;
  reputation: number;
  reputationTier: number;
  facilityIds: EntityId[];
  adventurerIds: EntityId[];
  partyIds: EntityId[];
}

export interface ChronicleEntry {
  id: EntityId;
  date: GameDate;
  scope: ChronicleScope;
  category: ChronicleCategory;
  title: string;
  description: string;
  relatedEntityIds: EntityId[];
}

export interface DecisionReport {
  id: EntityId;
  kind: "medical" | "emergency" | "recruitment";
  title: string;
  description: string;
  relatedEntityIds: EntityId[];
  priority: "normal" | "high" | "critical";
}

export interface GameState {
  version: number;
  currentDate: GameDate;
  guild: Guild;
  adventurers: Record<EntityId, Adventurer>;
  classes: Record<EntityId, AdventurerClass>;
  injuries: Record<EntityId, Injury>;
  parties: Record<EntityId, Party>;
  quests: Record<EntityId, Quest>;
  regions: Record<EntityId, Region>;
  facilities: Record<EntityId, Facility>;
  chronicle: ChronicleEntry[];
  reports: DecisionReport[];
}
