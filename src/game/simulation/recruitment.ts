import type {
  Adventurer, ChronicleEntry, EntityId, GameDate, GameState,
  Race, RecruitmentApplicant, RecruitmentEventDefinition, RecruitmentHistoryItem, Stats,
} from "../../types/game";
import { FACILITY_DEFS } from "../../data/facilityData";
import { getPortraitAvoiding } from "../assets/portraits";
import { GIVEN_NAMES, FAMILY_NAMES } from "../../data/names";
import {
  AGE_RANGES, CLASS_IDS, COMBAT_BASE, COMBAT_TENDENCY_BASE,
  EXPIRY_DAYS, FIRST_IMPRESSIONS, HIDDEN_GROWTH_TYPES,
  HOLD_DAYS, MAX_HISTORY, MOTIVATIONS, NEGATIVE_TRAITS,
  PERSONALITY_LABELS, POSITIVE_TRAITS, RACE_WEIGHTS, RARE_TRAITS,
  STAT_TEMPLATES,
} from "../../data/recruitmentData";
import { RECRUITMENT_EVENT_DEFINITIONS } from "../../data/recruitmentEventData";
import { jobLabels } from "../constants/labels";
import { advanceDate } from "./advance";

// ── Helpers ──────────────────────────────────────────────────────────────────

export function toAbsoluteDay(date: GameDate): number {
  const seasonIndex = ["spring", "summer", "autumn", "winter"].indexOf(date.season);
  return date.year * 120 + seasonIndex * 30 + date.day;
}

