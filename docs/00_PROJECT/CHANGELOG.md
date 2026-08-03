# CHANGELOG

Guild Chronicle 버전별 변경 이력. 상세 작업지시서는 `tasks/archive/`에 보관한다.

---

## 0018-P — Project Documentation Refactor & Workflow System

문서 구조 전면 재편 및 워크플로우 체계 확립.

- `docs/` 5폴더 구조 도입 (00_PROJECT / 01_SYSTEM / 02_DATABASE / 03_DESIGN / 99_BRAINSTORM)
- `tasks/` 폴더 도입 (todo / doing / archive)
- 작업 번호 4자리 체계 적용 (018 → 0018)
- `PROJECT_OVERVIEW.md`, `PROJECT_WORKFLOW.md`, `CHANGELOG.md` 신규 생성
- `tasks/TASK_TEMPLATE.md` 신규 생성
- `tasks/archive/0018_ADVENTURE_SYSTEM.md` — 0018 전체 작업 아카이브

---

## 0018-O — Project Documentation Finalization

018-F~018-N 이후 문서 전면 현행화.

- `QUEST_TAG_GUIDE.md`, `QUEST_DIRECTOR_GUIDE.md`, `SCENE_GENERATOR_GUIDE.md` 신규
- 기존 설계 문서 8개 현행화
- `PROJECT_RULES.md` 이벤트 엔진·Quest Director 규칙 추가
- `02_GAME_SYSTEM.md` Quest Validation 표, Quest Director 섹션 추가

---

## 0018-N — Quest Director & Mandatory Flow

필수 이벤트 강제 보장 시스템 구현.

- `questDirector.ts` — DirectorState, DirectorResult, evaluateDirector()
- urgency 4단계: none / low / high / critical
- critical 시 rollEventChance 무시하고 강제 이벤트 생성
- Event Memory 5→8개, Story Memory 10→15개 확장
- DevPanel Quest Director 섹션 추가

---

## 0018-M — Quest Validation & Story Consistency

의뢰 유형별 필수 단계 검증 및 서사 일관성.

- `questValidation.ts` — MandatoryStep, MANDATORY_SEQUENCES (6개 유형)
- `calcQuestStage` 일수 기반 재구현 (5일 이하 귀환 1일, 6일 이상 2일)
- 귀환 단계 환경·위험 이벤트만 허용
- `FAILURE_CONTEXT_BY_TYPE` — 의뢰 유형별 실패 서사
- 전투 없는 대실패 서사 자동 수정

---

## 0018-L — Adventure System Integration

지원 파티 현장 참전 통합.

- 지원 파티 도착 판정 (SUPPORT_TRAVEL_DAYS = 2)
- `generateSupportArrivalLog` — 6문단 합류 Scene
- 도착 후 날 모든 로그에 지원 파티원 등장
- `QuestChronicleEntry.supportPartyIds` 필드 추가

---

## 0018-K — Dynamic Event Engine

태그 기반 이벤트 선택 엔진.

- QuestTag 타입 시스템 (30+ 태그)
- EVENT_POOL 90개 이벤트
- deriveTags() — Quest 기존 필드에서 자동 파생
- selectEvent() — Event Memory + Event Chain + 태그 가중치
- 희귀 이벤트 10개 (rarity: "rare")

---

## 0018-J — Dynamic Story Engine

내러티브 반복 최소화 엔진.

- pickAvoidingRecent() — 최근 사용 문장 회피
- SEASON_CONTEXT — 계절 분위기 33% 확률 삽입
- ENEMY_BEHAVIOR — 8종 적별 전투 행동 패턴
- RARE_SCENES — 2% 확률 희귀 장면 12개

---

## 0018-I — Adventure Scene Generator

로그 기반에서 Scene 기반 서사로 전환.

- buildScene() 헬퍼 도입
- 전투 Scene 5~8 문단 (적 등장 → 협동 → 전황 반전)
- 지원 파티 Scene 5 문단
- 대성공 6 문단 영웅담, 대실패 5 문단 결말

---

## 0018-H — Adventure Story Generator

직업·퀘스트 유형별 내러티브 템플릿.

- Quest.enemyHint 필드 추가
- 9개 직업별 전투·탐사·이동 액션 템플릿
- 퀘스트 카테고리별 출발·이동·실행 내러티브

---

## 0018-F~G — Adventure Log & UI

모험 기록 시스템 및 의뢰 UI 개편.

- AdventureLogEntry 타입 + 결정적 해시 내러티브
- 의뢰 상세 모달 전환 (우측 패널 → 중앙 오버레이)

---

## 0018-A~E — 의뢰 시스템 기반

의뢰 수락, 진행, 결과, 게시판 UI 구현.

- 파티 배정, 랭크 적합성 검사, 도전 모드
- QuestProgress 4단계, 현장 이벤트, 플레이어 결정
- QuestResultGrade 6등급, 골드·전리품 보상
- 의뢰 게시판 3탭 구조

---

## 0016-A~D — 길드 홀 구조

사이드바, 일일 보고서, 가입 심사, 창고.

---

## 0013-A — 의뢰 게시판 UI 기반

의뢰 게시판, QuestType, 샘플 의뢰 12개.

---

## 0012-A~C — 파티 관리

파티 목록, 생성, 편성, 랭크, 유대.

---

## 0011~0011-E — 시간 진행

하루 진행, 계절, 연도, 부상 회복, 훈련.

---

## 0010~0010-A — 오디오 시스템

BGM, UI 효과음, 사운드 설정.

---

## 0007~0009 — 초상화·레이아웃·상세 UI

초상화 직접 경로, 모험가 상세 탭.

---

## 0005~0006 — 모험가 생성 및 관리

랜덤 생성, 목록, 상세 화면.

---

## 0003~0004 — 데이터 구조 및 에셋

GameState 설계, 에셋 매니페스트 자동 생성.

---

## 0002 — 기술 스택 및 실행 프로젝트

Vite + React 19 + TypeScript 5.8.

---

## 0001 — 프로젝트 기획 기반

비전, 시스템, 규칙, 개발 원칙, 폴더 구조.
