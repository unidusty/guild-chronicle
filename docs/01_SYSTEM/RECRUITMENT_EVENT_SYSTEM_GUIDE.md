# RECRUITMENT EVENT SYSTEM GUIDE

현재 구현 기준 (0019-I).

## 핵심 원칙

**Guild Chronicle에는 일반 지원자가 존재하지 않는다.**

모든 가입 신청은 고유한 배경과 사연을 가진 이벤트로 생성된다.

가입 신청 시스템은 단일 이벤트 풀 시스템이다.
일반 지원 / 특별 지원의 구분은 없다.
지원자 간의 차이는 배지나 등급이 아니라 사연·관계·배경 정보에서 드러난다.

---

## 개요

가입 신청 이벤트는 모든 지원자의 생성 진입점이다.

지원자가 생성될 때는 이벤트 풀에서 하나의 이벤트가 선택되며,
해당 이벤트의 배경과 조건에 따라 지원자가 구성된다.

사연 없이 생성되는 지원자는 존재하지 않는다.
이벤트 풀에는 기본 이벤트와 특별 이벤트가 함께 포함되어 있다.
기본 이벤트는 평범하지만 고유한 배경을 가진 지원자를 생성한다.

---

## 시스템 원칙

- **모든 지원자는 이벤트 풀에서 선택된 이벤트를 통해 생성된다.**
- 일반 지원 / 특별 지원 구분이 없다. 이벤트 종류에 따른 등급·배지가 없다.
- 이벤트 설명의 장점·단점은 텍스트 정보이며, 실제 능력치 보정이나 판정 효과로 연결되지 않는다.
- 이벤트 지원자도 기존 `pending → held / accepted / rejected / expired` 상태를 그대로 사용한다.
- 이벤트 종류가 아닌 이벤트 그룹(groupId)으로 인스턴스를 추적한다.
- 추천인(recommenderText), 함께 지원(relatedApplicantIds), 특별 사정(specialNote)은 해당 필드가 존재하는 이벤트에서만 표시된다.

---

## 발생 구조

### 발생 흐름

`generateDailyApplicants` 내에서 처리된다.

1. 시설·수용량·일일 확률 기존 조건 판정
2. 이벤트 풀에서 가중 랜덤으로 이벤트 선택 (항상 선택됨, null 없음)
3. 선택된 이벤트 규칙에 맞는 지원자 생성 (1명 또는 2명)
4. 수용량 제한 내에서 지원자를 `recruitment.applicants`에 추가

### 이벤트 풀 (15종)

#### 기본 이벤트 (총 가중치: 40, ~56%)

| id | name | weight | 비고 |
|---|---|---|---|
| `re-basic-newcomer` | 성실한 신입 | 10 | |
| `re-new-start` | 새로운 출발 | 8 | |
| `re-first-guild` | 첫 길드를 찾는 초보 | 8 | maxAge: 24 |
| `re-stable-life` | 안정적인 소속을 원하는 모험가 | 8 | minAge: 20 |
| `re-quiet-proof` | 조용히 실력을 증명하고 싶은 지원자 | 6 | |

#### 특별 이벤트 (총 가중치: 32, ~44%)

| id | name | weight | 비고 |
|---|---|---|---|
| `re-injury-comeback` | 부상 후 재기 | 8 | minAge: 22 |
| `re-debt-motivated` | 빚을 갚기 위한 지원 | 8 | |
| `re-siblings` | 형제 함께 지원 | 3 | 2인 동시 생성 |
| `re-fallen-noble` | 몰락한 귀족 | 2 | minAge: 20, human/elf |
| `re-rival-guild` | 라이벌 길드 출신 | 2 | minAge: 20 |
| `re-retired-knight` | 은퇴 기사 | 2 | minAge: 35, 근거리 직업 |
| `re-suspicious` | 수상한 지원자 | 2 | |
| `re-famous-apprentice` | 유명 모험가의 제자 | 2 | minAge: 18, 전투 직업 |
| `re-orphan` | 고아 출신 | 2 | maxAge: 28 |
| `re-royal-recommendation` | 왕실 추천장 | 1 | |

---

## 데이터 구조

### RecruitmentEventDefinition

이벤트 종류를 정의하는 불변 데이터.

