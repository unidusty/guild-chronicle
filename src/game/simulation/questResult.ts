import type {
  EntityId,
  GameDate,
  GameState,
  Party,
  Quest,
  QuestDecision,
  QuestEvent,
  QuestProgress,
  QuestResult,
  QuestResultGrade,
} from "../../types/game";
import { calcPartyCombatPower, calcQuestSuccessRate } from "./combatPower";

// ── Event modifiers ───────────────────────────────────────────────────────────

function eventModifier(events: QuestEvent[]): number {
  let mod = 0;
  for (const ev of events) {
    switch (ev.category) {
      case "combat":      mod -= 5; break;
      case "danger":      mod -= 8; break;
      case "environment": mod -= 3; break;
      case "reward":      mod += 3; break;
    }
  }
  return mod;
}

// ── Decision modifiers ────────────────────────────────────────────────────────

interface DecisionResult {
  modifier:       number;
  supportArrived: boolean;
  supportEnRoute: boolean;
  extraExplore:   boolean;
}

const SUPPORT_TRAVEL_DAYS = 2;

function decisionModifier(decisions: QuestDecision[], currentDay: number): DecisionResult {
  let modifier     = 0;
  let supportArrived = false;
  let supportEnRoute = false;
  let extraExplore   = false;

  for (const d of decisions) {
    if (d.decision === "extra_explore") {
      modifier += 5;
      extraExplore = true;
    } else if (d.decision === "support_dispatch" && d.supportPartyId) {
      const elapsed = currentDay - d.day;
      if (elapsed >= SUPPORT_TRAVEL_DAYS) {
        modifier += 25;
        supportArrived = true;
      } else {
        modifier += 10;
        supportEnRoute = true;
      }
    }
  }

  return { modifier, supportArrived, supportEnRoute, extraExplore };
}

// ── Teamwork modifier ─────────────────────────────────────────────────────────

function teamworkModifier(party: Party): number {
  let mod = 0;
  const qc = party.currentFormationQuestCount;
  if (qc >= 6)      mod += 10;
  else if (qc >= 3) mod += 6;
  else if (qc >= 1) mod += 3;

  const fd = party.currentFormationDays;
  if (fd > 30)      mod += 5;
  else if (fd > 10) mod += 2;

  return mod;
}

// ── Danger level modifier (for events + extra_explore) ───────────────────────

function calcDangerMod(prog: QuestProgress): number {
  const hotEvents = prog.events.filter(e => e.category === "combat" || e.category === "danger").length;
  const extraExploreCount = prog.decisions.filter(d => d.decision === "extra_explore").length;
  return hotEvents + extraExploreCount;
}

// ── Public: current predicted success rate ────────────────────────────────────

export function calcCurrentSuccessRate(
  party: Party,
  quest: Quest,
  prog: QuestProgress,
  state: GameState,
): number {
  const members  = party.memberIds.map(id => state.adventurers[id]).filter(Boolean);
  const power    = calcPartyCombatPower(party, members, state.classes);
  let rate       = calcQuestSuccessRate(power, party.rank, quest);

  rate += teamworkModifier(party);
  rate += eventModifier(prog.events);
  rate += decisionModifier(prog.decisions, prog.currentDay).modifier;

  return Math.max(1, Math.min(99, Math.round(rate)));
}

export function calcCurrentDangerLevel(quest: Quest, prog: QuestProgress): number {
  return Math.max(1, Math.min(5, quest.dangerLevel + calcDangerMod(prog)));
}

export function getSupportStatus(prog: QuestProgress): "none" | "en_route" | "arrived" {
  const { supportArrived, supportEnRoute } = decisionModifier(prog.decisions, prog.currentDay);
  if (supportArrived) return "arrived";
  if (supportEnRoute) return "en_route";
  return "none";
}

// ── Result grade determination ────────────────────────────────────────────────

export function determineResultGrade(successRate: number, retreat: boolean): QuestResultGrade {
  if (retreat)          return "retreat";
  if (successRate >= 90) return "great_success";
  if (successRate >= 70) return "success";
  if (successRate >= 50) return "narrow_success";
  if (successRate >= 30) return "failure";
  return "great_failure";
}

// ── Build final QuestResult on completion ─────────────────────────────────────

export function buildQuestResult(
  partyId: EntityId,
  quest: Quest,
  prog: QuestProgress,
  state: GameState,
  date: GameDate,
): QuestResult {
  const party = state.parties[partyId];
  if (!party) {
    return {
      questId:     quest.id,
      partyId,
      resultGrade: "failure",
      successRate: 0,
      success:     false,
      dangerLevel: quest.dangerLevel,
      supportUsed: false,
      retreat:     false,
      extraExplore: false,
      completedAt: date,
    };
  }

  const successRate  = calcCurrentSuccessRate(party, quest, prog, state);
  const dangerLevel  = calcCurrentDangerLevel(quest, prog);
  const { supportArrived, extraExplore } = decisionModifier(prog.decisions, prog.currentDay);
  const resultGrade  = determineResultGrade(successRate, false);
  const success      = successRate >= 50;

  return {
    questId:      quest.id,
    partyId,
    resultGrade,
    successRate,
    success,
    dangerLevel,
    supportUsed:  supportArrived,
    retreat:      false,
    extraExplore,
    completedAt:  date,
  };
}

