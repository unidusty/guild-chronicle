# QUEST VALIDATION GUIDE

Guild Chronicle Quest Director & Mandatory Flow 설계 기준서. (018-N)

---

## 개요

Quest Validation 시스템은 두 레이어로 구성된다.

| 레이어 | 역할 | 파일 |
|--------|------|------|
| **Quest Validation** (018-M) | 필수 단계 정의 · 미완료 경고 | `questValidation.ts` |
| **Quest Director** (018-N)   | 필수 이벤트 강제 생성 · 흐름 보장 | `questDirector.ts`   |

> Validation은 문제를 발견하는 시스템이다.  
> Quest Director는 문제를 해결하는 시스템이다.

---

## 1. 필수 단계 시퀀스 (MandatoryStep)

의뢰 유형마다 반드시 거쳐야 하는 단계를 정의한다.  
`questValidation.ts` 내부 `MANDATORY_SEQUENCES` 상수에 저장된다.

| 유형 | 필수 단계 | 트리거 카테고리 | 최소 Stage |
|------|-----------|-----------------|------------|
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

`checkMandatoryProgress(questType, events, currentStage)` 반환값:

```typescript
{ fulfilled: MandatoryStep[]; pending: MandatoryStep[]; allFulfilled: boolean }
```

- 해당 단계(minimumStage)에 도달하지 않은 단계는 판정 범위 외로 제외
- `events.some(e => triggerCategories.includes(e.category))` — 하나라도 매칭되면 충족

---

## 3. 긴급 가중치 (Urgency Multiplier)

귀환 전까지 충분한 시간이 있을 때는 정상 가중치로 이벤트가 선택된다.  
시간이 부족해질수록 미충족 필수 카테고리의 이벤트 가중치가 자동으로 높아진다.

| 귀환까지 남은 일 | 배율 |
|-----------------|------|
| > 2일 | ×1.5 |
| 2일 | ×2.0 |
| 1일 | ×2.5 |
| 0일 이하 | ×3.0 |

---

## 4. Quest Director — 긴급 단계 판정

`getDirectorState(quest, prog) → DirectorState`

| urgencyLevel | 조건 |
|--------------|------|
| `none` | 미완료 단계 없음 |
| `low` | 미완료 단계 있음, 귀환까지 > 미완료 수 + 1 |
| `high` | 귀환까지 = 미완료 수 + 1 |
| `critical` | 귀환까지 ≤ 미완료 수 (시간 부족) |

---

## 5. Quest Director — 강제 이벤트 생성

`evaluateDirector(quest, prog, tags) → DirectorResult | null`

- `urgencyLevel === "critical"` 일 때만 강제 이벤트를 반환
- 미완료 단계 중 **첫 번째**(`pendingSteps[0]`)의 트리거 카테고리에 맞는
  EVENT_POOL 후보를 찾아 점수가 가장 높은 이벤트를 선택
- `rarity === "epic"` 이벤트는 강제 후보에서 제외
- `allowedQuestTypes`, `blockedTags`, `requiredTags`, `requiredStage` 필터 모두 적용
- 귀환 단계(returning)에서는 `environment` / `danger` 이벤트만 허용
- 적합 후보가 없으면 null 반환 (일반 랜덤 선택으로 fallback)

---

## 6. advance.ts 통합 흐름

```
매일 이벤트 결정:

1. evaluateDirector(quest, prog, tags)
   ↓ DirectorResult?
   YES → eventDef = result.forcedEvent  (rollEventChance 무시)
   NO  → eventDef = selectEvent(...)    (기존 확률 롤)

2. eventDef != null → generateIncidentLog()
   eventDef == null → generateDailyLog()
```

---

## 7. 귀환 단계 이벤트 제한

`returning` 단계에서 selectEvent와 evaluateDirector 모두  
`environment` / `danger` 이외의 이벤트를 차단한다.

귀환 중 전투·탐사·보상·인물 이벤트는 발생하지 않는다.

---

## 8. 귀환 기간 계산

`getReturnStartDay(totalDays)` — 의뢰 기간에 따른 귀환 시작 일:

| 총 기간 | 귀환 일수 | 귀환 시작 |
|---------|----------|----------|
| 1~5일   | 1일      | totalDays - 1 |
| 6일 이상 | 2일      | totalDays - 2 |

---

## 9. Dev 모드 디버그

### console.log (advance.ts)

Director가 이벤트를 강제할 때:
```
[Director] {의뢰 제목} D{day}: 강제 이벤트 "{title}" — {reason}
```

Director가 강제하지 않고 urgency가 있을 때:
```
[Director] {의뢰 제목} D{day}: Stage={stage} Urgency={level} 미완료=[{ids}] 귀환까지={n}일
```

### console.warn (advance.ts)

완료 시 미충족 필수 단계가 남아 있으면:
```
[018-M] Quest type "{type}": mandatory step "{id}" ({desc}) was never triggered.
```

### DevPanel 표시

DevPanel의 **Quest Director** 섹션에서 진행 중 의뢰별로 확인 가능:
- 현재 Day / 총 기간 / Stage
- 귀환까지 남은 일수
- 긴급도 (none / low / high / critical)
- 완료된 필수 단계 (녹색)
- 미완료 필수 단계 (긴급도 색상)

---

## 10. 반복 억제

| 시스템 | 범위 | 파일 |
|--------|------|------|
| Event Memory | 최근 8개 이벤트 제목 회피 | `eventEngine.ts` |
| Story Memory | 최근 15개 로그 문장 회피 | `adventureLog.ts` |

---

## 11. 파일 구조

```
src/game/simulation/
├── questValidation.ts   — MandatoryStep 정의, 충족 판정, 긴급 가중치
├── questDirector.ts     — DirectorState, DirectorResult, evaluateDirector()
├── eventEngine.ts       — EVENT_POOL, selectEvent(), allowedQuestTypes 필터
└── advance.ts           — Director → selectEvent fallback 통합
```
