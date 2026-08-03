# GUILD REPUTATION SYSTEM GUIDE

## 개요

길드 명성(Guild Reputation)은 길드의 사회적 평가와 인지도를 나타내는 수치다.

모든 명성 변화는 하나의 공통 함수에서 처리되며,
수치 변경과 변동 기록이 항상 함께 이루어진다.

---

## 설계 원칙

- 명성 수치(`reputation: number`)만 Guild에 저장한다. 등급 문자열을 중복 저장하지 않는다.
- 명성 등급은 수치로부터 계산 함수(`getReputationTier`)가 실시간으로 도출한다.
- 모든 명성 변경은 `applyReputationChange`를 통해서만 이루어진다.
- 동일 `sourceId`의 명성 변화는 두 번 적용되지 않는다.
- 명성은 0 미만으로 내려가지 않는다.
- 중요한 변화(등급 변경, ±20 이상)만 연대기에 기록한다. 세부 기록은 `reputationChanges`에 보존한다.

---

## 명성 등급

| 등급 | 최소 명성 |
|---|---|
| 무명 길드 | 0 |
| 신생 길드 | 50 |
| 소규모 길드 | 200 |
| 지역 길드 | 600 |
| 유명 길드 | 1,500 |
| 명문 길드 | 3,500 |
| 전설의 길드 | 7,000 |

등급 경계값은 `src/game/constants/reputation.ts`의 `REPUTATION_TIERS`에서 관리한다.

---

## 명성 변화량 — 의뢰 결과

`calcQuestReputation(questGrade, resultGrade)` 함수가 반환하는 delta 값.

| 결과 \ 랭크 | F | E | D | C | B | A | S |
|---|---|---|---|---|---|---|---|
| 대성공 | +15 | +18 | +23 | +30 | +45 | +68 | +105 |
| 성공 | +8 | +10 | +12 | +16 | +24 | +36 | +56 |
| 간신히 성공 | +3 | +4 | +5 | +6 | +9 | +14 | +21 |
| 철수 | -3 | -4 | -5 | -6 | -9 | -14 | -21 |
| 실패 | -8 | -10 | -12 | -16 | -24 | -36 | -56 |
| 대실패 | -15 | -18 | -23 | -30 | -45 | -68 | -105 |

기본값 × 랭크 배율 후 반올림. 정확한 수치는 `reputation.ts`의 `BASE_DELTA`와 `RANK_MULTIPLIER` 참조.

---

## 명성 변화 적용 시점

**의뢰 결과** — `finalizeSettlement`(귀환 정산 완료 시) 에서 한 번만 적용.

- 재호출 시 `sourceId = "rep-quest-{reportId}"` 기반 중복 방지가 작동한다.
- 귀환 보고 생성 시점에는 적용하지 않는다.

---

## 데이터 구조

### ReputationChange

```ts
interface ReputationChange {
  id: EntityId;
  date: GameDate;
  type: ReputationChangeType;   // "quest_result" | "world_event" | "guild_activity"
  delta: number;                // 실제 적용된 변화량 (음수 가능)
  reputationBefore: number;
  reputationAfter: number;
  description: string;
  sourceId?: EntityId;          // 중복 방지용 출처 ID
}
```

### GameState 필드

```ts
reputationChanges: ReputationChange[];  // 최신 우선 배열
```

### Guild 필드

```ts
reputation: number;  // 현재 명성 수치 (0 이상)
// reputationTier는 저장하지 않음 — getReputationTier(reputation)으로 계산
```

---

## 주요 파일

| 역할 | 경로 |
|---|---|
| 타입 정의 | `src/types/game.ts` |
| 등급·변화량 상수 | `src/game/constants/reputation.ts` |
| 명성 변경 공통 함수 | `src/game/simulation/reputation.ts` |
| 의뢰 정산 연동 | `src/game/simulation/returnReport.ts` |
| 명성 selector | `src/game/simulation/selectors.ts` |
| UI | `src/features/guildHall/GuildHallPage.tsx` (명성 탭) |

---

## 연대기 연동

명성 변화가 다음 조건을 만족할 때 `ChronicleEntry(category: "reputation")`를 생성한다.

- 등급이 변경된 경우 (`tierChanged`)
- 변화량의 절댓값이 20 이상인 경우

작은 변화는 `reputationChanges` 배열에만 기록되며 연대기에는 남기지 않는다.

---

## 중복 방지

`applyReputationChange` 호출 전에 다음 조건을 검사한다.

```ts
if (sourceId && state.reputationChanges.some(c => c.sourceId === sourceId)) return state;
```

`sourceId` 형식: `"rep-quest-{reportId}"`

---

## 미구현 사항

- 도시별 / 지역별 / 국가별 명성
- 세력 평판 (귀족·왕실·상인 길드·타 길드)
- 세계 이벤트 명성 연동 (구조만 준비됨 — `type: "world_event"`)
- 명성에 따른 의뢰 품질·가입 신청 확률 변화
- 명성 하락에 따른 불이익
- 일일 보고서 명성 항목 (`reputation_changed` / `reputation_tier_changed` 타입 정의만 추가)
- 명성 그래프·통계·필터
