# FINANCE DATABASE

Guild Chronicle 재정 거래 데이터 구조 및 규칙 기준서. (0019-B)

---

## FinanceTransaction 필드 명세

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `EntityId` | `fin-{year}{season[0]}{day}-{type}-{random5}` |
| `date` | `GameDate` | 거래 발생 게임 날짜 |
| `type` | `FinanceTransactionType` | 거래 유형 (아래 표 참조) |
| `direction` | `"income" \| "expense"` | 수입 또는 지출 |
| `amount` | `number` | 거래 금액 (항상 양수) |
| `balanceBefore` | `number` | 거래 직전 guild.gold |
| `balanceAfter` | `number` | 거래 직후 guild.gold |
| `description` | `string` | 화면 표시용 설명 (한국어) |
| `sourceType?` | `string` | 중복 방지용 출처 분류 |
| `sourceId?` | `string` | 중복 방지용 출처 식별자 |

---

## FinanceTransactionType 목록

| type | direction | 발생 시점 | sourceType | sourceId 패턴 |
|------|-----------|-----------|-----------|--------------|
| `quest_commission` | income | 귀환 보고 정산 완료 | `"return_report"` | `report.id` |
| `warehouse_sale` | income | 창고 아이템 판매 | `"sale_transaction"` | `transaction.id` |
| `loot_purchase` | expense | 귀환 보고 전리품 매입 | `"return_report_loot"` | `report.id` |
| `facility_construction` | expense | 시설 건설 시작 | `"facility"` | `"{facilityId}:lv1"` |
| `facility_upgrade` | expense | 시설 업그레이드 시작 | `"facility"` | `"{facilityId}:lv{n}"` |

---

## 거래 생성 흐름

### 귀환 보고 정산 (returnReport.ts)

```
finalizeSettlement 호출
  ↓
사전 검증: guild.gold + guildFeeGold >= lootPurchaseTotal
  ↓
중간 상태 구성 (parties, adventurers, warehouse, returnReports 갱신)
  ↓
applyFinanceIncome(quest_commission, guildFeeGold)
  ↓ (lootPurchaseTotal > 0 인 경우)
applyFinanceExpense(loot_purchase, lootPurchaseTotal)
```

소득 먼저 적용하면, 수수료로 전리품 매입 비용을 충당할 수 있다.

### 창고 판매 (warehouse.ts)

```
sellWarehouseItem 호출
  ↓
warehouse + saleTransactions 갱신한 midState 구성
  ↓
applyFinanceIncome(warehouse_sale, totalPrice)
```

### 시설 건설 / 업그레이드 (facilities.ts)

```
startBuildFacility / startUpgradeFacility 호출
  ↓
facilities 갱신한 midState 구성 (gold 직접 차감 없음)
  ↓
applyFinanceExpense(facility_construction | facility_upgrade, cost)
```

---

## 중복 방지 규칙

`applyFinanceIncome` / `applyFinanceExpense` 내부에서, `sourceType`과 `sourceId`가 모두 제공된 경우 `(sourceType, sourceId, type)` 트리플이 기존 `financeTransactions`에 존재하면 추가하지 않고 입력 state를 그대로 반환한다.

---

## FinanceSummary 계산 (`getFinanceSummary`)

`GameState`에 저장하지 않고 selector에서 매번 계산한다.

```ts
interface FinanceSummary {
  currentGold: number;        // guild.gold 현재값
  todayIncome: number;        // 오늘 날짜 income 합계
  todayExpense: number;       // 오늘 날짜 expense 합계
  todayNet: number;           // todayIncome - todayExpense
  totalIncome: number;        // 전체 income 합계
  totalExpense: number;       // 전체 expense 합계
  recentTransactions: FinanceTransaction[]; // 최신 30건
}
```

"오늘"은 `toAbsoluteDay(tx.date) === toAbsoluteDay(state.currentDate)`로 판정한다.

---

## financeTransactions 배열 규칙

- `state.financeTransactions`는 최신 우선 (`[새 거래, ...기존]`)으로 유지된다.
- 같은 날 여러 거래가 발생하면 나중에 추가된 것이 인덱스 0에 위치한다.
- 배열 크기는 제한하지 않는다 (저장/불러오기 구현 시 고려).

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/types/game.ts` | FinanceTransaction, FinanceSummary, FinanceTransactionType, FinanceTransactionDirection 타입 |
| `src/game/simulation/finance.ts` | applyFinanceIncome, applyFinanceExpense, getFinanceSummary |
| `src/game/simulation/returnReport.ts` | finalizeSettlement — 정산 연동 |
| `src/game/simulation/warehouse.ts` | sellWarehouseItem — 창고 판매 연동 |
| `src/game/simulation/facilities.ts` | startBuildFacility, startUpgradeFacility — 시설 연동 |
| `src/features/finance/FinanceTab.tsx` | 재정 탭 UI |
| `src/game/constants/labels.ts` | financeTransactionTypeLabels, financeDirectionLabels |
| `docs/01_SYSTEM/GUILD_FINANCE_SYSTEM.md` | 재정 시스템 설계 기준서 |
