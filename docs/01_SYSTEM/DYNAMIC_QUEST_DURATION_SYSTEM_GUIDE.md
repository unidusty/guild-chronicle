# DYNAMIC QUEST DURATION SYSTEM GUIDE

## 개요

의뢰 진행 중 발생한 실제 사건과 길드장의 결정이 귀환 일정에 영향을 준다.

의뢰 카드의 기간은 **최초 예상 기간**이며,
진행 중 사건에 따라 현재 예상 기간이 늘어나거나 줄어든다.

---

## 설계 원칙

- 최초 예상 기간은 불변이다.
- 기간 변경은 반드시 실제 Quest Event 또는 길드장 결정에 근거한다.
- 동일 사건은 기간에 한 번만 영향을 준다.
- 기간 연장은 최대치를 초과할 수 없다.
- 기간 단축은 Mandatory Step을 건너뛰게 하지 않는다.
- Quest Director는 변경된 totalDays를 기준으로 urgency를 재평가한다.

---

## 데이터 구조

### QuestProgress 추가 필드

```ts
interface QuestProgress {
  // 기존 필드 ...

  initialEstimatedDays: number;       // 불변 — 의뢰 시작 시 고정
  currentEstimatedDays: number;       // 가변 — 기간 변경 시 갱신
  durationChanges: QuestDurationChange[];
}
```

### QuestDurationChange

```ts
interface QuestDurationChange {
  id: EntityId;
  questId: EntityId;
  date: GameDate;
  deltaDays: number;                          // + = 지연, − = 단축
  reason: string;
  sourceType: "event" | "decision" | "support" | "withdrawal";
  sourceId: EntityId;
  previousEstimatedDays: number;
  nextEstimatedDays: number;
  stage: QuestStage;
}
```

### QuestChronicleEntry 추가 필드

```ts
initialEstimatedDays: number;
finalEstimatedDays: number;
actualDurationDays: number;     // currentDay + 1 at completion
```

### ReturnReport 추가 필드

```ts
durationDays: number;           // 실제 수행 기간 (= actualDurationDays)
initialEstimatedDays: number;   // 최초 예상 기간
totalDurationDelta: number;     // durationDays - initialEstimatedDays
```

---

## 기간 변경 연동 이벤트

기간 변화가 설정된 이벤트 (DURATION_DELTA_BY_EVENT):

| 이벤트 | 변화 | 설명 |
|--------|------|------|
| ev-env-001 폭우 | +1일 | 시야 감소·이동 지연 |
| ev-env-002 짙은 안개 | +1일 | 탐색 속도 저하 |
| ev-env-003 낙석 | +1일 | 우회로 탐색 |
| ev-env-004 경로 붕괴 | +2일 | 새 경로 확보 |
| ev-env-005 갑작스러운 폭설 | +2일 | 이동 속도 급감 |
| ev-env-006 강물 범람 | +2일 | 도하 지점 봉쇄 |
| ev-explore-010 오래된 지도 발견 | −1일 | 경로 최적화 |
| ev-person-004 지역 주민 정보 입수 | −1일 | 목표 위치 확인 |

---

## 제한 규칙

### 최대 연장

```
최대 연장 = min(초기 기간 × 50%, 10일)
```

초기 기간 10일 의뢰: 최대 +5일
초기 기간 30일 의뢰: 최대 +10일

### 최소 잔여 기간

```
최소 잔여일 = max(1, 미완료 필수 단계 수 + 1)
```

기간 단축은 이 최소치를 위반할 수 없다.

---

## 중복 방지

중복 키: `(sourceType, sourceId)`

- 같은 이벤트에서 두 번 기간 변화가 적용되지 않는다.
- React 개발 모드 이중 실행 방지.
- 지원 파티 대기 효과 중복 방지.

---

## 지원 파티 대기

지원 결정 시 +SUPPORT_TRAVEL_DAYS(2일) 1회 적용.

- sourceType: `"support"`
- sourceId: decisionId

---

## Quest Director 연동

`prog.totalDays = prog.currentEstimatedDays`

기간이 변경되면 totalDays가 갱신되므로 Quest Director가 자동으로 새 urgency를 계산한다.

---

## 귀환 단계 제한

귀환 단계에서는 탐사·보상·인물 이벤트가 `selectEvent()`에서 이미 필터링된다.

따라서 단축 이벤트(ev-explore-010, ev-person-004)는 귀환 단계에서 발생하지 않는다.

연장 이벤트(ev-env-*)는 귀환 단계에서도 발생 가능 (날씨 등).

---

## 실제 수행 기간 계산

```
actualDurationDays = prog.currentDay + 1
```

`currentDay`는 0부터 시작하며, 완료 직전까지만 증가한다. 완료 당일은 +1로 보정한다.

---

## 처리 흐름

1. `advance.ts` → `updateQuests()`: 이벤트 생성 후 `getEventDurationDelta(def.id)` 조회
2. delta != 0이면 `tryApplyDurationChange()` 호출
3. 성공 시 `quests[questId].remainingDays += delta`, `prog.totalDays = prog.currentEstimatedDays + delta`
4. Adventure Log에 "기간 변경" incident 항목 추가
5. `processDayEnd()`: 이전/이후 durationChanges 비교 → `quest_duration_changed` 보고서 항목 추가

---

## 주요 파일

| 역할 | 경로 |
|------|------|
| 타입 정의 | `src/types/game.ts` |
| 기간 변경 로직 | `src/game/simulation/questDuration.ts` |
| 이벤트 연동 | `src/game/simulation/advance.ts` |
| 결정 연동 | `src/game/simulation/questDecisions.ts` |
| 연대기 기록 | `src/game/simulation/questChronicle.ts` |
| 귀환 보고 | `src/game/simulation/returnReport.ts` |
| 일일 보고서 | `src/game/simulation/dayEnd.ts` |
| 진행 중 UI | `src/features/quests/QuestDetail.tsx` |
| 목록 뱃지 | `src/features/quests/ActiveQuestsTab.tsx` |
| 귀환 보고 UI | `src/features/returnReport/ReturnReportModal.tsx` |

---

## 미구현 사항

- 날씨 시스템 (날씨별 이동 속도)
- 지역 거리 기반 기간 계산
- 원정 식량 소비
- 피로 누적
- 이동 수단 효과
- 기간 연장 협상
- 조기 완료 보너스
- 지연 위약금
- 의뢰인 반응
- 호위 의뢰 전용 기간 구조
- 대형 원정·레이드 장기 일정
