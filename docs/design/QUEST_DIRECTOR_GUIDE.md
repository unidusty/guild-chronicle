# QUEST DIRECTOR GUIDE

Guild Chronicle Quest Director 시스템 설계 기준서. (018-N)

---

## 핵심 철학

> Validation은 문제를 **발견**하는 시스템이다.  
> Quest Director는 문제를 **해결**하는 시스템이다.  
> Quest는 스스로 목표를 향해 진행되어야 한다.

018-M에서 Quest Validation이 구현되어 필수 이벤트 미발생을 감지할 수 있게 되었다.  
018-N에서 Quest Director가 추가되어 필수 이벤트가 실제로 발생하도록 보장한다.

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/game/simulation/questValidation.ts` | MandatoryStep 정의, 충족 판정, 긴급 가중치 |
| `src/game/simulation/questDirector.ts` | DirectorState, DirectorResult, evaluateDirector() |
| `src/game/simulation/advance.ts` | Director → selectEvent fallback 통합 |

---

## 1. 필수 단계 (MandatoryStep)

### 정의

의뢰 유형마다 반드시 거쳐야 하는 서사 단계. `questValidation.ts`의 `MANDATORY_SEQUENCES`에 정의된다.

```typescript
interface MandatoryStep {
  id:                  string;              // 식별자
  description:         string;             // 한국어 설명
  triggerCategories:   QuestEventCategory[]; // 이 카테고리의 이벤트가 발생하면 충족
  minimumStage:        QuestStage;          // 이 단계 이상에서만 판정
}
```

### 의뢰 유형별 필수 단계

| 유형 | 단계 ID | 트리거 카테고리 | 최소 Stage |
|------|---------|----------------|-----------|
| **hunt** | hunt-track | exploration, combat | searching |
| | hunt-encounter | combat | executing |
| | hunt-result | combat, danger | executing |
| **escort** | escort-threat | combat, danger, environment | searching |
| **exploration** | explore-discover | exploration, reward | searching |
| | explore-examine | exploration, combat, danger | executing |
| **search** | search-clue | exploration, person | searching |
| | search-target | exploration, person, danger | executing |
| **rescue** | rescue-locate | exploration, person | searching |
| | rescue-attempt | person, combat, danger | executing |
| **delivery** | deliver-obstacle | combat, environment, danger | searching |

---

## 2. 필수 단계 충족 판정

`checkMandatoryProgress(questType, events, currentStage)`

- 현재 Stage가 `minimumStage`에 도달하지 않은 단계는 판정 범위 외
- `events.some(e => triggerCategories.includes(e.category))` — 하나라도 매칭되면 충족
- 동일 이벤트가 여러 단계를 동시에 충족할 수 있음 (예: combat 이벤트 한 번으로 hunt-encounter + hunt-result 충족)

---

## 3. DirectorState — 긴급도 평가

`getDirectorState(quest, prog) → DirectorState`

```typescript
interface DirectorState {
  fulfilledSteps:  MandatoryStep[]; // 충족된 필수 단계
  pendingSteps:    MandatoryStep[]; // 미충족 필수 단계
  daysUntilReturn: number;          // 귀환 시작일까지 남은 일수
  urgencyLevel:    UrgencyLevel;    // "none" | "low" | "high" | "critical"
}
```

### urgencyLevel 계산

| urgencyLevel | 조건 |
|--------------|------|
| `none` | 미완료 단계 없음 |
| `low` | `daysUntilReturn > pendingSteps.length + 1` |
| `high` | `daysUntilReturn === pendingSteps.length + 1` |
| `critical` | `daysUntilReturn ≤ pendingSteps.length` |

### 귀환 시작일 계산

`getReturnStartDay(totalDays)`:

| 총 기간 | 귀환 일수 | 귀환 시작일 |
|---------|----------|------------|
| 1~5일   | 1일      | totalDays - 1 |
| 6일 이상 | 2일      | totalDays - 2 |

---

## 4. evaluateDirector — 강제 이벤트 결정

`evaluateDirector(quest, prog, tags) → DirectorResult | null`

### 반환 조건

- `urgencyLevel === "critical"` 이고 `pendingSteps.length > 0`인 경우에만 DirectorResult를 반환
- `none` / `low` / `high`는 null 반환 → 018-M의 긴급 가중치 부스트로 처리

### 강제 이벤트 선택 알고리즘

1. `pendingSteps[0]` (최우선 미완료 단계)을 타겟으로 설정
2. EVENT_POOL에서 다음 조건을 모두 만족하는 후보 추출:
   - `rarity !== "epic"` (희귀 이벤트 강제 금지)
   - `allowedQuestTypes` 필터 통과
   - `blockedTags` 없음, `requiredTags` 충족
   - `requiredStage` 일치 (있을 경우)
   - returning 단계면 environment/danger 이외 제외
   - `def.category`가 targetStep의 `triggerCategories`에 포함
3. 후보 중 scoreEvent() 점수가 가장 높은 이벤트 선택
4. 후보가 없으면 null 반환 → selectEvent() fallback

```typescript
interface DirectorResult {
  forcedEvent:  EventDefinition;   // 강제 생성할 이벤트
  targetStep:   MandatoryStep;     // 충족시키려는 필수 단계
  reason:       string;            // 디버그용 사유
  urgencyLevel: "high" | "critical";
}
```

---

## 5. advance.ts 통합 흐름

```
매일 이벤트 결정:

