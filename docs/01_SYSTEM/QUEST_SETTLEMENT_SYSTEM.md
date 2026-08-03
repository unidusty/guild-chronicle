# QUEST SETTLEMENT SYSTEM

Guild Chronicle 귀환 보고 및 정산 시스템 설계 기준서. (0019-A)

---

## 개요

의뢰 완료 시 즉시 정산하지 않는다.  
귀환 보고(ReturnReport)를 생성하고, 길드장이 확인 후 정산한다.

---

## 의뢰 완료 흐름

```
의뢰 remainingDays <= 0
    ↓
귀환 보고 생성 (ReturnReport)
    → state.returnReports에 추가
    → quest.assignedPartyId 파티: status → "waiting_settlement"
    → 파티원: currentQuestId → null (status는 "dispatched" 유지)
    → 지원 파티: status → "idle" (즉시 해제)
    → 의뢰 chronicle 기록 ("귀환 보고 생성됨")
    → QuestChronicleEntry 생성
    → AdventureLog completion 기록
    ↓
결재 대기 (MASTER'S DESK) 에 귀환 보고 표시
    ↓
길드장 클릭 → 귀환 보고 화면
    ↓
길드장 정산 확인 (전리품 길드 매입 선택)
    ↓
정산 완료
    → guild.gold += guildFeeGold - lootPurchaseTotal
    → party.totalGoldEarned += partyPaymentGold + lootPurchaseTotal
    → warehouse 선택된 전리품 추가
    → party: status → "idle"
    → 파티원: status → "idle"
    → ReturnReport 제거
```

---

## 데이터 구조

### ReturnReport

귀환 보고 전체 정보.

```typescript
interface ReturnReport {
  id: EntityId;                   // "rr-{questId}-{dateKey}"
  questId: EntityId;
  questTitle: string;
  questCategory: QuestCategory;
  questGrade: AdventurerRank;
  partyId: EntityId;
  partyNameSnapshot: string;
  memberIdsSnapshot: EntityId[];
  regionId: EntityId;
  regionNameSnapshot: string;
  durationDays: number;
  completedAt: GameDate;          // 귀환일
  resultGrade: QuestResultGrade;
  successRate: number;
  // 재정
  totalRewardGold: number;
  guildFeeGold: number;           // totalRewardGold × 10%
  partyPaymentGold: number;       // totalRewardGold - guildFeeGold
  // 전리품
  loot: LootEntry[];
}
```

### LootEntry

귀환 보고에 포함된 개별 전리품 항목.

```typescript
interface LootEntry {
  itemId: EntityId;
  itemName: string;
  quantity: number;
  unitValue: number;              // LootItem.baseValue
}
```

### LootOwnership

전리품 소유권 상태.

```typescript
type LootOwnership = "party" | "guild" | "quest_client";
```

- `"party"` — 기본값, 수행 파티 소유
- `"guild"` — 길드 매입 후 창고 이동 시
- `"quest_client"` — 의뢰품, 정산 시 의뢰인에게 자동 인계 (향후 구현)

### LootPurchaseResult

길드 매입 개별 항목 결과.

```typescript
interface LootPurchaseResult {
  itemId: EntityId;
  itemName: string;
  quantity: number;
  unitValue: number;
  totalValue: number;             // unitValue × quantity
}
```

### SettlementResult

정산 완료 결과.

```typescript
interface SettlementResult {
  reportId: EntityId;
  guildFeeGold: number;
  partyPaymentGold: number;
  purchasedLoot: LootPurchaseResult[];
  lootPurchaseTotal: number;
  netGuildGoldChange: number;     // guildFeeGold - lootPurchaseTotal
}
```

---

## 정산 지연 원칙

정산 완료 전까지 실행하지 않는 처리:

| 처리 | 이유 |
|------|------|
| `guild.gold` 증가 | 길드장 확인 전 재정 반영 금지 |
| `party.totalGoldEarned` 증가 | 지급 전 누적 금지 |
| `warehouse` 전리품 추가 | 매입 결정 후에만 창고 이동 |
| `party.status = "idle"` | 정산 완료 후에만 파티 자유 |
| `adventurer.status = "idle"` | 정산 완료 후에만 재파견 허용 |

귀환 즉시 실행하는 처리:

| 처리 | 이유 |
|------|------|
| `quest` 삭제 | 의뢰 게시판에서 제거 |
| `questProgress` 삭제 | 진행 데이터 정리 |
| `QuestResult` 생성 | 결과 기록 |
| `QuestChronicleEntry` 생성 | 연대기 기록 |
| `AdventureLog` completion 추가 | 모험 기록 완료 |
| 지원 파티 idle 전환 | 즉시 다른 의뢰 투입 가능 |
| `party.questsCompleted += 1` | 완료 실적 기록 |
| `party.totalActivityDays` 갱신 | 활동 일수 기록 |

---

## 파티 상태 흐름

```
idle
  ↓ 의뢰 수락
dispatched
  ↓ 의뢰 완료 (remainingDays = 0)
waiting_settlement
  ↓ 길드장 정산 완료
idle
```

### PartyStatus 용어 정리

| 값 | 표시 | 설명 |
|----|------|------|
| `idle` | 대기 | 의뢰 없음, 재파견 가능 |
| `dispatched` | 의뢰 수행 중 | 의뢰 진행 중 |
| `returning` | 귀환 중 | (예약됨, 향후 구현) |
| `waiting_settlement` | 정산 대기 | 귀환 완료, 정산 전 |

---

## UI 구조

### 귀환 보고 버튼 (결재 대기 패널)

GuildHallPage 대시보드 탭 "결재 대기(MASTER'S DESK)" 패널에 표시된다.

```
[ ! ] 귀환 보고 — [파티명]
      [의뢰명] · [결과 등급] · [날짜]                   ›
```

### 귀환 보고 화면 (ReturnReportModal)

귀환 보고 버튼 클릭 시 열리는 전체 오버레이 모달.

**섹션 구성:**
1. **의뢰 요약** — 파티명, 지역, 기간, 결과 등급, 성공률
2. **정산 내역** — 총 보수, 길드 수수료(10%), 파티 지급액(90%)
3. **획득 전리품** — 체크박스로 길드 매입 선택

**푸터:**
- 길드 매입 총액
- 길드 순수익 (guildFeeGold - lootPurchaseTotal)
- "정산 완료" 버튼

---

## 일일 운영 보고서 연동

업무 종료 시 귀환 보고가 새로 생성된 경우, 일일 운영 보고서에 표시된다.

```
DailyReportItemKind: "quest_returned"
표시: "귀환 보고 — [파티명]"
설명: "[의뢰명]이(가) 완료되었습니다. 결재 대기."
```

---

## 주의사항

- `waiting_settlement` 상태의 파티원(`status: "dispatched"`)은 다른 의뢰에 배정할 수 없다.
- `waiting_settlement` 파티가 있을 때 업무 종료는 정상 동작한다. 정산은 별도 처리다.
- 한 번에 여러 귀환 보고가 있을 수 있다 (다수 파티가 같은 날 귀환 시).
- 귀환 보고는 삭제(정산 완료)되기 전에는 영속된다. 날짜가 지나도 자동 처리되지 않는다.

---

## 관련 문서

- 길드 재정 시스템 → `docs/01_SYSTEM/GUILD_FINANCE_SYSTEM.md`
- 전리품 데이터 → `docs/02_DATABASE/LOOT_DATABASE.md`
- 게임 시스템 → `docs/01_SYSTEM/GAME_SYSTEM.md`
