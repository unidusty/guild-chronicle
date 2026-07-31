import type { AdventurerRank, EntityId, GameDate, GameState, Party } from "../../types/game";

const RANK_ORDER: AdventurerRank[] = ["F", "E", "D", "C", "B", "A", "S"];

function rankToNum(rank: AdventurerRank): number {
  return RANK_ORDER.indexOf(rank);
}

function numToRank(n: number): AdventurerRank {
  return RANK_ORDER[Math.max(0, Math.min(n, RANK_ORDER.length - 1))];
}

function calcPartyRank(memberIds: EntityId[], adventurers: GameState["adventurers"]): AdventurerRank {
  if (memberIds.length === 0) return "F";
  const sum = memberIds.reduce((acc, id) => acc + rankToNum(adventurers[id]?.rank ?? "F"), 0);
  return numToRank(Math.floor(sum / memberIds.length));
}

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
  const newRank = calcPartyRank(newMemberIds, state.adventurers);

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
  const newRank = calcPartyRank(newMemberIds, state.adventurers);

  return {
    ...state,
    parties: {
      ...state.parties,
      [partyId]: {
        ...party,
        memberIds: newMemberIds,
        leaderId: newLeaderId,
        rank: newRank,
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
