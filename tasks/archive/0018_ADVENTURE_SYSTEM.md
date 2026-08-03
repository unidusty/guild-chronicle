# 0018 — Adventure System

**기간**: 0018-A ~ 0018-P  
**상태**: done

이 파일은 0018 계열 모든 업데이트의 작업 아카이브다.

---

## 0018-P — Project Documentation Refactor & Workflow System

**목적**: 문서 구조 전면 재편 및 워크플로우 체계 확립.

**변경 내용**:
- `docs/` 5폴더 구조 (00_PROJECT / 01_SYSTEM / 02_DATABASE / 03_DESIGN / 99_BRAINSTORM)
- `tasks/` 폴더 (todo / doing / archive)
- 작업 번호 4자리 체계 (018 → 0018)
- 신규 문서: PROJECT_OVERVIEW.md, PROJECT_WORKFLOW.md, CHANGELOG.md
- 신규 문서: tasks/README.md, tasks/TASK_TEMPLATE.md
- 신규 문서: tasks/archive/0018_ADVENTURE_SYSTEM.md
- 이동: PROJECT_RULES.md, PROJECT_TERMINOLOGY.md → docs/00_PROJECT/
- 이동: 01_GAME_VISION.md → docs/00_PROJECT/GAME_VISION.md
- 이동: 02_GAME_SYSTEM.md → docs/01_SYSTEM/GAME_SYSTEM.md
- 이동: 03_GAME_RULES.md → docs/01_SYSTEM/GAME_RULES.md
- 이동: 04_ROADMAP.md → docs/00_PROJECT/ROADMAP.md
- 이동: 05_PROJECT_STATUS.md → docs/00_PROJECT/PROJECT_STATUS.md
- 이동: docs/design/* → docs/03_DESIGN/
- 내부 링크 전체 업데이트

---

## 0018-O — Project Documentation Finalization

**목적**: 018-F~018-N 이후 설계 문서 전면 현행화.

**변경 내용**:
- 신규: QUEST_TAG_GUIDE.md, QUEST_DIRECTOR_GUIDE.md, SCENE_GENERATOR_GUIDE.md
- 업데이트: EVENT_ENGINE_GUIDE.md, STORY_ENGINE_GUIDE.md, ADVENTURE_LOG_GUIDE.md, RARE_EVENT_GUIDE.md
- 업데이트: PROJECT_RULES.md, PROJECT_TERMINOLOGY.md, 02_GAME_SYSTEM.md, 04_ROADMAP.md, 05_PROJECT_STATUS.md

---

## 0018-N — Quest Director & Mandatory Flow

**목적**: 필수 단계 이벤트 강제 보장 시스템 구현.

**핵심 파일**:
- 신규: `src/game/simulation/questDirector.ts`
- 수정: `src/game/simulation/advance.ts`, `src/game/simulation/eventEngine.ts`
- 수정: `src/features/devTools/DevPanel.tsx`

**주요 변경**:
- DirectorState: none / low / high / critical urgency 4단계
- evaluateDirector(): critical 시 강제 이벤트 선택 (rollEventChance 무시)
- Event Memory 5→8개, Story Memory 10→15개
- DevPanel Quest Director 섹션

---

## 0018-M — Quest Validation & Story Consistency

**목적**: 의뢰 유형별 필수 단계 검증 및 서사 일관성 보장.

**핵심 파일**:
- 신규: `src/game/simulation/questValidation.ts`
- 수정: `src/game/simulation/questProgress.ts`, `src/game/simulation/adventureLog.ts`
- 수정: `src/game/simulation/eventEngine.ts`

**주요 변경**:
- MandatoryStep + MANDATORY_SEQUENCES (6개 의뢰 유형)
- calcQuestStage 진행률 기반 → 일수 기반 재구현
- 귀환 단계 environment/danger 이벤트만 허용
- FAILURE_CONTEXT_BY_TYPE — 유형별 실패 서사
- 전투 없는 대실패 서사 자동 수정 (hasCombat 체크)

---

## 0018-L — Adventure System Integration

**목적**: 지원 파티 현장 합류 전체 통합.

**주요 변경**:
- 지원 파티 도착 판정 (SUPPORT_TRAVEL_DAYS = 2)
- generateSupportArrivalLog — 6문단 합류 Scene
- generateDailyLog / generateIncidentLog 지원 파티원 등장
- QuestChronicleEntry.supportPartyIds 필드
- 의뢰 상세 UI "참여 파티" 섹션

---

## 0018-K — Dynamic Event Engine

**목적**: 태그 기반 데이터 주도 이벤트 선택 엔진.

**핵심 파일**:
- 신규: `src/game/simulation/eventEngine.ts`

**주요 변경**:
- QuestTag 타입 시스템 (30+ 태그, 7개 카테고리)
- EventDefinition: weight, rarity, requiredTags, blockedTags, boostedByTags, followUpIds
- EVENT_POOL 90개 (전투 20·탐사 15·환경 15·보상 10·인물 10·위험 10·희귀 10)
- deriveTags() — Quest 기존 필드에서 자동 파생
- Event Memory(최근 5개) + Event Chain(followUpIds 2배)

---

## 0018-J — Dynamic Story Engine

**목적**: 내러티브 반복 최소화.

**주요 변경**:
- hashSeed() 분리 + pickAvoidingRecent()
- buildRecentSegments() — 직전 10개 로그 중복 추출
- SEASON_CONTEXT — 계절별 분위기 (33% 삽입)
- ENEMY_BEHAVIOR — 8종 적별 패턴
- RARE_SCENES — 12개, 2% 확률

---

## 0018-I — Adventure Scene Generator

**목적**: 로그 기반 → 문단 단위 Scene 기반 서사 전환.

**주요 변경**:
- buildScene() 헬퍼
- 전투 Scene 5~8 문단 구조
- 지원 파티 Scene 5 문단
- 대성공 6 문단, 대실패 5 문단
- narrative.split("\n\n") → p 태그 렌더링

---

## 0018-H — Adventure Story Generator

**목적**: 직업·퀘스트 유형별 내러티브 템플릿.

**주요 변경**:
- Quest.enemyHint 필드 추가 (샘플 의뢰 12개 설정)
- 9개 직업별 전투·탐사·이동 액션 템플릿
- 퀘스트 카테고리별 출발·실행 내러티브
- regionName 파라미터 추가

---

## 0018-F~G — Adventure Log & Quest UI

**목적**: 모험 기록 시스템 기반 및 의뢰 UI 개편.

**0018-F**:
- AdventureLogEntry 타입 + GameState 연동
- 결정적 해시 기반 템플릿 선택
- 의뢰 상세 + 연대기 탭 표시

**0018-G**:
- 의뢰 상세 모달 전환 (우측 패널 → 중앙 오버레이)
- 오디오 경로 수정
- 설계 문서 현행화 (docs 9개 + 설계 가이드 4개)

---

## 0018-E — 의뢰 게시판 UI 개편

- 3탭 구조 (가능 의뢰 / 진행 중 의뢰 / 의뢰 연대기)
- 카드 그리드, 랭크 칩 필터, 정렬
- 전체 CSS 스타일링

---

## 0018-D — 의뢰 결과 및 보상

- QuestResultGrade (6단계)
- 성공률 계산, 골드 보상 배율
- QuestChronicleEntry, 의뢰 연대기 탭
- 전리품 드롭, 보상 결과 팝업

---

## 0018-C — 진행 중 의뢰 UI

- ActiveQuestsTab: 목록 + 우측 상세 패널
- 진행 단계·이벤트·결정 표시
- 지원 파견 파티 선택 UI

---

## 0018-B — 의뢰 진행 시스템

- QuestProgress 타입 (단계, 이벤트, 결정)
- 의뢰 진행 3단계: 이동 → 수행 → 귀환
- 현장 이벤트 생성 (확률적, 카테고리별)
- 플레이어 결정 (계속/철수/지원 파견)

---

## 0018-A — 의뢰 수락 및 파티 배정 기반

- 파티 선택 UI, 의뢰 배정 처리
- 랭크 적합성 검사, 도전 모드
- 권장 전투력 계산 (calcPartyCombatPower)
