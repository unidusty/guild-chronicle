# 전투 시스템 가이드

현재 구현 기준 (0018-P).

현재 구현과 향후 계획을 명확히 구분하여 작성한다.
구현 예정 항목은 ROADMAP의 내용을 그대로 인용하며 임의로 추가하거나 변경하지 않는다.

---

## 전투 시스템 개요

### 전투 철학

Guild Chronicle의 전투는 자동 계산된다.
플레이어는 전투를 직접 조작하지 않는다.
결정과 준비의 결과가 전투로 나타난다.

이 게임은 액션 RPG가 아니다.
전투의 재미는 "어떻게 싸우는가"가 아니라
"누구를 보냈는가, 어떤 파티를 구성했는가, 어떤 의뢰를 선택했는가"에서 나온다.

### 플레이어 역할

| 플레이어가 하는 것 | 플레이어가 하지 않는 것 |
|-------------------|------------------------|
| 파티 편성 | 공격 명령 |
| 진형 배치 | 회피 조작 |
| 의뢰 선택 | 스킬 선택 |
| 지원 파견 결정 | 실시간 개입 |
| 철수 결정 | 전술 마이크로 |

### 자동 전투 원칙

- 전투 결과는 파티 전투력·의뢰 위험도·이벤트·파티 구성을 종합해 계산한다.
- 같은 파티, 같은 의뢰도 이벤트에 따라 결과가 달라진다.
- 능력치·직업·특성·진형이 전투 결과에 영향을 주어야 한다. 임의적인 수치가 아니라 실제 구성의 차이가 결과를 만든다.

### Battle Event 중심 구조 (향후 구현)

0024 이후, 전투의 모든 행동은 Battle Event로 저장된다.
Battle Event는 텍스트 중계·Adventure Log·2D 전투 재생에 공통으로 사용된다.
현재는 Battle Event 구조가 구현되어 있지 않다.

---

## 전투 흐름

### 현재 구현

```
의뢰 수락 → 파티 배정 → 매일 advanceDay
  → 이벤트 엔진(selectEvent)이 전투 이벤트 선택
    → QuestEvent 생성 (category: "combat")
      → 성공률 재계산 (calcQuestSuccessRate)
        → Adventure Log Scene 생성 (generateIncidentLog)
          → 의뢰 완료 시 결과 등급 결정
```

#### 의뢰 중 전투 발생

- `advanceDay`가 호출될 때 이벤트 엔진이 확률적으로 이벤트를 선택한다.
- 전투 이벤트(`category: "combat"`)가 선택되면 `QuestEvent`가 생성된다.
- 이벤트 선택은 QuestTag·Event Memory·Event Chain 기반으로 동작한다.
- `Quest.enemyHint` 필드가 적 정보를 서사 생성에 제공한다.

#### 결과 계산

의뢰 완료 시 `QuestResultGrade`가 결정된다.

| 결과 등급 | 표시 |
|-----------|------|
| `great_success` | 대성공 |
| `success` | 성공 |
| `narrow_success` | 간신히 성공 |
| `retreat` | 철수 |
| `failure` | 실패 |
| `great_failure` | 대실패 |

결과는 예상 성공률과 진행 중 이벤트를 종합해 산출한다.
`hasCombat` 체크: 전투 이벤트가 없는 경우 대실패 서사에서 전투 관련 문장을 제외한다.

#### Adventure Log 생성

- 전투 이벤트 발생 시 `generateIncidentLog`가 전투 Scene을 생성한다.
- 전투 Scene은 5~8 문단 구조로 구성된다.
- `ENEMY_BEHAVIOR` 8종 적별 행동 패턴이 서사에 반영된다.
- 직업별 전투 액션 템플릿이 적용된다.
- 2~4명의 실제 파티원이 등장한다.

---

## 능력치 판정

### 현재 구현

현재 능력치는 전투력(combatPower) 계산에 가중합산 방식으로 반영된다.
직접 행동별 판정은 구현되어 있지 않다.

#### 개인 전투력 계산 (`calcMemberCombatPower`)

```
개인 전투력 = classWeightedStatSum × 1.2 + ratingSum × 2
```

