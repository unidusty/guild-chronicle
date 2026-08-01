# ADVENTURE LOG GUIDE

Guild Chronicle 모험 기록 시스템 설계 기준서. (018-L: 지원 파티 현장 통합)

---

## 개요

모험 기록(`AdventureLog`)은 의뢰 진행의 날별·사건별 서사를 장면(Scene) 단위의 한국어 문장으로 남기는 시스템이다.  
플레이어는 의뢰 상세 화면(진행 중)과 의뢰 연대기 탭(완료 후)에서 확인한다.

**018-H**: 로그 기반 시스템 구현 — 이벤트당 1~2문장  
**018-I**: Scene 기반으로 전환 — 이벤트당 2~8문단, 2~4명 모험가 등장  
**018-L**: 지원 파티 현장 통합 — 도착 후 지원 파티원이 모든 로그에 등장

---

## 핵심 원칙

1. **상태 파생 내러티브** — 모든 문장은 실제 게임 상태(파티원, 이벤트 결과, 적 정보)에서 파생된다. 임의의 사실을 만들지 않는다.
2. **결정적 해시** — 같은 `questId + day + category` 조합은 언제나 동일한 템플릿을 선택한다. 리렌더링이나 재계산으로 내러티브가 바뀌지 않는다.
3. **장면 중심** — 존재하지 않은 사건은 만들지 않는다. 실제 발생한 데이터를 장면으로 재구성한다.
4. **액터 선택** — 파티원 중 해당 역할(`vanguard` / `damage` / `support` / `scout`)에 맞는 모험가를 우선 선택한다. 한 장면에 2~4명이 등장할 수 있다.
5. **반복 최소화 (018-J)** — `buildRecentSegments(existingLogs)` + `pickAvoidingRecent()` 로 최근 10개 로그에서 사용된 문장을 피해 다음 문장을 선택한다. 이미 저장된 내러티브는 변경되지 않는다.

---

## 데이터 구조

```typescript
interface AdventureLogEntry {
  id: EntityId;              // "al-{questId}-{type}-{key}"
  questId: EntityId;
  partyId: EntityId;
  date: GameDate;
  questDay: number;          // 1부터 시작
  category: AdventureLogCategory;
  importance: AdventureLogImportance;
  title: string;             // 메타 표시용 제목
  narrative: string;         // 장면 본문 — 문단 구분자 "\n\n"
  actorIds: EntityId[];      // 장면에 등장한 모험가 ID (최대 4명)
  targetIds: EntityId[];
  incidentId?: EntityId;
  decisionId?: EntityId;
  tags: string[];
}
```

`GameState.adventureLogs: Record<EntityId, AdventureLogEntry[]>` — questId를 키로 사용.  
의뢰가 `state.quests`에서 삭제된 후에도 `adventureLogs`는 보존된다.

`narrative`는 `"\n\n"`으로 문단을 구분한다. UI에서는 이를 분리해 각각 `<p>` 태그로 렌더링한다.

---

## 기록 유형 및 생성 시점

| 생성 함수 | 시점 | 기록 ID |
|-----------|------|---------|
| `generateDepartureLog` | 파티 배정 직후 | `al-{q}-depart-{dateKey}` |
| `generateDailyLog` | 매일 업무 종료, 이벤트 없는 날 | `al-{q}-day-{day}-{dateKey}` |
| `generateIncidentLog` | 이벤트 발생 시 | `al-{q}-ev-{eventId}` |
| `generateDecisionLog` | 플레이어 결정 적용 시 | `al-{q}-dec-{decisionId}` |
| `generateSupportArrivalLog` | 지원 파티 도착 시 | `al-{q}-support-{dateKey}` |
| `generateCompletionLog` | 의뢰 완료·철수·포기 시 | `al-{q}-complete-{dateKey}` |

이벤트 발생 날은 `generateIncidentLog`만 생성하고 `generateDailyLog`는 생략한다.  
지원 파티 도착 날(`currentDay - decision.day === 2`)은 `generateSupportArrivalLog`만 생성하고 `generateDailyLog`는 생략한다.

---

## 중요도 등급

