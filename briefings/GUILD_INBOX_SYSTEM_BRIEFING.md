# GUILD INBOX SYSTEM — BRIEFING

## 시스템 철학

Inbox는 길드장의 **중앙 업무 책상**이다.

단순한 알림 목록이 아니다.
플레이어가 길드장으로서 반드시 확인하고 결정해야 하는 업무를
한 곳에서 관리하는 결재 허브다.

귀환 보고를 정산하고,
가입 신청을 심사하고,
현장에서 올라온 긴급 보고에 판단을 내리는 것.
이 모든 의사결정이 Inbox 하나에서 이루어진다.

---

## 설계 원칙

### 1. 하나의 Inbox, 모든 업무

시스템별 별도 업무 목록을 만들지 않는다.

귀환 보고 전용, 가입 신청 전용, Quest Director 전용 목록은 없다.
모든 길드장 업무는 공통 `InboxItem` 구조를 사용한다.
향후 세계 이벤트, 왕실 요청, 시설 사건도 같은 구조를 쓴다.

### 2. Inbox는 원본을 복제하지 않는다

각 업무의 원본 데이터는 해당 시스템에 있다.

- 귀환 보고 원본: `ReturnReport`
- 가입 신청 원본: `RecruitmentApplicant`
- Quest Director 원본: `QuestProgress`, `QuestEvent`, `QuestDecision`

Inbox는 원본으로 이동하기 위한 연결 정보와 우선순위만 갖는다.

### 3. 처리 완료는 원본 상태에서 판단한다

Inbox 항목은 클릭했다고 완료되지 않는다.

- 귀환 보고: `finalizeSettlement` 완료 시 자동 제거
- 가입 신청: 승인·반려·만료 시 완료 (보류는 당일 처리 완료로 간주)
- Quest Director: 선택지가 확정되고 결과가 적용된 후 완료

### 4. 미처리 업무는 다음 날을 막는다

`requiresAction: true` 항목이 하나라도 있으면 `오늘 업무 종료`가 차단된다.

단, 정보성 항목(향후 추가 예정)은 차단하지 않는다.
`requiresAction` 필드로 두 유형을 구분한다.

---

## 구현 현황 (0020-A)

### 타입

```typescript
type InboxItemType = "return_report" | "recruitment_application" | "quest_decision";
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

### Selector 방식 (저장 없음)

모든 Inbox 항목은 기존 GameState에서 파생된다.
새로운 GameState 필드를 추가하지 않았다.

| 원본 | 파생 조건 |
|------|----------|
| `state.returnReports` | 정산 대기 중인 전체 보고 |
| `state.recruitment.applicants` | `status === "pending"` 지원자만 |
| `state.questProgress[x].events` | `!e.read` (미결정 이벤트) |

### 우선순위

| 유형 | 기본 우선순위 | 조건 |
|------|------------|------|
| 귀환 보고 | important | 항상 |
| 가입 신청 (기본 이벤트) | normal | basic_newcomer 등 5종 |
| 가입 신청 (특별 이벤트) | important | siblings 등 10종 |
| Quest 미결정 이벤트 | urgent | Director urgency ≠ critical |
| Quest 미결정 이벤트 | critical | Director urgency = critical |

### 네비게이션

| 업무 종류 | 클릭 시 이동 |
|---------|------------|
| 귀환 보고 | 정산 모달 즉시 열기 |
| 가입 신청 | 가입 심사 탭으로 전환 |
| Quest 미결정 | 의뢰 게시판 → 진행 중 탭 → 해당 의뢰 자동 선택 |

### 일일 종료 차단

`canEndDay(state)` 가 `false`를 반환하면:
- 오늘 업무 종료 버튼이 잠김 상태로 표시
- 클릭 시 "미처리 업무 N건 · 처리 후 종료 가능" 안내 표시
- MASTER'S DESK 패널에 차단 안내문 표시

---

## 보류 지원자 정책

보류(`held`) 지원자는 Inbox에 포함되지 않는다.
보류 선택 = 당일 판단 완료로 간주한다.
보류 기간이 끝나 `pending`으로 복귀하면 Inbox에 다시 등록된다.

이 정책으로 보류 지원자가 업무 종료를 영구 차단하는 상황을 방지한다.

---

## 향후 확장 예정

다음 항목은 이번 작업에서 구현하지 않고 구조만 준비했다.

- `world_event` — 세계 이벤트 Inbox
- `royal_request` — 왕실 요청
- `facility_event` — 시설 사건
- `guild_operation` — 길드 운영 업무
- `urgent_quest` — 긴급 의뢰
- `reputation_event` — 명성 관련 업무

Inbox 처리 이력 전용 화면, 업무 검색·필터, 자동 처리 정책은
별도 작업에서 다룬다.
