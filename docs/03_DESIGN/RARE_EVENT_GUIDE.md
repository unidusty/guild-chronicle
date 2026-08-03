# RARE EVENT GUIDE

Guild Chronicle 희귀 사건 설계 기준서. (018-N)

---

## 개요

희귀 사건(Rare Event/Scene)은 낮은 확률로 발생하는 특별한 장면으로,  
플레이어에게 놀라움과 세계관 깊이를 제공한다.  
두 계층에서 독립적으로 구현된다.

---

## 계층 1 — 어드벤처 로그 희귀 장면 (018-J)

`adventureLog.ts`의 `RARE_SCENES` 풀에서 2% 확률로 삽입된다.

### 발생 시점

- `generateDailyLog` / `generateIncidentLog` 호출 시
- seed 기반 결정: `hashSeed(seed) % 50 === 0` (2%)

### 현재 RARE_SCENES (12개)

유성우, 흰 사슴, 오래된 비석, 검은 기사의 그림자, 어린아이의 노랫소리,  
버려진 신전, 쌍무지개, 오로라, 불꽃 나비떼, 말하는 까마귀, 떠도는 혼불, 샘물

### 특징

- 이벤트와 관계없이 일별 로그 문단 말미에 삽입됨
- 서사 분위기를 환기하고 세계의 신비로움을 부각
- `pickAvoidingRecent`가 적용되므로 단기간 반복 없음

---

## 계층 2 — 이벤트 엔진 희귀 이벤트 (018-K)

`eventEngine.ts`의 `EVENT_POOL`에 `rarity: "rare"` 또는 `"epic"`으로 등록된다.

### 가중치

| rarity | 기본 weight |
|--------|-------------|
| (없음) | 정의된 weight (1~6) |
| `"rare"` | 0.5 |
| `"epic"` | 0.1 |

### 현재 희귀 이벤트 (10개)

| ID | 제목 |
|----|------|
| `ev-rare-001` | 유성우 목격 |
| `ev-rare-002` | 길 잃은 아이 |
| `ev-rare-003` | 전설의 검 소문 |
| `ev-rare-004` | 떠돌이 대장장이 조우 |
| `ev-rare-005` | 오래된 영웅의 묘 |
| `ev-rare-006` | 드래곤의 발자국 |
| `ev-rare-007` | 검은 기사 조우 |
| `ev-rare-008` | 오로라 |
| `ev-rare-009` | 고대 정령 출현 |
| `ev-rare-010` | 예언서 조각 발견 |

### 특징

- `requiredTags`/`blockedTags` 없이 어느 의뢰에서도 발생 가능 (일부는 계절·지형 부스트)
- `followUpIds`로 후속 이벤트 연계 가능 (예: 드래곤의 발자국 → 드래곤 영역 경고)
- Event Memory로 단기간 동일 이벤트 반복 방지

---

## 신규 희귀 이벤트 추가 규칙

1. `EVENT_POOL`에 `rarity: "rare"`, `weight: 1` 으로 추가
2. ID: `ev-rare-{번호}` 형식 유지
3. 특정 퀘스트 유형에만 적합한 경우 `requiredTags` 또는 `boostedByTags` 활용
4. 계절·지형 연계 이벤트는 `boostedByTags`로 확률 조정

---

## 두 계층의 관계

| 구분 | 발생 단위 | 확률 | 저장 위치 |
|------|----------|------|----------|
| 로그 희귀 장면 | 문단 (서사 내) | 2% | `narrative` 내 포함 |
| 이벤트 희귀 이벤트 | QuestEvent 객체 | 가중치 0.5 | `prog.events[]` |

두 희귀 장치는 독립적으로 작동한다.  
같은 날 로그 희귀 장면 + 이벤트 희귀 이벤트가 동시에 발생할 수 있다.
