import type { AdventureLogEntry, ChronicleEntry, GameDate, GameState, LootDrop, QuestResult } from "../../types/game";
import { LOOT_TABLE } from "../../data/lootData";
import { calcQuestStage } from "./questProgress";
import { validateQuestCompletion } from "./questValidation";
import { evaluateDirector, getDirectorState } from "./questDirector";
import type { EventDefinition } from "./eventEngine";
import { deriveTags, selectEvent, buildQuestEvent } from "./eventEngine";
import { buildQuestResult } from "./questResult";
import { buildQuestChronicleEntry } from "./questChronicle";
import { generateDailyLog, generateIncidentLog, generateCompletionLog, generateSupportArrivalLog } from "./adventureLog";
import { createReturnReport } from "./returnReport";

const SUPPORT_TRAVEL_DAYS = 2;

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
  const newQuestResults: QuestResult[] = [];
  const newQuestChronicleEntries: ReturnType<typeof buildQuestChronicleEntry>[] = [];
  const newAdventureLogEntries: Record<string, AdventureLogEntry[]> = {};
  const newReturnReports: ReturnType<typeof createReturnReport>[] = [];
  const quests        = { ...state.quests };
  const adventurers   = { ...state.adventurers };
  const parties       = { ...state.parties };
  const questProgress = { ...state.questProgress };
  const date          = state.currentDate;

  function appendLog(questId: string, entry: AdventureLogEntry) {
    if (!newAdventureLogEntries[questId]) newAdventureLogEntries[questId] = [];
    newAdventureLogEntries[questId].push(entry);
  }

  for (const quest of Object.values(state.quests)) {
    if (quest.status !== "assigned") continue;

    const remaining = quest.remainingDays - 1;

    if (remaining <= 0) {
      const prog = questProgress[quest.id];

      if (import.meta.env.DEV && prog) {
        const { warnings } = validateQuestCompletion(quest.type, prog.events, prog.currentStage);
        for (const w of warnings) console.warn(w);
      }

      // Build quest result and chronicle entry before removing progress
      if (prog && quest.assignedPartyId) {
        const stateSnapshot: GameState = { ...state, parties, adventurers, questProgress };
        const questResult = buildQuestResult(quest.assignedPartyId, quest, prog, stateSnapshot, date);
        newQuestResults.push(questResult);
        const snapshotParty = state.parties[quest.assignedPartyId] ?? null;
        newQuestChronicleEntries.push(buildQuestChronicleEntry(quest, prog, snapshotParty, questResult, state));

        // Generate completion adventure log (with arrived support parties)
        const compMembers = snapshotParty
          ? snapshotParty.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][]
          : [];
        const compSupportParties = prog.decisions
          .filter(d => d.decision === "support_dispatch" && d.supportPartyId && (prog.currentDay - d.day) >= SUPPORT_TRAVEL_DAYS)
          .map(d => state.parties[d.supportPartyId!])
          .filter((p): p is typeof p & object => p !== undefined);
        appendLog(quest.id, generateCompletionLog(quest, questResult, prog, snapshotParty, compMembers, state.classes, date, state.regions[quest.regionId]?.name ?? "", compSupportParties));
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
        // Generate loot for the ReturnReport
        const loot = generateQuestLoot();

        // Create ReturnReport — settlement is deferred until guild master confirms
        if (prog && quest.assignedPartyId) {
          const regionName = state.regions[quest.regionId]?.name ?? "";
          const questResult = newQuestResults.find(r => r.questId === quest.id);
          if (questResult) {
            newReturnReports.push(createReturnReport(quest, party, questResult, loot, date, regionName));
          }
        }

        // Party → waiting_settlement (gold/loot deferred to finalizeSettlement)
        parties[party.id] = {
          ...party,
          status: "waiting_settlement",
          activeQuestId: null,
          currentFormationQuestCount: party.currentFormationQuestCount + 1,
          questsCompleted: party.questsCompleted + 1,
          totalActivityDays: party.totalActivityDays + quest.durationDays,
        };

        // Members: clear currentQuestId, keep status "dispatched" until settlement
        for (const memberId of party.memberIds) {
          if (adventurers[memberId]) {
            adventurers[memberId] = {
              ...adventurers[memberId],
              currentQuestId: null,
              questsCompleted: adventurers[memberId].questsCompleted + 1,
              totalActivityDays: adventurers[memberId].totalActivityDays + quest.durationDays,
            };
          }
        }

        newEntries.push({
          id: `chronicle-return-${quest.id}-${date.year}-${date.season}-${String(date.day).padStart(2, "0")}`,
          date,
          scope:            "guild",
          category:         "quest",
          title:            `${quest.title} 귀환 보고`,
          description:      `${party.name}이(가) 귀환했습니다. 정산 대기 중.`,
          relatedEntityIds: [party.id, ...party.memberIds],
        });
      }
    } else {
      const newProgress = Math.min(99, quest.progress + DAILY_PROGRESS);
      quests[quest.id] = { ...quest, remainingDays: remaining, progress: newProgress };

      const existing = questProgress[quest.id];
      if (existing) {
        const nextDay  = existing.currentDay + 1;
        const newStage = calcQuestStage(nextDay, existing.totalDays);
        const stageChanged = newStage !== existing.currentStage;
        let updated = {
          ...existing,
          currentDay:   nextDay,
          currentStage: newStage,
          reportRead:   stageChanged ? false : existing.reportRead,
        };

        // Compute arrived support parties (for log generation and event selection)
        const arrivedSupportParties = updated.decisions
          .filter(d => d.decision === "support_dispatch" && d.supportPartyId && (updated.currentDay - d.day) >= SUPPORT_TRAVEL_DAYS)
          .map(d => state.parties[d.supportPartyId!])
          .filter((p): p is typeof p & object => p !== undefined);
        const arrivedSupportMembers = arrivedSupportParties.flatMap(
          p => p.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][]
        );

        // Detect support parties that just arrived today (en_route → arrived)
        const newlyArrivedDecisions = updated.decisions.filter(d =>
          d.decision === "support_dispatch" && d.supportPartyId &&
          (updated.currentDay - d.day) === SUPPORT_TRAVEL_DAYS
        );
        for (const decision of newlyArrivedDecisions) {
          const supParty = state.parties[decision.supportPartyId!];
          if (supParty && quest.assignedPartyId) {
            const mainParty = state.parties[quest.assignedPartyId];
            if (mainParty) {
              const mainMembers = mainParty.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][];
              const supMembers  = supParty.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][];
              appendLog(quest.id, generateSupportArrivalLog(quest, updated, mainParty, mainMembers, supParty, supMembers, state.classes, date));
            }
          }
        }

        // Quest Director: force mandatory events when time is critical; else random roll
        const tags = deriveTags(quest, date, state.regions[quest.regionId]);
        let eventDef: EventDefinition | null = null;
        if (quest.assignedPartyId) {
          const directorResult = evaluateDirector(quest, updated, tags);
          if (directorResult) {
            eventDef = directorResult.forcedEvent;
            if (import.meta.env.DEV) {
              console.log(
                `[Director] ${quest.title} D${updated.currentDay}: ` +
                `강제 이벤트 "${eventDef.title}" — ${directorResult.reason}`,
              );
            }
          } else {
            if (import.meta.env.DEV) {
              const ds = getDirectorState(quest, updated);
              if (ds.urgencyLevel !== "none") {
                console.log(
                  `[Director] ${quest.title} D${updated.currentDay}: ` +
                  `Stage=${updated.currentStage} Urgency=${ds.urgencyLevel} ` +
                  `미완료=[${ds.pendingSteps.map(s => s.id).join(",")}] ` +
                  `귀환까지=${ds.daysUntilReturn}일`,
                );
              }
            }
            eventDef = selectEvent(quest, updated, date, tags);
          }
        }
        if (eventDef && quest.assignedPartyId) {
          const event = buildQuestEvent(quest.id, quest.assignedPartyId, absDay(date), eventDef);
          updated = {
            ...updated,
            hasIncident: true,
            incidentId:  event.eventId,
            events:      [...existing.events, event],
          };

          // Generate incident adventure log (with support party if present)
          const party = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;
          if (party) {
            const members = party.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][];
            const existingLogs = (state.adventureLogs ?? {})[quest.id] ?? [];
            appendLog(quest.id, generateIncidentLog(quest, event, updated, party, members, state.classes, date, state.regions[quest.regionId]?.name ?? "", existingLogs, arrivedSupportParties, arrivedSupportMembers));
          }
        } else if (newlyArrivedDecisions.length === 0) {
          // Generate daily routine log (skip if support just arrived — support log serves as today's entry)
          const party = quest.assignedPartyId ? state.parties[quest.assignedPartyId] : null;
          if (party) {
            const members = party.memberIds.map(id => state.adventurers[id]).filter(Boolean) as typeof state.adventurers[string][];
            const existingLogs = (state.adventureLogs ?? {})[quest.id] ?? [];
            const dailyLog = generateDailyLog(quest, updated, party, members, state.classes, date, state.regions[quest.regionId]?.name ?? "", existingLogs, arrivedSupportParties, arrivedSupportMembers);
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

  const updatedReturnReports = newReturnReports.length > 0
    ? [...state.returnReports, ...newReturnReports]
    : state.returnReports;

  return {
    ...state,
    quests,
    adventurers,
    parties,
    questProgress,
    questResults:    updatedQuestResults,
    questChronicle:  updatedQuestChronicle,
    adventureLogs:   updatedAdventureLogs,
    chronicle:       [...newEntries, ...state.chronicle],
    returnReports:   updatedReturnReports,
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
