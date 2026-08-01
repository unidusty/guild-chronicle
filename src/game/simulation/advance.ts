import type { AdventureLogEntry, ChronicleEntry, GameDate, GameState, LootDrop, QuestCompletionResult, QuestResult } from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";
import { calcQuestStage } from "./questProgress";
import { deriveTags, selectEvent, buildQuestEvent } from "./eventEngine";
import { buildQuestResult } from "./questResult";
import { buildQuestChronicleEntry } from "./questChronicle";
import { generateDailyLog, generateIncidentLog, generateCompletionLog } from "./adventureLog";

function absDay(date: GameDate): number {
  const si = ["spring", "summer", "autumn", "winter"].indexOf(date.season);
  return date.year * 120 + si * 30 + date.day;
}

// ── Date arithmetic ─────────────────────────────────────────────────────────

const SEASON_ORDER = ["spring", "summer", "autumn", "winter"] as const;
type Season = typeof SEASON_ORDER[number];

export function advanceDate(date: GameDate): GameDate {
  if (date.day < 30) return { ...date, day: date.day + 1 };

  const idx  = SEASON_ORDER.indexOf(date.season as Season);
  const next = SEASON_ORDER[(idx + 1) % 4];
  return { year: next === "spring" ? date.year + 1 : date.year, season: next, day: 1 };
}

// ── Loot generation ──────────────────────────────────────────────────────────

const LOOT_IDS = Object.keys(LOOT_TABLE);

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestLoot(): LootDrop[] {
  const count  = randInt(1, 3);
  const result: LootDrop[] = [];
  const used   = new Set<string>();

  for (let i = 0; i < count; i++) {
    let itemId = LOOT_IDS[Math.floor(Math.random() * LOOT_IDS.length)];
    let attempts = 0;
    while (used.has(itemId) && attempts < 20) {
      itemId = LOOT_IDS[Math.floor(Math.random() * LOOT_IDS.length)];
      attempts++;
    }
    if (!used.has(itemId)) {
      used.add(itemId);
      result.push({ itemId, quantity: randInt(1, 5) });
    }
  }
  return result;
}

// ── Quest & adventurer update ────────────────────────────────────────────────

const DAILY_PROGRESS = 15;

