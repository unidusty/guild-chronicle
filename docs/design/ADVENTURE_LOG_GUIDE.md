# ADVENTURE LOG GUIDE

Guild Chronicle 모험 기록 시스템 설계 기준서.

---

## 개요

모험 기록(`AdventureLog`)은 의뢰 진행의 날별·사건별 내러티브를 한국어 문장으로 남기는 시스템이다.  
플레이어는 의뢰 상세 화면(진행 중)과 의뢰 연대기 탭(완료 후)에서 확인한다.

---

## 핵심 원칙

1. **상태 파생 내러티브** — 모든 문장은 실제 게임 상태(파티원, 능력치, 이벤트 결과)에서 파생된다. 임의의 사실을 만들지 않는다.
2. **결정적 해시** — 같은 `questId + day + category` 조합은 언제나 동일한 템플릿을 선택한다. 리렌더링이나 재계산으로 내러티브가 바뀌지 않는다.
3. **단순한 문장** — 20~40자 내외 단문. 과장 없이 사실만 전달한다.
4. **액터 선택** — 파티원 중 해당 역할(`vanguard` / `damage` / `support` / `scout`)에 맞는 모험가를 우선 선택한다.

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
  title: string;             // 미사용 예정 (내러티브로 대체)
  narrative: string;         // 표시되는 한국어 문장
  actorIds: EntityId[];      // 언급된 모험가 ID
  targetIds: EntityId[];
  incidentId?: EntityId;
  decisionId?: EntityId;
  tags: string[];
}
```

`GameState.adventureLogs: Record<EntityId, AdventureLogEntry[]>` — questId를 키로 사용.  
의뢰가 `state.quests`에서 삭제된 후에도 `adventureLogs`는 보존된다.

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

## 템플릿 관리 규칙

- 모든 템플릿은 `src/game/simulation/adventureLog.ts` 내부 상수로 정의한다.
- 템플릿 변수는 `{변수명}` 형식 (예: `{actor}`, `{region}`, `{quest}`).
- 새 카테고리를 추가할 때는 `AdventureLogCategory` 타입, 템플릿 배열, CSS 클래스, `ADV_LOG_CATEGORY_LABELS` 레코드 네 곳을 모두 업데이트한다.
- 템플릿 배열은 최소 3개 이상을 유지해 반복감을 줄인다.

---

## UI 표시 규칙

- 진행 중 의뢰 상세(`QuestDetail`): 최신 12개를 역순으로 표시한다.
- 의뢰 연대기 탭(`QuestChronicleTab`): 연대기 항목 선택 시 우측 패널에 전체 기록을 표시한다.
- 각 항목은 메타 행(일차 / 카테고리 배지 / 날짜)과 내러티브 문장으로 구성된다.
- 액터 이름은 내러티브 아래 이탤릭으로 표시한다.