- 주 능력치 (`AdventurerClass.primaryStats`): 가중치 1.5
- 나머지 능력치: 가중치 0.75
- `ratingSum` = attack + defense + evasion + accuracy + survival + leadership 합계

#### 개인 전투력 기준값

| 랭크 | 범위 |
|------|------|
| F-rank 신입 | 55~65 |
| C-rank | 80~95 |
| B-rank | 100~115 |
| S-rank | 140~160 |

#### 능력치 6종 (`Stats`)

| 능력치 | 영향 |
|--------|------|
| `strength` (근력) | 주 능력치: 전사·검사·창병·수호자 |
| `agility` (민첩) | 주 능력치: 궁수·도적 |
| `endurance` (체력) | 주 능력치: 전사·수호자·성기사 |
| `intelligence` (지력) | 주 능력치: 마법사 |
| `perception` (인지) | 주 능력치: 궁수·도적 |
| `willpower` (의지) | 주 능력치: 사제·성기사 |

#### 전투 등급 (`combatRatings`)

| 항목 | 설명 |
|------|------|
| `attack` | 공격 능력 |
| `defense` | 방어 능력 |
| `evasion` | 회피 능력 |
| `accuracy` | 명중 능력 |
| `survival` | 생존 능력 |
| `leadership` | 리더십 |

### 향후 구현 (0020)

- 행동별 사용 능력치 정의 (공격·방어·도발·추적·정찰·함정·치료·정화 등)
- 판정 결과가 Adventure Log와 전투 기록의 근거가 됨
- 문장을 먼저 만들고 수치를 끼워 맞추는 방식 금지
- 동일 의뢰도 파티 구성에 따라 다른 결과 발생

---

## 직업 행동

### 현재 구현

직업은 주 능력치 가중치와 Adventure Log 서사 생성에 영향을 준다.
9개 직업별 전투·탐사·이동 액션 템플릿이 정의되어 있다.
진형에서의 선호 열(front/mid/back)이 정의되어 있다.

| 직업 | 역할 | 선호 열 | 주 능력치 |
|------|------|---------|-----------|
| warrior (전사) | vanguard | front | strength, endurance |
| guardian (수호자) | vanguard | front | strength, endurance |
| paladin (성기사) | vanguard | front | endurance, willpower |
| swordsman (검사) | vanguard | front, mid | strength |
| spearman (창병) | vanguard | front, mid | strength |
| archer (궁수) | scout | back, mid | agility, perception |
| mage (마법사) | damage | back, mid | intelligence |
| rogue (도적) | damage | back, mid | agility, perception |
| priest (사제) | support | back, mid | willpower |

### 향후 구현 (0020)

- 직업별 행동 후보와 우선순위 구현
- 특성이 행동 선택·성공률·위기 대응에 실제 영향
- 파티 조합과 역할 공백을 의뢰 결과에 반영

---

## 특성 효과

### 현재 구현

특성(`traits`)은 모험가 데이터에 저장되지만 전투 판정에 직접 반영되지 않는다.
Adventure Log 서사에서 특성 관련 문장이 등장한다.

### 향후 구현 (0020)

- 특성이 행동 선택·성공률·위기 대응에 실제 영향을 줌
- 성장 관련 특성 (노력파·천재·대기만성 등)이 성장 속도·전성기에 영향
- 단순 전투력 대폭 상승 지양

---

## 전술 진형

### 현재 구현

진형(`Formation`)은 3×3 슬롯 구조로 구현되어 있다.
파티 편성 화면에서 모험가를 슬롯에 배치할 수 있다.

#### 슬롯 구조

| 행 | 슬롯 |
|----|------|
| 전열 (front) | front-left, front-center, front-right |
| 중열 (mid) | mid-left, mid-center, mid-right |
| 후열 (back) | back-left, back-center, back-right |

#### 진형 보정 계산 (`calcFormationAdjustment`)

- 권장 열 배치: +5 (인당)
- 비권장 열 배치: -3 (인당)

#### 시너지 계산 (`calcSynergy`)