```ts
interface RecruitmentEventDefinition {
  id: EntityId;
  type: RecruitmentEventType;
  name: string;
  background: string;       // 가입 배경 (UI에 표시)
  currentSituation: string; // 현재 상황 (UI에 표시)
  advantageText: string;
  disadvantageText: string;
  weight: number;
  applicantCount: number;
  recommenderText?: string;  // 있는 이벤트만 — UI에 추천인 표시
  specialNote?: string;      // 있는 이벤트만 — UI에 특별 사정 표시
  conditions?: {
    minAge?: number;
    maxAge?: number;
    allowedRaces?: Race[];
    allowedClasses?: string[];
  };
}
```

### RecruitmentEventContext

지원자에 저장되는 이벤트 인스턴스 참조.

```ts
interface RecruitmentEventContext {
  eventId: EntityId;              // 이벤트 정의 ID
  eventType: RecruitmentEventType;
  groupId: EntityId;              // 이번 발생 고유 ID
  relatedApplicantIds: EntityId[]; // 같은 그룹 지원자 (형제 이벤트 등)
  originNote: string;             // 연대기 기록용 한 줄 설명
}
```

### RecruitmentApplicant 이벤트 필드

```ts
recruitmentEvent?: RecruitmentEventContext;  // 신규 지원자는 항상 존재
```

### Adventurer 보존 필드

```ts
recruitmentEventId?: string;  // 입단 시 이벤트 ID 보존 (향후 연대기·관계 시스템 활용)
```

---

## 형제 함께 지원 (siblings) 특이사항

- `applicantCount = 2` — 지원자 2명 동시 생성
- 동일 종족, 동일 성씨 생성
- `groupId`로 연결, 각각 `relatedApplicantIds`에 상대방 ID 저장
- 지원자 상세 화면에서 함께 지원한 인물 표시
- 개별 승인·보류·반려 가능 (동시 승인 강제 없음)

---

## 이벤트 조건 필터

이벤트 발생 시 조건(`conditions`)을 충족하는 지원자를 생성한다.

| 조건 | 적용 방식 |
|---|---|
| `minAge` | 해당 종족 최소 나이와 비교하여 높은 쪽 적용 |
| `maxAge` | 해당 종족 최대 나이와 비교하여 낮은 쪽 적용 |
| `allowedRaces` | 해당 종족 중 가중 랜덤 선택 |
| `allowedClasses` | 허용 직업군 중 랜덤 선택 |

---

## UI 연동

### 지원자 목록

이벤트에 따른 배지나 등급 표시 없음.
모든 카드 동일 스타일. 이름·직업·종족·나이·이벤트 이름·상태·만료일 표시.

### 지원자 상세

모든 지원자가 동일한 레이아웃을 사용:

- **상단**: 초상화 + 이름·종족·성별·나이·직업·성격 + 이벤트 제목·가입 배경·현재 상황·지원 동기·첫인상
- **중단**: 장점 / 단점 (2열 비교), 추천인·함께 지원·특별 사정 (해당 필드 있는 경우만)
- **하단**: 능력치, 승인·보류·반려 버튼

---

## 일일 보고서 연동

`recruitment_new_applicants` 항목 설명에 이벤트 배경 한 줄 추가.

예시: `"이름이(가) 가입을 신청했습니다. (부상 후 재기를 꿈꾸는 경력자)"`

---

## 연대기 연동

지원자 승인 시 연대기 설명에 `originNote` 추가.

예시: `"전사 이름이(가) 서풍 길드에 가입했다. [몰락한 귀족 출신]"`

---

## 미구현 사항

- 길드 명성에 따른 이벤트 등장 조건
- 지역·도시 상황에 따른 이벤트 변화
- 세계 이벤트 연계 특별 지원자
- 동시 승인 강제 조건
- 부분 승인 시 반응·후속 사건
- 지원자 간 실제 관계 수치
- 기존 모험가 지인 추천 이벤트
- 이벤트 연계 전용 의뢰
- 전직 용병, 멸망한 길드의 생존자 등 추가 이벤트
- 개인 연대기·장기 스토리 분기
- 정체 공개·재등장 이벤트
- 접수대 방문 연출
- 시설 자동화 연동
