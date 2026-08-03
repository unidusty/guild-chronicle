# 0020-B — 길드 명성 활용 시스템 구축

**버전**: 0020-B
**상태**: todo

---

## 작업 목적

0019-F에서 구축한 길드 명성 시스템을 실제 게임 콘텐츠에서 활용한다.

명성은 단순한 수치가 아니라,
세상이 길드를 어떻게 바라보는지를 표현하는 핵심 시스템이다.

이번 작업에서는 명성을 이용해

- 이벤트 발생 조건
- 의뢰 등장 조건
- 세계 반응
- Inbox 업무
- 연대기 및 보고

등과 연결한다.

---

# 설계 철학

- 명성은 더 강한 모험가를 제공하는 시스템이 아니다.
- 명성은 지원자의 능력을 결정하지 않는다.
- 명성은 세상이 길드를 바라보는 시선과
  새로운 이야기의 범위를 넓히는 기준이다.

---

# 구현 범위

## 1. Reputation Condition

콘텐츠가 명성 조건을 사용할 수 있도록 공통 조건 구조를 추가한다.

예시

- 최소 명성
- 최대 명성
- 최소 명성 등급
- 특정 명성 단계

---

## 2. 의뢰 연동

명성에 따라 새로운 성격의 의뢰가 등장할 수 있도록 한다.

예시

- 귀족 의뢰
- 왕실 관련 의뢰
- 도시 공식 요청
- 대형 상단 의뢰
- 길드 협력 요청

기존 의뢰를 교체하지 않고
추가 가능한 구조로 구현한다.

---

## 3. 명성 이벤트

명성 단계 도달 시 발생 가능한 이벤트 구조를 구현한다.

예시

- 주민들이 길드를 알아보기 시작
- 도시 행사 초청
- 귀족 관심
- 왕실 관계자 접촉
- 다른 길드 협력 제안

---

## 4. 세계 반응

명성 등급에 따라
기본 반응 문구와 이벤트를 연결한다.

---

## 5. Inbox 연동

명성 관련 의사결정은
0020-A Inbox 시스템을 사용한다.

예시

- 귀족 요청
- 행사 초청
- 협력 제안
- 표창 수락

---

## 6. 기록 연동

다음 내용을 기록한다.

- 명성 변화
- 명성 등급 변화
- 명성 이벤트
- 길드장 선택

Adventure Log
Guild Chronicle
하루 종료 보고

와 연동한다.

---

## 7. 데이터 기반 구조

명성 이벤트는
데이터만 추가하여 확장 가능해야 한다.

UI에서 이벤트별 분기문을 계속 추가하지 않는다.

---

# 데이터 구조 예시

```ts
interface ReputationCondition {
  minReputation?: number;
  maxReputation?: number;
  requiredRank?: ReputationRank;
}

interface ReputationEventDefinition {
  id: EntityId;
  title: string;
  description: string;
  condition: ReputationCondition;
}
```

기존 타입을 우선 재사용한다.

---

# 문서 작업

구현 전 다음 문서를 확인한다.

- PROJECT_RULES
- PROJECT_STATUS
- PROJECT_TERMINOLOGY
- ROADMAP

관련 SYSTEM / DATABASE 문서를 업데이트한다.

필요 시

- GUILD_REPUTATION_SYSTEM_GUIDE.md
- REPUTATION_DATABASE.md

를 작성 또는 갱신한다.

관련 BRIEFING이 없으면

`briefings/REPUTATION_SYSTEM_BRIEFING.md`

를 생성한다.

---

# 구현하지 않는 내용

- 지원자 능력치 상승
- 지원자 증가
- 상점 할인
- 시설 보너스
- 외교 시스템
- 국가 정치
- 지역 평판
- 세력 평판

---

# 구현 원칙

- 기존 0019-F 재사용
- 새로운 명성 수치 생성 금지
- 명성은 콘텐츠 조건으로만 활용
- 관련 없는 시스템 수정 금지
- 데이터 기반 확장 유지

---

# 검증

1. 명성 상승
2. 명성 등급 변화
3. 이벤트 발생
4. Inbox 등록
5. 관련 의뢰 생성 조건 확인
6. Adventure Log 기록
7. 하루 종료 보고 기록
8. 기존 명성 시스템 정상 동작

---

# 완료 조건

- Reputation Condition 구현
- 명성 이벤트 구현
- 의뢰 조건 연동
- Inbox 연동
- 기록 연동
- 문서 업데이트
- npm run check
- npm run build
- Git Commit
- 완료 후 tasks/archive 이동 또는 0020 Archive 통합

---

# Git Commit

```text
feat(0020-B): integrate guild reputation into world content
```

---

# 완료 보고

1. 변경 파일 목록
2. 추가 타입
3. 명성 조건 구조
4. 명성 이벤트
5. 의뢰 연동
6. Inbox 연동
7. 기록 연동
8. 문서 변경
9. npm run check 결과
10. npm run build 결과
11. Git Commit
12. Archive 이동 결과
