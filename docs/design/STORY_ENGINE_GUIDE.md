# STORY ENGINE GUIDE

Guild Chronicle Dynamic Story Engine 설계 기준서. (018-N)

---

## 개요

Dynamic Story Engine은 `adventureLog.ts`의 내러티브 생성 레이어로,  
동일한 이벤트가 반복될 때 서사가 단조로워지지 않도록 다음 세 가지 메커니즘을 적용한다.

1. **Story Memory** — 최근 사용된 문장을 기억하고 회피
2. **Seasonal Injection** — 계절 분위기 문장 33% 확률 삽입
3. **Rare Scenes** — 2% 확률로 특별 희귀 장면 삽입

---

## 핵심 함수

### hashSeed

```typescript
function hashSeed(seed: string): number
```

같은 seed → 항상 같은 숫자. 내러티브의 결정적(deterministic) 선택 기반.

### pickByHash

```typescript
function pickByHash<T>(arr: T[], seed: string): T
```

배열에서 seed 기반으로 항상 동일한 항목 선택. 리렌더링·재계산 시에도 동일한 결과.

### pickAvoidingRecent

```typescript
function pickAvoidingRecent<T>(arr: T[], seed: string, recent: Set<string>): T
```

- `recent`에 포함된 문장은 순서를 미루고 다른 항목을 선택
- 배열이 클수록(50개+) 자연스럽게 반복이 희소해짐

### buildRecentSegments

```typescript
function buildRecentSegments(logs: AdventureLogEntry[], count = 10): Set<string>
```

직전 N개 로그의 `narrative`를 `"\n\n"`으로 분리하여 문장 Set 반환.  
이미 저장된 내러티브는 변경하지 않는다.

### buildScene

```typescript
function buildScene(segments: string[]): string
```

빈 세그먼트를 제거하고 `"\n\n"`으로 조합. UI에서는 `<p>` 태그 단위 렌더링.

---

## 템플릿 풀 규모

| 상수 | 항목 수 | 역할 |
|------|--------|------|
| `SEASON_CONTEXT` | 4×5 = 20 | 계절별 분위기 (봄·여름·가을·겨울) |
| `ENEMY_BEHAVIOR` | 8종 × 4~6 | 적별 전투 행동 패턴 |
| `TRAVEL_DETAIL` | 34 | 이동 중 환경 관찰 |
| `EXPLORE_DETAIL` | 32 | 탐사 중 발견·관찰 |
| `COMBAT_DEVELOPMENT` | 50 | 전투 중 상황 전개 |
| `RETURN_DETAIL` | 20 | 귀환 중 상황 |
| `RARE_SCENES` | 12 | 2% 확률 희귀 장면 |
| 직업별 액션 | 8종 × 최대 8개 | 전투·탐사·이동 행동 |
| `SCENE_COOP` | 12 | 두 액터 협동 패턴 |

---

## Scene 구조

각 로그 유형별 문단 구성:

| 로그 유형 | 문단 수 | 구성 |
|-----------|--------|------|
| 출발 | 3 | 선언 → 분위기 → 이동 행동 |
| 이동 일별 | 2 | 묘사 → 관찰 |
| 수행 일별 | 3 | 상황 → 임무 → 특기 |
| 귀환 일별 | 2 | 귀환 묘사 → 마무리 |
| 전투 이벤트 | 5~8 | 분위기 → 적 등장 → 전투 시작 → 액터1 → 액터2 → 협동 → 전황 → 마무리 |
| 위험 이벤트 | 4~5 | 분위기 → 묘사 → 긴장 → 대응 → 반전 |
| 결정 | 2 | 결정 내용 → 파티 반응 |
| 지원 합류 | 6 | 고전 → 도착 → 지원원 행동 → 주 파티 반응 → 합동 공세 → 전황 반전 |
| 대성공 완료 | 6 | 영웅담 → 결정타 → 지원 → 전환 → 승리 → 안도 |
| 간신히 완료 | 3 | 고전 → 구원 → 안도 |
| 성공 완료 | 2 | 선언 → 기여 |
| 철수 완료 | 3 | 열세 → 결정 → 귀환 |
| 실패 완료 | 3 | 선언 → 원인 → 여운 |
| 대실패 완료 | 5 | 고전 → 분투 → 붕괴 → 선언 → 여운 |

---

## Quest Tag 연동 (018-K)

이벤트 엔진이 생성한 `QuestEvent.category`와 `event.title`을  
어드벤처 로그 생성 시 활용하여 상황에 맞는 서사 풀을 선택한다.

예: `category: "combat"` + `enemyHint: "고블린"` → `ENEMY_BEHAVIOR["goblin"]` 우선 선택.

---

## 지원 파티 서사 통합 (018-L)

`generateDailyLog`, `generateIncidentLog`, `generateCompletionLog`는 각각 `supportParties: Party[]`, `supportMembers: Adventurer[]`를 추가 파라미터로 받는다.  
`generateSupportArrivalLog`는 주 파티원(`mainMembers`)과 지원 파티원(`supportMembers`)을 모두 받아 합류 Scene을 생성한다.

| 상황 | 동작 |
|------|------|
| 일별 로그, 지원 도착 후 | 지원 파티원 한 명이 `sSupport` 세그먼트로 등장 |
| 전투 이벤트, 지원 도착 후 | 지원 파티원 공격 + 주 파티원과 협동 문단 삽입 |
| 지원 합류 당일 | `generateSupportArrivalLog` 전용 호출, 일별 로그 대체 |
| 완료 로그 | `result.supportUsed` 시 지원 파티 기여 문단 추가 |

제목은 `"${supportParty.name} 합류"` 형식으로 지원 파티 이름을 포함한다.

---

## 결정적 해시 원칙

- 동일한 `questId + day + category` 조합은 항상 같은 템플릿 선택
- 이미 저장된 내러티브는 절대 변경하지 않음
- `pickAvoidingRecent`는 저장된 내용을 바탕으로 선택하므로 동일 입력에 동일 결과
