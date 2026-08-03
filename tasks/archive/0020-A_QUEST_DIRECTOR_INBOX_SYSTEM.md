# 0020-A — Quest Director 콘텐츠 확장 및 길드 업무(Inbox) 시스템

**버전**: 0020-A  
**날짜**: 2026-08-03  
**상태**: todo

---

## 목적

현재 Quest Director는 기본 구조와 Mandatory Flow를 갖추고 있지만,
실제 플레이에서 길드장이 판단해야 하는 선택 이벤트의 종류와 빈도가 부족하다.

또한 귀환 보고, 가입 신청, 진행 중 의뢰의 긴급 선택 등
길드장이 처리해야 하는 업무가 각 시스템에 흩어져 있어
플레이 흐름이 분절되고 있다.

0020-A에서는 다음 두 가지를 함께 구축한다.

1. **Quest Director 선택 콘텐츠 확장**
2. **길드 업무(Inbox) 공통 시스템 구축**

Inbox는 앞으로 길드장의 모든 의사결정이 모이는 중앙 업무 허브가 된다.

이번 작업의 핵심 목표는 다음과 같다.

- Quest Director 선택 이벤트 확장
- 선택 결과가 기간·위험·보상·부상·성공률·Adventure Log에 영향을 주는 구조 마련
- 귀환 보고, 가입 신청, Quest Director 선택 이벤트를 공통 Inbox로 통합
- 대시보드에서 미처리 업무를 한눈에 확인
- 업무 선택 시 관련 화면으로 즉시 이동
- 미처리 업무가 있으면 `오늘 업무 종료` 차단
- 향후 세계 이벤트, 왕실 요청, 시설 사건도 같은 Inbox 구조를 사용하도록 확장 기반 마련

---

# 설계 철학

## 1. Inbox는 길드장의 업무 책상이다

Inbox는 단순 알림 목록이 아니다.

플레이어가 길드장으로서 반드시 확인하고 결정해야 하는 업무를
한 곳에서 관리하는 **중앙 결재 시스템**이다.

Inbox에는 단순 정보 알림이 아니라
다음과 같은 실제 처리 대상만 등록한다.

- 승인 또는 반려가 필요한 업무
- 정산 또는 확인이 필요한 업무
- 선택지가 필요한 사건
- 다음 날 진행을 막아야 하는 미처리 업무

단순 정보성 로그와 Inbox 업무를 혼동하지 않는다.

---

## 2. 모든 시스템은 같은 Inbox를 사용한다

다음 시스템마다 별도의 업무 목록을 만들지 않는다.

- 귀환 보고 전용 업무 목록
- 가입 신청 전용 업무 목록
- Quest Director 전용 업무 목록

모든 길드장의 업무는 공통 `InboxItem` 구조를 사용한다.

---

## 3. Inbox는 시스템을 대체하지 않는다

Inbox는 각 기능의 원본 데이터를 복제하거나 대체하지 않는다.

예시

- 귀환 보고 원본: `ReturnReport`
- 가입 신청 원본: `RecruitmentApplicant`
- Quest Director 원본: `QuestProgress`, `QuestEvent`, `QuestDecision`

Inbox는 해당 원본으로 이동하기 위한 연결 정보와
업무 상태만 보존한다.

---

## 4. 처리 완료는 원본 시스템 상태에서 판단한다

Inbox 항목은 단순히 클릭했다고 완료되지 않는다.

예시

- 귀환 보고: 정산 완료 시 처리 완료
- 가입 신청: 승인·보류·반려·만료 등 현재 정책에 맞는 처리 후 완료
- Quest Director 선택: 실제 선택지가 확정되고 결과가 적용된 후 완료

업무 상태는 원본 시스템과 항상 일치해야 한다.

---

# 구현 범위

## 1. Guild Inbox 공통 데이터 구조

공통 Inbox Item 구조를 추가한다.

필요한 타입 예시

- `InboxItem`
- `InboxItemType`
- `InboxItemStatus`
- `InboxPriority`
- `InboxTarget`
- `InboxSourceType`
- `InboxPresentation`

정확한 이름은 기존 프로젝트 명명 규칙에 맞게 정한다.

---

## 2. Inbox Item 필수 정보

각 업무는 최소한 다음 정보를 가진다.

- 업무 ID
- 업무 종류
- 제목
- 요약
- 생성 날짜
- 우선순위
- 상태
- 원본 시스템 종류
- 원본 엔티티 ID
- 이동 대상
- 처리 필요 여부
- 긴급 여부
- 정렬 기준
- 선택적 연출 문구

