# 0020-D — 세계 이벤트 시스템 확장

**버전**: 0020-D  
**상태**: todo

---

# 작업 목적

0019-D에서 구축한 세계 이벤트 기반을 확장하여,
플레이어가 항상 변화하는 세계 속에서 길드를 운영한다는 경험을 제공한다.

이번 업데이트는 **이벤트 수를 늘리는 것**이 아니라,
세계 이벤트가 의뢰·경제·명성·가입 신청·Inbox와 자연스럽게 연결되는
데이터 기반 월드 시스템을 구축하는 것이 목적이다.

---

# 설계 철학

- 세계는 플레이어와 관계없이 움직인다.
- 플레이어는 세계를 조종하는 존재가 아니라 변화에 대응하는 길드장이다.
- 세계 이벤트는 단순 알림이 아니라 게임 시스템에 실제 영향을 준다.
- 동일한 이벤트라도 지역에 따라 다른 결과를 만들 수 있어야 한다.
- 데이터만 추가하여 수백 개까지 확장 가능한 구조를 유지한다.

---

# 구현 범위

## 1. 세계 이벤트 풀 확장

정치, 경제, 재난, 사회, 군사, 질병 카테고리 이벤트를 데이터 기반으로 추가한다.

예시

- 왕위 계승
- 귀족 분쟁
- 풍년
- 흉년
- 광산 발견
- 교역 활성화
- 홍수
- 산사태
- 축제
- 영웅 추모식
- 몬스터 대이동
- 전쟁
- 전염병

---

## 2. 지역 이벤트

이벤트는 전 세계 또는 특정 국가·도시·지역·몬스터 군락 단위로 발생할 수 있어야 한다.

---

## 3. 이벤트 영향

이벤트는 다음 시스템과 연동 가능해야 한다.

- 의뢰
- 경제
- 전리품 가치
- 교역
- 몬스터
- 지역 위험도
- 명성
- NPC
- 가입 신청

이번 작업에서는 일부만 실제 적용해도 되며 구조를 우선한다.

---

## 4. 기간 시스템

이벤트는 시작 → 진행 → 종료 상태를 지원한다.

장기 이벤트

- 전쟁
- 축제
- 전염병
- 흉년

---

## 5. World News Board (강력 권장)

길드 홀에 세계 소식 게시판을 추가한다.

예시

- 북부 지방 흉년
- 동부 국경 전쟁
- ○○ 도시 축제
- 남부 광산 광맥 발견

최근 세계 뉴스를 시간순으로 표시한다.

---

## 6. 연출

발생 시

- 긴급 보고
- 도시 소식
- 왕실 발표
- 신문
- 전달문

등의 간단한 연출을 제공한다.

---

## 7. Inbox 연동

판단이 필요한 이벤트는 0020-A Inbox 등록.

예시

- 왕실 요청
- 긴급 토벌
- 도시 지원
- 구조 요청

---

## 8. 후속 이벤트

연쇄 이벤트를 지원한다.

예시

전쟁
→ 난민
→ 식량 부족
→ 도적 증가
→ 특별 의뢰

---

# 데이터 구조 예시

```ts
interface WorldEventDefinition {
  id: EntityId;
  category: WorldEventCategory;
  region?: RegionId;
  durationDays?: number;
  effects: WorldEventEffect[];
  followUps?: EntityId[];
}
```

기존 타입을 우선 재사용한다.

---

# 문서 작업

구현 전 확인

- PROJECT_RULES
- PROJECT_STATUS
- PROJECT_TERMINOLOGY
- ROADMAP
- WORLD_SYSTEM_GUIDE
- WORLD_EVENT_SYSTEM

필요 시

- WORLD_EVENT_DATABASE.md
- WORLD_EVENT_SYSTEM_GUIDE.md
- WORLD_NEWS_BOARD_GUIDE.md

생성 또는 업데이트.

BRIEFING이 없으면

`briefings/WORLD_EVENT_SYSTEM_BRIEFING.md`

를 생성하거나 갱신한다.

---

# 구현하지 않는 내용

- 국가 시스템
- 정치 시스템
- 외교 시스템
- 세력 시스템
- 세계지도 리뉴얼
- 지역 DB 전면 확장
- 몬스터 DB 전면 확장

---

# 구현 원칙

- 0019-D 재사용
- 데이터 기반 확장
- 실제 시스템 영향
- 단순 알림 지양
- 관련 없는 시스템 수정 금지

---

# 검증

1. 이벤트 발생
2. 지역 이벤트 발생
3. 기간 진행
4. 종료 처리
5. World News Board 기록
6. Inbox 등록
7. 후속 이벤트 생성
8. Adventure Log 기록
9. 기존 시스템 정상 동작

---

# 완료 조건

- 이벤트 데이터 확장
- 지역 이벤트 지원
- 영향 구조
- 기간 시스템
- World News Board
- Inbox 연동
- 후속 이벤트 구조
- 문서 업데이트
- npm run check
- npm run build
- Git Commit
- tasks/archive 이동 또는 0020 Archive 통합

---

# Git Commit

```text
feat(0020-D): expand world event system and add world news board
```

---

# 완료 보고

1. 변경 파일 목록
2. 추가 이벤트 목록
3. 지역 이벤트 구조
4. 이벤트 영향
5. World News Board
6. Inbox 연동
7. 후속 이벤트
8. 문서 변경
9. npm run check
10. npm run build
11. Git Commit
12. Archive 이동