| 값 | CSS 클래스 | 용도 |
|----|-----------|------|
| `normal` | (없음) | 일반 진행 내러티브 |
| `notable` | `adv-log-notable` | 주목할 만한 이벤트 |
| `major` | `adv-log-major` | 결정, 중요 전투 |
| `historic` | `adv-log-historic` | 대성공, 사망 등 역사적 사건 |

---

## 카테고리별 CSS 클래스

`.adv-log-entry`에 `.adv-log-cat-{category}` 클래스가 추가된다.  
카테고리별로 좌측 보더 색상과 배경색이 다르게 적용된다.

| 카테고리 | 색조 |
|----------|------|
| `departure` | 파란 계열 (여정 시작) |
| `combat` | 붉은 계열 (전투) |
| `decision` | 남색 계열 (결정) |
| `completion` | 녹색 계열 (완료) |
| `retreat` | 갈색 계열 (철수) |
| `failure` | 어두운 붉은 계열 (실패) |
| `discovery` | 황갈색 계열 (발견) |
| 나머지 | 기본 녹색 계열 |

---

## Scene 구조

각 생성 함수는 `buildScene(segments[])` 헬퍼로 문단을 조합한다. 빈 세그먼트는 자동으로 제거된다.

| 로그 유형 | 문단 수 | 주요 구성 |
|-----------|--------|-----------|
| 출발 (`departure`) | 3 | 출발 선언 → 분위기 묘사 → 액터 이동 행동 |
| 이동 일별 (`travel`) | 2 | 이동 묘사 → 액터 관찰 행동 |
| 수행 일별 (`executing`) | 3 | 상황 묘사 → 임무 행동 → 액터 특기 행동 |
| 귀환 일별 (`returning`) | 2 | 귀환 묘사 → 마무리 |
| 전투 사건 (`combat`) | 5~8 | 분위기 → 적 등장 → 전투 시작 → 액터1 → 액터2 → 협동 → 액터3 → 전황 변화 |
| 위험 사건 (`danger`) | 4~5 | 분위기 → 위험 묘사 → 긴장 → 액터 대응 → 반전 |
| 탐사·발견 사건 | 3 | 발견 묘사 → 액터 탐사 행동 → 안도 |
| 결정 (`decision`) | 2 | 결정 내용 → 파티 반응·다음 행동 |
| 지원 합류 (`teamwork`) | 6 | 고전 묘사 → 지원 도착 → 지원원 행동 → 주 파티 반응 → 합동 공세 → 전황 반전 |
| 대성공 완료 | 6 | 영웅담 → 액터1 결정타 → 액터2 지원 → 전황 전환 → 승리 → 안도 |
| 간신히 완료 | 3 | 고전 묘사 → 구원 액터 → 안도 |
| 성공 완료 | 2 | 완료 선언 → 액터 기여 |
| 철수 완료 | 3 | 열세 묘사 → 철수 결정 → 귀환 |
| 실패 완료 | 3 | 실패 선언 → 원인 설명 → 무거운 여운 |
| 대실패 완료 | 5 | 고전 묘사 → 액터 분투 → 전선 붕괴 → 대실패 선언 → 여운 |

---

## 지원 파티 통합 (018-L)

`generateDailyLog`, `generateIncidentLog`, `generateCompletionLog`는 각각 `supportParties: Party[]`, `supportMembers: Adventurer[]` 파라미터를 추가로 받는다.  
`generateSupportArrivalLog`는 주 파티원(`mainMembers`)과 지원 파티원(`supportMembers`)을 모두 받아 두 집단의 모험가를 한 Scene에 등장시킨다.

| 함수 | 지원 파티 동작 |
|------|--------------|
| `generateDailyLog` | `supportParties.length > 0`이면 지원 파티원 한 명이 일별 로그에 등장 |
| `generateIncidentLog` | 전투 Scene에 지원 파티원 공격 + 주 파티원과 협동 문단 삽입 |
| `generateSupportArrivalLog` | 고전 → 도착 알림 → 지원원 행동 → 주 파티 반응 → 합동 공세 → 전황 반전 (6문단) |
| `generateCompletionLog` | `result.supportUsed` 시 지원 파티 기여 문단 추가 |

