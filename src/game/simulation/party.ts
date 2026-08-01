import type { EntityId, Formation, FormationSlot, GameDate, GameState, Party } from "../../types/game";
import { computePartyRank } from "./combatPower";

function resetFormation(party: Party, date: GameDate): Partial<Party> {
  return {
    currentFormationDays: 0,
    currentFormationQuestCount: 0,
    formationStartDate: date,
    formationHistory: [
      ...party.formationHistory,
      ...(party.memberIds.length > 0
        ? [{ memberIds: [...party.memberIds], startDate: party.formationStartDate ?? date, endDate: date, questCount: party.currentFormationQuestCount }]
        : []),
    ],
  };
}

export function createParty(state: GameState, name: string): GameState {
  const id = `party-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const date = state.currentDate;
  const newParty: Party = {
    id, name,
    previousNames: [],
    leaderId: null,
    memberIds: [],
    rank: "F",
    status: "idle",
    activeQuestId: null,
    experience: 0,
    currentFormationDays: 0,
    currentFormationQuestCount: 0,
    formationStartDate: date,
    formationHistory: [],
    questsCompleted: 0,
    questsDispatched: 0,
    totalActivityDays: 0,
    formation: {},
    totalGoldEarned: 0,
  };
  return {
    ...state,
    guild: { ...state.guild, partyIds: [...state.guild.partyIds, id] },
    parties: { ...state.parties, [id]: newParty },
  };
}

export function renameParty(state: GameState, partyId: EntityId, name: string): GameState {
  const party = state.parties[partyId];
  if (!party) return state;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 20) return state;
  return {
    ...state,
    parties: {
      ...state.parties,
      [partyId]: {
        ...party,
        name: trimmed,
        previousNames: party.name !== trimmed ? [...party.previousNames, party.name] : party.previousNames,
      },
    },
  };
}

export function deleteParty(state: GameState, partyId: EntityId): GameState {
  const party = state.parties[partyId];
  if (!party || party.status === "dispatched") return state;

  const adventurers = { ...state.adventurers };
  for (const memberId of party.memberIds) {
    if (adventurers[memberId]) {
      adventurers[memberId] = { ...adventurers[memberId], partyId: null };
    }
  }

  const parties = { ...state.parties };
  delete parties[partyId];

  return {
    ...state,
    guild: { ...state.guild, partyIds: state.guild.partyIds.filter((id) => id !== partyId) },
    parties,
    adventurers,
  };
}

export function addPartyMember(state: GameState, partyId: EntityId, adventurerId: EntityId): GameState {
  const party = state.parties[partyId];
  const adv = state.adventurers[adventurerId];
  if (!party || !adv) return state;
  if (party.status === "dispatched") return state;
  if (adv.status !== "idle" || adv.partyId !== null) return state;
  if (party.memberIds.includes(adventurerId)) return state;

  const newMemberIds = [...party.memberIds, adventurerId];
  const newRank = computePartyRank(newMemberIds, state.adventurers);

  return {
    ...state,
    parties: {
      ...state.parties,
      [partyId]: {
        ...party,
        memberIds: newMemberIds,
        rank: newRank,
        ...resetFormation(party, state.currentDate),
      },
    },
    adventurers: { ...state.adventurers, [adventurerId]: { ...adv, partyId } },
  };
}

export function removePartyMember(state: GameState, partyId: EntityId, adventurerId: EntityId): GameState {
  const party = state.parties[partyId];
  const adv = state.adventurers[adventurerId];
  if (!party || !adv) return state;
  if (party.status === "dispatched") return state;

  const newMemberIds = party.memberIds.filter((id) => id !== adventurerId);
  const newLeaderId = party.leaderId === adventurerId ? null : party.leaderId;
  const newRank = computePartyRank(newMemberIds, state.adventurers);

  // Remove member from formation slots
  const newFormation = Object.fromEntries(
    Object.entries(party.formation).filter(([, id]) => id !== adventurerId)
  ) as Party["formation"];

  return {
    ...state,
    parties: {
      ...state.parties,
      [partyId]: {
        ...party,
        memberIds: newMemberIds,
        leaderId: newLeaderId,
        rank: newRank,
        formation: newFormation,
        ...resetFormation(party, state.currentDate),
      },
    },
    adventurers: { ...state.adventurers, [adventurerId]: { ...adv, partyId: null } },
  };
}

export function setPartyLeader(state: GameState, partyId: EntityId, adventurerId: EntityId): GameState {
  const party = state.parties[partyId];
  if (!party) return state;
  if (party.status === "dispatched") return state;
  if (!party.memberIds.includes(adventurerId)) return state;

  return {
    ...state,
    parties: {
      ...state.parties,
      [partyId]: {
        ...party,
        leaderId: adventurerId,
        ...resetFormation(party, state.currentDate),
      },
    },
  };
}

export function setFormationSlot(
  state: GameState,
  partyId: EntityId,
  slot: FormationSlot,
  adventurerId: EntityId | null,
): GameState {
  const party = state.parties[partyId];
  if (!party || party.status === "dispatched") return state;

  // Remove adventurer from any existing slot first
  const cleaned = Object.fromEntries(
    Object.entries(party.formation).filter(([, id]) => id !== adventurerId)
  ) as Party["formation"];

  const newFormation: Party["formation"] = adventurerId
    ? { ...cleaned, [slot]: adventurerId }
    : { ...cleaned };

  if (!adventurerId) delete newFormation[slot];

  return {
    ...state,
    parties: {
      ...state.parties,
      [partyId]: { ...party, formation: newFormation },
    },
  };
}

export function swapFormationSlots(
  state: GameState,
  partyId: EntityId,
  slotA: FormationSlot,
  slotB: FormationSlot,
): GameState {
  const party = state.parties[partyId];
  if (!party || party.status === "dispatched") return state;

  const advA = party.formation[slotA];
  const advB = party.formation[slotB];
  if (advA === advB) return state;

  const newFormation = { ...party.formation };
  if (advA) newFormation[slotB] = advA; else delete newFormation[slotB];
  if (advB) newFormation[slotA] = advB; else delete newFormation[slotA];

  return {
    ...state,
    parties: { ...state.parties, [partyId]: { ...party, formation: newFormation } },
  };
}

export function replaceFormation(
  state: GameState,
  partyId: EntityId,
  formation: Formation,
): GameState {
  const party = state.parties[partyId];
  if (!party || party.status === "dispatched") return state;
  return {
    ...state,
    parties: { ...state.parties, [partyId]: { ...party, formation: { ...formation } } },
  };
}
