# PROJECT OVERVIEW

Guild Chronicle 프로젝트 개요. (0018-P)

---

## 프로젝트 소개

**Guild Chronicle**은 판타지 세계의 모험가 길드를 운영하는 PC 경영 시뮬레이션 게임이다.

플레이어는 영웅이 아니라 **길드 마스터**다. 모험가를 선발하고, 파티를 구성하고, 의뢰를 배정하며 길드를 성장시킨다. 전투는 자동으로 진행되며 결정의 결과가 게임 세계에 쌓인다.

---

## 핵심 철학

- 결정과 관리의 결과가 전투와 사건으로 나타난다.
- 모든 기록은 삭제되지 않는다. 성공도 실패도 역사가 된다.
- 시스템은 복잡하지 않되, 조합의 깊이를 제공한다.
- 목표는 **판타지 Football Manager**다.

---

## 현재 버전

**0018-P — Project Documentation Refactor & Workflow System**

---

## 현재 구현 시스템

| 시스템 | 설명 |
|--------|------|
| 모험가 생성 | 종족·성별·직업·성격 기반 랜덤 생성 |
| 파티 관리 | 편성, 랭크, 유대, 리더 지정 |
| 의뢰 시스템 | 수락, 진행 4단계, 결과 6등급, 연대기 |
| 이벤트 엔진 | 90개 이벤트, 태그 기반 선택, Event Memory |
| Quest Director | 필수 이벤트 강제 보장, urgency 4단계 |
| Adventure Log | 문단 단위 Scene 서사, Story Memory |
| Dynamic Story Engine | 계절·희귀 장면, 반복 억제 |
| 지원 파티 | 2일 이동 후 현장 합류, Scene 통합 |
| 길드 운영 | 시설, 창고, 가입 심사, 일일 보고서 |

---

## 다음 목표

**0019 — 길드 재정 및 세계 이벤트**

- 길드 운영 자금 및 시설 유지비
- 랜덤 세계 이벤트 (축제, 흉년, 전염병 등)
- 길드 명성 시스템

→ 상세: `docs/00_PROJECT/ROADMAP.md`

---

## 문서 구조

```
docs/
├── 00_PROJECT/    프로젝트 운영
├── 01_SYSTEM/     게임 시스템 설계
├── 02_DATABASE/   데이터 구조
├── 03_DESIGN/     구현 설계 가이드
└── 99_BRAINSTORM/ 아이디어 및 미확정 기획

tasks/
├── todo/          대기 중 작업
├── doing/         진행 중 작업
└── archive/       완료된 작업지시서
```

---

## 개발 방식

```
기획 (ChatGPT)
  ↓
Markdown Task 작성
  ↓
Claude Code 구현
  ↓
tasks/archive/ 보관
```

모든 개발은 **문서 먼저 → 구현 나중** 원칙으로 진행한다.

→ 상세: `docs/00_PROJECT/PROJECT_WORKFLOW.md`

---

## 기술 스택

- **Frontend**: React 19 + TypeScript 5.8 + Vite 7
- **CSS**: 순수 CSS (프레임워크 없음)
- **상태 관리**: 순수 함수 `(state: GameState) => GameState`
- **런타임**: 브라우저 전용, 서버 없음
