# GUILD OPERATING COST SYSTEM GUIDE

## 개요

길드는 매일 시설 유지비와 기본 운영비를 지출한다.

오늘 업무 종료 시 자동으로 계산·처리되며, Finance Transaction과 연동된다.

---

## 설계 원칙

- 운영비는 날짜가 진행될 때 하루에 정확히 한 번 처리한다.
- 모든 계산과 처리는 `applyDailyOperatingCost` 단일 진입점을 통한다.
- 골드는 0 미만으로 내려가지 않는다. 부족분은 미납으로 기록한다.
- 미납은 현 버전에서 경고 표시만 하며 자동 상환·시설 정지·파산을 적용하지 않는다.
- 운영 중인(`active`) 시설만 유지비 대상이다. `unbuilt`, `constructing`, `upgrading`은 제외한다.

---

## 비용 구조

### 기본 운영비

```ts
BASE_DAILY_GUILD_OPERATING_COST = 30  // 단위: G/일
```

행정·소모품·식량·조명 등 잡비를 단일 수치로 단순화한 값이다.

### 시설 유지비

| 시설 | Lv1 | Lv2 | Lv3 |
|------|-----|-----|-----|
| 길드 홀 | 20G | 40G | 70G |
| 접수대 | 10G | 20G | 35G |
| 창고 | 8G | 16G | 28G |
| 가입 심사실 | 15G | 25G | 40G |

초기 상태 (길드 홀 Lv1 + 접수대 Lv1 + 창고 Lv1 active):

```
일일 총 운영비 = 30 + 20 + 10 + 8 = 68G
```

### 일일 총 운영비 계산

```
일일 총 운영비 = BASE_DAILY_GUILD_OPERATING_COST + Σ(active 시설 유지비)
```

---

## 처리 흐름

`processDayEnd` step 3.5에서 `advanceDay` 이전에 실행한다.

이 순서는 `state.currentDate`가 여전히 `previousDate`인 상태에서 Finance Transaction을 기록하기 위한 것이다.

```ts
// 3.5. Apply daily operating costs (before advanceDay)
const { newState: afterOpCost, result: opCostResult } = applyDailyOperatingCost(afterRelease);

// 4. Advance day
const afterAdvance = advanceDay(afterOpCost);
```

### 중복 차감 방지

`GameState.lastOperatingCostDay: number | null` — 마지막으로 운영비가 처리된 절대일을 저장한다.

```ts
if (state.lastOperatingCostDay === toAbsoluteDay(state.currentDate)) return state (noop);
```

같은 날짜에 재호출되면 아무 효과도 없이 반환된다.

---

## 자금 부족 처리

```
필요 비용: 120G
현재 자금: 70G

실제 지불: 70G  (시설 유지비 먼저, 기본 운영비 순)
미납:      50G
최종 자금: 0G
```

- `guild.unpaidOperatingCost` 누적 증가
- 골드는 0 미만이 되지 않음
- Finance Transaction은 실제 지불액이 0보다 클 때만 생성

---

## Finance Transaction 연동

| type | 설명 |
|------|------|
| `facility_maintenance` | 운영 중인 시설 유지비 합계 |
| `guild_operating_cost` | 기본 길드 운영비 |

- `sourceType`: `"daily_operation"`
- `sourceId`: `"${year}${season}${day}-maint"` / `"${year}${season}${day}-base"`

---

## 데이터 구조

### DailyOperatingCostResult

```ts
interface DailyOperatingCostResult {
  date: GameDate;
  baseOperatingCost: number;
  facilityMaintenanceEntries: FacilityMaintenanceEntry[];
  facilityMaintenanceTotal: number;
  totalCost: number;
  paidAmount: number;
  unpaidAmount: number;
  balanceBefore: number;
  balanceAfter: number;
}
```

### Guild 필드 추가

```ts
unpaidOperatingCost: number;  // 누적 미납액 (0 이상)
```

### GameState 필드 추가

```ts
lastOperatingCostDay: number | null;  // 마지막 처리 절대일 (중복 방지)
```

---

## 주요 파일

| 역할 | 경로 |
|------|------|
| 타입 정의 | `src/types/game.ts` |
| 시설 유지비 데이터 | `src/data/facilityData.ts` (`maintenanceCostByLevel`) |
| 상수 + 계산·처리 함수 | `src/game/simulation/operatingCost.ts` |
| 일일 종료 연동 | `src/game/simulation/dayEnd.ts` |
| Finance 연동 | `src/game/simulation/finance.ts` |
| 시설 UI (유지비 표시) | `src/features/facilities/FacilitiesPage.tsx` |
| 재정 탭 (운영비·미납 표시) | `src/features/finance/FinanceTab.tsx` |
| 길드 홀 대시보드 (미납 경고) | `src/game/simulation/selectors.ts` (`getGuildMetrics`) |

---

## 일일 운영 보고서 연동

| Kind | 표시 조건 |
|------|-----------|
| `guild_operating_cost` | 총 운영비 > 0 |
| `operating_cost_unpaid` | 미납액 > 0 |

---

## 미구현 사항

- 직원 급여
- 시설 수익 (숙박·식사·펍)
- 세금 / 대출 / 부채 상환
- 미납 이자
- 미납으로 인한 시설 기능 정지
- 파산 및 게임오버
- 명성·세계 이벤트에 따른 비용 보정
- 운영비 예산 설정
