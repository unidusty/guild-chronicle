import type { LootItem } from "../types/game";

export const LOOT_TABLE: Record<string, LootItem> = {
  "loot-goblin-ear":       { id: "loot-goblin-ear",       name: "고블린 귀",       category: "monster", baseValue: 15  },
  "loot-wolf-pelt":        { id: "loot-wolf-pelt",        name: "늑대 가죽",       category: "monster", baseValue: 45  },
  "loot-slime-gel":        { id: "loot-slime-gel",        name: "슬라임 점액",     category: "monster", baseValue: 20  },
  "loot-beast-fang":       { id: "loot-beast-fang",       name: "마수의 송곳니",   category: "monster", baseValue: 60  },
  "loot-mana-stone-sm":    { id: "loot-mana-stone-sm",    name: "작은 마석",       category: "mineral", baseValue: 120 },
  "loot-hard-carapace":    { id: "loot-hard-carapace",    name: "단단한 갑각",     category: "monster", baseValue: 35  },
  "loot-monster-bone":     { id: "loot-monster-bone",     name: "몬스터 뼈",       category: "monster", baseValue: 25  },
  "loot-herb":             { id: "loot-herb",             name: "약초",            category: "herb",    baseValue: 30  },
  "loot-iron-ore":         { id: "loot-iron-ore",         name: "철광석",          category: "mineral", baseValue: 40  },
  "loot-old-weapon-shard": { id: "loot-old-weapon-shard", name: "낡은 무기 조각",  category: "misc",    baseValue: 18  },
  "loot-torn-cloth":       { id: "loot-torn-cloth",       name: "찢어진 천",       category: "misc",    baseValue: 8   },
  "loot-old-coin":         { id: "loot-old-coin",         name: "오래된 동전",     category: "misc",    baseValue: 22  },
};
