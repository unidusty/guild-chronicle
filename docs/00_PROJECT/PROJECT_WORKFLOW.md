# PROJECT WORKFLOW

Guild Chronicle 개발 워크플로우. (0018-P)

---

## 개발 흐름

```
1. 기획 (ChatGPT)
   └─ 게임 메커니즘, 시스템 설계 토론
        ↓
2. Markdown 작성
   └─ 작업지시서: tasks/todo/XXXX_제목.md
        ↓
3. 설계 문서 작성 또는 업데이트
   └─ docs/03_DESIGN/ 또는 docs/01_SYSTEM/
        ↓
4. Claude Code 구현
   └─ 작업지시서 기반 코드 작성
        ↓
5. 빌드 검증
   └─ npm run check && npm run build
        ↓
6. Git Commit
   └─ feat(0018): ...
        ↓
7. Archive 보관
   └─ tasks/archive/0018_제목.md 에 기록 통합
```

---

## 파일 역할

| 위치 | 역할 |
|------|------|
| `docs/00_PROJECT/` | 공식 프로젝트 운영 문서 |
| `docs/01_SYSTEM/` | 게임 시스템 설계 (무엇을 만드는가) |
| `docs/02_DATABASE/` | 데이터 구조 정의 |
| `docs/03_DESIGN/` | 구현 상세 가이드 (어떻게 만드는가) |
| `docs/99_BRAINSTORM/` | 아이디어, 미확정 기획 |
| `tasks/todo/` | 아직 시작하지 않은 작업지시서 |
| `tasks/doing/` | 현재 진행 중인 작업지시서 |
| `tasks/archive/` | 완료된 작업지시서 모음 |

---

## 작업 번호 체계

형식: `XXXX` (4자리) 또는 `XXXX-A` (하위 업데이트)

예시:
- `0018` — 018 의뢰 시스템 전체
- `0018-A` — 018의 첫 번째 하위 업데이트
- `0018-P` — 018의 열여섯 번째 하위 업데이트 (현재)
- `0019` — 다음 메이저 업데이트

---

## Archive 규칙

하위 업데이트(A, B, C...)는 개별 파일로 보관하지 않는다.

같은 번호의 모든 하위 업데이트는 하나의 파일에 통합한다.

```
tasks/archive/
└── 0018_ADVENTURE_SYSTEM.md   ← 0018-A부터 0018-P까지 전부 포함
```

---

## Git Commit 형식

```
feat(0018): 기능 요약
fix(0018): 버그 수정 요약
docs(0018): 문서 작업 요약
refactor(0018): 리팩토링 요약
```

---

## 문서 작성 원칙

- 공식 설계만 `docs/` 하위에 작성한다.
- 아이디어·미확정 기획은 `docs/99_BRAINSTORM/`에 둔다.
- 현재 구현 사실과 향후 계획을 같은 문서에 섞지 않는다.
- 기능 구현 전에 설계 문서를 먼저 작성한다.
- 한 번의 업데이트에서는 정해진 범위만 수정한다.

---

## Claude Code 작업 방식

1. 작업지시서를 제공한다.
2. Claude Code가 설계 문서를 먼저 읽는다.
3. 코드를 작성한다.
4. `npm run check && npm run build`로 검증한다.
5. Git commit을 생성한다.
6. 완료 보고를 받는다.

Claude Code는 항상 `PROJECT_RULES.md`와 `PROJECT_TERMINOLOGY.md`를 기준으로 동작한다.