예시

```ts
interface InboxItem {
  id: EntityId;
  type: InboxItemType;
  status: InboxItemStatus;
  priority: InboxPriority;
  title: string;
  summary: string;
  sourceType: InboxSourceType;
  sourceId: EntityId;
  target: InboxTarget;
  createdAt: GameDate;
  requiresAction: boolean;
  isUrgent: boolean;
  presentationKey?: string;
}
```

위 코드는 예시이며 기존 타입 구조를 우선한다.

---

## 3. Inbox Item Type

초기 구현 대상

- `return_report`
- `recruitment_application`
- `quest_decision`

향후 확장 예정

- `world_event`
- `royal_request`
- `facility_event`
- `guild_operation`
- `urgent_quest`
- `reputation_event`

향후 타입은 구조만 고려하고 실제 기능은 구현하지 않는다.

---

## 4. Inbox Status

기본 상태 예시

- `pending`
- `in_progress`
- `resolved`
- `expired`

이번 작업에서는 필요 이상으로 상태를 늘리지 않는다.

처리 완료된 업무를 영구 Inbox 목록에 계속 남길지,
최근 처리 이력으로 분리할지는 현재 UI 구조에 맞게 결정한다.

권장

- 활성 Inbox: 미처리 업무만 표시
- 최근 처리 내역: 필요 시 최근 일부만 별도 표시
- 원본 기록은 각 시스템과 연대기에 보존

---

## 5. Inbox Priority

업무 우선순위를 지원한다.

예시

- `normal`
- `important`
- `urgent`
- `critical`

권장 기준

### normal

- 일반 가입 신청
- 일반 귀환 보고

### important

- 정산 대기
- 특별 관계 가입 신청

### urgent

- 진행 중 의뢰의 선택 필요 사건
- 철수 또는 지원 판단

### critical

- 즉시 판단하지 않으면 의뢰 진행이 불가능한 사건
- Quest Director critical 업무

우선순위는 UI 정렬과 강조에 사용한다.

---

## 6. Inbox Target

업무 선택 시 관련 화면으로 이동할 수 있어야 한다.

예시 대상

- 귀환 보고 모달
- 가입 심사 탭 + 특정 지원자 상세
- 진행 중 의뢰 탭 + 특정 의뢰 상세 + 선택 이벤트
- 향후 세계 이벤트 상세
- 향후 시설 이벤트 상세

단순 페이지 이동만 하지 말고,
가능하면 해당 엔티티가 바로 선택된 상태로 열리도록 한다.

---

## 7. Inbox 저장 방식

GameState에 Inbox 업무를 저장하거나
원본 상태에서 selector로 생성하는 방식 중
현재 프로젝트 구조에 적합한 방식을 선택한다.

권장 판단 기준

### 저장 방식이 적합한 경우

- 업무 생성 시점과 연출 문구를 보존해야 함
- 우선순위와 생성 순서가 중요함
- 원본이 삭제되기 전에 업무 이력을 보존해야 함

### selector 방식이 적합한 경우

- 원본 상태만으로 항상 정확히 재구성 가능
- 중복 상태 저장을 피할 수 있음

필요하면 혼합 구조를 사용할 수 있다.

예시

- 귀환 보고·가입 신청: selector 기반 Inbox projection
- Quest Director 선택: 실제 업무 레코드 저장

중요한 것은 원본과 Inbox의 상태 불일치가 발생하지 않는 것이다.

---

## 8. Inbox 생성 공통 함수

Inbox 항목 생성은 공통 함수 또는 공통 factory를 사용한다.

예시

- `createInboxItem`
- `registerInboxItem`
- `upsertInboxItem`
- `resolveInboxItem`
- `getPendingInboxItems`

정확한 이름은 현재 코드 구조에 맞춘다.

---

## 9. Inbox 중복 방지

같은 원본 업무가 여러 번 등록되지 않도록 한다.

중복 키 예시

```text
type + sourceType + sourceId
```

또는

```text
inboxType + targetEntityId + actionKey
```

다음 상황을 검증한다.

- 같은 귀환 보고 중복 등록
- 같은 지원자 중복 등록
- 같은 Quest Event 선택 업무 중복 등록
- `processDayEnd` 재호출
- React 개발 모드 중복 실행
- 업무 등록 함수 재호출

---

## 10. Inbox 자동 정리