| 조건 | 보정 |
|------|------|
| 탱커(vanguard) 포함 | +10 |
| 힐러(support) 포함 | +20 |
| 역할 3종 이상 | +10 |
| 근거리·원거리 혼합 | +5 |
| 탱커 없음 (2인 이상) | -20 |
| 힐러 없음 (3인 이상) | -15 |
| 직업 중복 (인당 -5, 최대 -15) | -5~-15 |

#### 파티 전투력 계산 (`calcPartyCombatPower`)

```
파티 전투력 = 개인 전투력 합계 + 시너지 보정 + 진형 보정
```

| 단계 | 범위 |
|------|------|
| 초기 (F-rank, 3~4명) | 100~300 |
| 중반 (C-rank, 4명) | 300~500 |
| 후반 (B-rank, 4~5명) | 400~650 |
| 최상 (S-rank, 6명) | 850~1000 |

### 향후 구현 (0024)

- 기본 진형 3×3 또는 3×5 구조. 데이터 구조는 3×5 기준 검토
- 전열·중열·후열 + 좌·중앙·우 위치에 실제 의미 부여
- 중앙 전열 탱커의 도발·보호 범위
- 전열 빈 라인이 적의 침투 경로가 됨
- 후열 노출·측면 압박·전열 붕괴를 판정에 반영
- 직업별 권장 위치와 위치 보정 확장
- 적 유형별 공격 경로와 진형 공략 방식

---

## 예상 성공률

### 현재 구현

`calcQuestSuccessRate(combatPower, partyRank, quest)`

```
questPower = RANK_BASE_POWER[grade] + (dangerLevel - 3) × 25
ratio      = combatPower / questPower
rate       = round(30 + ratio × 55)
도전 모드  = rate - 35
최종 성공률 = clamp(rate, 10, 95)
```

#### 의뢰 권장 전투력 기준값 (`RANK_BASE_POWER`)

| 등급 | 기준 전투력 |
|------|------------|
| F | 120 |
| E | 220 |
| D | 330 |
| C | 450 |
| B | 580 |
| A | 720 |
| S | 880 |

#### 도전 모드

파티 랭크가 의뢰 등급보다 정확히 1단계 낮을 때 허용.
성공률 -35% 패널티 적용.

---

## Battle Event

### 현재 구현

현재 전투 이벤트는 `QuestEvent` 형태로 저장된다.
`QuestEvent`는 의뢰 진행 중 발생한 사건의 메타 정보를 담는다.
Battle Event 구조(행동별 세부 기록)는 구현되어 있지 않다.

### 향후 구현 (0024)

Battle Event는 전투에서 발생한 모든 행동을 턴 또는 시간 순서로 저장한다.

#### 데이터 필드

| 필드 | 설명 |
|------|------|
| `battleId` | 전투 식별자 |
| `turn` | 턴 순서 |
| `actorId` | 행동 주체 모험가 ID |
| `targetIds` | 대상 ID 목록 |
| `actionType` | 행동 종류 |
| `sourcePosition` | 행동 주체 위치 |
| `targetPosition` | 대상 위치 |
| `success` / `failure` / `critical` | 판정 결과 |
| 피해·회복·보호·상태 효과 | 수치 결과 |
| 관련 QuestTag·특성·장비 | 판정 근거 |
| `narrativeKey` + 중요도 | Adventure Log 연동 키 |

#### Battle Event 활용처

| 활용처 | 설명 |
|--------|------|
| Adventure Log | 중요 Battle Event를 Scene으로 변환 |
| 실시간 텍스트 중계 | Battle Event 순서대로 전투 상황 출력 |
| 전투 리플레이 | 저장된 Battle Event를 재생 (새 판정 없음) |
| 2D 자동 전투 | Battle Event를 아이콘·이펙트로 시각화 |
| 연대기 | 주요 Battle Event를 연대기 기록에 포함 |

---

## 적 AI

### 현재 구현

적 행동은 Adventure Log 서사 생성에 사용되는 텍스트 패턴으로만 존재한다.
`ENEMY_BEHAVIOR` 8종 적별 행동 패턴이 서사 선택에 영향을 준다.
적이 실제 수치로 판정을 수행하는 구조는 없다.

