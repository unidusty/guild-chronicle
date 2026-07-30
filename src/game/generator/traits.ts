import type { TraitRef } from "../../types/game";
import { pickUnique } from "./util";

export interface TraitDefinition {
  id: string;
  name: string;
}

export const traitDefinitions: TraitDefinition[] = [
  { id: "trait-brave",       name: "용감함"   },
  { id: "trait-keen-eye",    name: "날카로운 눈" },
  { id: "trait-stubborn",    name: "완고함"   },
  { id: "trait-calm",        name: "침착함"   },
  { id: "trait-ambitious",   name: "야망"     },
  { id: "trait-cautious",    name: "신중함"   },
  { id: "trait-loyal",       name: "충성스러움" },
  { id: "trait-reckless",    name: "무모함"   },
  { id: "trait-curious",     name: "호기심"   },
  { id: "trait-disciplined", name: "절제력"   },
  { id: "trait-empathic",    name: "공감 능력" },
  { id: "trait-vengeful",    name: "복수심"   },
  { id: "trait-greedy",      name: "탐욕"     },
  { id: "trait-humble",      name: "겸손함"   },
  { id: "trait-perceptive",  name: "예리함"   },
];

export function pickTraits(count: number): TraitRef[] {
  return pickUnique(traitDefinitions, count).map((t) => ({ id: t.id, revealed: true }));
}

export function getTraitName(traitId: string): string {
  return traitDefinitions.find((t) => t.id === traitId)?.name ?? traitId;
}