원본 업무가 처리되면 Inbox 상태도 자동 갱신해야 한다.

예시

### 귀환 보고

- 정산 완료
- Inbox 업무 resolved 또는 제거

### 가입 신청

- 승인
- 반려
- 만료
- 정책상 보류를 미처리로 볼 경우 pending 유지
- 정책상 보류를 임시 처리로 볼 경우 상태 규칙 명확화

### Quest Director 선택

- 선택 결과 적용
- Inbox 업무 resolved

원본이 이미 삭제됐는데 Inbox만 남는 고아 참조를 허용하지 않는다.

---

# 기존 시스템 연동

## 11. 귀환 보고 연동

0019-A의 귀환 보고를 Inbox에 등록한다.

등록 시점

- 의뢰 완료 후 Return Report 생성 시

업무 정보 예시

- 제목: `귀환 보고가 도착했습니다`
- 요약: 의뢰명, 수행 파티, 결과 등급
- 우선순위: important
- 이동 대상: 해당 Return Report

처리 완료 조건

- `finalizeSettlement` 완료

Inbox 클릭 시 해당 귀환 보고 모달을 즉시 연다.

---

## 12. 가입 신청 연동

현재 가입 신청 시스템의 모든 미처리 지원자를 Inbox에 등록한다.

등록 시점

- 신규 지원자 생성 시

업무 정보 예시

- 제목: `새로운 가입 신청`
- 요약: 지원자 이름, 직업, 가입 이벤트 제목
- 우선순위: normal 또는 이벤트에 따라 important
- 이동 대상: 가입 심사 탭 + 해당 지원자

처리 완료 조건은 현재 가입 심사 정책과 일치시킨다.

- 승인: 완료
- 반려: 완료
- 만료: 완료
- 보류: 기존 정책을 검토하여 완료 또는 미처리 유지 결정

보류 때문에 매일 업무 종료가 영구 차단되지 않도록
정책을 명확히 정의한다.

권장

- 보류는 해당 날짜의 판단을 완료한 것으로 처리
- 보류 기간 종료 후 pending 복귀 시 새 업무 또는 기존 업무 재활성화

---

## 13. Quest Director 선택 업무 연동

Quest Director에서 길드장의 판단이 필요한 사건이 발생하면
자동으로 Inbox에 등록한다.

대상

- `needsDecision: true`
- 미결정 Quest Event
- critical urgency로 생성된 선택 사건

업무 정보 예시

- 제목: `긴급 현장 보고`
- 요약: 의뢰명, 사건명, 현재 위험
- 우선순위: urgent 또는 critical
- 이동 대상: 진행 중 의뢰 상세 + 해당 이벤트

처리 완료 조건

- 플레이어가 선택지를 확정
- 결과가 실제 QuestProgress에 적용
- Adventure Log 생성 완료

---

# Quest Director 콘텐츠 확장

## 14. 이벤트 콘텐츠 확장

기존 Quest Director와 Event Engine을 기반으로
길드장의 선택이 필요한 사건을 확장한다.

초기 추가 후보

- 길이 막힘
- 산사태
- 폭우
- 폭설
- 안개
- 식량 부족
- 부상자 발생
- 흔적 발견
- 몬스터 습격
- 야영지 선택
- 보급 요청
- 우회로 발견
- 철수 제안
- 지원 요청
- 장비 파손
- 현지 안내인 제안
- 다리 붕괴
- 목표 조기 발견
- 전투 장기화
- 추가 탐사 제안

실제 추가 수량은 기존 Event Pool과 중복 여부를 확인한 뒤 결정한다.

기존에 동일 이벤트가 있으면 중복 생성하지 않고
선택지와 효과를 보강한다.

---

## 15. 이벤트 정의 확장

선택 이벤트는 데이터 기반으로 다음 정보를 가질 수 있어야 한다.

- 이벤트 ID
- 제목
- 설명
- 카테고리
- 발생 조건
- 진행 단계
- 필요 태그
- 차단 태그
- 선택지 목록
- 후속 이벤트
- 우선순위
- Inbox 표시 정보

기존 `EventDefinition`을 확장할 수 있으면 재사용한다.

Quest Event와 World Event를 혼동하지 않는다.

---

## 16. 선택지 구조

각 선택 이벤트는 복수 선택지를 가진다.

필요한 타입 예시

- `QuestDecisionOption`
- `QuestDecisionEffect`
- `QuestDecisionOutcome`
- `QuestDecisionRiskPreview`

