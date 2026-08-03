# tasks

Guild Chronicle 작업지시서 관리 폴더.

---

## 폴더 구성

| 폴더 | 역할 |
|------|------|
| `todo/` | 아직 시작하지 않은 작업지시서 |
| `doing/` | 현재 진행 중인 작업지시서 |
| `archive/` | 완료된 작업지시서 모음 |

---

## 작업 번호 체계

`XXXX` 또는 `XXXX-A` (4자리)

같은 번호의 하위 업데이트(A, B, C...)는 archive에서 하나의 파일로 통합 관리한다.

예시: `archive/0018_ADVENTURE_SYSTEM.md` — 0018-A부터 0018-P까지 전부 포함

---

## 작업 원칙

- 모든 작업지시서는 `TASK_TEMPLATE.md`를 기준으로 작성한다.
- 기능을 변경했다면 관련 공식 문서를 반드시 함께 업데이트한다.
- 변경 사항이 없는 문서는 수정하지 않는다.

## 작업지시서 작성 방법

`TASK_TEMPLATE.md`를 복사해 작성한다.

---

## 워크플로우

```
todo/ 작성 → doing/ 이동 → 구현 완료 → archive/ 통합
```

→ 상세: `docs/00_PROJECT/PROJECT_WORKFLOW.md`
