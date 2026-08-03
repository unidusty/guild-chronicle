# QUEST TAG GUIDE

Guild Chronicle Quest Tag 시스템 설계 기준서. (018-N)

---

## 개요

Quest Tag는 의뢰의 특성을 나타내는 공통 언어다.  
이벤트 선택, 어드벤처 로그 서사, 보상 계산 등 모든 하위 시스템이 Quest Tag를 기준으로 동작한다.  
태그는 의뢰 데이터에서 **자동 파생**되며 별도로 저장하지 않는다.

---

## 태그 카테고리

| 카테고리 | 접두사 | 설명 |
|---------|--------|------|
| 지형 | `terrain:*` | 의뢰 수행 지역의 지형 특성 |
| 적 | `enemy:*` | 주요 적 유형 |
| 위험 | `risk:*` | 현장 위험 요소 |
| 목표 | `obj:*` | 의뢰 목표 유형 |
| 계절 | `season:*` | 진행 계절 |
| 난이도 | `diff:*` | 의뢰 위험도 |
| 테마 | `theme:*` | 분위기·서사 테마 |

---

## 전체 태그 목록

### 지형 (`terrain:*`)

| 태그 | 설명 |
|------|------|
| `terrain:forest` | 숲 지역 |
| `terrain:mountain` | 산악 지대 |
| `terrain:dungeon` | 던전·지하 구조물 |
| `terrain:plain` | 평원 |
| `terrain:swamp` | 습지·늪 |
| `terrain:coast` | 해안·해변 |
| `terrain:city` | 도시·마을 |
| `terrain:ruins` | 고대 유적·폐허 |

### 적 (`enemy:*`)

| 태그 | 설명 | ENEMY_BEHAVIOR 연동 |
|------|------|---------------------|
| `enemy:undead` | 언데드 계열 | `undead` 풀 |
| `enemy:beast` | 야수 계열 | `beast` 풀 |
| `enemy:bandit` | 산적·인간 적 | `bandit` 풀 |
| `enemy:monster` | 일반 몬스터 | `monster` 풀 |
| `enemy:dragon` | 드래곤 계열 | `dragon` 풀 |
| `enemy:golem` | 골렘·기계 구조체 | `golem` 풀 |
| `enemy:goblin` | 고블린 계열 | `goblin` 풀 |
| `enemy:rodent` | 설치류 계열 | `rodent` 풀 |

### 위험 (`risk:*`)

| 태그 | 설명 |
|------|------|
| `risk:ambush` | 매복 위험 |
| `risk:trap` | 함정 지대 |
| `risk:collapse` | 붕괴·낙석 위험 |
| `risk:flood` | 침수·홍수 위험 |
| `risk:disease` | 질병·전염 위험 |
| `risk:hostile` | 적대적 세력 지배 지역 |
| `risk:magic` | 불안정한 마법 환경 |
| `risk:curse` | 저주·오염 위험 |

### 목표 (`obj:*`)

| 태그 | 의뢰 카테고리 |
|------|--------------|
| `obj:hunt` | hunt (토벌) |
| `obj:escort` | escort (호위) |
| `obj:search` | search (수색) |
| `obj:rescue` | rescue (구조) |
| `obj:explore` | exploration (탐사) |
| `obj:deliver` | delivery (배달) |

### 계절 (`season:*`)

| 태그 | 계절 |
|------|------|
| `season:spring` | 봄 |
| `season:summer` | 여름 |
| `season:autumn` | 가을 |
| `season:winter` | 겨울 |

### 난이도 (`diff:*`)

| 태그 | dangerLevel 범위 |
|------|-----------------|
| `diff:easy` | 1 |
| `diff:normal` | 2~3 |
| `diff:hard` | 4~6 |
| `diff:extreme` | 7+ |

### 테마 (`theme:*`)

| 태그 | 설명 |
|------|------|
| `theme:mystery` | 미스터리·수수께끼 |
| `theme:danger` | 극도의 위험 (region.danger ≥ 70) |
| `theme:treasure` | 보물·보상 |
| `theme:social` | 사회적·인적 요소 |

