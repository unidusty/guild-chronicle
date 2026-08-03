# 0020-F — 길드 직접 발주 의뢰 시스템 구축

**버전**: 0020-F  
**상태**: todo

---

# 작업 목적

외부 의뢰인이 등록하는 의뢰와 별도로,
길드 내부 운영 문제를 해결하기 위한 **길드 직접 발주 의뢰**를 구축한다.

이번 작업의 목표는 골드 수익이 아니라

- 창고 자원 확보
- 시설 운영 지원
- 길드원 구조
- 정보 수집
- 지역 안전 확보

등 길드 운영을 위한 내부 의뢰 구조를 만드는 것이다.

---

# 설계 철학

- 길드 발주 의뢰는 돈벌이 의뢰가 아니다.
- 실제 길드의 필요가 생겼을 때만 생성된다.
- 자동 시작하지 않고 길드장이 승인한다.
- 외부 의뢰와 동일한 Quest 시스템을 재사용한다.
- 발주 주체만 다르다.

---

# 구현 범위

## 1. 발주 주체 구분

모든 의뢰는 `External` 또는 `Guild` 발주자를 가진다.

UI와 연대기에서 명확히 표시한다.

---

## 2. 길드 필요 감지

다음 상태를 감지하여 발주 후보를 생성한다.

- 창고 부족
- 시설 재료 부족
- 길드원 구조
- 중요 물품 회수
- 위협 제거
- 정보 수집
- 탐사
- 시설 건설 준비 자원

---

## 3. 발주 초안

필요가 발생하면 즉시 의뢰가 시작되지 않는다.

길드 발주 초안을 만들고 Inbox 등록.

흐름

필요 발생

↓

초안 생성

↓

Inbox

↓

승인

↓

파티 배정

↓

의뢰 시작

---

## 4. 승인

승인 전 확인

- 목적
- 기간
- 위험
- 비용
- 보수
- 기대 성과

---

## 5. 재정 연동

길드가 직접 비용 지급.

- 발주 비용
- 파티 보수
- 추가 지원 비용

FinanceTransaction 재사용.

길드 자금 부족 시 승인 불가.

---

## 6. 정산

외부 의뢰

- 의뢰인 지급
- 길드 10% 수수료

길드 발주

- 길드 직접 지급
- 수수료 없음

---

## 7. 성과

예시

- 창고 자원
- 시설 재료
- 정보
- 길드원 구조
- 위험 감소
- 후속 의뢰

---

## 8. 실패

실패 시

- 비용 손실
- 자원 미획득
- 운영 문제 지속
- 후속 구조 의뢰 가능

---

## 9. UI

배지

- 외부 의뢰
- 길드 발주

표시

- 발주 목적
- 발주 사유
- 길드 지출
- 기대 성과

---

## 10. Inbox

길드 내부 필요가 생기면 Inbox 등록.

예시

- 창고 부족
- 길드원 미귀환
- 시설 재료 부족
- 위협 증가

---

## 11. 기록

Adventure Log / Quest Chronicle / Guild Chronicle

기록

- 승인
- 거절
- 비용
- 결과
- 성과
- 실패

---

# 데이터 구조 예시

```ts
interface GuildQuestDraft{
 id:EntityId;
 reason:string;
 expectedReward:string;
 estimatedCost:number;
 sourceNeed:string;
}
```

기존 Quest 타입을 우선 재사용한다.

---

# 문서 작업

확인

- PROJECT_RULES
- PROJECT_STATUS
- PROJECT_TERMINOLOGY
- ROADMAP
- QUEST_SYSTEM
- GUILD_FINANCE_SYSTEM

필요 시

- GUILD_QUEST_SYSTEM_GUIDE.md
- GUILD_QUEST_DATABASE.md

작성 또는 업데이트.

BRIEFING 없으면

`briefings/GUILD_INTERNAL_QUEST_BRIEFING.md`

생성.

---

# 향후 예정

- 자유 제작 의뢰
- 0022 자동 의뢰 생성
- 외부 길드 위탁
- 반복 의뢰
- 시설 건설 연계
- 거리 계산
- 국가 발주
- 세력 발주

---

# 구현하지 않는 내용

- 자유 의뢰 편집
- 자동 생성 전체
- 거리 계산
- 시설 건설
- 재료 DB
- 보수 협상
- 외부 재하청

---

# 구현 원칙

- 기존 Quest 시스템 재사용
- 발주 주체만 구분
- 수수료 없음
- 상태 기반 템플릿 생성
- Finance 기록 필수
- 관련 없는 시스템 수정 금지

---

# 검증

1. 내부 필요 발생
2. 초안 생성
3. Inbox 등록
4. 승인
5. 파티 배정
6. 비용 지급
7. 수행
8. 정산
9. 기록 생성
10. 외부 의뢰 영향 없음

---

# 완료 조건

- 발주 주체 구조
- 길드 발주 초안
- Inbox 연동
- 승인 흐름
- Finance 연동
- UI 구분
- Chronicle 기록
- 문서 업데이트
- npm run check
- npm run build
- Git Commit
- tasks/archive 이동 또는 0020 Archive 통합

---

# Git Commit

```text
feat(0020-F): add guild issued quest system
```

---

# 완료 보고

1. 변경 파일
2. 발주 구조
3. 초안 생성
4. 승인 흐름
5. Finance 연동
6. Inbox 연동
7. UI 변경
8. Chronicle 기록
9. 문서 변경
10. npm run check
11. npm run build
12. Git Commit
13. Archive 이동