function updateQuests(state: GameState): GameState {
  const newEntries: ChronicleEntry[] = [];
  const newResults: QuestCompletionResult[] = [];
  const newQuestResults: QuestResult[] = [];
  const newQuestChronicleEntries: ReturnType<typeof buildQuestChronicleEntry>[] = [];
  const newAdventureLogEntries: Record<string, AdventureLogEntry[]> = {};
  const quests        = { ...state.quests };
  const adventurers   = { ...state.adventurers };
  const parties       = { ...state.parties };
  const warehouse     = { ...state.warehouse };
  const questProgress = { ...state.questProgress };
  const date          = state.currentDate;
  let   goldEarned    = 0;

  function appendLog(questId: string, entry: AdventureLogEntry) {
    if (!newAdventureLogEntries[questId]) newAdventureLogEntries[questId] = [];
    newAdventureLogEntries[questId].push(entry);
  }

  for (const quest of Object.values(state.quests)) {
    if (quest.status !== "assigned") continue;

    const remaining = quest.remainingDays - 1;

    if (remaining <= 0) {
      const prog = questProgress[quest.id];

      // Build quest result and chronicle entry before removing progress
      if (prog && quest.assignedPartyId) {
        const stateSnapshot: GameState = { ...state, parties, adventurers, questProgress };
        const questResult = buildQuestResult(quest.assignedPartyId, quest, prog, stateSnapshot, date);
        newQuestResults.push(questResult);
        const snapshotParty = state.parties[quest.assignedPartyId] ?? null;
        newQuestChronicleEntries.push(buildQuestChronicleEntry(quest, prog, snapshotParty, questResult, state));

        // Generate completion adventure log
        const compMembers = snapshotParty
          ? snapshotParty.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][]
          : [];
        appendLog(quest.id, generateCompletionLog(quest, questResult, prog, snapshotParty, compMembers, state.classes, date, state.regions[quest.regionId]?.name ?? ""));
      }

      // Release support parties from decisions
      if (prog) {
        for (const d of prog.decisions) {
          if (d.decision === "support_dispatch" && d.supportPartyId) {
            const sp = parties[d.supportPartyId];
            if (sp) {
              parties[d.supportPartyId] = { ...sp, status: "idle", activeQuestId: null };
              for (const memberId of sp.memberIds) {
                if (adventurers[memberId]) {
                  adventurers[memberId] = { ...adventurers[memberId], status: "idle", currentQuestId: null };
                }
              }
            }
          }
        }
      }

      // Remove completed quest from the board
      delete quests[quest.id];
      delete questProgress[quest.id];

      const party = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;
      if (party) {
        parties[party.id] = {
          ...party,
          status: "idle",
          activeQuestId: null,
          currentFormationQuestCount: party.currentFormationQuestCount + 1,
          questsCompleted: party.questsCompleted + 1,
          totalActivityDays: party.totalActivityDays + quest.durationDays,
          totalGoldEarned: party.totalGoldEarned + quest.rewardGold,
        };

        for (const memberId of party.memberIds) {
          if (adventurers[memberId]) {
            adventurers[memberId] = {
              ...adventurers[memberId],
              status: "idle",
              currentQuestId: null,
              questsCompleted: adventurers[memberId].questsCompleted + 1,
              totalActivityDays: adventurers[memberId].totalActivityDays + quest.durationDays,
            };
          }
        }

        const loot = generateQuestLoot();
        for (const { itemId, quantity } of loot) {
          warehouse[itemId] = (warehouse[itemId] ?? 0) + quantity;
        }

        goldEarned += quest.rewardGold;

        newResults.push({
          questId:        quest.id,
          questTitle:     quest.title,
          grade:          quest.grade,
          partyId:        party.id,
          partyName:      party.name,
          adventurerIds:  [...party.memberIds],
          durationDays:   quest.durationDays,
          rewardGold:     quest.rewardGold,
          completedAt:    date,
          loot,
        });

        newEntries.push({
          id: `chronicle-complete-${quest.id}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
          date,
          scope:            "guild",
          category:         "quest",
          title:            `${quest.title} 완료`,
          description:      `${party.name}이(가) 의뢰를 마치고 길드로 귀환했습니다.`,
          relatedEntityIds: [party.id, ...party.memberIds],
        });
      }
    } else {
      const newProgress = Math.min(99, quest.progress + DAILY_PROGRESS);
      quests[quest.id] = { ...quest, remainingDays: remaining, progress: newProgress };

      const existing = questProgress[quest.id];
      if (existing) {
        const newStage = calcQuestStage(newProgress);
        const stageChanged = newStage !== existing.currentStage;
        let updated = {
          ...existing,
          currentDay:   existing.currentDay + 1,
          currentStage: newStage,
          reportRead:   stageChanged ? false : existing.reportRead,
        };

        // Roll for random event (only when quest still has days remaining)
        const tags     = deriveTags(quest, date, state.regions[quest.regionId]);
        const eventDef = quest.assignedPartyId ? selectEvent(quest, updated, date, tags) : null;
        if (eventDef && quest.assignedPartyId) {
          const event = buildQuestEvent(quest.id, quest.assignedPartyId, absDay(date), eventDef);
          updated = {
            ...updated,
            hasIncident: true,
            incidentId:  event.eventId,
            events:      [...existing.events, event],
          };

          // Generate incident adventure log
          const party = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;
          if (party) {
            const members = party.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][];
            const existingLogs = (state.adventureLogs ?? {})[quest.id] ?? [];
            appendLog(quest.id, generateIncidentLog(quest, event, updated, party, members, state.classes, date, state.regions[quest.regionId]?.name ?? "", existingLogs));
          }
        } else {
          // Generate daily routine log
          const party = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;
          if (party) {
            const members = party.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][];
            const existingLogs = (state.adventureLogs ?? {})[quest.id] ?? [];
            const dailyLog = generateDailyLog(quest, updated, party, members, state.classes, date, state.regions[quest.regionId]?.name ?? "", existingLogs);
            if (dailyLog) appendLog(quest.id, dailyLog);
          }
        }

        questProgress[quest.id] = updated;
      }
    }
  }

  const updatedQuestResults = newQuestResults.length > 0
    ? { ...state.questResults, ...Object.fromEntries(newQuestResults.map(r => [r.questId, r])) }
    : state.questResults;

  const updatedQuestChronicle = newQuestChronicleEntries.length > 0
    ? [...newQuestChronicleEntries, ...state.questChronicle]
    : state.questChronicle;

  // Merge new adventure log entries into existing logs
  let updatedAdventureLogs = state.adventureLogs;
  if (Object.keys(newAdventureLogEntries).length > 0) {
    updatedAdventureLogs = { ...state.adventureLogs };
    for (const [questId, entries] of Object.entries(newAdventureLogEntries)) {
      updatedAdventureLogs[questId] = [...(updatedAdventureLogs[questId] ?? []), ...entries];
    }
  }

  return {
    ...state,
    guild:          goldEarned > 0 ? { ...state.guild, gold: state.guild.gold + goldEarned } : state.guild,
    quests,
    adventurers,
    parties,
    warehouse,
    questProgress,
    questResults:    updatedQuestResults,
    questChronicle:  updatedQuestChronicle,
    adventureLogs:   updatedAdventureLogs,
    chronicle:       [...newEntries, ...state.chronicle],
    pendingResults:  [...state.pendingResults, ...newResults],
  };
}

// ── Injury recovery ──────────────────────────────────────────────────────────

function updateInjuries(state: GameState): GameState {
  const newEntries: ChronicleEntry[] = [];
  const injuries    = { ...state.injuries };
  const adventurers = { ...state.adventurers };
  const date        = state.currentDate;

  for (const injury of Object.values(state.injuries)) {
    const remaining = injury.recoveryDays - 1;

    if (remaining <= 0) {
      delete injuries[injury.id];

      const adv = adventurers[injury.adventurerId];
      if (adv) {
        const newInjuryIds = adv.injuryIds.filter((id) => id !== injury.id);
        adventurers[adv.id] = {
          ...adv,
          injuryIds: newInjuryIds,
          status:    newInjuryIds.length === 0 ? "idle" : adv.status,
        };

        newEntries.push({
          id: `chronicle-recover-${adv.id}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
          date,
          scope:            "adventurer",
          category:         "injury",
          title:            "부상 회복 완료",
          description:      `${adv.name}의 ${injury.name}이(가) 완전히 회복되었습니다.`,
          relatedEntityIds: [adv.id],
        });
      }
    } else {
      injuries[injury.id] = { ...injury, recoveryDays: remaining };
    }
  }

  return {
    ...state,
    injuries,
    adventurers,
    chronicle: [...newEntries, ...state.chronicle],
  };
}

