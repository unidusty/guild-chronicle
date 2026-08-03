export type EntityId = string;
export type FormationSlot = "front-1" | "front-2" | "mid-1" | "mid-2" | "back-1" | "back-2";
export type FormationRow = "front" | "mid" | "back";
export type Formation = Partial<Record<FormationSlot, EntityId>>;
export type LootCategory = "monster" | "herb" | "mineral" | "misc";

export interface LootItem {
  id: EntityId;
  name: string;
  category: LootCategory;
  baseValue: number;
}

export type Race = "human" | "elf" | "dwarf";
export type Gender = "male" | "female";
export type AdventurerRank = "F" | "E" | "D" | "C" | "B" | "A" | "S";
export type AdventurerStatus = "idle" | "dispatched" | "injured" | "training" | "recovering";
export type PartyStatus = "idle" | "dispatched" | "returning" | "waiting_settlement";
export type QuestStatus = "available" | "assigned" | "in_progress" | "completed" | "failed" | "expired";
export type QuestType = "normal" | "urgent" | "raid";
export type QuestStage = "traveling" | "searching" | "executing" | "returning";
export type QuestEventCategory = "exploration" | "combat" | "environment" | "reward" | "person" | "danger";
export type QuestDecisionType = "continue" | "withdraw" | "support_dispatch" | "extra_explore" | "abandon";
export type QuestResultGrade = "great_success" | "success" | "narrow_success" | "retreat" | "failure" | "great_failure";
export type QuestCategory = "escort" | "search" | "hunt" | "delivery" | "rescue" | "exploration";
export type ChronicleScope = "guild" | "adventurer" | "party" | "world";
export type ChronicleCategory = "join" | "quest" | "injury" | "growth" | "facility" | "reputation" | "world";
export type AdventureLogCategory =
  | "departure" | "travel" | "exploration" | "combat" | "defense"
  | "healing" | "discovery" | "incident" | "decision" | "injury"
  | "growth" | "trait" | "relationship" | "teamwork" | "retreat"
  | "failure" | "death" | "return" | "completion";
export type AdventureLogImportance = "normal" | "notable" | "major" | "historic";

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
  trainingDays: number;
  joinedAt: GameDate;
  isArchived: boolean;
  personality: string;
  background: string;
  combatRatings: CombatRatings;
  combatTendencies: CombatTendencies;
  questsCompleted: number;
  questsDispatched: number;
  totalActivityDays: number;
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

export interface PartyHistory {
  memberIds: EntityId[];
  startDate: GameDate;
  endDate: GameDate;
  questCount: number;
}

export interface Party {
  id: EntityId;
  name: string;
  previousNames: string[];
  leaderId: EntityId | null;
  memberIds: EntityId[];
  rank: AdventurerRank;
  status: PartyStatus;
  activeQuestId: EntityId | null;
  experience: number;
  currentFormationDays: number;
  currentFormationQuestCount: number;
  formationStartDate: GameDate | null;
  formationHistory: PartyHistory[];
  questsCompleted: number;
  questsDispatched: number;
  totalActivityDays: number;
  formation: Formation;
  totalGoldEarned: number;
}

export interface LootDrop {
  itemId: EntityId;
  quantity: number;
}

export interface QuestCompletionResult {
  questId: EntityId;
  questTitle: string;
  grade: AdventurerRank;
  partyId: EntityId;
  partyName: string;
  adventurerIds: EntityId[];
  durationDays: number;
  rewardGold: number;
  completedAt: GameDate;
  loot: LootDrop[];
}