선택지 정보 예시

- 선택지 ID
- 표시 이름
- 설명
- 예상 효과
- 실제 효과
- 조건
- 위험도
- 후속 이벤트 ID
- Adventure Log narrative key

---

## 17. 선택 효과

선택 결과는 기존 시스템 범위 안에서 다음 요소에 영향을 줄 수 있다.

- 현재 예상 기간
- 남은 기간
- 위험도
- 성공 확률 modifier
- 부상 가능성
- 보상 modifier
- 지원 파티 요청
- 철수 상태
- Adventure Log
- 후속 이벤트

모든 효과를 한 이벤트에 과도하게 넣지 않는다.

---

## 18. 기간 영향

0019-H 동적 의뢰 기간 시스템을 재사용한다.

예시

### 길이 막힘

- 우회: +2일, 위험 감소
- 강행 돌파: 기간 유지, 위험 증가
- 현지 안내 요청: 비용 발생 가능, +0~1일

### 산사태

- 안전한 우회: +2~3일
- 위험 구간 돌파: +0~1일, 부상 위험 증가
- 철수: 귀환 일정 재계산

기간 변경은 기존 공통 duration adjustment 함수를 사용한다.

---

## 19. 위험도 영향

기존 위험도 구조가 있다면 modifier 방식으로 적용한다.

예시

- 안전한 우회: 위험 감소
- 강행 돌파: 위험 증가
- 야영: 위험 감소, 기간 증가
- 야간 이동: 기간 단축, 위험 증가

원본 의뢰 위험도를 영구 덮어쓰지 않는다.

---

## 20. 성공률 영향

기존 예상 성공률 계산 함수를 재사용한다.

선택 결과는 modifier 형태로 반영한다.

예시

- 정확한 정보 확보: 성공률 증가
- 식량 부족 방치: 성공률 감소
- 지원 요청: 성공률 증가
- 무리한 강행: 성공률 감소 가능

UI와 결과 계산에서 서로 다른 공식을 사용하지 않는다.

---

## 21. 부상 영향

기존 부상 시스템이 실제 의뢰 사건과 연결되어 있다면
선택 결과에서 부상 가능성을 적용할 수 있다.

새로운 복잡한 부상 판정 시스템은 만들지 않는다.

부상 효과가 아직 안전하게 연결되지 않는다면
구조만 준비하고 실제 적용은 일부 이벤트로 제한한다.

---

## 22. 보상 영향

선택 결과가 보상에 영향을 줄 수 있는 구조를 마련한다.

예시

- 추가 탐사: 기간 증가, 추가 전리품 가능
- 현지 지원 요청: 비용 발생, 일정 단축
- 목표 조기 발견: 조기 완료 가능
- 철수: 보상 감소 또는 없음

기존 정산 구조를 깨뜨리지 않는다.

---

## 23. 후속 이벤트

일부 선택은 후속 이벤트 후보를 설정할 수 있다.

예시

- 우회 선택 → 숨겨진 길 발견
- 야영 선택 → 야간 습격
- 추가 탐사 → 희귀 발견 또는 강적 조우
- 지원 요청 → 지원 파티 도착

기존 Event Chain 구조를 우선 재사용한다.

---

## 24. Adventure Log 연동

선택 이벤트 발생과 결정 결과를 Adventure Log에 기록한다.

기록 내용

- 사건 발생
- 길드장에게 보고된 내용
- 선택한 판단
- 실제 결과
- 기간·위험·보상 변화
- 후속 상황

임의의 사실을 만들지 않고 실제 적용 결과에서 문장을 생성한다.

---

## 25. Mandatory Flow 보호

새 이벤트와 선택지가 Quest Director의 Mandatory Flow를 깨뜨리지 않아야 한다.

규칙

- 필수 단계를 대체할 수 있는 이벤트는 명확히 정의
- 기간 단축으로 필수 단계 생략 금지
- 철수 선택 시 기존 철수 흐름 사용
- critical 강제 이벤트가 Inbox 등록 없이 자동 진행되지 않음
- 결정 대기 중에는 해당 의뢰의 진행을 무리하게 계속하지 않음

---

## 26. 결정 대기 중 의뢰 처리

길드장의 판단이 필요한 Quest Event가 미처리 상태일 때
해당 의뢰를 어떻게 진행할지 명확히 한다.

권장

- 해당 의뢰의 핵심 진행을 일시 정지
- 날짜 전체는 Inbox 미처리 때문에 종료 불가
- 선택 후 정상 진행 재개

