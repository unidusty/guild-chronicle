# LOOT DATABASE

Guild Chronicle 전리품 데이터 기준서. (0019-C)

---

## 데이터 구조

### LootItem (영구 정의)

`src/data/lootData.ts`의 `LOOT_TABLE`에 정의된 아이템 원본.

```typescript
interface LootItem {
  id: EntityId;           // "loot-{식별자}"
  name: string;           // 한국어 이름
  category: LootCategory; // "monster" | "herb" | "mineral" | "misc"
  baseValue: number;      // 시장 기준가 (창고 판매가 = baseValue)
}
```

### LootCategory

| 값 | 표시 | 설명 |
|----|------|------|
| `monster` | 몬스터 소재 | 몬스터에서 채취한 재료 |
| `herb` | 약초 | 식물성 재료 |
| `mineral` | 광물 | 광석류 |
| `misc` | 잡화 | 기타 잡동사니 |

### LootDrop (의뢰 드롭 시)

```typescript
interface LootDrop {
  itemId: EntityId;    // LootItem.id
  quantity: number;    // 드롭 수량
}
```

### LootEntry (귀환 보고 내 전리품)

```typescript
interface LootEntry {
  itemId: EntityId;
  itemName: string;         // 이름 스냅샷
  quantity: number;
  unitValue: number;        // baseValue 스냅샷 (시장 기준가)
  purchaseUnitValue: number; // 길드 매입가 = floor(baseValue × GUILD_PURCHASE_RATE)
}
```

### 전리품 가격 구조 (0019-C)

| 구분 | 계산식 | 설명 |
|------|--------|------|
| 시장 기준가 (`unitValue`) | `LootItem.baseValue` | 플레이어에게 표시되는 아이템 가치 |
| 길드 매입가 (`purchaseUnitValue`) | `floor(baseValue × 0.80)` | 정산 시 길드가 파티에 지급하는 금액 |
| 창고 판매가 | `baseValue` | 창고에서 외부에 판매 시 수익 (시장가 그대로) |

`GUILD_PURCHASE_RATE = 0.80` — `src/game/constants/economy.ts` 정의.  
`calcGuildPurchaseValue(baseValue)` — 공통 계산 함수.

길드는 전리품을 시장가의 80%에 매입하고 100%로 판매하여 20% 마진을 확보한다.

---

## 전리품 목록

`src/data/lootData.ts` 기준 (0019-A).

| ID | 이름 | 카테고리 | 단가(G) |
|----|------|----------|---------|
| `loot-goblin-ear` | 고블린 귀 | monster | 15 |
| `loot-wolf-pelt` | 늑대 가죽 | monster | 45 |
| `loot-slime-gel` | 슬라임 점액 | monster | 20 |
| `loot-beast-fang` | 마수의 송곳니 | monster | 60 |
| `loot-mana-stone-sm` | 작은 마석 | mineral | 120 |
| `loot-hard-carapace` | 단단한 갑각 | monster | 35 |
| `loot-monster-bone` | 몬스터 뼈 | monster | 25 |
| `loot-herb` | 약초 | herb | 30 |
| `loot-iron-ore` | 철광석 | mineral | 40 |
| `loot-old-weapon-shard` | 낡은 무기 조각 | misc | 18 |
| `loot-torn-cloth` | 찢어진 천 | misc | 8 |
| `loot-old-coin` | 오래된 동전 | misc | 22 |

---

## 드롭 규칙

### 현재 규칙 (0019-A)

`src/game/simulation/advance.ts`의 `generateQuestLoot()` 함수가 의뢰 완료 시 전리품을 생성한다.

- 드롭 종류: 1~3종 (랜덤)
- 종류별 수량: 1~5개 (랜덤)
- 중복 없음 (같은 아이템 두 번 드롭 안 됨)
- 의뢰 카테고리·랭크·지역·적 무관 (현재 균등 확률)

### 향후 계획

- 의뢰 카테고리별 드롭 풀 구분
- 적 유형(`enemyHint`) 기반 드롭 테이블
- 지역 특산 아이템
- 랭크별 드롭 품질 상승

---

## 전리품 흐름

```
의뢰 완료
  ↓
generateQuestLoot() → LootDrop[]
  ↓
ReturnReport.loot (LootEntry[]) 에 기록
  ↓
귀환 보고 화면에서 길드 매입 선택
  ↓
finalizeSettlement()
  ↓
선택된 아이템 → state.warehouse에 추가
미선택 아이템 → 파티 보유 (현재 미추적)
```

### 소유권 원칙

- 전리품의 기본 소유자는 수행 파티다.
- 길드가 매입(길드장 정산 확인)해야만 창고에 들어간다.
- 매입 가격 = `LootEntry.purchaseUnitValue × quantity` (baseValue의 80%)
- 미매입 전리품은 파티 소유이나 현재 개별 파티 인벤토리는 미구현이다.

---

## 창고 연동

| 필드 | 타입 | 설명 |
|------|------|------|
| `state.warehouse` | `Record<EntityId, number>` | 아이템 ID → 수량 |
| `state.saleTransactions` | `SaleTransaction[]` | 판매 기록 |

창고에 동일 아이템이 있으면 수량이 누적된다.

---

## 관련 문서

- 정산 시스템 → `docs/01_SYSTEM/QUEST_SETTLEMENT_SYSTEM.md`
- 길드 재정 → `docs/01_SYSTEM/GUILD_FINANCE_SYSTEM.md`