### 향후 구현 (0024)

- 적 유형별 공격 경로와 진형 공략 방식 구현
- Battle Event 생성 시 적 AI가 행동을 결정

---

## 지원 파티

### 현재 구현

- 플레이어가 "지원 파견" 결정 → 대기 중인 파티가 현장 출발
- `SUPPORT_TRAVEL_DAYS = 2`: 2일 후 현장 도착
- 도착 당일 합류 Scene 생성 (`generateSupportArrivalLog`)
- 도착 이후 일별·사건 로그에 지원 파티원 등장
- 의뢰 연대기에 `supportPartyIds` 기록
- 의뢰 상세 UI에 "참여 파티" 섹션 표시 (합류 완료 / 이동 중 배지)

### 향후 구현 (0024)

- 지원 파티 도착 시 합동 진형 편성
- 합류 순간 전투 일시 정지 + 재배치 기회
- 자동 배치와 수동 재배치 모두 지원
- 1파티 3×5, 2파티 5×5 등 참여 파티 수에 따른 전장 확장 검토
- 3파티 이상과 공격대는 별도 대형 진형으로 확장
- 합류 이후 Battle Event와 Adventure Log는 합동 진형 기준으로 생성

---

## 실시간 텍스트 중계

### 현재 구현

구현되어 있지 않다.
현재 전투는 Adventure Log(문단 단위 Scene)로만 표현된다.

### 향후 구현 (0024)

- 의뢰 중 전투 발생 시 별도 중계 화면 표시
- 실제 Battle Event 순서대로 전투 상황 출력
- 일시 정지
- 1배속 / 2배속 / 4배속
- 주요 장면만 보기
- 전체 전투 건너뛰기
- 전투 종료 요약
- 중요 Battle Event를 Adventure Log Scene으로 변환
- 전투 결과를 먼저 계산한 뒤 중계하는 시뮬레이션·리플레이 구조 사용

---

## 2D 자동 전투

### 현재 구현

구현되어 있지 않다.

### 향후 구현 (0024 — 텍스트 중계 이후)

- 역할 아이콘 기반 2D 표현
  - 탱커: 방패 아이콘
  - 근접 딜러: 칼 아이콘
  - 원거리 딜러: 활 아이콘
  - 힐러: 십자가 아이콘
  - 마법사: 마법 문양
- 공격선·화살·마법·피격·회복·도발의 최소 연출
- 저장된 Battle Event를 재생 (새로운 전투 판정을 만들지 않음)
- 전투 다시보기와 하이라이트 확장 준비

---

## 향후 확장 예정

ROADMAP 기준. 버전 표기는 계획이며 변경될 수 있다.

### 0020 — 모험가 성장 및 관계 (예정)

- 능력치를 의뢰와 전투의 실제 판정에 반영
- 공격·방어·도발·추적·정찰·함정·치료·정화 등 행동별 사용 능력치 정의
- 직업별 행동 후보와 우선순위 구현
- 특성이 행동 선택·성공률·위기 대응에 실제 영향
- 파티 조합과 역할 공백을 의뢰 결과에 반영
- 실제 판정 결과를 Adventure Log와 전투 기록의 근거로 사용

### 0023 — 장비 및 제작 (예정)

- 장비 효과가 전투 판정에 영향 (능력치 증가 +1~2 수준)
- 전투력 대폭 상승 금지. 패시브 효과 중심
- 특정 진형에서 효과 발생하는 장비

### 0024 — 전술 진형 및 전투 시뮬레이션 (예정)

구현 순서:
1. 능력치·직업·특성 실제 판정 연결
2. 진형과 위치 규칙
3. 적 행동과 공격 경로
4. Battle Event 데이터
5. 실시간 텍스트 중계
6. Adventure Log 요약
7. 지원 파티 합동 진형
8. 역할 아이콘 기반 2D 자동 전투

### 0024-A — 작은 길드 1차 플레이 사이클 (예정)

- 전술 진형과 전투 텍스트 중계의 1차 버전 작동이 최소 조건 중 하나