export interface SaleTransaction {
  id: string;
  date: GameDate;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quest {
  id: EntityId;
  title: string;
  grade: AdventurerRank;
  regionId: EntityId;
  type: QuestCategory;
  questType: QuestType;
  status: QuestStatus;
  description: string;
  clientName: string;
  dangerLevel: number;
  recommendedPartySize: number;
  expiresInDays: number;
  rewardGold: number;
  durationDays: number;
  remainingDays: number;
  progress: number;
  assignedPartyId: EntityId | null;
  expectedReturnAt: GameDate | null;
  riskTags: string[];
  enemyHint?: string | null;
}

export interface QuestEvent {
  eventId: EntityId;
  questId: EntityId;
  partyId: EntityId;
  day: number;
  category: QuestEventCategory;
  title: string;
  description: string;
  read: boolean;
}

export interface QuestDecision {
  decisionId: EntityId;
  eventId: EntityId;
  questId: EntityId;
  partyId: EntityId;
  day: number;
  decision: QuestDecisionType;
  supportPartyId: EntityId | null;
}

export interface QuestProgress {
  questId: EntityId;
  partyId: EntityId;
  startDay: number;
  expectedEndDay: number;
  currentDay: number;
  totalDays: number;
  currentStage: QuestStage;
  reportRead: boolean;
  hasIncident: boolean;
  incidentId: EntityId | null;
  events: QuestEvent[];
  decisions: QuestDecision[];
}

export interface QuestChronicleEntry {
  id: EntityId;
  questId: EntityId;
  questTitle: string;
  questCategory: QuestCategory;
  partyId: EntityId | null;
  partyNameSnapshot: string | null;
  regionId: EntityId | null;
  regionNameSnapshot: string | null;
  completedDate: GameDate;
  resultGrade: QuestResultGrade;
  narrative: string;
  rewardGold: number;
  memberCountSnapshot: number;
  incidentCount: number;
  supportUsed: boolean;
  supportPartyIds: EntityId[];
  extraExplore: boolean;
  successRate: number;
}

export interface QuestResult {
  questId: EntityId;
  partyId: EntityId;
  resultGrade: QuestResultGrade;
  successRate: number;
  success: boolean;
  dangerLevel: number;
  supportUsed: boolean;
  retreat: boolean;
  extraExplore: boolean;
  completedAt: GameDate;
}

export interface Region {
  id: EntityId;
  name: string;
  danger: number;
  control: "kingdom" | "contested" | "hostile";
}

export type FacilityStatus = "unbuilt" | "constructing" | "active" | "upgrading";

export interface Facility {
  id: EntityId;
  name: string;
  description: string;
  level: number;                         // 0 = unbuilt, 1–maxLevel = built
  maxLevel: number;
  status: FacilityStatus;
  unlocks: string[];
  targetLevel: number | null;            // level being built/upgraded toward
  constructionProgressDays: number;
  constructionDurationDays: number;
  constructionStartedDay: GameDate | null;
}

export type LootOwnership = "party" | "guild" | "quest_client";

export interface LootEntry {
  itemId: EntityId;
  itemName: string;
  quantity: number;
  unitValue: number;         // baseValue — 시장 기준가
  purchaseUnitValue: number; // 길드 매입가 (baseValue × GUILD_PURCHASE_RATE)
}

export interface LootPurchaseResult {
  itemId: EntityId;
  itemName: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
}

export interface ReturnReport {
  id: EntityId;
  questId: EntityId;
  questTitle: string;
  questCategory: QuestCategory;
  questGrade: AdventurerRank;
  partyId: EntityId;
  partyNameSnapshot: string;
  memberIdsSnapshot: EntityId[];
  regionId: EntityId;
  regionNameSnapshot: string;
  durationDays: number;
  completedAt: GameDate;
  resultGrade: QuestResultGrade;
  successRate: number;
  totalRewardGold: number;
  guildFeeGold: number;
  partyPaymentGold: number;
  loot: LootEntry[];
}

export interface SettlementResult {
  reportId: EntityId;
  guildFeeGold: number;
  partyPaymentGold: number;
  purchasedLoot: LootPurchaseResult[];
  lootPurchaseTotal: number;
  netGuildGoldChange: number;
}

// ── Finance ───────────────────────────────────────────────────────────────────

export type FinanceTransactionDirection = "income" | "expense";

export type FinanceTransactionType =
  | "quest_commission"
  | "warehouse_sale"
  | "loot_purchase"
  | "facility_construction"
  | "facility_upgrade";

export interface FinanceTransaction {
  id: EntityId;
  date: GameDate;
  type: FinanceTransactionType;
  direction: FinanceTransactionDirection;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  sourceType?: string;
  sourceId?: string;
}

export interface FinanceSummary {
  currentGold: number;
  todayIncome: number;
  todayExpense: number;
  todayNet: number;
  totalIncome: number;
  totalExpense: number;
  recentTransactions: FinanceTransaction[];
}

// ── World Events ─────────────────────────────────────────────────────────────

export type WorldEventType =
  | "festival"
  | "monster_surge"
  | "famine"
  | "abundant_harvest"
  | "merchant_visit"
  | "noble_quest_boom"
  | "border_conflict"
  | "epidemic";

export type WorldEventEffectTarget =
  | "warehouse_sale"
  | "quest_reward"
  | "recruitment"
  | "region_danger";

export interface WorldEventEffect {
  target: WorldEventEffectTarget;
  modifier: number; // fractional: 0.15 = +15%, −0.15 = −15%
}

export interface WorldEventDefinition {
  id: EntityId;
  type: WorldEventType;
  name: string;
  description: string;
  weight: number;
  minDurationDays: number;
  maxDurationDays: number;
  conflictGroup?: string;
  effects: WorldEventEffect[];
  startNotification: string;
  endNotification: string;
}

export interface ActiveWorldEvent {
  id: EntityId;
  definitionId: EntityId;
  startedAt: GameDate;
  remainingDays: number;
  effects: WorldEventEffect[];
}

export type DailyReportItemKind =
  | "quest_completed"
  | "quest_returned"
  | "quest_progress_update"
  | "quest_event"
  | "facility_completed"
  | "injury_recovered"
  | "training_completed"
  | "recruitment_accepted"
  | "recruitment_rejected"
  | "recruitment_expired"
  | "recruitment_new_applicants"
  | "world_event_started"
  | "world_event_ended";

export interface DailyReportItem {
  kind: DailyReportItemKind;
  title: string;
  description: string;
}

export interface DailyReport {
  previousDate: GameDate;
  nextDate: GameDate;
  items: DailyReportItem[];
}

// ── Recruitment Events ───────────────────────────────────────────────────────

export type RecruitmentEventType =
  | "siblings"
  | "fallen_noble"
  | "rival_guild_origin"
  | "royal_recommendation"
  | "retired_knight"
  | "suspicious_applicant"
  | "famous_adventurer_apprentice"
  | "orphan_background"
  | "injury_comeback"
  | "debt_motivated";

export interface RecruitmentEventDefinition {
  id: EntityId;
  type: RecruitmentEventType;
  name: string;
  description: string;
  featureText: string;
  advantageText: string;
  disadvantageText: string;
  weight: number;
  applicantCount: number;
  recommenderText?: string;
  specialNote?: string;
  conditions?: {
    minAge?: number;
    maxAge?: number;
    allowedRaces?: Race[];
    allowedClasses?: string[];
  };
}

export interface RecruitmentEventContext {
  eventId: EntityId;
  eventType: RecruitmentEventType;
  groupId: EntityId;
  relatedApplicantIds: EntityId[];
  originNote: string;
}

// ── Recruitment ──────────────────────────────────────────────────────────────

export type RecruitmentApplicantStatus =
  | "pending"
  | "held"
  | "accepted"
  | "rejected"
  | "expired";

export interface RecruitmentApplicant {
  id: string;
  name: string;
  race: Race;
  gender: Gender;
  age: number;
  classId: EntityId;
  portrait: string | null;
  stats: Stats;
  personalityLabel: string;
  motivation: string;
  firstImpression: string;
  // hidden from player UI
  hiddenPotential: number;
  hiddenTraits: string[];
  hiddenGrowthType: string;
  hiddenLoyaltyTendency: number;
  // state
  status: RecruitmentApplicantStatus;
  appliedAt: GameDate;
  appliedDay: number;       // toAbsoluteDay(appliedAt) for fast comparison
  expiresDay: number;       // appliedDay + EXPIRY_DAYS
  holdUntilDay: number | null;
  recruitmentEvent?: RecruitmentEventContext;
}

export interface RecruitmentHistoryItem {
  id: string;
  applicantName: string;
  classId: EntityId;
  action: "accepted" | "rejected" | "held" | "expired";
  day: number;              // absolute day of action
  adventurerId?: string;    // if accepted
}

export interface RecruitmentState {
  applicants: RecruitmentApplicant[];
  history: RecruitmentHistoryItem[];
  lastGeneratedDay: number | null;
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

export interface AdventureLogEntry {
  id: EntityId;
  questId: EntityId;
  partyId: EntityId;
  date: GameDate;
  questDay: number;
  category: AdventureLogCategory;
  importance: AdventureLogImportance;
  title: string;
  narrative: string;
  actorIds: EntityId[];
  targetIds: EntityId[];
  incidentId?: EntityId;
  decisionId?: EntityId;
  tags: string[];
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
  questProgress: Record<EntityId, QuestProgress>;
  questResults: Record<EntityId, QuestResult>;
  questChronicle: QuestChronicleEntry[];
  adventureLogs: Record<EntityId, AdventureLogEntry[]>;
  regions: Record<EntityId, Region>;
  facilities: Record<EntityId, Facility>;
  chronicle: ChronicleEntry[];
  reports: DecisionReport[];
  pendingResults: QuestCompletionResult[];
  returnReports: ReturnReport[];
  warehouse: Record<EntityId, number>;
  saleTransactions: SaleTransaction[];
  financeTransactions: FinanceTransaction[];
  recruitment: RecruitmentState;
  activeWorldEvents: ActiveWorldEvent[];
}