미처리 선택 이벤트를 무시한 채
다음 날로 넘어가 결과가 자동 확정되는 것을 금지한다.

---

# 대시보드 및 UI

## 27. 길드 홀 Inbox 영역

기존 `결재 대기(MASTER'S DESK)` 영역을
공통 Inbox UI로 전환하거나 확장한다.

표시 내용

- 전체 미처리 업무 수
- 업무 종류
- 제목
- 간단한 요약
- 생성 날짜
- 우선순위
- 긴급 표시
- 이동 버튼

기존 길드 홀 레이아웃을 최대한 재사용한다.

---

## 28. Inbox 정렬

기본 정렬

1. critical
2. urgent
3. important
4. normal
5. 같은 우선순위에서는 오래된 업무 우선

또는 프로젝트 UX에 맞는 명확한 규칙을 적용한다.

정렬 로직을 UI에서 임의로 중복 작성하지 않는다.

---

## 29. Inbox 배지

대시보드 또는 사이드바에서
미처리 업무 수를 확인할 수 있어야 한다.

권장

- 길드 홀 메뉴 배지
- 결재 대기 섹션 숫자
- critical 업무 별도 강조

과도한 알림 효과는 구현하지 않는다.

---

## 30. Inbox 상세 이동

업무 클릭 시 해당 시스템으로 이동한다.

### 귀환 보고

- Return Report 모달 열기

### 가입 신청

- 길드 홀
- 가입 심사 탭
- 해당 지원자 선택

### Quest Director

- 의뢰 게시판
- 진행 중 의뢰 탭
- 해당 의뢰 선택
- 선택 이벤트 영역으로 이동

---

## 31. Inbox 전용 화면 여부

이번 작업에서는 별도 Inbox 전체 페이지를 새로 만들기보다
기존 길드 홀의 결재 대기 영역을 우선 확장한다.

업무가 많아져 별도 화면이 필요할 경우를 대비해
컴포넌트와 selector는 재사용 가능하게 구성한다.

---

## 32. 업무 발생 연출

새로운 업무가 발생할 때
상황에 맞는 짧은 연출 문구를 제공한다.

예시

- `의뢰 파티가 귀환했습니다.`
- `누군가 길드의 문을 두드립니다.`
- `긴급 현장 보고가 도착했습니다.`

연출은 간단한 토스트, 알림 패널 또는 보고서 문구 수준으로 구현한다.

컷신이나 복잡한 애니메이션은 만들지 않는다.

업무 생성 자체와 연출 표시를 분리한다.

---

# 오늘 업무 종료 제한

## 33. 차단 조건

미처리 Inbox 업무 중 `requiresAction: true` 항목이 하나라도 있으면
`오늘 업무 종료`를 허용하지 않는다.

안내 문구

> 아직 처리하지 않은 업무가 남아 있습니다.

---

## 34. 정보성 Inbox와 차단 업무 구분

향후 Inbox에 정보성 항목이 들어올 수 있으므로
모든 Inbox Item이 업무 종료를 막는 구조로 만들지 않는다.

예시 필드

```ts
requiresAction: boolean;
```

이번 작업의 초기 대상은 모두 실제 처리가 필요할 수 있지만
구조적으로 구분한다.

---

## 35. 보류 지원자 정책

가입 신청의 `held` 상태가
업무 종료를 영구 차단하지 않도록 한다.

권장 규칙

- 보류 선택을 완료한 날에는 처리 완료로 간주
- 보류 해제 후 pending으로 돌아오면 다시 Inbox 활성화

정확한 구현은 기존 보류 시스템과 일치시킨다.

---

## 36. 차단 UI

업무 종료 버튼 클릭 시

- 남은 업무 수 표시
- 가장 긴급한 업무 안내
- Inbox 영역으로 이동 또는 강조

버튼을 완전히 숨기지 않는다.

왜 진행할 수 없는지 플레이어가 이해할 수 있어야 한다.

---

## 37. 미처리 업무 selector

공통 selector를 제공한다.

예시

- `getPendingInboxItems`
- `getBlockingInboxItems`
- `getInboxCount`
- `getHighestPriorityInboxItem`
- `canEndDay`

정확한 이름은 기존 selector 구조에 맞춘다.

---

# 데이터 무결성

## 38. 원본과 Inbox 상태 일치

다음 상태를 허용하지 않는다.

