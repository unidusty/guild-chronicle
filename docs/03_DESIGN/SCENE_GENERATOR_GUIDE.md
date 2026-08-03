# SCENE GENERATOR GUIDE

Guild Chronicle Scene 생성 시스템 설계 기준서. (018-N)

---

## 개요

Scene Generator는 `adventureLog.ts`에 구현된 내러티브 생성 레이어다.  
게임 상태(파티원, 이벤트 결과, 적 정보, 계절)를 입력으로 받아  
한국어 문단 단위의 장면(Scene)을 조립한다.

---

## 핵심 원칙

1. **상태 파생** — 모든 문장은 실제 게임 상태에서 파생된다. 임의의 사실을 만들지 않는다.
2. **결정적 해시** — 같은 `questId + day + category` 조합은 언제나 동일한 템플릿을 선택한다.
3. **반복 최소화** — `pickAvoidingRecent`가 최근 15개 로그에 사용된 문장을 피해 선택한다.
4. **액터 선택** — 파티원 중 적합한 역할의 모험가를 선택해 이름을 삽입한다.
5. **지원 파티 통합** — 도착한 지원 파티원도 로그에 등장할 수 있다.

---

## 핵심 헬퍼 함수

### buildScene

```typescript
function buildScene(segments: string[]): string
```

빈 세그먼트를 제거하고 `"\n\n"`으로 조합한다.  
UI에서는 `narrative.split("\n\n")`으로 분리해 각각 `<p>` 태그로 렌더링한다.

### applyVars

```typescript
function applyVars(template: string, vars: Record<string, string>): string
```

`{변수명}` 형식의 자리표시자를 실제 값으로 치환한다.

| 변수 | 설명 |
|------|------|
| `{actor}` | 주요 등장 모험가 이름 |
| `{actor2}` | 두 번째 등장 모험가 이름 |
| `{party}` | 파티 이름 |
| `{quest}` | 의뢰 제목 |
| `{enemy}` | 적 이름 (`quest.enemyHint`) |
| `{region}` | 지역 이름 |

### selectActor

```typescript
function selectActor(
  members: Adventurer[],
  classes: Record<EntityId, AdventurerClass>,
  preferredRoles: ActorRole[],
  seed: string,
  excludeId?: EntityId,
): Adventurer | null
```

파티원 중 `preferredRoles`에 해당하는 역할을 가진 모험가를 seed 기반으로 선택.  
`excludeId`로 이미 선택된 액터를 제외할 수 있다.

| ActorRole | 직업 예시 |
|-----------|----------|
| `vanguard` | 전사, 기사, 팔라딘 |
| `damage` | 마법사, 궁수, 도적 |
| `support` | 사제, 수도사 |
| `scout` | 도적, 궁수 |

---

## 로그 유형별 Scene 구조

### 출발 로그 (`generateDepartureLog`)

| 세그먼트 | 내용 | 풀 |
|---------|------|---|
| s0 | 출발 선언 | 의뢰 유형별 DEPARTURE_OPENING |
| s1 | 계절 분위기 (33%) | SEASON_CONTEXT |
| s2 | 액터 이동 행동 | CLASS_TRAVEL 또는 기본 이동 풀 |

### 일별 로그 (`generateDailyLog`)

#### 이동 단계 (`traveling`)
| 세그먼트 | 내용 |
|---------|------|
| s0 | TRAVEL_DETAIL (이동 환경 묘사) |
| s1 (선택) | 액터 이동 행동 (25% 확률) |

#### 수행 단계 (`executing`)
| 세그먼트 | 내용 |
|---------|------|
| s0 | EXPLORE_DETAIL (탐사 관찰) |
| s1 (선택) | 액터 임무 행동 (25% 확률) |
| s2 (선택) | 계절 분위기 (33% 확률) |

#### 귀환 단계 (`returning`)
| 세그먼트 | 내용 |
|---------|------|
| s0 | RETURN_DETAIL (귀환 묘사) |
| s1 (선택) | 액터 마무리 행동 (25% 확률) |

### 사건 로그 — 전투 (`generateIncidentLog`, category: "combat")

| 세그먼트 | 내용 |
|---------|------|
| s0 | SCENE_OPENING (의뢰 유형별 분위기) |
| s1 | SCENE_ENEMY_APPEAR + enemyHint |
| s2 | SCENE_CONFLICT (전투 시작) |
| s3 | 액터1 전투 행동 (CLASS_COMBAT 또는 COMBAT_ACTOR) |
| s4 | 액터2 행동 (COMBAT_ACTOR, 파티원 ≥ 2일 때) |
| s5 | SCENE_COOP (협동 — 두 액터 이름) |
| s6 | ENEMY_BEHAVIOR (적별 전투 패턴) |
| s7 | SCENE_TURNING_POS 또는 SCENE_TURNING_NEG |
| s_support (선택) | 지원 파티원 공격 + 협동 문단 (도착 후) |

