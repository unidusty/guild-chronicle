# 05. PROJECT STATUS

## 현재 버전

**0019-I — 가입 신청 이벤트 시스템 전면 개선**

## 완료

- 프로젝트 기획 기반 (비전, 시스템, 규칙, 개발 원칙)
- Vite + React 19 + TypeScript 5.8 + 순수 CSS 실행 프로젝트
- PC 경영 시뮬레이션형 길드 대시보드 기본 레이아웃
- 공용 게임 엔티티 타입 정의 (모험가, 길드, 파티, 의뢰, 지역, 시설, 연대기, 결재)
- ID 참조 기반의 정규화된 `GameState` 구조
- 화면용 데이터를 계산하는 selector 분리
- 에셋 폴더 스캔 및 매니페스트 자동 생성 (`tools/generate-manifest.js`)
- 초상화 직접 경로 방식 (`portrait: string | null`)
- 랜덤 모험가 생성 (이름, 종족, 성별, 능력치, 성격, 출신, 특성)
- 모험가 목록 화면 (이름 검색, 직업·종족·상태 필터, 가나다 정렬)
- 모험가 상세 화면 (초상화, 기본정보, 능력치, 전투 능력, 전투 성향, 특성, 최근 활동)
- 길드 소속감 표시 (0~100 바)
- 현재 위치 자동 계산 (상태·의뢰·지역 기반)
- 전투 능력 별점 (채워진 별 / 빈 별 구분)
- BGM 재생 (첫 사용자 입력 후 자동 시작, 반복)
- UI 효과음 (hover, select, 의뢰서 펼침)
- 사운드 설정 화면 (BGM·효과음 볼륨 및 음소거 개별 조절, localStorage 저장)
- 하루 진행 버튼 (날짜 증가, 계절 전환, 연도 증가)
- 진행 중 의뢰 남은 일수 감소 및 진행률 증가
- 해 바뀜 시 모험가 나이 증가
- 부상 회복 일수 감소 및 완료 처리 (회복 완료 연대기 기록)
- 훈련 남은 일수 감소 및 완료 처리 (훈련 완료 연대기 기록)
- 기본 모험가 12명 (종족·성별·직업·성향 다양성 반영)
- 파티 목록 화면 (카드 형식, 상태·리더·파티원 초상화·의뢰 정보)
- 파티 상세 화면 (파티원 목록, 리더 표시, 진행 의뢰, 파티 정보)
- 파티 생성 / 해산 / 이름 변경 (인라인)
- 모험가 배치·제외·리더 지정
- 파견 중 파티 편성 잠금
- 파티 랭크 자동 계산 (파티원 평균 플로어)
- 파티 유대 단계 (신생 파티 → 오랜 전우)
- 사이드바 네비게이션 7개 메뉴
- 길드 홀 3탭 (대시보드 / 시설 / 가입 심사)
- 오늘 업무 종료 2단계 UI + 일일 운영 보고서
- 시설 건설·업그레이드 시스템 (건설 전·공사 중·운영 중)
- 가입 심사 시스템 (지원자 생성, 승인/보류/반려, 자동 만료)
- 길드 창고 (전리품 보관, 판매)
- 의뢰 게시판 3탭 구조 (가능 의뢰 / 진행 중 의뢰 / 의뢰 연대기)
- 가능 의뢰 카드 그리드 + 중앙 모달 상세 (ESC / 바깥 클릭 / X 버튼으로 닫기)
- 파티 배정: 랭크 적합성 검사, 도전 모드, 예상 성공률
- 의뢰 진행 3단계: 이동 → 수행 → 귀환
- 현장 이벤트 (카테고리별 확률 생성, 플레이어 결정 필요 여부)
- 플레이어 결정 (계속 / 추가 탐색 / 지원 파견 / 철수 / 포기)
- 예상 성공률 실시간 계산 (전투력, 랭크, 위험도, 이벤트 반영)
- 의뢰 결과 6등급 (대성공·성공·간신히 성공·철수·실패·대실패)
- 골드 보상 배율 + 전리품 드롭
- 의뢰 연대기 (`QuestChronicleEntry`) + 의뢰 연대기 탭
- 모험 기록 (`AdventureLog`) — 출발·일별·이벤트·결정·완료 내러티브
- 결정적 해시 기반 일관된 내러티브 생성
- 모험 기록 의뢰 상세 + 연대기 탭 양쪽 표시
- Adventure Scene Generator — 문단 단위 장면 서사 (018-I)
- 전투 5~8 문단 Scene (적 등장·협동·전황 반전·감정 표현)
- 대성공 6 문단 영웅담, 대실패 5 문단 무거운 결말
- 2~4명 모험가 동시 등장 + 협동 템플릿
- `Quest.enemyHint` + 9개 직업별 전투·탐사·이동 액션 템플릿
- Dynamic Story Engine — 반복 최소화 동적 서사 (018-J)
- `pickAvoidingRecent()` Story Memory — 최근 10개 로그 기반 중복 회피
- 계절 분위기 문장 33% 확률 삽입, 희귀 장면 2% 확률
- 적별 전투 행동 패턴 8종, 이동 34개·탐사 32개·전투 50개·귀환 20개 풀
- 직업별 액션 최대 8개 확장, 협동 패턴 12개
- Dynamic Event Engine — 데이터 기반 이벤트 선택 (018-K)
- `QuestTag` 타입 시스템 — 지형·적·위험·목표·계절·난이도·테마 (30+ 태그)
- `EventDefinition` 구조체 — weight, rarity, requiredTags, blockedTags, boostedByTags, followUpIds
- `EVENT_POOL` 90개 이벤트 (전투 20·탐사 15·환경 15·보상 10·인물 10·위험 10·희귀 10)
- `deriveTags()` — Quest 기존 필드에서 태그 자동 파생 (Quest 타입 변경 없음)
- `selectEvent()` — 태그 가중치·Event Memory·Event Chain 통합 선택
- Event Memory: `prog.events` 최근 5개 title 기반 중복 이벤트 억제
- Event Chain: `followUpIds`로 후속 이벤트 우선 선택 (가중치 2배)
- 희귀 이벤트 10개 (rarity: "rare") — 유성우·검은 기사·오로라·고대 정령 등
- 설계 문서: EVENT_ENGINE_GUIDE.md / STORY_ENGINE_GUIDE.md / RARE_EVENT_GUIDE.md
- Adventure System Integration — 지원 파티 현장 참전 (018-L)
- 지원 파티 도착 판정 (`SUPPORT_TRAVEL_DAYS = 2`) + 도착 당일 합류 Scene 생성
- `generateSupportArrivalLog` — 주 파티 고전 → 지원 파티 등장 → 합류 6문단 서사
- `generateDailyLog` / `generateIncidentLog` — 도착한 지원 파티원이 이후 로그에 등장
- `generateCompletionLog` — 지원 파티 기여 문단 추가 (supportUsed 시)
- `QuestChronicleEntry.supportPartyIds` — 참여한 파티 ID 배열로 연대기에 기록
- 의뢰 상세 UI "참여 파티" 섹션 — 주 파티 + 지원 파티 현황 (합류 완료 / 이동 중 배지)
- Quest Validation & Story Consistency (018-M)
- `questValidation.ts` — 의뢰 유형별 필수 단계 시퀀스, 긴급 가중치, 귀환 허용 카테고리
- `calcQuestStage` 일수 기반 재구현 — 5일 이하 귀환 1일, 6일 이상 귀환 2일
- `returning` 단계에서 `environment` / `danger` 이외 이벤트 완전 차단
- 탐사 전용 이벤트 4개 `allowedQuestTypes: ["exploration"]` 제한
- 의뢰 미충족 필수 단계 임박 시 관련 이벤트 가중치 1.5~3배 긴급 부스트
- `FAILURE_CONTEXT_BY_TYPE` — 의뢰 유형별 실패 서사 (hunt·search·rescue·exploration·escort·delivery)
- `generateCompletionLog` 대실패 — 전투 없을 시 "강적과의 전투 끝에" 서사 자동 제외
- Quest Director & Mandatory Flow (018-N)
- `questDirector.ts` — `DirectorState` / `DirectorResult` / `evaluateDirector()` 구현
- `getDirectorState()` — urgency 레벨 4단계: none / low / high / critical
- `evaluateDirector()` — critical 시 필수 단계 첫 항목에 맞는 이벤트 강제 생성 (rollEventChance 무시)
- `advance.ts` — Director → selectEvent fallback 흐름 통합, dev 모드 콘솔 로그
- Event Memory 5→8개 확장, Story Memory 10→15개 확장 (반복 억제 강화)
- DevPanel — "Quest Director" 섹션 추가 (긴급도·완료/미완료 필수 단계 표시)
- `docs/03_DESIGN/QUEST_VALIDATION_GUIDE.md` 신규 작성
- Project Documentation Finalization (0018-O)
- `docs/03_DESIGN/QUEST_TAG_GUIDE.md` 신규 — QuestTag 전체 목록, deriveTags 매핑, 이벤트·서사 영향
- `docs/03_DESIGN/QUEST_DIRECTOR_GUIDE.md` 신규 — Director 철학, MandatoryStep 표, 알고리즘 전체
- `docs/03_DESIGN/SCENE_GENERATOR_GUIDE.md` 신규 — Scene Generator 구조, 세그먼트 조립, 템플릿 목록
- 기존 설계 문서 8개 현행화 (EVENT_ENGINE_GUIDE·STORY_ENGINE_GUIDE·ADVENTURE_LOG_GUIDE·RARE_EVENT_GUIDE 등)
- `PROJECT_RULES.md` — 이벤트 엔진·Quest Director·모험 기록 규칙 추가
- `PROJECT_TERMINOLOGY.md` — 버전 018-N 반영, Event Memory 8개·Story Memory 15개 현행화
- `docs/01_SYSTEM/GAME_SYSTEM.md` — Quest Validation 표, Quest Director 섹션, Dynamic Story Engine 섹션 추가
- Project Documentation Refactor & Workflow System (0018-P)
- `docs/` 5폴더 구조 도입 (00_PROJECT / 01_SYSTEM / 02_DATABASE / 03_DESIGN / 99_BRAINSTORM)
- `tasks/` 폴더 도입 (todo / doing / archive), TASK_TEMPLATE.md 생성
- 작업 번호 4자리 체계 적용 (018 → 0018)
- 신규: PROJECT_OVERVIEW.md, PROJECT_WORKFLOW.md, CHANGELOG.md
- 신규: tasks/archive/0018_ADVENTURE_SYSTEM.md — 0018 전체 아카이브
- 이동: PROJECT_RULES.md, PROJECT_TERMINOLOGY.md → docs/00_PROJECT/
- 이동: docs/design/* → docs/03_DESIGN/
- 내부 링크 전체 업데이트
- 몬스터 시스템 문서 신규 생성
- `docs/01_SYSTEM/MONSTER_SYSTEM_GUIDE.md` — 몬스터 분류·위협도·의뢰 연동 규칙
- `docs/02_DATABASE/MONSTER_DATABASE.md` — 몬스터 24종 상세 데이터
- `docs/02_DATABASE/MONSTER_COLONY_GUIDE.md` — 군락 번식·이동·소탕·재유입 규칙
- 세계 시스템 문서 신규 생성
- `docs/01_SYSTEM/WORLD_SYSTEM_GUIDE.md` — 세계 구조·규칙·연동 시스템 설계
- `docs/02_DATABASE/REGION_DATABASE.md` — 지역 데이터 구조·10개 지역 상세
- `docs/02_DATABASE/FACTION_DATABASE.md` — 세력 데이터 구조·9개 세력 상세
- `briefings/WORLD_SYSTEM_BRIEFING.md` — 세계 시스템 문서 구성 개요 및 설계 철학
- 전투 시스템 문서 신규 생성
- `docs/01_SYSTEM/BATTLE_SYSTEM_GUIDE.md` — 전투 철학·전투력 계산·진형·성공률·지원 파티·향후 계획
- UI·디자인 문서 개편 (0018-Q 이후)
- `docs/03_DESIGN/VISUAL_STYLE_GUIDE.md` — 색상 팔레트·타이포그래피·컴포넌트 스타일·분위기 기준
- `docs/03_DESIGN/TITLE_SCREEN_GUIDE.md` — 타이틀 화면 구성·로고·메뉴·오디오 연동·향후 확장
- `docs/03_DESIGN/UI_REFERENCE.md` 개정 — 비주얼 스타일·타이틀 화면 문서 연결
- `docs/03_DESIGN/ASSET_NAMING_GUIDE.md` 개정 — 초상화 파일명 규칙 현행화 (`{종족}_{m|f}_{직업}_{순번}.webp`)
- `docs/03_DESIGN/PORTRAIT_ASSET_GUIDE.md` 개정 — 파일명·매니페스트 구조 현행화, 비주얼 스타일 연결

## 현재 데이터 원칙

- 화면 표시용 문자열을 원본 데이터에 중복 저장하지 않는다.
- 엔티티 간 연결은 이름이 아니라 안정적인 ID를 사용한다.
- 원본 게임 상태와 UI 가공 데이터를 분리한다.
- 사망, 은퇴, 이탈한 모험가는 `isArchived`와 연대기로 보존한다.
- 저장 데이터 버전을 관리한다.
- 초상화 경로와 개수를 코드에 하드코딩하지 않는다.
- 랜덤 생성 로직은 UI와 완전히 분리한다.
- 연대기에는 의미 있는 사건만 기록한다. 단순 날짜 변경은 기록하지 않는다.
- 모험 기록 내러티브는 실제 게임 상태에서 파생한다. 임의의 사실을 만들지 않는다.
- 오디오 파일은 `public/audio/`에 두고 코드에서 `/audio/파일명.mp3`로 참조한다.

## 미구현

- 모험가 경험치 및 스탯 성장 (의뢰 완료 시)
- 파티원 간 관계 수치
- 은닉 특성 발현
- 길드 자금 소비 (실패 패널티)
- 저장 및 불러오기
- 능력치 실전 판정 (행동별 능력치 연결)
- Battle Event 데이터 구조
- 실시간 전투 텍스트 중계
- 2D 자동 전투

- 귀환 보고 및 정산 시스템 (0019-A)
  - `ReturnReport` 타입 — 귀환 보고서 구조 (보수·수수료·전리품 포함)
  - `SettlementResult` 타입 — 정산 결과 (길드 매입 전리품·순수입)
  - `LootEntry` / `LootPurchaseResult` — 전리품 항목 타입
  - `PartyStatus.waiting_settlement` — 정산 대기 상태 추가
  - `GameState.returnReports: ReturnReport[]` — 정산 대기 보고서 목록
  - `src/game/simulation/returnReport.ts` — `createReturnReport` / `calcSettlement` / `finalizeSettlement`
  - `advance.ts` — 의뢰 완료 시 즉시 정산 → ReturnReport 생성 + 파티 `waiting_settlement`로 변경
  - `dayEnd.ts` — `returnReports` 기반 일일 보고서 항목 생성 (`quest_returned`)
  - `src/features/returnReport/ReturnReportModal.tsx` — 정산 모달 UI (보수 분배·전리품 체크박스·순수입 표시)
  - `GuildHallPage` MASTER'S DESK에 귀환 보고 버튼 표시, 정산 완료 시 상태 반영
  - CSS: `.rrm-*` 클래스 군 추가 (overlay·modal·header·body·section·settlement·loot·footer)
  - 설계 문서: `docs/01_SYSTEM/GUILD_FINANCE_SYSTEM.md`, `docs/01_SYSTEM/QUEST_SETTLEMENT_SYSTEM.md`, `docs/02_DATABASE/LOOT_DATABASE.md`

- 길드 재정 시스템 (0019-B)
  - `FinanceTransaction` 타입 — 골드 변동 원자 기록 (type·direction·amount·balanceBefore·balanceAfter·sourceType·sourceId)
  - `FinanceTransactionType` — quest_commission / warehouse_sale / loot_purchase / facility_construction / facility_upgrade
  - `FinanceTransactionDirection` — income / expense
  - `FinanceSummary` — 오늘 수입/지출/순익 + 누적 합계 + 최근 30건 (GameState 필드 없음, selector 계산)
  - `GameState.financeTransactions: FinanceTransaction[]` — 최신 우선 배열
  - `src/game/simulation/finance.ts` — `applyFinanceIncome` / `applyFinanceExpense` / `getFinanceSummary`
  - 중복 방지 — sourceType + sourceId + type 트리플 검사
  - `returnReport.ts` — 사전 검증 추가, `applyFinanceIncome`(quest_commission) + `applyFinanceExpense`(loot_purchase) 연동
  - `warehouse.ts` — `applyFinanceIncome`(warehouse_sale) 연동
  - `facilities.ts` — `applyFinanceExpense`(facility_construction / facility_upgrade) 연동
  - `labels.ts` — `financeTransactionTypeLabels` / `financeDirectionLabels` 추가
  - `src/features/finance/FinanceTab.tsx` — 요약 카드 4개 + 거래 내역 테이블
  - `GuildHallPage` — "재정" 탭 추가 (4번째 탭)
  - `ReturnReportModal` — canAfford 검사 + 골드 부족 시 정산 완료 버튼 비활성화
  - CSS: `--font-xsmall` `:root` 추가, `.finance-*` 클래스 군 추가
  - 설계 문서: `docs/01_SYSTEM/GUILD_FINANCE_SYSTEM.md`, `docs/02_DATABASE/FINANCE_DATABASE.md` 추가

- 전리품 가치 경제 밸런스 및 타이틀 화면 (0019-C)
  - `src/game/constants/economy.ts` (신규) — `GUILD_PURCHASE_RATE = 0.80` / `calcGuildPurchaseValue(baseValue)`
  - `LootEntry.purchaseUnitValue` 필드 추가 — `floor(baseValue × 0.80)` 스냅샷
  - `createReturnReport`: `purchaseUnitValue` 함께 스냅샷
  - `calcSettlement`: `LootPurchaseResult.unitValue` = `purchaseUnitValue` (80% 적용)
  - `ReturnReportModal`: 매입가 + 시장가 분리 표시 (`.rrm-loot-market` 취소선)
  - 창고 판매가: `baseValue` 유지 (변경 없음) — 매입 80% / 판매 100%로 20% 마진 확보
  - `src/features/title/TitleScreen.tsx` (신규) — 로고·부제·메뉴 4개 (새 게임/이어하기/설정/종료)
  - `App.tsx`: `screen: "title" | "game"` 상태 추가; 개발 모드에서는 즉시 game 진입
  - 이어하기: `disabled` (저장 기능 미구현), 설정: 기존 `SettingsModal` 재사용, 종료: `window.close()` 안전 처리
  - BGM: 기존 `guild-hall-bgm.mp3` 사용 (타이틀 전용 BGM 에셋 없음)
  - CSS: `.title-*` 클래스 군 추가, `.rrm-loot-market` 추가
  - 문서: `LOOT_DATABASE.md` (0019-C 반영), `TITLE_SCREEN_GUIDE.md` (구현 현행화)

- 랜덤 세계 이벤트 시스템 (0019-D)
  - `WorldEventType` / `WorldEventEffectTarget` / `WorldEventEffect` / `WorldEventDefinition` / `ActiveWorldEvent` 타입 추가
  - `DailyReportItemKind` — `world_event_started` / `world_event_ended` 추가
  - `GameState.activeWorldEvents: ActiveWorldEvent[]` 추가
  - `src/data/worldEventData.ts` — 8종 이벤트 정의 (왕국 축제·몬스터 증가·흉년·풍년·상인 방문·귀족 의뢰 증가·국경 분쟁·전염병)
  - `src/game/simulation/worldEvents.ts` — `tickWorldEvents` / `trySpawnWorldEvent` / modifier accessor 3종
  - `dayEnd.ts` — tick → spawn → 연대기 기록 → 보고서 항목 연동
  - `warehouse.ts` — `getWarehouseSaleModifier` 적용 (판매가 실시간 보정)
  - `worldEventTypeLabels` 추가 (`labels.ts`)
  - DevPanel — 활성 이벤트 목록 + 강제 발생 버튼 + 전체 해제 버튼
  - GuildHallPage 대시보드 — 활성 세계 이벤트 스트립 (이벤트명 + 잔여 일수 + 유형별 색상)
  - CSS: `.world-event-strip` / `.we-tag` / 이벤트 유형별 색상 / `day-end-report-item.world_event_*`
  - 문서: `WORLD_EVENT_SYSTEM_GUIDE.md` (신규), `WORLD_EVENT_DATABASE.md` (신규)

- 가입 신청 이벤트 시스템 (0019-E)
  - `RecruitmentEventType` / `RecruitmentEventDefinition` / `RecruitmentEventContext` 타입 추가
  - `RecruitmentApplicant.recruitmentEvent?: RecruitmentEventContext` 필드 추가
  - `src/data/recruitmentEventData.ts` (신규) — 10종 이벤트 정의 + `RECRUITMENT_EVENT_CHANCE = 0.20`
  - `recruitment.ts` — `generateEventApplicants` / `pickEventDefinition` 추가; `generateDailyApplicants`에 이벤트 발생 판정 통합
  - `acceptApplicant` — 이벤트 지원자 승인 시 연대기에 `originNote` 포함
  - `dayEnd.ts` — `recruitment_new_applicants` 설명에 이벤트 이름 부기
  - `labels.ts` — `recruitmentEventTypeLabels` 추가
  - `ApplicantList.tsx` — 특별 지원 배지 (이벤트 이름)
  - `ApplicantDetail.tsx` — 특별 지원 섹션 (이름·설명·특징·장단점·관계)
  - `RecruitmentTab.tsx` — `allApplicants` prop 전달
  - CSS: `.rec-event-badge` / `.rec-event-section` / `.rec-event-adv` / `.rec-event-dis` 등
  - 문서: `RECRUITMENT_EVENT_SYSTEM_GUIDE.md` (신규), `RECRUITMENT_EVENT_DATABASE.md` (신규), `RECRUITMENT_EVENT_SYSTEM_BRIEFING.md` (신규)
  - 버그 수정: `questDirector.ts` — critical 단계 이벤트 선택을 결정론적 reduce에서 가중 랜덤으로 교체 (매 게임 동일 이벤트 반복 방지)

- 길드 명성 시스템 (0019-F)
  - `ReputationChangeType` / `ReputationChange` 타입 추가
  - `DailyReportItemKind` — `reputation_changed` / `reputation_tier_changed` 추가
  - `Guild.reputationTier: number` 제거 → `getReputationTier(reputation)` 계산 함수로 대체
  - `GameState.reputationChanges: ReputationChange[]` 추가
  - `src/game/constants/reputation.ts` (신규) — `REPUTATION_TIERS` (7등급) / `getReputationTier` / `calcQuestReputation`
  - `src/game/simulation/reputation.ts` (신규) — `applyReputationChange` (중복 방지·연대기 생성·최소값 0 처리)
  - `returnReport.ts` — `finalizeSettlement`에서 `calcQuestReputation` + `applyReputationChange` 연동 (sourceId 기반 중복 방지)
  - `selectors.ts` — `getGuildMetrics` 명성 카드 현행화 (등급명 + 다음 등급까지 표시), `getReputationLog` selector 추가
  - `GuildHallPage` — "명성" 탭 추가 (5번째 탭): 현재 명성·등급·진행률·등급 기준표·변동 기록
  - CSS: `.rep-*` 클래스 군 추가
  - 문서: `GUILD_REPUTATION_SYSTEM_GUIDE.md` (신규), `GUILD_REPUTATION_SYSTEM_BRIEFING.md` (신규)

- 시설 유지비 및 길드 운영비 시스템 (0019-G)
  - `FinanceTransactionType` — `facility_maintenance` / `guild_operating_cost` 추가
  - `DailyReportItemKind` — `guild_operating_cost` / `operating_cost_unpaid` 추가
  - `FacilityMaintenanceEntry` / `DailyOperatingCostResult` 인터페이스 추가
  - `Guild.unpaidOperatingCost: number` 추가
  - `GameState.lastOperatingCostDay: number | null` 추가 (중복 차감 방지)
  - `facilityData.ts` — `FacilityDef.maintenanceCostByLevel: [number, number, number]` 추가 (시설 4종 레벨별 유지비)
  - `src/game/simulation/operatingCost.ts` (신규) — `BASE_DAILY_GUILD_OPERATING_COST = 30` / `calcDailyOperatingCost` / `applyDailyOperatingCost`
  - `dayEnd.ts` — step 3.5에 `applyDailyOperatingCost` 연동 (advanceDay 이전, 날짜 정합성 유지)
  - `labels.ts` — `facility_maintenance` / `guild_operating_cost` 레이블 추가
  - `selectors.ts` — 길드 자금 카드 note에 미납 경고 표시
  - `FacilitiesPage.tsx` — 시설 상세 패널에 일일 유지비 (현재 레벨 + 다음 레벨) 표시
  - `FinanceTab.tsx` — 오늘의 운영비 섹션 추가, 미납 누적 시 경고 배너 표시
  - CSS: `.finance-unpaid-*` / `.finance-opcost-*` / `.fac-maintenance-*` / `.day-end-report-item.guild_operating_cost` 등
  - 문서: `GUILD_OPERATING_COST_SYSTEM_GUIDE.md` (신규), `GUILD_OPERATION_COST_BRIEFING.md` (신규)

- 동적 의뢰 기간 시스템 (0019-H)
  - `QuestDurationChange` 타입 추가 — 기간 변경 감사 기록 (id·questId·date·deltaDays·reason·sourceType·sourceId·previousEstimatedDays·nextEstimatedDays·stage)
  - `QuestDurationChangeSourceType` — `"event" | "decision" | "support" | "withdrawal"`
  - `QuestProgress` 확장 — `initialEstimatedDays` (불변) / `currentEstimatedDays` (가변) / `durationChanges[]` 추가
  - `QuestEvent.definitionId` 필드 추가 — 기간 델타 조회를 위한 EventDefinition ID 참조
  - `QuestChronicleEntry` 확장 — `initialEstimatedDays` / `finalEstimatedDays` / `actualDurationDays` 추가
  - `ReturnReport` 확장 — `durationDays` (실제 수행 일수) / `initialEstimatedDays` / `totalDurationDelta` 추가
  - `DailyReportItemKind` — `quest_duration_changed` 추가
  - `src/game/simulation/questDuration.ts` (신규) — `DURATION_DELTA_BY_EVENT` 매핑(8종) / `tryApplyDurationChange` (중복 방지·상한·하한 검사)
  - `advance.ts` — 이벤트 생성 후 `getEventDurationDelta` 조회 → `tryApplyDurationChange` 연동
  - `questDecisions.ts` — 지원 파견 결정 시 `tryApplyDurationChange(sourceType: "support")` 연동
  - `questProgress.ts` — `createQuestProgress`에 신규 필드 초기화 추가
  - `eventEngine.ts` — `buildQuestEvent`에 `definitionId` 포함
  - `questChronicle.ts` — 연대기 기록에 실제 수행 기간·예상 기간 스냅샷 추가
  - `returnReport.ts` — `createReturnReport`에 `prog` 파라미터 추가, 실제 수행 기간 계산 (`currentDay + 1`)
  - `dayEnd.ts` — `durationChanges.length` 비교로 당일 기간 변경 감지 → 보고서 항목 추가
  - `ActiveQuestsTab.tsx` — 기간 변화 배지 (`.aq-duration-delta`) 표시
  - `QuestDetail.tsx` — 기간 정보 블록 (최초 예상 / 현재 예상 / 최근 변경 사유) 추가
  - `ReturnReportModal.tsx` — 실제 기간 + 최초 예상 대비 변화 표시
  - CSS: `.aq-duration-delta` / `.quest-duration-info` / `.qdi-*` / `.rrm-duration-delta` / `.day-end-report-item.quest_duration_changed`
  - 문서: `docs/01_SYSTEM/DYNAMIC_QUEST_DURATION_SYSTEM_GUIDE.md` (신규), `briefings/DYNAMIC_QUEST_DURATION_BRIEFING.md` (신규)

- 가입 신청 이벤트 시스템 전면 개선 (0019-I)
  - `RecruitmentEventType` — 5개 기본 타입 추가 (`basic_newcomer` / `new_start` / `first_guild` / `stable_membership` / `quiet_proof`)
  - `RecruitmentEventDefinition` 필드 정리 — `description` → `background`, `featureText` → `currentSituation`
  - `Adventurer.recruitmentEventId?: string` 추가 — 승인 시 이벤트 ID 보존
  - `src/data/recruitmentEventData.ts` — 기본 이벤트 5종 추가, 전체 15종 (가중치 합계 72)
  - `pickEventDefinition` 반환 타입 non-nullable로 변경, null 가드 제거
  - `generateDailyApplicants` — 100% 이벤트 기반 생성으로 전환 (20% 확률 제거, 단일 이벤트 풀)
  - `convertApplicantToAdventurer` — `recruitmentEventId` 보존
  - `originNotes` — 기본 이벤트 5종 한 줄 설명 추가
  - `labels.ts` — `recruitmentEventTypeLabels` 기본 이벤트 5종 추가
  - `ApplicantList.tsx` — 이벤트 이름 스팬 추가 (배지 없이 통일된 카드)
  - `ApplicantDetail.tsx` — 이벤트 제목·가입 배경·현재 상황 레이아웃 개선
  - CSS: `.rec-card-event` / `.rd-event-title` 추가
  - 문서: `RECRUITMENT_EVENT_SYSTEM_GUIDE.md` / `RECRUITMENT_EVENT_DATABASE.md` 전면 개정

## 다음 작업

**0020 이후 — 모험가 성장 (예정)**



## 주의사항

- 저장 기능은 아직 구현되지 않았다. 새로고침 시 게임 상태가 초기화된다.
- 초상화를 추가한 뒤에는 `npm run manifest`를 실행해야 반영된다.
