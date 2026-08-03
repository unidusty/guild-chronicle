# GUILD FINANCE SYSTEM

Guild Chronicle 길드 재정 시스템 설계 기준서. (0019-B)

---

## 설계 철학

길드 재정은 플레이어의 경영 판단을 실제 결과로 연결한다.

- 의뢰 보수는 길드가 직접 전부 갖지 않는다. 실제 수행 파티에게 지급한다.
- 재정 거래는 모두 확인 단계를 거친다. 자동 정산은 없다.
- 창고는 길드의 자산이다. 파티의 전리품과 구분된다.

---

## 현재 구현 (0019-A)

### 수입

| 항목 | 내용 | 상태 |
|------|------|------|
| 의뢰 보수 수수료 | 외부 의뢰 보수의 10% | ✅ 구현 |
| 전리품 길드 매입 | 파티 전리품을 길드가 구매 | ✅ 구현 |
| 창고 판매 수익 | 창고 전리품 판매 | ✅ 구현 (기존) |

### 지출

| 항목 | 내용 | 상태 |
|------|------|------|
| 전리품 매입 비용 | 파티 전리품 구매 대금 | ✅ 구현 |
| 시설 건설·업그레이드 | 시설 공사 비용 | ✅ 구현 (기존) |

### 미구현 (향후)

| 항목 | 예정 |
|------|------|
| 시설 유지비 | 0019-B 이후 |
| 의뢰 실패 패널티 | 0019-B 이후 |
| 파티 보수 지급 (내부 분배) | 0019-B 이후 |
| 길드 발주 의뢰 비용 | 0021 이후 |
| 숙박·식사·펍 수익 | 0025 이후 |
| 시장 시세 | 0025 이후 |

---

## 의뢰 보수 정산 구조

외부 의뢰 보수는 길드가 전부 갖지 않는다.

```
총 의뢰 보수  (quest.rewardGold)
    │
    ├── 길드 수수료 10%  →  guild.gold += guildFeeGold
    │
    └── 파티 지급액 90%  →  party.totalGoldEarned += partyPaymentGold
                              (실제 분배는 파티 내부 처리, 현재 미구현)
```

### 계산식

```
guildFeeGold    = floor(totalRewardGold × 0.10)
partyPaymentGold = totalRewardGold - guildFeeGold
```

### 길드 매입 연동

정산 시 파티 전리품을 길드가 구매할 경우 추가 지출이 발생한다.

```
guild.gold 순변화 = guildFeeGold - lootPurchaseTotal
```

`lootPurchaseTotal > guildFeeGold`이면 해당 의뢰에서 길드는 순손실이다.  
전리품 가치가 높을 때 의도적으로 발생할 수 있다.

---

## 전리품 경제

### 소유권 원칙

| 종류 | 기본 소유자 | 정산 후 변화 |
|------|------------|------------|
| 의뢰품 (quest item) | 의뢰인 | 정산 시 자동 인계 (미구현, 향후) |
| 전리품 (loot) | 수행 파티 | 길드 매입 시 창고 이동 |

현재(0019-A) 구현에서 의뢰품 개념은 문서화만 되었으며 모든 드롭 아이템은 전리품으로 처리한다.

### 길드 매입 가격

정산 시 플레이어가 전리품을 길드가 구매할 아이템을 선택한다.

- 구매 가격 = `LootItem.baseValue × quantity`
- 감정·협상 보정 없음 (현재)
- 창고에 들어간 아이템은 기존 창고 판매 기능으로 판매 가능

---

## GameState 재정 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `guild.gold` | `number` | 길드 보유 골드 |
| `party.totalGoldEarned` | `number` | 파티 누적 획득 골드 |
| `warehouse` | `Record<EntityId, number>` | 길드 창고 아이템 수량 |
| `saleTransactions` | `SaleTransaction[]` | 창고 판매 기록 |
| `returnReports` | `ReturnReport[]` | 정산 대기 귀환 보고 목록 |
| `financeTransactions` | `FinanceTransaction[]` | 골드 변동 전체 거래 내역 (최신 우선) |

---

## FinanceTransaction 구조 (0019-B)

모든 골드 변동을 `FinanceTransaction` 하나로 원자적으로 기록한다.

```ts
interface FinanceTransaction {
  id: EntityId;
  date: GameDate;
  type: FinanceTransactionType;      // quest_commission | warehouse_sale | loot_purchase | facility_construction | facility_upgrade
  direction: "income" | "expense";
  amount: number;                    // 항상 양수
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  sourceType?: string;               // 중복 방지용 출처 타입
  sourceId?: string;                 // 중복 방지용 출처 ID
}
```

### 원자성 규칙

`applyFinanceIncome` / `applyFinanceExpense`는 `guild.gold` 갱신과 `financeTransactions` 추가를 단일 반환값으로 처리한다. 중간 상태가 존재하지 않는다.

### 중복 방지

같은 `(sourceType, sourceId, type)` 조합의 거래가 이미 존재하면 추가하지 않는다.

### sourceId 규칙

| 거래 유형 | sourceType | sourceId |
|-----------|-----------|---------|
| 의뢰 수수료 | `"return_report"` | `report.id` |
| 전리품 구매 | `"return_report_loot"` | `report.id` |
| 창고 판매 | `"sale_transaction"` | `transaction.id` |
| 시설 건설 | `"facility"` | `"${facilityId}:lv1"` |
| 시설 업그레이드 | `"facility"` | `"${facilityId}:lv${n}"` |

---

## 향후 설계 방향

### 0020 이후
- 시설 유지비: 매일 업무 종료 시 자동 차감
- 의뢰 실패 패널티: 결과 등급에 따른 보수 삭감
- 파티 보수 내부 분배 (파티원 개인 지갑 도입)

### 0021
- 길드 발주 의뢰: 길드 자금으로 수행 파티 보수 직접 지급

### 0025
- 시장 시세 변동
- 상점 시스템
- 시설별 수익 (숙박, 펍, 훈련장 등)

---

## 관련 문서

- 정산 시스템 → `docs/01_SYSTEM/QUEST_SETTLEMENT_SYSTEM.md`
- 전리품 데이터 → `docs/02_DATABASE/LOOT_DATABASE.md`
- 재정 데이터베이스 → `docs/02_DATABASE/FINANCE_DATABASE.md`
- 전투 시스템 → `docs/01_SYSTEM/BATTLE_SYSTEM_GUIDE.md`