- 정산 완료된 Return Report가 Inbox pending
- 반려된 지원자가 Inbox pending
- 이미 결정한 Quest Event가 Inbox pending
- 원본이 삭제됐는데 Inbox target만 남음
- Inbox resolved인데 원본은 미처리

필요 시 동기화 selector 또는 cleanup 함수를 제공한다.

---

## 39. Inbox 고아 참조 정리

원본 데이터가 삭제·만료·완료됐을 때
Inbox 항목을 자동으로 resolved 또는 제거한다.

일일 처리 또는 관련 action 완료 시 정리한다.

---

## 40. ID 규칙

Inbox ID는 결정적이거나 중복 방지가 쉬운 형식을 사용한다.

예시

```text
inbox-return-{returnReportId}
inbox-recruitment-{applicantId}
inbox-quest-decision-{questId}-{eventId}
```

기존 ID 생성 규칙을 우선한다.

---

# 파일 위치 원칙

현재 프로젝트 구조를 먼저 확인한다.

예시

- Inbox 타입: 공용 게임 타입
- Inbox selector 및 factory: `src/game/` 또는 `src/features/inbox/`
- Quest Director 확장: 기존 `questDirector.ts`, `eventEngine.ts`
- UI: `src/features/guildHall/` 또는 `src/features/inbox/`
- 내비게이션: 기존 App 및 feature 상태
- 레이블: 기존 labels 파일
- CSS: 기존 global 또는 feature 스타일

관련 없는 폴더 구조 개편은 하지 않는다.

---

# 문서 작업

구현 전에 관련 문서를 먼저 확인한다.

필수 검토

- `docs/00_PROJECT/PROJECT_OVERVIEW.md`
- `docs/00_PROJECT/PROJECT_RULES.md`
- `docs/00_PROJECT/PROJECT_STATUS.md`
- `docs/00_PROJECT/PROJECT_TERMINOLOGY.md`
- `docs/00_PROJECT/PROJECT_WORKFLOW.md`
- `docs/00_PROJECT/ROADMAP.md`
- Quest Director 관련 SYSTEM / DESIGN 문서
- Quest Validation 관련 DESIGN 문서
- Event Engine 관련 DESIGN 문서
- Adventure Log 관련 DESIGN 문서
- 귀환 보고 관련 SYSTEM 문서
- 가입 신청 관련 SYSTEM 문서

필요 시 신규 작성

- `docs/01_SYSTEM/GUILD_INBOX_SYSTEM_GUIDE.md`
- `docs/02_DATABASE/INBOX_DATABASE.md`

동일 목적의 문서가 있다면 새로 만들지 않고 기존 문서를 업데이트한다.

---

# BRIEFING

관련 BRIEFING을 확인한다.

필요 시 다음 문서를 생성 또는 업데이트한다.

- `briefings/QUEST_DIRECTOR_BRIEFING.md`
- `briefings/GUILD_INBOX_SYSTEM_BRIEFING.md`

BRIEFING에는 다음 철학을 기록한다.

- Inbox는 길드장의 중앙 업무 책상
- 시스템별 별도 결재 목록을 만들지 않음
- 모든 의사결정 업무는 공통 Inbox 사용
- Quest Director는 단순 기간 조정기가 아니라 선택 기반 의뢰 콘텐츠
- 선택은 기간·위험·보상·부상·성공률·서사에 연결
- 향후 세계 이벤트·왕실 요청·시설 사건도 Inbox 사용

---

# 향후 예정으로 문서화할 내용

이번 작업에서 구현하지 않고
ROADMAP 또는 BRIEFING의 향후 항목으로 기록한다.

- 세계 이벤트 Inbox
- 왕실 요청
- 시설 이벤트
- 명성 활용 이벤트
- 경제 위기 업무
- 길드 직접 발주 의뢰
- 직원 업무 분담
- 자동 처리 정책
- 비서 또는 직원 위임
- 업무 우선순위 자동 추천
- 장기 후속 이벤트
- 연쇄 의사결정
- Inbox 검색 및 필터
- 처리 이력 전용 화면

미구현 기능을 완료 항목으로 기록하지 않는다.

---

# 이번 업데이트에서 구현하지 않는 내용