const tags = deriveTags(quest, date, region);
let eventDef = null;

if (quest.assignedPartyId) {
  const directorResult = evaluateDirector(quest, updated, tags);
  if (directorResult) {
    eventDef = directorResult.forcedEvent;  // rollEventChance 무시
  } else {
    eventDef = selectEvent(quest, updated, date, tags);  // 정상 확률 롤
  }
}
```

Director가 강제하는 경우 `rollEventChance`는 호출되지 않는다.  
이벤트 생성 이후의 흐름(buildQuestEvent, generateIncidentLog 등)은 동일하다.

---

## 6. 긴급 가중치 부스트 (018-M 연동)

Director가 강제하지 않는 경우(urgency가 none/low/high)에는  
`getMandatoryUrgencyMultiplier`가 selectEvent의 가중치 계산에 적용된다.

| 귀환까지 남은 일 | 미충족 카테고리 이벤트 배율 |
|-----------------|--------------------------|
| > 2일 | ×1.5 |
| 2일 | ×2.0 |
| 1일 | ×2.5 |
| 0일 이하 | ×3.0 |

---

## 7. 귀환 단계 이벤트 제한

`returning` 단계에서는 `environment` / `danger` 이벤트만 허용된다.  
Director와 selectEvent 모두 이 제한을 적용한다.

전투·탐사·보상·인물 이벤트는 귀환 중 발생하지 않는다.

---

## 8. 완료 검증 (018-M)

퀘스트 완료 직전 dev 모드에서 `validateQuestCompletion`이 실행된다.  
미충족 필수 단계가 있으면 `console.warn`으로 경고한다.

```
[018-M] Quest type "hunt": mandatory step "hunt-encounter" (목표 조우) was never triggered.
```

Director가 정상 동작한다면 이 경고는 발생하지 않아야 한다.

---

## 9. Dev 모드 디버그

### advance.ts 콘솔 출력

강제 이벤트 발생 시:
```
[Director] {의뢰 제목} D{day}: 강제 이벤트 "{title}" — {reason}
```

강제하지 않고 urgency가 있는 날:
```
[Director] {의뢰 제목} D{day}: Stage={stage} Urgency={level}
미완료=[{step ids}] 귀환까지={n}일
```

### DevPanel 표시

DevPanel의 **Quest Director** 섹션에서 진행 중 모든 의뢰의 상태를 확인할 수 있다:
- Day / 총 기간 / Stage
- 귀환까지 남은 일수
- urgencyLevel (색상 코딩: none=회색, low=녹색, high=황색, critical=빨강)
- 충족된 필수 단계 (녹색)
- 미충족 필수 단계 (긴급도 색상)

---

## 10. 설계 확장 가이드

### 새 의뢰 유형 추가

1. `QuestCategory` 타입에 새 값 추가 (`types/game.ts`)
2. `MANDATORY_SEQUENCES`에 해당 유형 정의 추가 (`questValidation.ts`)
3. EVENT_POOL에 해당 유형 전용 이벤트 추가 (필요시 `allowedQuestTypes` 설정)
4. Story Engine 템플릿에 해당 유형 서사 추가 (`adventureLog.ts`)
5. 이 문서와 `QUEST_VALIDATION_GUIDE.md` 업데이트

### 기존 의뢰 유형에 필수 단계 추가

`MANDATORY_SEQUENCES[questType]` 배열에 `MandatoryStep` 항목 추가.  
추가된 단계는 `minimumStage` 이상에서만 판정되므로  
기존 진행 중인 퀘스트에도 즉시 적용된다.

---

## 참조 문서

- `docs/design/QUEST_VALIDATION_GUIDE.md` — 전체 시스템 개요
- `docs/design/EVENT_ENGINE_GUIDE.md` — EVENT_POOL 및 selectEvent
- `docs/design/QUEST_TAG_GUIDE.md` — 이벤트 필터링에 사용되는 태그
