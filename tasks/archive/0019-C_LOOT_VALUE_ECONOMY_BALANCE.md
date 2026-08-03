# 작업번호

0019-C

# 작업명

전리품 가치 및 길드 경제 밸런스 시스템 구축

---

# 작업 목적

0019-C에서는 길드가 전리품 거래를 통해
적절한 이익을 얻을 수 있는 기초 경제 구조를 구축한다.

또한 게임 실행 시 Guild Chronicle다운 분위기를 제공하기 위해
기본 Title Screen과 Main Menu를 추가한다.

---

# 구현 범위

## 1. 전리품 기본 가치

모든 전리품은 Base Value를 가진다.

기존 전리품 데이터 구조를 확장하여
기본 가치를 관리할 수 있도록 한다.

---

## 2. 길드 매입가

길드는 Base Value보다 낮은 가격으로 전리품을 매입한다.

기본 매입 비율은 80%로 적용한다.

공통 계산 방식을 사용하여
중복 계산을 방지한다.

---

## 3. 창고 판매가

길드 창고 판매가는 Base Value를 기준으로 계산한다.

길드가 전리품 거래를 통해
수익을 얻을 수 있도록 한다.

---

## 4. 기존 시스템 연동

다음 시스템과 자연스럽게 연동한다.

- 귀환 보고
- 의뢰 정산
- 길드 재정
- 재정 거래
- 창고

기존 시스템을 최대한 재사용한다.

---

## 5. Title Screen

게임 실행 시 기본 Title Screen을 추가한다.

구성

- Guild Chronicle 로고
- 타이틀 배경
- Title BGM
- New Game
- Continue (비활성)
- Settings
- Exit

게임 흐름

Title Screen

↓

New Game

↓

Guild Hall

현재는 최소 기능만 구현한다.

---

# 이번 업데이트에서 구현하지 않는 내용

## 경제

- 제작
- 공방
- 시장 시세
- 가격 변동
- 상인
- 상인 네트워크
- 경매장

## Title Screen

- Continue 저장 기능
- 새 게임 설정
- 캐릭터 생성
- 난이도 선택
- 시작 지역 선택
- 시네마틱

---

# 문서 작업

구현 전에 관련 SYSTEM / DATABASE / DESIGN 문서를 먼저 확인하고
필요한 문서를 작성하거나 업데이트한다.

예)

- GUILD_FINANCE_SYSTEM.md
- LOOT_DATABASE.md

필요 시

- ECONOMY_SYSTEM_BRIEFING.md

를 생성하거나 업데이트한다.

또한 변경되는 모든 공식 문서를 함께 업데이트한다.

예)

- PROJECT_STATUS.md
- PROJECT_TERMINOLOGY.md
- ROADMAP.md
- 관련 SYSTEM / DATABASE / DESIGN 문서

문서와 실제 구현 내용이 항상 일치하도록 유지한다.

---

# 구현 원칙

- 기존 시스템을 최대한 재사용한다.
- 관련 없는 기능은 수정하지 않는다.
- 구현 범위를 불필요하게 확장하지 않는다.
- 기존 게임 로직에 영향을 최소화한다.
- 새로운 시스템을 만들기보다 기존 구조와 연결한다.
- 작업지시서에 명시되지 않은 추가 기능은 구현하지 않는다.

---

# 작업 완료 처리

구현, 문서 업데이트, 검증 및 Git Commit이 모두 완료되면

`tasks/todo/0019-C_LOOT_VALUE_ECONOMY_BALANCE.md`

파일을 프로젝트 워크플로우에 따라
`tasks/archive/`로 이동한다.

동일한 0019 Archive 통합 문서가 이미 존재한다면
기존 Archive 규칙에 따라 해당 문서에 내용을 통합한다.

Archive 통합 후에는
`tasks/todo/`에 완료된 작업지시서를 남기지 않는다.

---

# 완료 조건

- [ ] 전리품 Base Value 적용
- [ ] 길드 매입 비율 80% 적용
- [ ] 길드 매입가와 창고 판매가 분리
- [ ] 귀환 보고 및 정산 시스템 연동
- [ ] Finance Transaction 연동
- [ ] 창고 판매 계산 연동
- [ ] 기본 Title Screen 구현
- [ ] New Game에서 Guild Hall 진입
- [ ] Continue 비활성 처리
- [ ] 기존 Settings 기능 재사용 또는 안전한 최소 연결
- [ ] Exit 브라우저 환경 안전 처리
- [ ] 관련 공식 문서 업데이트
- [ ] 필요 시 ECONOMY_SYSTEM_BRIEFING.md 생성 또는 업데이트
- [ ] npm run check 통과
- [ ] npm run build 통과
- [ ] Git Commit 생성
- [ ] 작업지시서 Archive 이동 또는 0019 Archive 문서 통합

---

# Git Commit

```text
feat(0019-C): 전리품 가치 경제와 타이틀 화면 추가
```

정확한 커밋 메시지는 실제 작업 내용에 맞게 조정한다.

---

# 완료 보고 형식

1. 변경된 파일 목록
2. 주요 구현 내용
3. 변경된 데이터 구조
4. Base Value 및 매입가 계산 방식
5. 창고 판매가 계산 방식
6. Finance 시스템 연동 내용
7. 귀환 보고 연동 내용
8. 추가된 Title Screen 구성
9. New Game / Continue / Settings / Exit 동작
10. 사용한 이미지 및 오디오 에셋 경로
11. 문서 변경 사항
12. BRIEFING 생성 또는 변경 사항
13. npm run check 결과
14. npm run build 결과
15. Git Commit 메시지
16. Archive 이동 또는 통합 결과