- 명성 활용 시스템
- 가입 신청 시스템 재리뉴얼
- 세계 이벤트 확장
- 경제 확장
- 길드 직접 발주 의뢰
- 왕실 요청 실제 구현
- 시설 이벤트 실제 구현
- 직원 자동 처리
- Inbox 업무 위임
- Inbox 전용 대형 페이지
- 복잡한 알림 애니메이션
- 컷신
- 모든 Quest Event의 전면 재작성
- 새로운 전투 시스템
- 신규 부상 시스템
- 신규 보상 시스템

---

# 구현 원칙

- 기존 Quest Director를 최대한 재사용한다.
- 기존 Event Engine과 Mandatory Flow를 유지한다.
- 기존 귀환 보고와 가입 신청 기능을 유지한다.
- 모든 길드장 업무는 공통 Inbox를 사용한다.
- Inbox는 원본 시스템을 복제하지 않는다.
- 관련 없는 기능은 수정하지 않는다.
- 구현 범위를 불필요하게 확장하지 않는다.
- 데이터 기반 확장 구조를 유지한다.
- 결정 결과는 실제 게임 상태에 반영한 뒤 기록한다.
- 미처리 의사결정을 자동으로 무시하지 않는다.
- 새로운 아이디어는 완료 보고에서 제안만 한다.

---

# 금지 사항

- 귀환 보고 전용 Inbox를 별도로 만들지 않는다.
- 가입 신청 전용 Inbox를 별도로 만들지 않는다.
- Quest Director 전용 Inbox를 별도로 만들지 않는다.
- 기존 원본 데이터를 Inbox 내부에 복제 저장하지 않는다.
- 업무 클릭만으로 완료 처리하지 않는다.
- 미처리 Quest Decision을 자동 선택하지 않는다.
- 미처리 업무가 있는데 다음 날 진행을 허용하지 않는다.
- 보류 지원자로 인해 영구적으로 다음 날 진행이 막히게 하지 않는다.
- 기존 Quest Director urgency와 Mandatory Flow를 무시하지 않는다.
- World Event와 Quest Event를 혼합하지 않는다.
- 관련 없는 대시보드 전체 개편을 하지 않는다.

---

# 검증 시나리오

## 시나리오 1 — 귀환 보고 등록

1. 의뢰 완료
2. Return Report 생성
3. Inbox에 귀환 보고 1건 등록
4. 대시보드에 표시
5. 클릭 시 해당 보고 열림
6. 정산 완료 후 Inbox 제거 또는 resolved

---

## 시나리오 2 — 가입 신청 등록

1. 신규 지원자 생성
2. Inbox에 지원자 업무 등록
3. 클릭 시 가입 심사 탭과 해당 지원자 열림
4. 승인 또는 반려 후 업무 완료

---

## 시나리오 3 — 보류 지원자

1. 지원자 보류
2. 같은 날 업무 종료 가능
3. 보류 기간 종료 후 pending 복귀
4. Inbox 업무 재활성화

---

## 시나리오 4 — Quest Director 선택 업무

1. 진행 중 의뢰에서 선택 이벤트 발생
2. Inbox에 urgent 업무 등록
3. 클릭 시 해당 의뢰와 이벤트 열림
4. 선택 결과 적용
5. Adventure Log 생성
6. Inbox 업무 완료

---

## 시나리오 5 — 업무 종료 차단

1. requiresAction 업무 존재
2. 오늘 업무 종료 클릭
3. 날짜 진행 안 됨
4. 안내 문구 표시
5. Inbox로 이동 또는 강조

---

## 시나리오 6 — 모든 업무 처리

1. 모든 차단 업무 처리
2. 오늘 업무 종료 가능
3. 기존 DayEnd 흐름 정상 작동

---

## 시나리오 7 — 중복 등록 방지

1. 같은 Return Report 등록 함수 재호출
2. Inbox 항목 1건 유지
3. 같은 지원자 및 Quest Event도 중복 없음

---

## 시나리오 8 — 고아 참조 정리

1. 원본 지원자 만료 또는 삭제
2. Inbox 항목 자동 정리
3. 클릭 시 오류 없음

---

## 시나리오 9 — 우선순위 정렬

1. normal, important, urgent, critical 업무 존재
2. critical이 가장 위
3. 같은 우선순위에서는 오래된 업무 우선

---

## 시나리오 10 — 기간 선택 효과

1. 산사태 이벤트 발생
2. 안전 우회 선택
3. 동적 의뢰 기간 증가
4. 위험도 감소
5. Adventure Log 기록
6. Inbox 완료

---

## 시나리오 11 — 지원 요청

