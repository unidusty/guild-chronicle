# WORLD EVENT SYSTEM GUIDE

현재 구현 기준 (0020-D).

## 개요

세계 이벤트(World Event)는 길드 외부에서 발생하는 사건으로,
게임 세계가 플레이어의 행동과 무관하게 변화하고 있다는 감각을 제공한다.

세계 이벤트는 Quest Event Engine과 구분된다.

- **Quest Event** — 개별 의뢰 진행 중 발생하는 현장 사건 (`QuestEvent`)
- **World Event** — 길드 외부 세계 상태 변화 (`ActiveWorldEvent`)

---

## 데이터 구조

### WorldEventDefinition

세계 이벤트 종류를 정의하는 불변 데이터.

```ts
interface WorldEventDefinition {
  id: EntityId;
  type: WorldEventType;
  name: string;
  description: string;
  category: WorldEventCategory; // 0020-D: social|economy|disaster|military|politics|disease|nature
  weight: number;               // 발생 가중치 (높을수록 자주 발생)
  minDurationDays: number;      // 최소 지속 기간
  maxDurationDays: number;      // 최대 지속 기간
  conflictGroup?: string;       // 동일 그룹끼리 동시 활성화 불가
  regionId?: EntityId;          // 0020-D: 특정 지역 이벤트 (구조 예약, 효과 미연동)
  followUpIds?: EntityId[];     // 0020-D: 종료 시 연쇄 이벤트 ID 목록
  inboxTitle?: string;          // 0020-D: 있으면 Inbox 알림 생성
  inboxPriority?: InboxPriority;// 0020-D: Inbox 우선순위
  effects: WorldEventEffect[];
  startNotification: string;
  endNotification: string;
}

interface WorldEventHistoryEntry {
  id: EntityId;
  definitionId: EntityId;
  startedAt: GameDate;
  endedAt: GameDate;
}
```

### ActiveWorldEvent

현재 진행 중인 이벤트 인스턴스.

```ts
interface ActiveWorldEvent {
  id: EntityId;
  definitionId: EntityId;
  startedAt: GameDate;
  remainingDays: number;
  effects: WorldEventEffect[];  // 스폰 시점의 스냅샷
}
```

### WorldEventEffect

이벤트가 적용하는 modifier.

```ts
interface WorldEventEffect {
  target: WorldEventEffectTarget; // warehouse_sale | quest_reward | recruitment | region_danger | loot_value
  modifier: number;               // 분수값: 0.15 = +15%, -0.15 = -15%
}
```

---

## 발생 조건

- 하루 최대 신규 이벤트 **1개**
- 동시 활성 이벤트 **최대 3개** (이미 3개라면 신규 발생 없음)
- 기본 발생 확률 **30%** (조건 충족 시)
- 이미 활성 중인 이벤트 유형 제외
- 같은 `conflictGroup`의 이벤트가 활성 중이면 제외
- 나머지 후보 중 weight 비례 가중 랜덤 선택

---

## 발생 흐름 (processDayEnd)

1. 시설 공사 진행
2. 지원자 만료
3. 보류 지원자 해제
4. 날짜 진행 (advanceDay)
5. 신규 지원자 생성
6. **세계 이벤트 tick** — remainingDays 감소, 만료된 이벤트 수집
7. **신규 세계 이벤트 시도** — 조건 충족 시 1개 발생
8. 세계 연대기 기록 (이벤트 시작/종료)
9. 일일 보고서 항목 수집 (world_event_started / world_event_ended 포함)

---

## 효과 적용 원칙

원본 데이터를 직접 수정하지 않는다.

계산 시점에 modifier accessor를 호출하여 임시 보정값을 얻는다.

```ts
// 창고 판매 modifier accessor
getWarehouseSaleModifier(state): number

// 의뢰 보상 modifier accessor (미연동, 향후 확장)
getQuestRewardModifier(state): number

// 모집 확률 modifier accessor (미연동, 향후 확장)
getRecruitmentModifier(state): number
```

이벤트 종료 후에는 modifier가 자동으로 사라진다 (activeWorldEvents에서 제거).

---

## 현재 실제 연동

| 효과 대상 | 연동 여부 | 파일 |
|---|---|---|
| `warehouse_sale` | ✅ 연동 | `src/game/simulation/warehouse.ts` |
| `quest_reward` | 🔲 미연동 (향후 확장) | — |
| `recruitment` | 🔲 미연동 (향후 확장) | — |
| `region_danger` | 🔲 미연동 (향후 확장) | — |

---

## 창고 판매가 보정 방식

```ts
const saleModifier = getWarehouseSaleModifier(state);
const totalPrice = saleModifier !== 0
  ? Math.max(1, Math.floor(baseTotalPrice * (1 + saleModifier)))
  : baseTotalPrice;
```

여러 이벤트의 효과는 합산된다 (예: +15% + +20% = +35%).

---

## 충돌 그룹 규칙

| 그룹명 | 해당 이벤트 |
|---|---|
| `festival` | 왕국 축제 |
| `harvest` | 흉년, 풍년 |
| `war` | 국경 분쟁 |
| `disease` | 전염병 |

같은 `conflictGroup`에 속한 이벤트는 동시에 활성화될 수 없다.

---

## 일일 보고서 연동

```
세계 이벤트 종료 → DailyReportItem { kind: "world_event_ended" }
세계 이벤트 시작 → DailyReportItem { kind: "world_event_started" }
```

---

## 세계 연대기 연동

이벤트 시작 및 종료 시 `ChronicleEntry`가 생성된다.

```ts
{
  scope: "world",
  category: "world",
  title: "왕국 축제 발생" | "왕국 축제 종료",
  description: startNotification | endNotification,
}
```

---

## 개발 도구

DevPanel (개발 모드에서만 표시)에서 다음 기능을 사용할 수 있다.

- 현재 활성 이벤트 목록 + 잔여 일수 + 효과 요약
- 이벤트 유형별 강제 발생 버튼
- 전체 이벤트 해제 버튼

---

## 미구현 사항

0019-D 범위에서 구현하지 않은 내용:

- 지역별 개별 이벤트
- 계절 전용 이벤트
- 연쇄 이벤트
- 플레이어 선택 이벤트
- 의뢰 자동 생성과의 직접 연동
- 모집 확률 실제 연동
- 의뢰 보상 실제 연동
- 전염병 부상·질병 시뮬레이션
- 세계 이벤트 전용 별도 페이지