// ── Training progress ────────────────────────────────────────────────────────

function updateTraining(state: GameState): GameState {
  const newEntries: ChronicleEntry[] = [];
  const adventurers = { ...state.adventurers };
  const date        = state.currentDate;

  for (const adv of Object.values(state.adventurers)) {
    if (adv.status !== "training") continue;

    const remaining = adv.trainingDays - 1;

    if (remaining <= 0) {
      adventurers[adv.id] = { ...adv, trainingDays: 0, status: "idle" };

      newEntries.push({
        id: `chronicle-train-${adv.id}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
        date,
        scope:            "adventurer",
        category:         "growth",
        title:            "훈련 완료",
        description:      `${adv.name}이(가) 훈련을 마치고 대기 상태로 복귀했습니다.`,
        relatedEntityIds: [adv.id],
      });
    } else {
      adventurers[adv.id] = { ...adv, trainingDays: remaining };
    }
  }

  return {
    ...state,
    adventurers,
    chronicle: [...newEntries, ...state.chronicle],
  };
}

// ── Party formation days ────────────────────────────────────────────────────

function updatePartyFormations(state: GameState): GameState {
  const parties = { ...state.parties };
  for (const party of Object.values(state.parties)) {
    parties[party.id] = { ...party, currentFormationDays: party.currentFormationDays + 1 };
  }
  return { ...state, parties };
}

// ── Age increment (year change only) ────────────────────────────────────────

function updateAges(state: GameState): GameState {
  const adventurers = { ...state.adventurers };

  for (const adv of Object.values(state.adventurers)) {
    if (!adv.isArchived) {
      adventurers[adv.id] = { ...adv, age: adv.age + 1 };
    }
  }

  return { ...state, adventurers };
}

// ── Main advance function ────────────────────────────────────────────────────

export function advanceDay(state: GameState): GameState {
  const newDate = advanceDate(state.currentDate);
  const yearChanged = newDate.year > state.currentDate.year;

  let next: GameState = { ...state, currentDate: newDate };
  next = updateQuests(next);
  next = updateInjuries(next);
  next = updateTraining(next);
  next = updatePartyFormations(next);
  if (yearChanged) next = updateAges(next);
  return next;
}