export function addDaysToDate(date: GameDate, days: number): GameDate {
  let result = date;
  for (let i = 0; i < days; i++) result = advanceDate(result);
  return result;
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickWeighted<T extends string>(
  pool: Array<{ value: T; weight: number }>,
  rng: () => number,
): T {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (const { value, weight } of pool) {
    r -= weight;
    if (r <= 0) return value;
  }
  return pool[pool.length - 1].value;
}

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ── Name generation ──────────────────────────────────────────────────────────

function generateName(
  race: "human" | "elf" | "dwarf",
  gender: "male" | "female",
  existingNames: Set<string>,
  rng: () => number,
): string {
  const firstPool = GIVEN_NAMES[race][gender];
  const lastPool = FAMILY_NAMES[race];
  let attempts = 0;
  while (attempts < 12) {
    const name = `${pickRandom(firstPool, rng)} ${pickRandom(lastPool, rng)}`;
    if (!existingNames.has(name)) return name;
    attempts++;
  }
  return `${pickRandom(firstPool, rng)} ${pickRandom(lastPool, rng)}`;
}

// ── Stat generation ──────────────────────────────────────────────────────────

function generateStats(classId: string, rng: () => number): Stats {
  const template = STAT_TEMPLATES[classId] ?? STAT_TEMPLATES["warrior"];
  const base = (): number => randInt(3, 6, rng);
  const stats: Stats = {
    strength:     base(),
    agility:      base(),
    endurance:    base(),
    intelligence: base(),
    perception:   base(),
    willpower:    base(),
  };
  for (const stat of template.primary) {
    stats[stat] += randInt(2, 4, rng);
  }
  for (const stat of template.secondary) {
    stats[stat] += randInt(1, 2, rng);
  }
  return stats;
}

// ── Hidden data generation ───────────────────────────────────────────────────

function generateHiddenPotential(rng: () => number): number {
  const r = rng();
  if (r < 0.10) return randInt(1, 25, rng);
  if (r < 0.35) return randInt(26, 45, rng);
  if (r < 0.75) return randInt(46, 70, rng);
  if (r < 0.95) return randInt(71, 88, rng);
  return randInt(89, 100, rng);
}

function generateHiddenTraits(rng: () => number): string[] {
  const traits: string[] = [];
  // Rare traits (very low chance)
  if (rng() < 0.003) {
    traits.push(pickRandom(RARE_TRAITS, rng));
    return traits;
  }
  // Positive trait
  if (rng() < 0.15) traits.push(pickRandom(POSITIVE_TRAITS, rng));
  // Negative trait (independent roll)
  if (rng() < 0.10) traits.push(pickRandom(NEGATIVE_TRAITS, rng));
  return traits;
}

// ── Core applicant generation ────────────────────────────────────────────────

function generateSingleApplicant(
  appliedAt: GameDate,
  usedPaths: Set<string>,
  existingNames: Set<string>,
  rng: () => number,
): RecruitmentApplicant {
  const race = pickWeighted(RACE_WEIGHTS.map(({ race, weight }) => ({ value: race, weight })), rng);
  const gender = rng() < 0.5 ? "male" : "female";
  const classId = pickRandom(CLASS_IDS, rng) as string;
  const { min, max } = AGE_RANGES[race];
  const age = randInt(min, max, rng);

  const name = generateName(race, gender, existingNames, rng);
  const portrait = getPortraitAvoiding(race, gender as "male" | "female", classId, usedPaths);
  const stats = generateStats(classId, rng);
  const appliedDay = toAbsoluteDay(appliedAt);

  return {
    id: `applicant-${Math.random().toString(36).slice(2, 9)}`,
    name,
    race,
    gender: gender as "male" | "female",
    age,
    classId: classId as EntityId,
    portrait,
    stats,
    personalityLabel: pickRandom(PERSONALITY_LABELS, rng),
    motivation:       pickRandom(MOTIVATIONS, rng),
    firstImpression:  pickRandom(FIRST_IMPRESSIONS, rng),
    hiddenPotential:        generateHiddenPotential(rng),
    hiddenTraits:           generateHiddenTraits(rng),
    hiddenGrowthType:       pickRandom(HIDDEN_GROWTH_TYPES, rng),
    hiddenLoyaltyTendency:  randInt(10, 90, rng),
    status: "pending",
    appliedAt,
    appliedDay,
    expiresDay: appliedDay + EXPIRY_DAYS,
    holdUntilDay: null,
  };
}

// ── Recruitment event generation ─────────────────────────────────────────────

function pickEventDefinition(rng: () => number): RecruitmentEventDefinition {
  const defs = RECRUITMENT_EVENT_DEFINITIONS;
  const total = defs.reduce((s, d) => s + d.weight, 0);
  let r = rng() * total;
  for (const def of defs) {
    r -= def.weight;
    if (r <= 0) return def;
  }
  return defs[defs.length - 1];
}

function pickClassForEvent(def: RecruitmentEventDefinition, rng: () => number): string {
  const allowed = def.conditions?.allowedClasses;
  if (allowed && allowed.length > 0) return allowed[Math.floor(rng() * allowed.length)];
  return pickRandom(CLASS_IDS, rng) as string;
}

function pickRaceForEvent(def: RecruitmentEventDefinition, rng: () => number): Race {
  const allowed = def.conditions?.allowedRaces as Race[] | undefined;
  if (allowed && allowed.length > 0) {
    const pool = RACE_WEIGHTS.filter((rw) => allowed.includes(rw.race as Race));
    if (pool.length > 0) return pickWeighted(pool.map(({ race, weight }) => ({ value: race as Race, weight })), rng);
    return allowed[Math.floor(rng() * allowed.length)] as Race;
  }
  return pickWeighted(RACE_WEIGHTS.map(({ race, weight }) => ({ value: race as Race, weight })), rng);
}

function pickAgeForEvent(def: RecruitmentEventDefinition, race: Race, rng: () => number): number {
  const { min: raceMin, max: raceMax } = AGE_RANGES[race];
  const minAge = Math.max(raceMin, def.conditions?.minAge ?? raceMin);
  const maxAge = Math.min(raceMax, def.conditions?.maxAge ?? raceMax);
  if (minAge > maxAge) return raceMin;
  return randInt(minAge, maxAge, rng);
}

function generateEventApplicants(
  def: RecruitmentEventDefinition,
  appliedAt: GameDate,
  usedPaths: Set<string>,
  existingNames: Set<string>,
  rng: () => number,
): RecruitmentApplicant[] {
  const groupId: EntityId = `rgroup-${Math.random().toString(36).slice(2, 9)}`;
  const appliedDay = toAbsoluteDay(appliedAt);

  if (def.applicantCount === 2 && def.type === "siblings") {
    const race = pickRaceForEvent(def, rng);
    const familyName = pickRandom(FAMILY_NAMES[race], rng);

    const makeOne = (gender: "male" | "female"): RecruitmentApplicant => {
      const classId = pickRandom(CLASS_IDS, rng) as string;
      const age = pickAgeForEvent(def, race, rng);
      const firstName = (() => {
        const pool = GIVEN_NAMES[race][gender];
        let attempts = 0;
        while (attempts < 12) {
          const n = pickRandom(pool, rng);
          const full = `${n} ${familyName}`;
          if (!existingNames.has(full)) return n;
          attempts++;
        }
        return pickRandom(pool, rng);
      })();
      const name = `${firstName} ${familyName}`;
      const portrait = getPortraitAvoiding(race, gender, classId, usedPaths);
      return {
        id: `applicant-${Math.random().toString(36).slice(2, 9)}`,
        name,
        race,
        gender,
        age,
        classId: classId as EntityId,
        portrait,
        stats: generateStats(classId, rng),
        personalityLabel: pickRandom(PERSONALITY_LABELS, rng),
        motivation: pickRandom(MOTIVATIONS, rng),
        firstImpression: pickRandom(FIRST_IMPRESSIONS, rng),
        hiddenPotential: generateHiddenPotential(rng),
        hiddenTraits: generateHiddenTraits(rng),
        hiddenGrowthType: pickRandom(HIDDEN_GROWTH_TYPES, rng),
        hiddenLoyaltyTendency: randInt(10, 90, rng),
        status: "pending",
        appliedAt,
        appliedDay,
        expiresDay: appliedDay + EXPIRY_DAYS,
        holdUntilDay: null,
        recruitmentEvent: {
          eventId: def.id,
          eventType: def.type,
          groupId,
          relatedApplicantIds: [],
          originNote: "형제 함께 지원",
        },
      };
    };

    const genderA: "male" | "female" = rng() < 0.5 ? "male" : "female";
    const genderB: "male" | "female" = rng() < 0.4 ? genderA : (genderA === "male" ? "female" : "male");
    const a = makeOne(genderA);
    const b = makeOne(genderB);
    if (a.portrait) usedPaths.add(a.portrait);
    existingNames.add(a.name);
    existingNames.add(b.name);

    a.recruitmentEvent!.relatedApplicantIds = [b.id];
    b.recruitmentEvent!.relatedApplicantIds = [a.id];
    return [a, b];
  }

  // Single applicant events
  const race = pickRaceForEvent(def, rng);
  const gender: "male" | "female" = rng() < 0.5 ? "male" : "female";
  const classId = pickClassForEvent(def, rng);
  const age = pickAgeForEvent(def, race, rng);
  const name = generateName(race, gender, existingNames, rng);
  const portrait = getPortraitAvoiding(race, gender, classId, usedPaths);

  const originNotes: Record<string, string> = {
    "re-basic-newcomer":      "새로운 출발을 원하는 신입 모험가",
    "re-new-start":           "새로운 출발을 원하는 모험가",
    "re-first-guild":         "처음으로 길드를 찾은 초보 모험가",
    "re-stable-life":         "안정적인 소속을 원하는 모험가",
    "re-quiet-proof":         "조용히 실력을 증명하고 싶은 모험가",
    "re-injury-comeback":     "부상 후 재기를 꿈꾸는 경력자",
    "re-debt-motivated":      "채무 상환을 위해 지원한 모험가",
    "re-fallen-noble":        "몰락한 귀족 출신",
    "re-rival-guild":         "라이벌 길드 출신",
    "re-royal-recommendation":"왕실 추천장 보유",
    "re-retired-knight":      "은퇴 기사",
    "re-suspicious":          "출신 불명의 지원자",
    "re-famous-apprentice":   "유명 모험가의 제자",
    "re-orphan":              "고아 출신",
  };

  return [{
    id: `applicant-${Math.random().toString(36).slice(2, 9)}`,
    name,
    race,
    gender,
    age,
    classId: classId as EntityId,
    portrait,
    stats: generateStats(classId, rng),
    personalityLabel: pickRandom(PERSONALITY_LABELS, rng),
    motivation: pickRandom(MOTIVATIONS, rng),
    firstImpression: pickRandom(FIRST_IMPRESSIONS, rng),
    hiddenPotential: generateHiddenPotential(rng),
    hiddenTraits: generateHiddenTraits(rng),
    hiddenGrowthType: pickRandom(HIDDEN_GROWTH_TYPES, rng),
    hiddenLoyaltyTendency: randInt(10, 90, rng),
    status: "pending",
    appliedAt,
    appliedDay,
    expiresDay: appliedDay + EXPIRY_DAYS,
    holdUntilDay: null,
    recruitmentEvent: {
      eventId: def.id,
      eventType: def.type,
      groupId,
      relatedApplicantIds: [],
      originNote: originNotes[def.id] ?? def.name,
    },
  }];
}

// ── Day advance: expire applicants ───────────────────────────────────────────

export function expireApplicants(
  state: GameState,
): { state: GameState; expired: RecruitmentApplicant[] } {
  const todayAbsDay = toAbsoluteDay(state.currentDate);
  const expired: RecruitmentApplicant[] = [];
  const newApplicants = state.recruitment.applicants.map((a) => {
    if ((a.status === "pending" || a.status === "held") && todayAbsDay >= a.expiresDay) {
      expired.push(a);
      return { ...a, status: "expired" as const };
    }
    return a;
  });

  if (expired.length === 0) return { state, expired };

  const newHistory: RecruitmentHistoryItem[] = [
    ...expired.map((a): RecruitmentHistoryItem => ({
      id: `hist-${a.id}-exp-${todayAbsDay}`,
      applicantName: a.name,
      classId: a.classId,
      action: "expired",
      day: todayAbsDay,
    })),
    ...state.recruitment.history,
  ].slice(0, MAX_HISTORY);

  return {
    state: { ...state, recruitment: { ...state.recruitment, applicants: newApplicants, history: newHistory } },
    expired,
  };
}

// ── Day advance: release held applicants whose hold period ended ──────────────

export function releaseHeldApplicants(state: GameState): GameState {
  const todayAbsDay = toAbsoluteDay(state.currentDate);
  let changed = false;
  const newApplicants = state.recruitment.applicants.map((a) => {
    if (a.status === "held" && a.holdUntilDay !== null && todayAbsDay >= a.holdUntilDay) {
      changed = true;
      return { ...a, status: "pending" as const, holdUntilDay: null };
    }
    return a;
  });
  if (!changed) return state;
  return { ...state, recruitment: { ...state.recruitment, applicants: newApplicants } };
}

// ── Day advance: generate new applicants for the current date ─────────────────

export function generateDailyApplicants(
  state: GameState,
  rng: () => number = Math.random,
): { state: GameState; newApplicants: RecruitmentApplicant[] } {
  const newAbsDay = toAbsoluteDay(state.currentDate);
  if (state.recruitment.lastGeneratedDay === newAbsDay) {
    return { state, newApplicants: [] };
  }

  const facility = state.facilities["facility-recruitment"];
  const canRecruit = facility && facility.level > 0 && facility.status !== "constructing";
  if (!canRecruit) {
    return { state: { ...state, recruitment: { ...state.recruitment, lastGeneratedDay: newAbsDay } }, newApplicants: [] };
  }

  const def = FACILITY_DEFS["facility-recruitment"];
  const levelDef = def?.levels[facility.level - 1];
  const config = levelDef?.recruitment;
  if (!config) {
    return { state: { ...state, recruitment: { ...state.recruitment, lastGeneratedDay: newAbsDay } }, newApplicants: [] };
  }

  const pendingCount = state.recruitment.applicants.filter(
    (a) => a.status === "pending" || a.status === "held",
  ).length;
  if (pendingCount >= config.capacity) {
    return { state: { ...state, recruitment: { ...state.recruitment, lastGeneratedDay: newAbsDay } }, newApplicants: [] };
  }

  if (rng() >= config.dailyChance) {
    return { state: { ...state, recruitment: { ...state.recruitment, lastGeneratedDay: newAbsDay } }, newApplicants: [] };
  }

  const spaceAvailable = config.capacity - pendingCount;
  if (spaceAvailable <= 0) {
    return { state: { ...state, recruitment: { ...state.recruitment, lastGeneratedDay: newAbsDay } }, newApplicants: [] };
  }

  // Collect used portrait paths and names
  const usedPaths = new Set<string>();
  for (const adv of Object.values(state.adventurers)) {
    if (adv.portrait) usedPaths.add(adv.portrait);
  }
  for (const app of state.recruitment.applicants) {
    if (app.portrait) usedPaths.add(app.portrait);
  }

  const existingNames = new Set(
    Object.values(state.adventurers).map((a) => a.name).concat(
      state.recruitment.applicants.map((a) => a.name),
    ),
  );

  const appliedAt = state.currentDate;
  const newApplicants: RecruitmentApplicant[] = [];

  // All applicants are generated through the event pool.
  // Basic events (basic_newcomer, new_start, etc.) serve as the fallback for ordinary applicants.
  const eventDef = pickEventDefinition(rng);
  const eventApplicants = generateEventApplicants(eventDef, appliedAt, usedPaths, existingNames, rng);
  const toAdd = eventApplicants.slice(0, spaceAvailable);
  for (const a of toAdd) {
    newApplicants.push(a);
    if (a.portrait) usedPaths.add(a.portrait);
    existingNames.add(a.name);
  }

  return {
    state: {
      ...state,
      recruitment: {
        ...state.recruitment,
        applicants: [...state.recruitment.applicants, ...newApplicants],
        lastGeneratedDay: newAbsDay,
      },
    },
    newApplicants,
  };
}

// ── Player actions ────────────────────────────────────────────────────────────

export function acceptApplicant(state: GameState, applicantId: string): GameState {
  const applicant = state.recruitment.applicants.find((a) => a.id === applicantId);
  if (!applicant || applicant.status !== "pending") return state;

  const todayAbsDay = toAbsoluteDay(state.currentDate);
  const newAdventurer = convertApplicantToAdventurer(applicant, state.currentDate);

  const newApplicants = state.recruitment.applicants.map((a) =>
    a.id === applicantId ? { ...a, status: "accepted" as const } : a,
  );

  const historyItem: RecruitmentHistoryItem = {
    id: `hist-${applicantId}-acc-${todayAbsDay}`,
    applicantName: applicant.name,
    classId: applicant.classId,
    action: "accepted",
    day: todayAbsDay,
    adventurerId: newAdventurer.id,
  };

  const eventNote = applicant.recruitmentEvent?.originNote;
  const chronicleEntry: ChronicleEntry = {
    id: `chr-rec-${newAdventurer.id}-${state.currentDate.year}-${state.currentDate.season}-${state.currentDate.day}`,
    date: state.currentDate,
    scope: "adventurer",
    category: "join",
    title: "길드 입단",
    description: eventNote
      ? `${jobLabels[applicant.classId] ?? applicant.classId} ${applicant.name}이(가) 서풍 길드에 가입했다. [${eventNote}]`
      : `${jobLabels[applicant.classId] ?? applicant.classId} ${applicant.name}이(가) 서풍 길드에 가입했다.`,
    relatedEntityIds: [newAdventurer.id],
  };

  return {
    ...state,
    adventurers: { ...state.adventurers, [newAdventurer.id]: newAdventurer },
    guild: { ...state.guild, adventurerIds: [...state.guild.adventurerIds, newAdventurer.id] },
    chronicle: [chronicleEntry, ...state.chronicle],
    recruitment: {
      ...state.recruitment,
      applicants: newApplicants,
      history: [historyItem, ...state.recruitment.history].slice(0, MAX_HISTORY),
    },
  };
}

export function rejectApplicant(state: GameState, applicantId: string): GameState {
  const applicant = state.recruitment.applicants.find((a) => a.id === applicantId);
  if (!applicant || (applicant.status !== "pending" && applicant.status !== "held")) return state;

  const todayAbsDay = toAbsoluteDay(state.currentDate);
  const newApplicants = state.recruitment.applicants.map((a) =>
    a.id === applicantId ? { ...a, status: "rejected" as const } : a,
  );

  const historyItem: RecruitmentHistoryItem = {
    id: `hist-${applicantId}-rej-${todayAbsDay}`,
    applicantName: applicant.name,
    classId: applicant.classId,
    action: "rejected",
    day: todayAbsDay,
  };

  return {
    ...state,
    recruitment: {
      ...state.recruitment,
      applicants: newApplicants,
      history: [historyItem, ...state.recruitment.history].slice(0, MAX_HISTORY),
    },
  };
}

export function holdApplicant(state: GameState, applicantId: string): GameState {
  const applicant = state.recruitment.applicants.find((a) => a.id === applicantId);
  if (!applicant || applicant.status !== "pending") return state;

  const todayAbsDay = toAbsoluteDay(state.currentDate);
  const holdUntilDay = todayAbsDay + HOLD_DAYS;
  const newApplicants = state.recruitment.applicants.map((a) =>
    a.id === applicantId
      ? { ...a, status: "held" as const, holdUntilDay }
      : a,
  );

  const historyItem: RecruitmentHistoryItem = {
    id: `hist-${applicantId}-held-${todayAbsDay}`,
    applicantName: applicant.name,
    classId: applicant.classId,
    action: "held",
    day: todayAbsDay,
  };

  return {
    ...state,
    recruitment: {
      ...state.recruitment,
      applicants: newApplicants,
      history: [historyItem, ...state.recruitment.history].slice(0, MAX_HISTORY),
    },
  };
}

export function releaseHold(state: GameState, applicantId: string): GameState {
  const applicant = state.recruitment.applicants.find((a) => a.id === applicantId);
  if (!applicant || applicant.status !== "held") return state;

  const newApplicants = state.recruitment.applicants.map((a) =>
    a.id === applicantId ? { ...a, status: "pending" as const, holdUntilDay: null } : a,
  );

  return {
    ...state,
    recruitment: { ...state.recruitment, applicants: newApplicants },
  };
}

// ── Applicant → Adventurer conversion ────────────────────────────────────────

function convertApplicantToAdventurer(
  applicant: RecruitmentApplicant,
  joinedAt: GameDate,
): Adventurer {
  const slug = applicant.name.replace(/\s+/g, "-").replace(/[^\w-]/g, "").toLowerCase();
  const id: EntityId = `adv-rec-${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const combatBase = COMBAT_BASE[applicant.classId] ?? COMBAT_BASE["warrior"];
  const combatTend = COMBAT_TENDENCY_BASE[applicant.classId] ?? COMBAT_TENDENCY_BASE["warrior"];

  // belonging: 30-80 derived from hiddenLoyaltyTendency (1-90)
  const belonging = Math.round(30 + (applicant.hiddenLoyaltyTendency / 90) * 50);

  return {
    id,
    name: applicant.name,
    race: applicant.race,
    gender: applicant.gender,
    age: applicant.age,
    classId: applicant.classId,
    rank: "F",
    portrait: applicant.portrait,
    stats: { ...applicant.stats },
    potential: applicant.hiddenPotential,
    traits: applicant.hiddenTraits.map((t) => ({ id: t, revealed: false })),
    belonging,
    status: "idle",
    partyId: null,
    currentQuestId: null,
    injuryIds: [],
    trainingDays: 0,
    joinedAt,
    isArchived: false,
    personality: applicant.personalityLabel,
    background: "신입 모험가",
    combatRatings: { ...combatBase },
    combatTendencies: { ...combatTend },
    questsCompleted: 0,
    questsDispatched: 0,
    totalActivityDays: 0,
    recruitmentEventId: applicant.recruitmentEvent?.eventId,
  };
}
