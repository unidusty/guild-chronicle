import type { EntityId, GameState, Party } from "../../types/game";

export function createParty(state: GameState, name: string): GameState {
  const id = `party-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const newParty: Party = {
    id, name,
    leaderId: null,
    memberIds: [],
    rank: "D",
    status: "idle",
    activeQuestId: null,
    experience: 0,
  };
  return {
    ...state,
    guild: { ...state.guild, partyIds: [...state.guild.partyIds, id] },
    parties: { ...state.parties, [id]: newParty },
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

  return {
    ...state,
    parties: { ...state.parties, [partyId]: { ...party, memberIds: [...party.memberIds, adventurerId] } },
    adventurers: { ...state.adventurers, [adventurerId]: { ...adv, partyId } },
  };
}

export function removePartyMember(state: GameState, partyId: EntityId, adventurerId: EntityId): GameState {
  const party = state.parties[partyId];
  const adv = state.adventurers[adventurerId];
  if (!party || !adv) return state;
  if (party.status === "dispatched") return state;

  return {
    ...state,
    parties: {
      ...state.parties,
      [partyId]: {
        ...party,
        memberIds: party.memberIds.filter((id) => id !== adventurerId),
        leaderId: party.leaderId === adventurerId ? null : party.leaderId,
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
    parties: { ...state.parties, [partyId]: { ...party, leaderId: adventurerId } },
  };
}