---

## 태그 파생 (`deriveTags`)

`deriveTags(quest, date, region?)` — Quest 기존 데이터에서 태그를 자동으로 파생한다.

```typescript
// 소스 → 파생 태그
quest.type         → obj:hunt, obj:escort, ...
quest.dangerLevel  → diff:easy, diff:normal, diff:hard, diff:extreme
quest.riskTags[]   → RISK_TAG_MAP으로 변환
quest.enemyHint    → ENEMY_TAG_MAP으로 변환
quest.regionId     → REGION_TERRAIN으로 지형 태그
region?.control    → "hostile" → risk:hostile
region?.danger     → ≥70 → theme:danger
date.season        → season:spring, ...
```

### RISK_TAG_MAP 주요 매핑

| riskTag | QuestTag |
|---------|----------|
| `"ambush"` | `risk:ambush` |
| `"trap"` | `risk:trap` |
| `"magic"` | `risk:magic` |
| `"curse"` | `risk:curse` |
| `"disease"` | `risk:disease` |

### ENEMY_TAG_MAP 주요 매핑

| enemyHint (부분 문자열) | QuestTag |
|------------------------|---------|
| 언데드, 스켈레톤, 좀비 | `enemy:undead` |
| 와이번, 드래곤 | `enemy:dragon` |
| 고블린 | `enemy:goblin` |
| 산적, 도적 | `enemy:bandit` |
| 늑대, 곰, 야수 | `enemy:beast` |
| 골렘 | `enemy:golem` |

---

## 태그가 이벤트 선택에 미치는 영향

### requiredTags — 등장 조건 제한

`requiredTags`에 열거된 태그가 **모두** 존재해야 이벤트 후보에 포함된다.

```
ev-explore-013 (마법 함정 지대): requiredTags: ["risk:magic"]
→ risk:magic 태그가 없는 의뢰에서는 등장하지 않음
```

### blockedTags — 등장 차단

`blockedTags`에 열거된 태그가 **하나라도** 있으면 이벤트 후보에서 제외된다.

```
ev-env-001 (폭우): blockedTags: ["season:winter"]
→ 겨울 의뢰에서는 등장하지 않음
```

### boostedByTags — 가중치 증가

`boostedByTags`에 열거된 태그가 일치할 때마다 가중치 **+2**가 적용된다.

```
ev-combat-001 (강한 개체 출현): boostedByTags: ["obj:hunt", "diff:hard"]
→ 토벌 + 고난이도 의뢰에서 가중치 +4 (강력 부스트)
```

### allowedQuestTypes — 의뢰 유형 전용

특정 의뢰 유형에서만 등장하도록 제한한다. (018-M 도입)

```
ev-explore-004 (고대 비문 발견): allowedQuestTypes: ["exploration"]
→ 탐사 의뢰에서만 등장
```

---

## 태그가 Story Engine에 미치는 영향

| 태그 | 영향 |
|------|------|
| `enemy:*` | ENEMY_BEHAVIOR 풀 선택 (적별 전투 행동 패턴) |
| `obj:*` | SCENE_OPENING 풀 선택 (퀘스트 유형별 첫 문장) |
| `season:*` | SEASON_CONTEXT 풀 선택 (계절 분위기 문장) |
| `terrain:ruins` | 고대 탐사 서사 우선 |

---

## 신규 태그 추가 규칙

1. `QuestTag` 타입에 리터럴 추가 (`eventEngine.ts`)
2. `RISK_TAG_MAP` 또는 `ENEMY_TAG_MAP`에 매핑 추가 (`deriveTags`)
3. 영향을 받는 EventDefinition의 `boostedByTags` 또는 `requiredTags` 갱신
4. 이 문서 업데이트

---

## 참조 문서

- `EVENT_ENGINE_GUIDE.md` — 이벤트 선택 전체 흐름
- `QUEST_DIRECTOR_GUIDE.md` — 필수 단계와 태그 연동
- `STORY_ENGINE_GUIDE.md` — 태그 기반 서사 풀 선택
