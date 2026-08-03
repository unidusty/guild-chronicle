# GUILD INBOX SYSTEM GUIDE

## 개요

Guild Inbox는 길드장이 처리해야 하는 모든 업무를 단일 인터페이스에서 관리하는 중앙 결재 시스템이다.

귀환 보고 정산, 가입 신청 심사, Quest Director 현장 보고 등
흩어져 있던 길드장 업무를 `InboxItem`이라는 공통 구조로 통합한다.

향후 세계 이벤트, 왕실 요청, 시설 사건도 같은 구조로 확장한다.

---

## 타입 구조

```typescript
// src/types/game.ts

type InboxItemType =
  | "return_report"
  | "recruitment_application"
  | "quest_decision";

type InboxPriority = "normal" | "important" | "urgent" | "critical";

interface InboxTarget {
  page?: "guildHall" | "quests";
  tab?: "recruitment";
  entityId?: EntityId;
}

interface InboxItem {
  id: EntityId;
  type: InboxItemType;
  priority: InboxPriority;
  title: string;
  summary: string;
  sourceId: EntityId;
  target: InboxTarget;
  createdDay: number;
  requiresAction: boolean;
  isUrgent: boolean;
}
```

---

## Selector 구조

파일: `src/game/simulation/inboxSelectors.ts`

모든 Inbox 항목은 기존 GameState에서 파생된다.
새로운 GameState 필드를 추가하지 않는다.

### getInboxItems(state)

세 가지 원본에서 항목을 파생하여 우선순위 순으로 정렬한 배열을 반환한다.

```
우선순위 정렬:
  1. critical (Quest Director urgent)
  2. urgent (Quest Director normal)
  3. important (귀환 보고, 특별 이벤트 가입)
  4. normal (기본 이벤트 가입)
  동일 우선순위 내에서는 createdDay 오름차순 (오래된 항목 먼저)
```

### canEndDay(state)

`requiresAction: true`인 항목이 하나라도 있으면 `false`를 반환한다.

### getInboxCount(state)

`requiresAction: true`인 항목 수를 반환한다.

---

## 항목 파생 규칙

### 귀환 보고 (return_report)

원본: `state.returnReports`

- 정산 완료(`finalizeSettlement`) 시 `returnReports`에서 제거 → 자동으로 Inbox에서 사라짐
- 우선순위: important
- `requiresAction: true`
- `id`: `inbox-return-{rr.id}`

### 가입 신청 (recruitment_application)

원본: `state.recruitment.applicants`

- `status === "pending"` 지원자만 포함
- `status === "held"` 지원자는 제외 (보류 = 당일 처리 완료로 간주)
- 보류 기간 종료 후 `pending` 복귀 시 자동으로 Inbox에 다시 등록
- 특별 이벤트 타입(siblings, fallen_noble 등 10종): priority = important
- 기본 이벤트 타입(basic_newcomer 등 5종): priority = normal
- `id`: `inbox-recruitment-{applicant.id}`

### Quest 미결정 이벤트 (quest_decision)

원본: `state.questProgress[questId].events`

- `!e.read` 인 이벤트 = 미결정 이벤트
- 결정 적용 후 `e.read = true` → 자동으로 Inbox에서 사라짐
- Quest Director urgencyLevel이 critical이면 priority = critical, 나머지는 urgent
- `id`: `inbox-quest-{questId}-{eventId}`

---

## 중복 방지

ID 규칙이 결정적(deterministic)으로 설계되어 있어
동일한 원본 엔티티에 대한 중복 등록이 구조적으로 불가능하다.

React 개발 모드의 이중 렌더링, `processDayEnd` 재호출,
업무 등록 함수 재호출 등 모든 상황에서 중복이 발생하지 않는다.

---

## 네비게이션

Inbox 항목 클릭 시 동작:

| 항목 유형 | 동작 |
|---------|------|
| `return_report` | 정산 모달 즉시 열기 (GuildHallPage 내부) |
| `recruitment_application` | 가입 심사 탭으로 전환 (GuildHallPage 내부) |
| `quest_decision` | `onNavigate("quests", { questId })` 호출 → App.tsx에서 QuestBoardPage 이동 + 해당 의뢰 자동 선택 |

### 네비게이션 흐름

```
GuildHallPage
  └─ onNavigate("quests", { questId })
       ↓
App.tsx
  └─ setSelectedQuestId(questId)
  └─ setPage("quests")
       ↓
QuestBoardPage
  └─ initialSelectedId = questId
  └─ useEffect → setTab("active"), setSelectedId(questId)
  └─ onInitialConsumed() → App.tsx setSelectedQuestId(null)
```

---

## UI 구조

### MASTER'S DESK 패널

파일: `src/features/guildHall/GuildHallPage.tsx`

- `getInboxItems(state)`로 항목 목록을 파생
- 우선순위별 아이콘 색상: gold(귀환), green(가입), danger(Quest 결정)
- urgent/critical 항목: 좌측 강조 테두리 (`.inbox-item-urgent`)
- urgent/critical 항목: 제목 옆 배지 표시 (`.inbox-priority-badge`)

### 업무 종료 차단 UI

`canEndDay(state)`가 false일 때:

- 버튼에 `.day-end-locked` 클래스 추가 (opacity 감소)
- 버튼 클릭 시 `showBlockedMsg = true`
- "미처리 업무 N건 · 처리 후 종료 가능" 문구 표시
- MASTER'S DESK 패널 상단에 `inbox-blocked-notice` 표시

---

## 고아 참조 방지

Inbox가 selector 기반이므로 고아 참조가 구조적으로 발생하지 않는다.

- 귀환 보고가 `finalizeSettlement` 후 삭제되면 Inbox 항목도 자동 사라짐
- 지원자가 만료·승인·반려되면 `status !== "pending"` 필터로 자동 제외
- 의뢰가 철수·포기로 종료되면 `questProgress`에서 삭제 → 자동 제외
- 이벤트에 결정이 내려지면 `e.read = true` → 자동 제외

---

## 향후 확장 InboxItemType

다음 타입은 구조만 정의하고 실제 기능은 구현하지 않는다.

```typescript
// 향후 추가 예정
| "world_event"
| "royal_request"
| "facility_event"
| "guild_operation"
| "urgent_quest"
| "reputation_event"
```

각 타입은 동일한 `InboxItem` 인터페이스를 사용하며,
`getInboxItems()` 내부에 해당 원본 파생 로직을 추가하는 방식으로 확장한다.

---

## 관련 문서

- `briefings/GUILD_INBOX_SYSTEM_BRIEFING.md` — 설계 철학
- `briefings/QUEST_DIRECTOR_BRIEFING.md` — Quest Director 시스템 및 이벤트 풀
- `docs/01_SYSTEM/GAME_SYSTEM.md` — 전체 시스템 개요
- `docs/03_DESIGN/QUEST_DIRECTOR_GUIDE.md` — Quest Director 상세 설계
