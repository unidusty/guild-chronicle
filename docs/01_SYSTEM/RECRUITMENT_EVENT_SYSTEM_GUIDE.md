# RECRUITMENT EVENT SYSTEM GUIDE

## 개요

가입 신청 이벤트(Recruitment Event)는 모든 지원자의 생성 진입점이다.

평범한 신입도 기본 이벤트를 통해 생성되며,
특별한 배경을 가진 지원자는 특별 이벤트를 통해 생성된다.

---

## 시스템 원칙

- **모든 지원자는 이벤트 풀에서 선택된 이벤트를 통해 생성된다.**
- 기본 이벤트(`isBasic: true`)는 UI에 배지·상세 섹션을 표시하지 않는다.
- 특별 이벤트는 지원자 목록과 상세 화면에서 시각적으로 구분된다.
- 이벤트 설명의 장점·단점은 텍스트 정보이며, 실제 능력치 보정이나 판정 효과로 연결되지 않는다.
- 이벤트 지원자도 기존 `pending → held / accepted / rejected / expired` 상태를 그대로 사용한다.
- 이벤트 종류가 아닌 이벤트 그룹(groupId)으로 인스턴스를 추적한다.

---

## 발생 구조

### 발생 흐름

`generateDailyApplicants` 내에서 처리된다.

1. 시설·수용량·일일 확률 기존 조건 판정
2. 이벤트 풀에서 가중 랜덤으로 이벤트 선택 (기본 이벤트 ~80%, 특별 이벤트 ~20%)
3. 선택된 이벤트 규칙에 맞는 지원자 생성 (1명 또는 2명)
4. 수용량 제한 내에서 지원자를 `recruitment.applicants`에 추가

### 이벤트 분류

| 분류 | isBasic | 가중치 합계 | UI 표시 |
|---|---|---|---|
| 기본 이벤트 (6종) | true | ~70 | 배지·섹션 미표시 |
| 특별 이벤트 (8종) | false (미설정) | ~14 | 배지·섹션 표시 |

### 주요 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `EXPIRY_DAYS` | 5 | 지원 유효 기간 (기존과 동일) |

---

## 데이터 구조

### RecruitmentEventDefinition

이벤트 종류를 정의하는 불변 데이터.

```ts
interface RecruitmentEventDefinition {
  id: EntityId;
  type: RecruitmentEventType;
  name: string;
  description: string;
  featureText: string;
  advantageText: string;
  disadvantageText: string;
  weight: number;
  applicantCount: number;
  isBasic?: boolean;    // true: 기본 이벤트, UI 미표시
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

### RecruitmentApplicant 추가 필드

```ts
recruitmentEvent?: RecruitmentEventContext;
```

특별 이벤트가 없는 일반 지원자는 `undefined`.

---

## 형제 함께 지원 (siblings) 특이사항

- `applicantCount = 2` — 지원자 2명 동시 생성
- 동일 종족, 동일 성씨 생성
- `groupId`로 연결, 각각 `relatedApplicantIds`에 상대방 ID 저장
- 지원자 상세 화면에서 형제 이름 표시
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

이벤트 지원자 카드에 `특별 지원 · [이벤트 이름]` 배지 표시.

### 지원자 상세

특별 지원 섹션 추가:
- 이벤트 이름
- 배경 설명
- 특징
- 장점 / 단점
- 관계 (형제 이벤트: 상대방 이름)

일반 지원자는 해당 섹션 미표시.

---

## 일일 보고서 연동

`recruitment_new_applicants` 항목 설명에 이벤트 배경 한 줄 추가.

예시: `"이름1, 이름2이(가) 가입을 신청했습니다. (형제 함께 지원)"`

---

## 연대기 연동

특별 지원자 승인 시 연대기 설명에 `originNote` 추가.

예시: `"전사 이름이(가) 서풍 길드에 가입했다. [형제 함께 지원]"`

---

## 미구현 사항

- 길드 명성에 따른 이벤트 등장 조건
- 지역·도시 상황에 따른 이벤트 변화
- 세계 이벤트 연계 특별 지원자
- 동시 승인 강제 조건
- 부분 승인 시 반응·후속 사건
- 지원자 간 실제 관계 수치
- 기존 모험가 지인 추천
- 이벤트 연계 전용 의뢰
- 개인 연대기·장기 스토리 분기
- 정체 공개·재등장 이벤트