`advance.ts`는 의뢰 진행 루프에서 도착한 지원 파티(`currentDay - decision.day >= SUPPORT_TRAVEL_DAYS`)를 계산해 각 함수에 전달한다.

---

## Dynamic Story Engine 추가 상수 (018-J)

| 상수 | 항목 수 | 역할 |
|------|--------|------|
| `SEASON_CONTEXT` | 4×5 | 계절별 분위기 문장 (33% 확률 삽입) |
| `ENEMY_BEHAVIOR` | 8종 × 4~6 | 적별 전투 행동 패턴 |
| `TRAVEL_DETAIL` | 34 | 이동 중 환경 관찰 |
| `EXPLORE_DETAIL` | 32 | 탐사 중 발견/관찰 |
| `COMBAT_DEVELOPMENT` | 50 | 전투 중 상황 전개 |
| `RETURN_DETAIL` | 20 | 귀환 중 상황 |
| `RARE_SCENES` | 12 | 2% 확률 희귀 장면 |

**Story Memory 동작:**
1. `generateDailyLog` / `generateIncidentLog` 호출 시 `existingLogs` 전달
2. `buildRecentSegments(existingLogs, 10)` — 직전 10개 로그의 문장을 Set으로 구성
3. `pickAvoidingRecent(pool, seed, recentSegments)` — 이미 사용된 문장을 건너뛰고 선택
4. 50개 이상 풀에서 선택하므로 자연적으로 반복이 희소해짐

---

## Scene 세그먼트 상수 (018-I 추가)

| 상수 | 역할 |
|------|------|
| `SCENE_OPENING` | 퀘스트 유형별 분위기 묘사 첫 문장 |
| `SCENE_ENEMY_APPEAR` | 적 등장 — `{enemy}` 변수 사용 |
| `SCENE_CONFLICT` | 전투 시작 선언 |
| `SCENE_COOP` | 두 액터 협동 — `{actor}` + `{actor2}` |
| `SCENE_TURNING_POS` | 전황 유리하게 전환 |
| `SCENE_TURNING_NEG` | 전황 불리하게 전환 |
| `SCENE_TENSION` | 긴장감 표현 |
| `SCENE_RELIEF` | 안도·위기 해소 |
| `SCENE_RESOLVE` | 결의·포기 거부 |
| `SCENE_STRUGGLE` | 고전·한계 묘사 |
| `SCENE_VICTORY` | 승리·목표 달성 |
| `SCENE_AFTERMATH_FAIL` | 실패 여운 |
| `SCENE_RETURN_CLOSE` | 귀환 마무리 |
| `SUPPORT_STRUGGLE` | 지원 전 고전 묘사 |
| `SUPPORT_REACTION` | 지원 도착 후 파티 반응 |
| `SUPPORT_COMBINED` | 두 파티 합동 공세 |

---

## 템플릿 관리 규칙

- 모든 템플릿은 `src/game/simulation/adventureLog.ts` 내부 상수로 정의한다.
- 템플릿 변수는 `{변수명}` 형식 (예: `{actor}`, `{actor2}`, `{region}`, `{enemy}`).
- 새 카테고리를 추가할 때는 `AdventureLogCategory` 타입, 템플릿 배열, CSS 클래스, `ADV_LOG_CATEGORY_LABELS` 레코드 네 곳을 모두 업데이트한다.
- 템플릿 배열은 최소 3개 이상을 유지해 반복감을 줄인다.

---

## UI 표시 규칙

- 진행 중 의뢰 상세(`QuestDetail`): 최신 8개를 역순으로 표시한다.
- 의뢰 연대기 탭(`QuestChronicleTab`): 연대기 항목 선택 시 우측 패널에 전체 기록을 표시한다.
- 각 항목은 메타 행(일차 / 카테고리 배지 / 날짜)과 장면 문단들로 구성된다.
- `narrative.split("\n\n")`으로 분리 후 각 문단을 `<p>` 태그로 렌더링한다.
- 액터 이름은 내러티브 아래 이탤릭으로 표시한다.
