# Guild Chronicle — 공식 용어 사전

현재 구현 기준 (018-N) 작성.

---

## 메뉴 구조

### 사이드바 네비게이션

| 메뉴 | 페이지 | 상태 |
|------|--------|------|
| 길드 홀 | GuildHallPage | 구현 완료 |
| 모험가 | AdventurersPage | 구현 완료 |
| 파티 | PartiesPage | 구현 완료 |
| 의뢰 게시판 | QuestBoardPage | 구현 완료 |
| 길드 창고 | WarehousePage | 구현 완료 |
| 세계 지도 | — | 미구현 |
| 연대기 | — | 미구현 |

---

## 길드 홀

**컴포넌트:** `GuildHallPage`

세 개의 탭으로 구성된다.

### 대시보드 탭

- **지표 카드** (metric-card) — 보유 골드 / 모험가 수 / 명성 / 의뢰 성공률
- **오늘의 모험가 현황** (ACTIVE ROSTER) — 현재 활동 중(파견·부상·훈련)인 모험가 목록
- **결재 대기** (MASTER'S DESK) — 처리가 필요한 항목. 가입 심사 대기자가 1명 이상이면 상단에 자동 추가됨
- **진행 중인 의뢰** (LIVE OPERATIONS) — 파견된 파티와 의뢰 진행률
- **최근 연대기** (CHRONICLE) — 최근 주요 사건 3건

**"오늘 업무 종료" 버튼**은 대시보드 탭에서만 표시된다.

### 시설 탭

→ **시설** 섹션 참조

### 가입 심사 탭

→ **가입 심사** 섹션 참조.  
가입 심사실이 건설 전이면 잠금 안내 화면, 공사 중이면 진행률 화면이 표시된다.  
심사 대기자가 있을 때 탭 배지(숫자)가 표시된다.

---

## 시설

**컴포넌트:** `FacilitiesPage`  
**데이터:** `src/data/facilityData.ts`

### 시설 상태 (`FacilityStatus`)

| 값 | 표시 | 설명 |
|----|------|------|
| `unbuilt` | 건설 전 | 건설된 적 없음 |
| `constructing` | 건설 중 | 처음 건설 진행 중 |
| `upgrading` | 업그레이드 중 | 레벨 상승 공사 중 |
| `active` | 운영 중 | 정상 운영 상태 |

### 시설 목록

| ID | 이름 | 기본 상태 | 최대 레벨 |
|----|------|-----------|-----------|
| `facility-guild-hall` | 길드 홀 | Lv1 active | 3 |
| `facility-reception` | 접수대 | Lv1 active | 3 |
| `facility-storage` | 창고 | Lv1 active | 3 |
| `facility-recruitment` | 가입 심사실 | unbuilt | 3 |

### 건설 흐름

1. 플레이어가 건설/업그레이드 버튼 클릭
2. 확인 모달에서 비용·기간 확인
3. `startBuildFacility` / `startUpgradeFacility` 호출 → 골드 차감, 상태 변경
4. 매일 업무 종료 시 `advanceFacilityConstruction` 진행
5. 완공 시 상태 → `active`, 연대기 자동 기록

---

## 가입 심사

**컴포넌트:** `RecruitmentTab` → `ApplicantList` + `ApplicantDetail`  
**시뮬레이션:** `src/game/simulation/recruitment.ts`

### 지원자 상태 (`RecruitmentApplicantStatus`)

| 값 | 표시 | 설명 |
|----|------|------|
| `pending` | 심사 대기 | 처리 대기 중 |
| `held` | 보류 중 | 2일간 결정 유예 |
| `accepted` | 합류 승인 | 모험가로 등록됨 |
| `rejected` | 지원 반려 | 거절됨 |
| `expired` | 만료 | 기간 내 미처리 |

### 심사 규칙

- 지원 후 **5일** 내에 처리하지 않으면 자동 만료 (`EXPIRY_DAYS = 5`)
- **보류**는 2일간 유지된다 (`HOLD_DAYS = 2`)
- 보류 해제 후 다시 심사 대기 상태로 전환

### 공개 / 비공개 정보

| 항목 | 공개 여부 |
|------|-----------|
| 이름 / 직업 / 종족 / 성별 / 나이 | **공개** |
| 성격 레이블 / 지원 동기 / 첫인상 | **공개** |
| 능력치 6종 | **공개** |
| 잠재력 (`hiddenPotential`) | **비공개** |
| 은닉 특성 (`hiddenTraits`) | **비공개** |
| 성장 유형 (`hiddenGrowthType`) | **비공개** |
| 충성도 성향 (`hiddenLoyaltyTendency`) | **비공개** |

### 심사 행동

| 버튼 | 함수 | 효과 |
|------|------|------|
| 승인 | `acceptApplicant` | F등급 모험가로 등록, 연대기 기록 |
| 보류 | `holdApplicant` | 2일 유예, 다시 심사 가능 |
| 반려 | `rejectApplicant` | 지원 거절 |
| 보류 해제 | `releaseHold` | 즉시 pending 상태로 전환 |

### 지원자 생성 메커니즘

가입 심사실이 **active** 상태일 때, 매일 업무 종료 시 확률적으로 지원자가 생성된다.

| 레벨 | 일일 확률 | 최대 인원/일 | 대기 캐파 |
|------|-----------|-------------|-----------|
| Lv1 | 35% | 1명 | 3명 |
| Lv2 | 55% | 2명 | 5명 |
| Lv3 | 75% | 3명 | 8명 |

대기 인원이 캐파에 도달하면 그날은 생성되지 않는다.

---

## 의뢰

**컴포넌트:** `QuestBoardPage`  
**시뮬레이션:** `src/game/simulation/quests.ts`, `advance.ts`

### 의뢰 상태 (`QuestStatus`)

| 값 | 표시 | 설명 |
|----|------|------|
| `available` | 접수 가능 | 파티 배정 대기 중 |
| `assigned` | 출발 대기 | 파티 배정됨, 다음 날 진행 시작 |
| `in_progress` | 수행 중 | 파티 파견됨 |
| `completed` | — | 완료 즉시 게시판에서 제거 |

> `failed`, `expired`는 타입에 정의되어 있으나 현재 미사용.

### 의뢰 등급 (`AdventurerRank`)

`F` → `E` → `D` → `C` → `B` → `A` → `S`

### 의뢰 종류 (`QuestType`)

| 값 | 표시 |
|----|------|
| `normal` | 일반 의뢰 |
| `urgent` | 긴급 의뢰 |
| `raid` | 레이드 |

### 의뢰 카테고리 (`QuestCategory`)

`escort`(호위) / `search`(수색) / `hunt`(토벌) / `delivery`(배달) / `rescue`(구조) / `exploration`(탐사)

### 의뢰 결과 등급 (`QuestResultGrade`)

| 값 | 표시 | 설명 |
|----|------|------|
| `great_success` | 대성공 | 기대 이상 완수 |
| `success` | 성공 | 정상 완수 |
| `narrow_success` | 간신히 성공 | 겨우 완수 |
| `retreat` | 철수 | 플레이어 철수 결정 |
| `failure` | 실패 | 목표 달성 실패 |
| `great_failure` | 대실패 | 사상자 발생 또는 의뢰 파탄 |

### 의뢰 탭 구조

의뢰 게시판(`QuestBoardPage`)은 세 탭으로 구성된다.

| 탭 | 컴포넌트 | 설명 |
|----|----------|------|
| 가능 의뢰 | `AvailableQuestsTab` | 카드 그리드 + 중앙 모달 상세 |
| 진행 중 의뢰 | `ActiveQuestsTab` | 목록 + 우측 상세 패널 |
| 의뢰 연대기 | `QuestChronicleTab` | 완료 의뢰 기록 + 모험 기록 |

### 완료 흐름 (0019-A 이후 — 정산 연동)

1. `advanceDay` → `updateQuests` 에서 `remainingDays -= 1`
2. `remainingDays <= 0` 시 의뢰를 `state.quests`에서 **삭제**
3. `createReturnReport` → `state.returnReports` 에 추가 (정산 대기)
4. 파티 상태 → `waiting_settlement`, 멤버 `currentQuestId: null` (status는 유지)
5. 길드 연대기 기록 + 의뢰 연대기(`QuestChronicle`) 기록
6. 모험 기록(`AdventureLog`) 완료 항목 추가
7. 플레이어가 MASTER'S DESK에서 귀환 보고 열기 → 전리품 매입 선택 → 정산 완료
8. `finalizeSettlement` → 파티·멤버 `idle`, 골드 반영, 선택된 전리품 창고 추가, ReturnReport 제거

---

## 귀환 보고 / 정산 (`ReturnReport`)

**컴포넌트:** `ReturnReportModal`  
**시뮬레이션:** `src/game/simulation/returnReport.ts`

### 파티 상태 (`PartyStatus`)

| 값 | 표시 | 설명 |
|----|------|------|
| `idle` | 대기 | 파견 가능 상태 |
| `dispatched` | 의뢰 수행 중 | 의뢰 수행 중 |
| `returning` | 귀환 중 | 의뢰 귀환 단계 |
| `waiting_settlement` | 정산 대기 | 의뢰 완료, 길드장 정산 대기 |

### 정산 흐름

- 의뢰 완료 시 `ReturnReport` 생성 → `state.returnReports` 적재
- MASTER'S DESK에서 귀환 보고 버튼 클릭 → `ReturnReportModal` 열림
- 전리품 중 길드 매입 선택 (체크박스) → 매입가 = `unitValue × quantity`
- 길드 수수료: `totalRewardGold × 10%` (`GUILD_FEE_RATE = 0.10`)
- 파티 지급액: `totalRewardGold - guildFeeGold`
- 길드 순수입: `guildFeeGold - lootPurchaseTotal`
- 정산 완료 시 `finalizeSettlement` 호출 → 파티·멤버 `idle` 전환, `applyFinanceIncome`(quest_commission) + `applyFinanceExpense`(loot_purchase) 적용, 창고 업데이트
- 골드 부족(`guild.gold + guildFeeGold < lootPurchaseTotal`) 시 정산 버튼 비활성화

---

## 재정 거래 (`FinanceTransaction`)

**소스:** `src/game/simulation/finance.ts`  
**데이터:** `GameState.financeTransactions: FinanceTransaction[]` (최신 우선)

모든 골드 변동은 `FinanceTransaction` 하나로 원자적으로 기록된다. `guild.gold` 변경과 거래 기록이 동일 함수 호출에서 처리된다.

| 필드 | 설명 |
|------|------|
| `type` | quest_commission / warehouse_sale / loot_purchase / facility_construction / facility_upgrade |
| `direction` | income / expense |
| `amount` | 거래 금액 (항상 양수) |
| `balanceBefore / balanceAfter` | 거래 전후 잔액 |
| `sourceType + sourceId` | 중복 방지 트리플 키 (type 포함) |

**중복 방지:** 같은 `(sourceType, sourceId, type)` 트리플이 존재하면 추가하지 않는다.

**UI:** `GuildHallPage` 재정 탭 → `FinanceTab` — 요약 카드 4개 + 거래 내역 테이블

---

## 의뢰 진행 (`QuestProgress`)

**데이터:** `GameState.questProgress: Record<EntityId, QuestProgress>`

### 진행 단계 (`QuestStage`)

| 값 | 표시 |
|----|------|
| `traveling` | 이동 중 |
| `executing` | 수행 중 |
| `returning` | 귀환 중 |

### 현장 이벤트 (`QuestEvent`)

의뢰 진행 중 확률적으로 발생한다. 플레이어가 결정을 내려야 하는 경우 `needsDecision: true`로 표시된다.

### 플레이어 결정 (`QuestDecisionType`)

| 값 | 표시 | 설명 |
|----|------|------|
| `continue` | 계속 진행 | 현 상태 유지 |
| `extra_explore` | 추가 탐색 | 위험을 감수하고 계속 |
| `support_dispatch` | 지원 파견 | 다른 파티 파견 |
| `withdraw` | 철수 | 의뢰 포기 후 귀환 |
| `abandon` | 완전 포기 | 즉시 종료 |

---

## 모험 기록 (`AdventureLog` / Adventure Scene)

**데이터:** `GameState.adventureLogs: Record<EntityId, AdventureLogEntry[]>` (questId를 키로 사용)  
**생성:** `src/game/simulation/adventureLog.ts`

의뢰 진행의 날별·사건별 장면(Scene) 기록. 의뢰가 삭제된 후에도 보존된다.

`narrative` 필드는 `"\n\n"`으로 문단을 구분하며 UI에서 `<p>` 태그로 렌더링된다. 한 Scene은 2~8 문단, 전투 Scene은 최대 8 문단으로 구성된다.

**018-J Dynamic Story Engine**: `buildRecentSegments()` + `pickAvoidingRecent()`로 직전 10개 로그 문장 회피. 계절 문장 33% 삽입, 희귀 장면 2% 삽입. 이동/탐사/전투/귀환 풀 총 130+ 문장, 적별·직업별 행동 템플릿.

### 기록 범주 (`AdventureLogCategory`)

| 값 | 표시 | 생성 시점 |
|----|------|-----------|
| `departure` | 출발 | 파티 배정 시 |
| `travel` | 이동 | 이동 단계 일별 |
| `exploration` | 탐사 | 수행 단계 일별 |
| `combat` | 전투 | 전투 이벤트 |
| `defense` | 방어 | 방어 이벤트 |
| `healing` | 치료 | 치료 이벤트 |
| `discovery` | 발견 | 보상·발견 이벤트 |
| `incident` | 사건 | 일반 이벤트 |
| `decision` | 결정 | 플레이어 결정 |
| `injury` | 부상 | 부상 이벤트 |
| `growth` | 성장 | 성장 이벤트 |
| `trait` | 특성 | 특성 발현 이벤트 |
| `relationship` | 관계 | 관계 이벤트 |
| `teamwork` | 팀워크 | 팀워크 이벤트 |
| `retreat` | 철수 | 철수 결정 |
| `failure` | 실패 | 실패 완료 |
| `death` | 사망 | 사망 이벤트 |
| `return` | 귀환 | 귀환 단계 일별 |
| `completion` | 완료 | 의뢰 완료 시 |

### 중요도 (`AdventureLogImportance`)

`normal` / `notable` / `major` / `historic`

### 기록 ID 형식

| 유형 | ID 형식 |
|------|---------|
| 출발 | `al-{questId}-depart-{dateKey}` |
| 일별 | `al-{questId}-day-{day}-{dateKey}` |
| 이벤트 | `al-{questId}-ev-{eventId}` |
| 결정 | `al-{questId}-dec-{decisionId}` |
| 지원 합류 | `al-{questId}-support-{dateKey}` |
| 완료 | `al-{questId}-complete-{dateKey}` |

### 지원 파티 시스템 (018-L)

| 용어 | 설명 |
|------|------|
| `SUPPORT_TRAVEL_DAYS` | 지원 파티 이동 기간 상수 (= 2일) |
| 이동 중 (`en_route`) | 결정 후 아직 도착하지 않은 상태 |
| 합류 완료 (`arrived`) | `currentDay - decision.day >= SUPPORT_TRAVEL_DAYS` |
| `supportPartyIds` | `QuestChronicleEntry`에 기록되는 참여 파티 ID 배열 |

---

## 파티

**컴포넌트:** `PartiesPage`

### 파티 상태 (`PartyStatus`)

| 값 | 표시 |
|----|------|
| `idle` | 대기 중 |
| `dispatched` | 의뢰 수행 중 |
| `returning` | 귀환 중 |

---

## 모험가

**컴포넌트:** `AdventurersPage`

### 모험가 상태 (`AdventurerStatus`)

| 값 | 표시 |
|----|------|
| `idle` | 대기 |
| `dispatched` | 의뢰 수행 |
| `injured` | 부상 |
| `training` | 훈련 중 |
| `recovering` | 회복 중 |

### 종족 (`Race`)

| 값 | 표시 | 나이 범위 |
|----|------|-----------|
| `human` | 인간 | 16–45 |
| `elf` | 엘프 | 18–180 |
| `dwarf` | 드워프 | 20–90 |

### 직업 (`classId`)

| ID | 표시 | 역할 |
|----|------|------|
| `warrior` | 전사 | vanguard |
| `swordsman` | 검사 | vanguard |
| `spearman` | 창병 | vanguard |
| `archer` | 궁수 | scout |
| `mage` | 마법사 | damage |
| `paladin` | 성기사 | vanguard |
| `rogue` | 도적 | damage |
| `priest` | 사제 | support |
| `guardian` | 수호자 | vanguard |

### 능력치 (`Stats`)

`strength`(근력) / `agility`(민첩) / `endurance`(체력) / `intelligence`(지력) / `perception`(인지) / `willpower`(의지)

---

## 창고

**컴포넌트:** `WarehousePage`

전리품(`LootItem`)을 보관한다. 의뢰 완료 시 `warehouse: Record<EntityId, number>` 에 자동 추가된다.  
판매 기능이 있으며, 판매 내역은 `saleTransactions`에 기록된다.

---

## 연대기

**데이터:** `GameState.chronicle: ChronicleEntry[]`  
**컴포넌트:** 미구현 (플레이스홀더)

### 연대기 범주 (`ChronicleCategory`)

| 값 | 상황 |
|----|------|
| `join` | 모험가 입단 |
| `quest` | 의뢰 출발 / 완료 |
| `injury` | 부상 발생 / 회복 |
| `growth` | 훈련 완료 / 성장 |
| `facility` | 시설 완공 |
| `reputation` | 명성 변화 |
| `world` | 세계 이벤트 |

---

## 오늘 업무 종료

**트리거:** 대시보드 탭 우상단 "오늘 업무 종료" 버튼  
**컴포넌트:** `DayEndOverlay`  
**함수:** `processDayEnd(state): { newState, report }`

### 처리 순서

1. **시설 공사 진행** — `advanceFacilityConstruction` (+1일, 완공 시 연대기 기록)
2. **지원자 만료 처리** — `expireApplicants` (오늘 날짜 기준)
3. **보류 해제 처리** — `releaseHeldApplicants`
4. **날짜 증가** — `advanceDay` (의뢰·부상·훈련 갱신, 골드 보상 지급)
5. **신규 지원자 생성** — `generateDailyApplicants` (새 날짜 기준)
6. **일일 운영 보고서 생성**

### 2단계 UI 흐름

1. **확인 단계** — 진행 중 의뢰 수, 공사 중 시설 수 요약 / 취소·업무종료 버튼
2. **보고서 단계** — 당일 주요 사건 목록 / 다음 날짜 표시 / 확인 버튼

---

## 일일 운영 보고서

**타입:** `DailyReport { previousDate, nextDate, items: DailyReportItem[] }`

### 항목 종류 및 표시 순서

| 순서 | Kind | 설명 |
|------|------|------|
| 1 | `recruitment_new_applicants` | 신규 지원자 도착 |
| 2 | `recruitment_accepted` | 가입 승인 |
| 3 | `recruitment_rejected` | 지원 반려 |
| 4 | `recruitment_expired` | 지원 만료 |
| 5 | `facility_completed` | 시설 완공 |
| 6 | `quest_completed` | 의뢰 완료 |
| 7 | `injury_recovered` | 부상 회복 |
| 8 | `training_completed` | 훈련 완료 |

---

## 날짜 체계

- **1년** = 4계절 × 30일 = **120일**
- **계절**: 봄(spring) · 늦여름(summer) · 가을(autumn) · 겨울(winter)
- **절대일** `toAbsoluteDay(date)` = `year × 120 + seasonIndex × 30 + day`
- 배경 연도: 왕국력 317년 (게임 시작 기준)

---

## 공식 UI 용어 대조

| 화면 텍스트 | 코드 식별자 |
|------------|-------------|
| 길드 홀 | `GuildHallPage` |
| 오늘 업무 종료 | `processDayEnd`, `DayEndOverlay` |
| 일일 운영 보고서 | `DailyReport` |
| 가입 심사 | `RecruitmentTab` |
| 결재 대기 | `state.reports` + `pendingApplicantCount` |
| 진행 중인 의뢰 | `getActiveQuestRows` (`status === "assigned"`) |
| 심사 대기 | `RecruitmentApplicantStatus = "pending"` |
| 보류 중 | `RecruitmentApplicantStatus = "held"` |
| 건설 전 | `FacilityStatus = "unbuilt"` |
| 공사 중 | `FacilityStatus = "constructing" | "upgrading"` |
| 운영 중 | `FacilityStatus = "active"` |

---

## 이벤트 엔진 (018-K / 018-N)

### QuestTag

의뢰 특성을 나타내는 공통 언어 타입. `"카테고리:값"` 형식.  
→ 상세 내용: `docs/03_DESIGN/QUEST_TAG_GUIDE.md`

| 카테고리 | 값 |
|----------|---|
| `terrain:*` | `forest` `mountain` `dungeon` `plain` `swamp` `coast` `city` `ruins` |
| `enemy:*` | `undead` `beast` `bandit` `monster` `dragon` `golem` `goblin` `rodent` |
| `risk:*` | `ambush` `trap` `collapse` `flood` `disease` `hostile` `magic` `curse` |
| `obj:*` | `hunt` `escort` `search` `rescue` `explore` `deliver` |
| `season:*` | `spring` `summer` `autumn` `winter` |
| `diff:*` | `easy` `normal` `hard` `extreme` |
| `theme:*` | `mystery` `danger` `treasure` `social` |

### EventDefinition

`src/game/simulation/eventEngine.ts`의 `EVENT_POOL` 항목 구조.

| 필드 | 설명 |
|------|------|
| `id` | 식별자 (`ev-{category}-{number}`) |
| `weight` | 기본 선택 가중치 |
| `rarity` | `"rare"` (weight 0.5) / `"epic"` (weight 0.1) |
| `requiredTags` | 전부 존재해야 등장 |
| `blockedTags` | 하나라도 있으면 제외 |
| `requiredStage` | 특정 Quest 진행 단계에서만 등장 |
| `boostedByTags` | 일치할 때마다 weight +2 |
| `followUpIds` | 다음 이벤트 우선 후보 (Event Chain) |
| `allowedQuestTypes` | 지정된 의뢰 유형에서만 등장 (018-M) |

### Event Memory

`prog.events` 최근 **8**개의 제목을 기록하여 동일 이벤트 단기 반복을 억제. (018-N: 5→8)

### Event Chain

마지막 이벤트의 `followUpIds`에 등록된 이벤트가 가중치 2배로 다음 선택에 우선됨.

---

## Quest Validation & Director (018-M / 018-N)

→ 상세 내용: `docs/03_DESIGN/QUEST_VALIDATION_GUIDE.md`, `docs/03_DESIGN/QUEST_DIRECTOR_GUIDE.md`

### MandatoryStep

의뢰 유형마다 반드시 거쳐야 하는 서사 단계 정의. `questValidation.ts`의 `MANDATORY_SEQUENCES`에 저장.

| 필드 | 설명 |
|------|------|
| `id` | 단계 식별자 (예: `hunt-encounter`) |
| `description` | 한국어 설명 |
| `triggerCategories` | 충족 시키는 이벤트 카테고리 목록 |
| `minimumStage` | 최소 진행 단계 |

### DirectorState (urgencyLevel)

| 값 | 의미 |
|----|------|
| `none` | 미완료 필수 단계 없음 |
| `low` | 시간 여유 있음 (urgency weight만 적용) |
| `high` | 촉박 (urgency weight 강화) |
| `critical` | 즉시 강제 이벤트 생성 필요 |

### Quest Stage (일수 기반)

| Stage | 설명 |
|-------|------|
| `traveling` | 이동 단계 |
| `searching` | 탐색·추적 단계 |
| `executing` | 목표 수행 단계 |
| `returning` | 귀환 단계 (5일 이하: 마지막 1일, 6일 이상: 마지막 2일) |

---

## Adventure Log (018-F ~ 018-N)

→ 상세 내용: `docs/03_DESIGN/ADVENTURE_LOG_GUIDE.md`, `docs/03_DESIGN/SCENE_GENERATOR_GUIDE.md`

### Story Memory

`adventureLog.ts`의 `buildRecentSegments`가 직전 **15**개 로그 문장을 Set으로 구성하여 반복을 억제. (018-N: 10→15)

### 기록 ID 형식

| 로그 유형 | ID 형식 |
|-----------|---------|
| 출발 | `al-{q}-depart-{dateKey}` |
| 일별 | `al-{q}-day-{day}-{dateKey}` |
| 사건 | `al-{q}-ev-{eventId}` |
| 결정 | `al-{q}-dec-{decisionId}` |
| 지원 합류 | `al-{q}-support-{dateKey}` |
| 완료 | `al-{q}-complete-{dateKey}` |

### 지원 파티 시스템

| 용어 | 설명 |
|------|------|
| 주 파티 (Primary Party) | 의뢰에 처음 배정된 파티 |
| 지원 파티 (Support Party) | 길드장 결정으로 파견된 추가 파티 |
| `SUPPORT_TRAVEL_DAYS` | 지원 파티 이동 소요 일수 (`2`) |
| 이동 중 (en_route) | 파견 결정 후 도착 전 상태 |
| 합류 완료 (arrived) | 현장 도착 후 상태 |

---

## Deprecated 용어

| 폐기된 용어 | 대체 용어 | 변경 시점 |
|------------|----------|-----------|
| 하루 진행 | 오늘 업무 종료 | 016-A |
| 길드 현황 | 길드 홀 | 016-A |
| 시설 (단독 메뉴) | 길드 홀 > 시설 탭 | 016-A |
| 가입 심사 (단독 메뉴) | 길드 홀 > 가입 심사 탭 | 016-A |
| 오늘의 영입 후보 | 가입 심사 (지원자 목록) | 016-B |
| `status: "completed"` in quests | 의뢰 완료 후 `state.quests`에서 삭제 | 016-C |