### 사건 로그 — 위험 (`generateIncidentLog`, category: "danger")

| 세그먼트 | 내용 |
|---------|------|
| s0 | SCENE_OPENING |
| s1 | 위험 묘사 (DANGER_INCIDENT) |
| s2 | SCENE_TENSION (긴장) |
| s3 | 액터 대응 행동 |
| s4 | SCENE_RELIEF 또는 SCENE_RESOLVE |

### 결정 로그 (`generateDecisionLog`)

| 세그먼트 | 내용 |
|---------|------|
| s0 | 결정 내용 (DECISION_NARRATIVE[decisionType]) |
| s1 | 파티 반응·다음 행동 |

### 지원 합류 로그 (`generateSupportArrivalLog`)

| 세그먼트 | 내용 |
|---------|------|
| s0 | SUPPORT_STRUGGLE (주 파티 고전 묘사) |
| s1 | 지원 파티 도착 알림 (지원 파티 이름 포함) |
| s2 | 지원 파티원 행동 (CLASS_COMBAT 또는 COMBAT_ACTOR) |
| s3 | 주 파티원 반응 |
| s4 | SUPPORT_COMBINED (합동 공세) |
| s5 | SCENE_TURNING_POS (전황 반전) |

제목: `"${supportParty.name} 합류"`

### 완료 로그 (`generateCompletionLog`)

#### 대성공 (`great_success`) — 6 세그먼트
| 세그먼트 | 내용 |
|---------|------|
| s0 | GREAT_SUCCESS_HERO[quest.type] (카테고리별 영웅담) |
| s1 | 액터1 결정타 행동 |
| s2 | 액터2 지원 행동 (파티원 ≥ 2) |
| s3 | SCENE_TURNING_POS |
| s4 | SCENE_VICTORY |
| s5 | SCENE_RELIEF |

#### 성공 (`success`) — 2 세그먼트
| 세그먼트 | 내용 |
|---------|------|
| s0 | COMPLETION_NARRATIVE.success |
| s1 | 액터 기여 (COMPLETION_ACTOR) |

#### 간신히 성공 (`narrow_success`) — 3 세그먼트
| 세그먼트 | 내용 |
|---------|------|
| s0 | COMPLETION_NARRATIVE.narrow_success |
| s1 | 구원 액터 행동 |
| s2 | SCENE_RELIEF |

#### 철수 (`retreat`) — 3 세그먼트
| 세그먼트 | 내용 |
|---------|------|
| s0 | SCENE_TURNING_NEG |
| s1 | COMPLETION_NARRATIVE.retreat (결정 서술) |
| s2 | SCENE_RETURN_CLOSE |

#### 실패 (`failure`) — 3 세그먼트
| 세그먼트 | 내용 |
|---------|------|
| s0 | COMPLETION_NARRATIVE.failure |
| s1 | FAILURE_CONTEXT_BY_TYPE[quest.type] (유형별 실패 사유) |
| s2 | SCENE_AFTERMATH_FAIL |

#### 대실패 (`great_failure`) — 5 세그먼트
| 세그먼트 | 내용 |
|---------|------|
| s0 | SCENE_STRUGGLE |
| s1 | 액터 행동 (전투 기록 있을 시 CLASS_COMBAT, 없을 시 COMPLETION_ACTOR) |
| s2 | SCENE_TURNING_NEG |
| s3 | COMPLETION_NARRATIVE.great_failure (전투 없으면 "강적과의 전투" 문장 제외) |
| s4 | SCENE_AFTERMATH_FAIL |

---

## 템플릿 상수 목록

