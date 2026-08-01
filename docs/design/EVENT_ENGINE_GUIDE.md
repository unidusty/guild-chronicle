# EVENT ENGINE GUIDE

Guild Chronicle Dynamic Event Engine 설계 기준서. (018-N)

---

## 개요

이벤트 엔진(`eventEngine.ts`)은 의뢰 진행 중 발생하는 현장 이벤트를 데이터 기반으로 선택·생성한다.  
기존 `questEvents.ts`의 단순 확률 + 템플릿 방식을 대체하며, 태그 시스템을 공통 언어로 삼아 모든 하위 시스템과 연동한다.

---

## 핵심 구성 요소

### 1. QuestTag — 공통 언어

퀘스트의 특성을 나타내는 태그 집합. 이벤트 선택, 어드벤처 로그, 전투, 보상 등 모든 시스템이 공유하는 공통 언어다.

| 카테고리 | 예시 |
|----------|------|
| 지형 (`terrain:*`) | `forest` `mountain` `dungeon` `plain` `swamp` `coast` `city` `ruins` |
| 적 (`enemy:*`) | `undead` `beast` `bandit` `monster` `dragon` `golem` `goblin` `rodent` |
| 위험 (`risk:*`) | `ambush` `trap` `collapse` `flood` `disease` `hostile` `magic` `curse` |
| 목표 (`obj:*`) | `hunt` `escort` `search` `rescue` `explore` `deliver` |
| 계절 (`season:*`) | `spring` `summer` `autumn` `winter` |
| 난이도 (`diff:*`) | `easy` `normal` `hard` `extreme` |
| 테마 (`theme:*`) | `mystery` `danger` `treasure` `social` |

### 2. EventDefinition — 이벤트 정의

```typescript
interface EventDefinition {
  id: string;               // "ev-{category}-{number}"
  category: QuestEventCategory;
  title: string;
  description: string;
  weight: number;           // 기본 선택 가중치 (1~6)
  rarity?: "rare" | "epic"; // 없으면 common
  requiredTags?: QuestTag[]; // 전부 존재해야 등장
  blockedTags?: QuestTag[];  // 하나라도 존재하면 제외
  requiredStage?: QuestStage; // 특정 진행 단계에서만 등장
  boostedByTags?: QuestTag[]; // 일치할 때마다 가중치 +2
  followUpIds?: string[];    // 이 이벤트 후 다음 이벤트 우선 후보
  allowedQuestTypes?: QuestCategory[]; // 지정된 의뢰 유형에서만 등장 (018-M)
}
```

### 3. EVENT_POOL — 90개 이벤트

| 카테고리 | 수 |
|----------|---|
| 전투 (combat) | 20 |
| 탐사 (exploration) | 15 |
| 환경 (environment) | 15 |
| 보상 (reward) | 10 |
| 인물 (person) | 10 |
| 위험 (danger) | 10 |
| 희귀 (rare) | 10 |
| **합계** | **90** |

---

## 태그 파생 (`deriveTags`)

```typescript
deriveTags(quest: Quest, date: GameDate, region?: Region): Set<QuestTag>
```

기존 Quest 데이터에서 태그를 자동 파생한다. Quest 타입 변경 없이 동작한다.

| 소스 | 파생 태그 |
|------|----------|
| `quest.type` | `obj:hunt` 등 목표 태그 |
| `quest.dangerLevel` | `diff:easy / normal / hard / extreme` |
| `quest.riskTags[]` | RISK_TAG_MAP으로 변환 |
| `quest.enemyHint` | ENEMY_TAG_MAP으로 변환 |
| `quest.regionId` | REGION_TERRAIN으로 지형 태그 |
| `region.control` | `hostile` → `risk:hostile` |
| `region.danger` | ≥70 → `theme:danger` |
| `date.season` | `season:spring` 등 계절 태그 |

---

## 이벤트 선택 (`selectEvent`)

```typescript
selectEvent(quest, prog, date, tags): EventDefinition | null
```

### 발생 확률

```
base = 0.10
dangerBonus = max(0, dangerLevel - 2) × 0.04
stageBonus  = executing 단계 ? 0.05 : 0
probability = min(base + dangerBonus + stageBonus, 0.32)
```

### 필터링

1. **Event Memory** — `prog.events` 최근 8개의 `title`을 추출하여 동일 이벤트 재발생 차단 (018-N: 5→8)
2. **Stage 필터** — `requiredStage`가 있으면 현재 단계와 일치해야 함
3. **Tag 필터** — `requiredTags` 전부 존재, `blockedTags` 없어야 함
4. **Returning 필터** — `returning` 단계에서는 `environment` / `danger` 이외 차단 (018-M)
5. **Quest Type 필터** — `allowedQuestTypes`가 있으면 현재 의뢰 유형이 포함돼야 함 (018-M)

### 가중치 계산

```
weight = def.weight
if rarity == "rare":  weight = 0.5
if rarity == "epic":  weight = 0.1
for each boostedByTag matching tags: weight += 2
if followUpBias has def.id: weight × 2  (Event Chain)
weight × getMandatoryUrgencyMultiplier(...)  (018-M 긴급 부스트)
```

### Event Chain

마지막 이벤트의 `followUpIds`에 등록된 이벤트는 가중치가 2배 적용된다.  
예: 강한 개체 출현 → followUp: 정예 개체 발견, 파티원 경상

---

## 이벤트 생성 (`buildQuestEvent`)

```typescript
buildQuestEvent(questId, partyId, day, def): QuestEvent
```

- ID 형식: `ev-{def.id}-{questId}-{day}`
- `QuestEvent` 타입 변경 없음
- 이후 `adventureLog.ts`가 `event.title`을 기반으로 서사 생성

---

## advance.ts 연동 (018-N 이후)

```typescript
// 하루 진행 시 — Quest Director 우선, fallback selectEvent
const tags = deriveTags(quest, date, state.regions[quest.regionId]);
let eventDef: EventDefinition | null = null;
if (quest.assignedPartyId) {
  const directorResult = evaluateDirector(quest, updated, tags);
  if (directorResult) {
    eventDef = directorResult.forcedEvent;  // 강제 이벤트 (rollEventChance 무시)
  } else {
    eventDef = selectEvent(quest, updated, date, tags);  // 정상 확률 롤
  }
}
if (eventDef) {
  const event = buildQuestEvent(quest.id, quest.assignedPartyId!, absDay(date), eventDef);
  // ... incident 처리
}
```

---

## 신규 이벤트 추가 규칙

1. `EVENT_POOL` 배열에 `EventDefinition` 객체 추가
2. ID 형식: `ev-{category}-{3자리숫자}` (예: `ev-combat-021`)
3. `requiredTags`로 등장 조건을 좁히고, `boostedByTags`로 유사한 퀘스트에서 더 자주 등장하게 함
4. 희귀 이벤트: `rarity: "rare"`, `weight: 1`로 설정
5. 연쇄 이벤트: 선행 이벤트의 `followUpIds`에 신규 ID 추가