1. 지원 요청 이벤트 발생
2. 지원 파견 선택
3. 기존 지원 파티 구조 연동
4. 중복 파견 없음
5. 후속 이벤트 정상 연결

---

## 시나리오 12 — Mandatory Flow

1. 필수 단계 미완료
2. critical 이벤트 생성
3. Inbox 등록
4. 선택 전 다음 날 진행 차단
5. 선택 후 Director 정상 재평가

---

## 시나리오 13 — 기존 시스템 회귀

다음 기능이 정상 작동해야 한다.

- 귀환 보고
- 정산
- 재정
- 창고
- 가입 신청
- 세계 이벤트
- 명성
- 시설 유지비
- 동적 의뢰 기간
- Quest Chronicle
- Adventure Log
- DayEnd Report

---

# 완료 조건

- [ ] Inbox 공통 타입 추가
- [ ] Inbox Type / Status / Priority 구조 추가
- [ ] Inbox Target 구조 추가
- [ ] Inbox 생성 공통 함수 구현
- [ ] Inbox 중복 방지 구현
- [ ] Inbox 완료 및 정리 처리 구현
- [ ] 귀환 보고 Inbox 연동
- [ ] 가입 신청 Inbox 연동
- [ ] Quest Director 선택 업무 Inbox 연동
- [ ] 대시보드 Inbox UI 구현
- [ ] 미처리 업무 수 배지 구현
- [ ] 업무 클릭 시 관련 화면 이동
- [ ] 업무 우선순위 정렬
- [ ] 업무 발생 간단 연출
- [ ] 미처리 업무 시 오늘 업무 종료 차단
- [ ] 보류 지원자 차단 정책 처리
- [ ] `canEndDay` 또는 동일 selector 구현
- [ ] Quest Director 이벤트 콘텐츠 확장
- [ ] 선택지 구조 확장
- [ ] 기간 영향 연동
- [ ] 위험도 영향 연동
- [ ] 성공률 modifier 연동
- [ ] 지원 요청 및 철수 기존 기능 연동
- [ ] Adventure Log 연동
- [ ] Event Chain 연동
- [ ] Mandatory Flow 보호
- [ ] 중복 이벤트·결정 처리 방지
- [ ] 기존 시스템 회귀 검증
- [ ] 관련 SYSTEM / DATABASE 문서 작성 또는 업데이트
- [ ] 관련 BRIEFING 생성 또는 업데이트
- [ ] 향후 Inbox 확장 계획 문서화
- [ ] PROJECT_STATUS.md 현행화
- [ ] PROJECT_TERMINOLOGY.md 현행화
- [ ] ROADMAP.md 현행화
- [ ] `npm run check` 통과
- [ ] `npm run build` 통과
- [ ] Git Commit 생성
- [ ] 작업지시서 Archive 이동 또는 0020 Archive 통합

---

# 작업 완료 처리

구현, 문서 업데이트, 검증 및 Git Commit이 모두 완료되면

`tasks/todo/0020-A_QUEST_DIRECTOR_INBOX_SYSTEM.md`

파일을 프로젝트 워크플로우에 따라 `tasks/archive/`로 이동한다.

동일한 0020 Archive 통합 문서가 이미 존재한다면
기존 Archive 규칙에 따라 해당 문서에 내용을 통합한다.

Archive 처리 후 `tasks/todo/`에 완료된 작업지시서를 남기지 않는다.

---

# Git Commit

```text
feat(0020-A): expand Quest Director and build Guild Inbox
```

정확한 메시지는 실제 작업 내용에 맞게 조정한다.

---

# 완료 보고 형식

1. 변경된 파일 목록
2. Inbox 데이터 구조
3. Inbox Item 타입 및 우선순위
4. Inbox 생성·완료·정리 방식
5. 귀환 보고 연동
6. 가입 신청 연동
7. Quest Director 선택 업무 연동
8. 추가한 Quest Director 이벤트
9. 추가한 선택지
10. 기간·위험·성공률·보상 영향
11. Adventure Log 및 Event Chain 연동
12. 대시보드 Inbox UI
13. 업무 클릭 내비게이션
14. 업무 종료 제한 구현
15. 중복 업무 방지 방식
16. 보류 지원자 처리 정책
17. 기존 시스템 회귀 검증
18. 문서 변경 사항
19. BRIEFING 생성 또는 변경 사항
20. 향후 예정 항목 반영 위치
21. `npm run check` 결과
22. `npm run build` 결과
23. Git Commit 메시지
24. Archive 이동 또는 통합 결과