| 상수 | 항목 수 | 역할 |
|------|--------|------|
| `SEASON_CONTEXT` | 4×5=20 | 계절별 분위기 (33% 확률 삽입) |
| `ENEMY_BEHAVIOR` | 8종×4~6 | 적별 전투 행동 패턴 |
| `TRAVEL_DETAIL` | 34 | 이동 중 환경 관찰 |
| `EXPLORE_DETAIL` | 32 | 탐사 중 발견·관찰 |
| `COMBAT_DEVELOPMENT` | 50 | 전투 중 상황 전개 |
| `RETURN_DETAIL` | 20 | 귀환 중 상황 |
| `RARE_SCENES` | 12 | 2% 확률 희귀 장면 |
| `SCENE_OPENING` | 의뢰 유형별 | 퀘스트 유형 분위기 첫 문장 |
| `SCENE_ENEMY_APPEAR` | 10+ | 적 등장 (`{enemy}` 변수) |
| `SCENE_CONFLICT` | 10+ | 전투 시작 선언 |
| `SCENE_COOP` | 12 | 두 액터 협동 (`{actor}`, `{actor2}`) |
| `SCENE_TURNING_POS` | 10+ | 전황 유리하게 전환 |
| `SCENE_TURNING_NEG` | 10+ | 전황 불리하게 전환 |
| `SCENE_TENSION` | 8+ | 긴장감 표현 |
| `SCENE_RELIEF` | 8+ | 안도·위기 해소 |
| `SCENE_RESOLVE` | 8+ | 결의·포기 거부 |
| `SCENE_STRUGGLE` | 8+ | 고전·한계 묘사 |
| `SCENE_VICTORY` | 8+ | 승리·목표 달성 |
| `SCENE_AFTERMATH_FAIL` | 8+ | 실패 여운 |
| `SCENE_RETURN_CLOSE` | 8+ | 귀환 마무리 |
| `SUPPORT_STRUGGLE` | 6+ | 지원 전 주 파티 고전 묘사 |
| `SUPPORT_REACTION` | 6+ | 지원 도착 후 파티 반응 |
| `SUPPORT_COMBINED` | 6+ | 두 파티 합동 공세 |
| `CLASS_COMBAT` | 직업별 4~8개 | 직업별 전투 행동 |
| `CLASS_EXPLORE` | 직업별 4개 | 직업별 탐사 행동 |
| `CLASS_TRAVEL` | 직업별 4개 | 직업별 이동 행동 |
| `COMBAT_ACTOR` | 역할별 4~6개 | 역할별 일반 전투 행동 |
| `COMPLETION_ACTOR` | 역할별 3개 | 완료 시 기여 문장 |
| `FAILURE_CONTEXT_BY_TYPE` | 유형별 3개 | 의뢰 유형별 실패 사유 |
| `GREAT_SUCCESS_HERO` | 유형별 3개 | 의뢰 유형별 대성공 영웅담 |

---

## 희귀 장면 삽입 (2%)

일별 로그·사건 로그 생성 시 seed 기반으로 2% 확률 판정:

```typescript
if (hashSeed(seed + "-rare") % 50 === 0) {
  segments.push(pickAvoidingRecent(RARE_SCENES, seed + "-raresc", recentSegments));
}
```

희귀 장면은 이벤트와 무관하게 문단 말미에 삽입된다.

---

## 지원 파티 서사 통합

도착한 지원 파티(`arrivedSupportParties`)가 있을 때:
- **일별 로그**: 지원 파티원 한 명이 추가 세그먼트로 등장
- **전투 사건 로그**: 지원 파티원 공격 + 주 파티원과 협동 문단 삽입
- **완료 로그**: `result.supportUsed`이면 지원 파티 기여 문단 추가

---

## 스토리 일관성 검증 (018-M)

완료 로그 생성 시 실제 사건 기록을 확인해 문맥에 맞는 서사를 선택한다:

```typescript
// 전투 이벤트가 없었던 경우 "강적과의 전투 끝에" 서사 제외
const hasCombat = prog.events.some(e => e.category === "combat");
const gfPool = hasCombat
  ? COMPLETION_NARRATIVE.great_failure
  : COMPLETION_NARRATIVE.great_failure.filter(s => !s.includes("강적과의 전투"));
```

---

## 템플릿 추가 규칙

1. 모든 템플릿은 `adventureLog.ts` 내부 상수로 정의한다
2. 템플릿 변수는 `{변수명}` 형식 (예: `{actor}`, `{enemy}`)
3. 새 카테고리 추가 시 `AdventureLogCategory` 타입, 템플릿 배열, CSS 클래스, `ADV_LOG_CATEGORY_LABELS` 레코드 네 곳 모두 업데이트
4. 배열은 최소 3개 이상 유지

---

## 참조 문서

- `ADVENTURE_LOG_GUIDE.md` — 로그 시스템 전체 개요
- `STORY_ENGINE_GUIDE.md` — Dynamic Story Engine (반복 억제, 희귀 장면)
- `QUEST_DIRECTOR_GUIDE.md` — 필수 이벤트 보장 시스템
