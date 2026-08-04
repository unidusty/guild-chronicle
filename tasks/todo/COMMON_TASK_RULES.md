# COMMON_TASK_RULES.md

> Guild Chronicle 공통 작업 규칙
> 이 문서는 archive로 이동하지 않는다.

## 작업 시작
- 반드시 이 문서와 작업지시서를 함께 읽고 작업한다.
- 작업지시서 범위를 벗어난 기능은 구현하지 않는다.

## 구현 원칙
- 기존 시스템 최대 재사용
- 관련 없는 시스템 수정 금지
- 불필요한 리팩토링 금지
- 새로운 아이디어는 구현하지 말고 완료 보고에 제안

## 프로젝트 문서 현행화 (필수)

구현 완료 후 반드시 수행한다.

- ROADMAP.md 업데이트
- PROJECT_STATUS.md 업데이트
- CHANGELOG.md 업데이트
- PROJECT_TERMINOLOGY.md 업데이트(필요 시)
- 관련 SYSTEM GUIDE 업데이트
- DATABASE 문서 업데이트
- DESIGN 문서 업데이트(필요 시)
- BRIEFING 문서 업데이트(없으면 생성)
- 완료된 ROADMAP는 완료 구간으로 이동
- 예정 구간에 동일 내용이 남아있다면 제거
- 미구현 내용은 FOLLOW_UPS 또는 ROADMAP으로 이동
- tasks/archive 이동

문서와 프로젝트 상태는 실제 구현과 항상 일치해야 한다.

## 검증
- npm run check
- npm run build

## Git
실제 작업 내용에 맞는 Commit 생성

## 완료 보고
1. 변경 파일
2. 추가 타입
3. 추가 함수
4. 추가 UI
5. 문서 변경
6. 검증 결과
7. Git Commit

## Archive
작업 완료 후 작업지시서는 tasks/archive로 이동한다.
이 문서는 이동하지 않는다.
